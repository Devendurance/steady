export type Employee = {
  id: string;
  name: string;
  role: string;
  salaryMicro: number;
  address: string;
  claimedMonths: number[];
};

export type Release = {
  month: number;
  amountMicro: number;
  epoch: number;
  at: string;
  tx: string;
};

export type Payroll = {
  id: string;
  label: string;
  employer: string;
  monthlyBudgetMicro: number;
  months: number;
  monthsReleased: number;
  payeeCount: number;
  startEpoch: number;
  epochsPerMonth: number;
  fundedMicro: number;
  employees: Employee[];
  releases: Release[];
  network: "demo" | "mainnet";
  contract?: string;
};

const KEY = "steady.payroll.v1";
const XTM = 1_000_000;

const employee = (
  id: string,
  name: string,
  role: string,
  salaryXtm: number,
  address: string,
): Employee => ({
  id,
  name,
  role,
  salaryMicro: salaryXtm * XTM,
  address,
  claimedMonths: [],
});

export const seedPayroll = (): Payroll => ({
  id: "northwind-001",
  label: "Northwind Studio",
  employer: "Devendurance",
  monthlyBudgetMicro: 1_560 * XTM,
  months: 6,
  monthsReleased: 1,
  payeeCount: 5,
  startEpoch: 38_980,
  epochsPerMonth: 2_160,
  fundedMicro: 4 * 1_560 * XTM,
  network: "demo",
  employees: [
    employee("amara", "Amara Okonkwo", "Design lead", 340, "otl_1amara7k2q9v4m8x3n6p5r2t9w4y7c1b8d3f6g0h5j2k9l4m7n"),
    employee("tunde", "Tunde Bakare", "Engineer", 420, "otl_1tunde4r8w2y6m1q5n9p3t7v0x4c8b2d6f1g5h9j3k7l0m4n8"),
    employee("zainab", "Zainab Musa", "Product", 360, "otl_1zainab2m7q4v9x1n5p8r3t6w0y4c7b1d5f9g2h6j0k3l8m"),
    employee("chidi", "Chidi Eze", "Growth", 260, "otl_1chidi8n3q7v1x5m9p2r6t0w4y8c1b5d9f3g7h0j4k8l2m6"),
    employee("mina", "Mina Sule", "Support", 180, "otl_1mina5q9v3x7m1n5p9r2t6w0y4c8b1d5f9g3h7j0k4l8m2n6p"),
  ],
  releases: [
    {
      month: 1,
      amountMicro: 1_560 * XTM,
      epoch: 38_980,
      at: "2026-10-31T09:12:00.000Z",
      tx: "9c1f4a7e2b8d5f0a3c6e9b2d7f4a1c8e5b3d0f7a2c9e6b4d1f8a5c2e7b0d3f6a",
    },
  ],
});

export function loadPayroll(): Payroll {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Payroll;
      if (parsed && parsed.id && Array.isArray(parsed.employees)) return parsed;
    }
  } catch {
    /* fall through to a fresh seed */
  }
  return seedPayroll();
}

export function savePayroll(p: Payroll) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function resetPayroll(): Payroll {
  const fresh = seedPayroll();
  savePayroll(fresh);
  return fresh;
}

export const balanceMicro = (p: Payroll) =>
  Math.max(0, p.fundedMicro - p.releases.reduce((sum, r) => sum + r.amountMicro, 0));

export const runwayMonths = (p: Payroll) =>
  p.monthlyBudgetMicro > 0 ? balanceMicro(p) / p.monthlyBudgetMicro : 0;

export const nextReleaseEpoch = (p: Payroll) =>
  p.monthsReleased < p.months
    ? p.startEpoch + p.monthsReleased * p.epochsPerMonth
    : 0;

export function releaseMonth(p: Payroll): { payroll: Payroll; release?: Release; error?: string } {
  if (p.monthsReleased >= p.months) return { payroll: p, error: "All months have been released." };
  if (balanceMicro(p) < p.monthlyBudgetMicro) return { payroll: p, error: "The vault is underfunded for this month." };
  const release: Release = {
    month: p.monthsReleased + 1,
    amountMicro: p.monthlyBudgetMicro,
    epoch: nextReleaseEpoch(p),
    at: new Date().toISOString(),
    tx: randomHex(32),
  };
  const next: Payroll = {
    ...p,
    monthsReleased: p.monthsReleased + 1,
    releases: [...p.releases, release],
  };
  savePayroll(next);
  return { payroll: next, release };
}

export function claimMonth(p: Payroll, employeeId: string, month: number): Payroll {
  const next: Payroll = {
    ...p,
    employees: p.employees.map((e) =>
      e.id === employeeId && !e.claimedMonths.includes(month)
        ? { ...e, claimedMonths: [...e.claimedMonths, month] }
        : e,
    ),
  };
  savePayroll(next);
  return next;
}

export function topUpMonth(p: Payroll): { payroll: Payroll; error?: string } {
  const cap = p.monthlyBudgetMicro * p.months;
  const balance = balanceMicro(p);
  if (balance + p.monthlyBudgetMicro > cap) {
    return { payroll: p, error: "The committed payroll is already fully funded." };
  }
  const next = { ...p, fundedMicro: p.fundedMicro + p.monthlyBudgetMicro };
  savePayroll(next);
  return { payroll: next };
}

export function randomHex(bytes: number): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const XTM_PER_TARI = XTM;
