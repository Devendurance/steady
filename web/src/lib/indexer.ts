// Read-only access to Tari's public Ootle indexer. Adapted from the MIT-licensed
// Semvi indexer helper (github.com/emmaGH1/semvi), narrowed to Steady's needs.
// No keys, no wallet, no submissions.

export const INDEXER = "https://indexer-a.ootle.tari.com";
export const explorerTx = (tx: string) => `https://explorer.tari.mw/tx/${tx}`;
export const explorerComponent = (id: string) => `https://explorer.tari.mw/component/${id}`;
export const indexerComponent = (id: string) => `${INDEXER}/substates/${id}`;

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function decodeCbor(bytes: Uint8Array): any {
  let i = 0;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const len = (ai: number): number => {
    if (ai < 24) return ai;
    if (ai === 24) return bytes[i++];
    if (ai === 25) {
      const v = dv.getUint16(i);
      i += 2;
      return v;
    }
    if (ai === 26) {
      const v = dv.getUint32(i);
      i += 4;
      return v;
    }
    if (ai === 27) {
      const v = dv.getBigUint64(i);
      i += 8;
      return Number(v);
    }
    throw Error("Indefinite CBOR unsupported");
  };
  const item = (): any => {
    const b = bytes[i++];
    const mt = b >> 5;
    const ai = b & 31;
    switch (mt) {
      case 0:
        return len(ai);
      case 1: {
        const n = len(ai);
        return typeof n === "bigint" ? -1n - n : -1 - n;
      }
      case 2: {
        const n = len(ai);
        const v = bytes.slice(i, i + n);
        i += n;
        return v;
      }
      case 3: {
        const n = len(ai);
        const v = new TextDecoder().decode(bytes.subarray(i, i + n));
        i += n;
        return v;
      }
      case 4: {
        const n = len(ai);
        return Array.from({ length: n }, item);
      }
      case 5: {
        const n = len(ai);
        const m = new Map();
        for (let k = 0; k < n; k++) {
          const key = item();
          m.set(key instanceof Uint8Array ? hex(key) : key, item());
        }
        return m;
      }
      case 6: {
        const tag = len(ai);
        return { tag, value: item() };
      }
      case 7: {
        if (ai === 20) return false;
        if (ai === 21) return true;
        if (ai === 22 || ai === 23) return null;
        throw Error("Unsupported simple " + ai);
      }
    }
  };
  return item();
}

export const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

async function get(path: string) {
  const r = await fetch(INDEXER + path, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw Error(`Tari indexer returned HTTP ${r.status} for ${path}`);
  return r.json();
}

export async function fetchNetwork(): Promise<{ network: string; epoch: number; version?: string }> {
  const [info, stats] = await Promise.all([get("/info"), get("/epoch-manager/stats")]);
  return { network: info.network, version: info.version, epoch: stats.current_epoch };
}

export async function fetchSubstate(id: string) {
  const j = await get(`/substates/${encodeURIComponent(id)}`);
  const raw = j?.state?.up?.substate;
  if (!raw) throw Error(`${id} is not a live substate on this network`);
  return {
    value: decodeCbor(b64(raw)),
    version: j.version,
    verified: j.verified === true,
    anchorEpoch: j.proof?.anchor?.epoch,
  };
}

function findAmount(value: any): number | null {
  if (!Array.isArray(value)) return null;
  const [resource, amount] = value;
  if (resource?.tag === 131 && (typeof amount === "number" || typeof amount === "bigint")) {
    return Number(amount);
  }
  for (const item of value) {
    const nested = findAmount(item);
    if (nested !== null) return nested;
  }
  return null;
}

export async function fetchVaultBalance(vaultId: string): Promise<number> {
  const s = await fetchSubstate(vaultId);
  const amount = findAmount(s.value);
  if (amount === null) throw Error(`Could not decode the balance of ${vaultId}`);
  return amount;
}

export type LivePayroll = {
  balanceMicro: number;
  monthlyBudgetMicro: number;
  months: number;
  monthsReleased: number;
  payeeCount: number;
  startEpoch: number;
  epochsPerMonth: number;
  rosterHash: string;
  label: string;
  epoch: number;
  verified: boolean;
};

function toNum(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (v && typeof v === "object" && "value" in v) return toNum(v.value);
  return Number(v);
}

// Component state for Payroll is [employer, vaultRef, monthly_budget, months,
// payee_count, start_epoch, epochs_per_month, months_released, roster_hash, label].
// The indexer wraps it as [header, [state]] inside the substate value.
export async function fetchPayroll(component: string): Promise<LivePayroll> {
  const s = await fetchSubstate(component);
  const [, [state]] = s.value[1][0];
  const [
    ,
    vaultRef,
    monthlyBudgetMicro,
    months,
    payeeCount,
    startEpoch,
    epochsPerMonth,
    monthsReleased,
    rosterHash,
    label,
  ] = state;
  const vaultId = "vault_" + hex(vaultRef.value);
  const balanceMicro = await fetchVaultBalance(vaultId);
  const net = await fetchNetwork();
  return {
    balanceMicro,
    monthlyBudgetMicro: toNum(monthlyBudgetMicro),
    months: toNum(months),
    monthsReleased: toNum(monthsReleased),
    payeeCount: toNum(payeeCount),
    startEpoch: toNum(startEpoch),
    epochsPerMonth: toNum(epochsPerMonth),
    rosterHash: typeof rosterHash === "string" ? rosterHash : hex(rosterHash),
    label: typeof label === "string" ? label : "",
    epoch: net.epoch,
    verified: s.verified,
  };
}

export async function fetchReceipt(tx: string) {
  const raw = await get(`/transaction-receipts/${encodeURIComponent(tx)}`);
  const digest = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", b64(raw.receipt))));
  return { raw, sha256: digest };
}
