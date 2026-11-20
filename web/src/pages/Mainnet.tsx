import { useEffect, useState } from "react";
import { MAINNET } from "../lib/mainnet";
import {
  explorerComponent,
  explorerTx,
  fetchPayroll,
  fetchReceipt,
  indexerComponent,
  type LivePayroll,
} from "../lib/indexer";
import { dateUtc, shortHex, xtm } from "../lib/format";
import { Arrow, Check, Chip, Copy, Eye, Lock } from "../components/ui";

type LoadState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "live"; data: LivePayroll; receipt?: string }
  | { state: "error"; message: string };

export function Mainnet() {
  const [load, setLoad] = useState<LoadState>({ state: "idle" });
  const published = Boolean(MAINNET.contract);

  async function refresh() {
    if (!published) return;
    setLoad({ state: "loading" });
    try {
      const data = await fetchPayroll(MAINNET.contract);
      let receipt: string | undefined;
      if (MAINNET.publishTx) {
        try {
          receipt = (await fetchReceipt(MAINNET.publishTx)).sha256;
        } catch {
          receipt = undefined;
        }
      }
      setLoad({ state: "live", data, receipt });
    } catch (error) {
      setLoad({ state: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  useEffect(() => {
    if (published) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="shell page">
      <div className="dash-head">
        <div>
          <div className="dash-kicker">
            <Chip tone={published ? "lime" : "warn"}>
              <Eye /> {published ? "Live on Tari mainnet" : "Publish pending"}
            </Chip>
            <span className="mono faint">NETWORK / MAINNET</span>
          </div>
          <h1>Mainnet proof</h1>
          <p className="muted">
            The same payroll contract the demo simulates, published on Tari Ootle mainnet and read
            live from the public indexer.
          </p>
        </div>
        <div className="dash-actions">
          <button
            className="btn btn-ghost btn-small"
            onClick={refresh}
            disabled={!published || load.state === "loading"}
            type="button"
          >
            {load.state === "loading" ? "Reading…" : "Re-check live state"}
          </button>
          <a className="btn btn-ghost btn-small" href="#/demo">
            Open demo <Arrow />
          </a>
        </div>
      </div>

      {!published ? (
        <section className="card panel">
          <p className="section-label">Deployment in progress</p>
          <h2>The contract is being published.</h2>
          <p className="muted">
            This page fills in automatically once the mainnet transaction commits. The source,
            engine tests and build are already in the repository.
          </p>
          <ol className="checklist">
            <li>
              <Check /> Rust template written and compiled to WASM
            </li>
            <li>
              <Check /> Engine tests cover release rules, authorization and funding caps
            </li>
            <li>
              <span className="pending-dot" /> Mainnet template publish
            </li>
            <li>
              <span className="pending-dot" /> Funded payroll run and live indexer read
            </li>
          </ol>
        </section>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-cell">
              <span className="stat-label">Live epoch</span>
              <span className="stat-value">
                {load.state === "live" ? load.data.epoch.toLocaleString() : "—"}
              </span>
              <span className="stat-sub">mainnet</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Vault balance</span>
              <span className="stat-value">
                {load.state === "live" ? xtm(load.data.balanceMicro) : "—"}
              </span>
              <span className="stat-sub">XTM, read live</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Months released</span>
              <span className="stat-value">
                {load.state === "live" ? load.data.monthsReleased : "—"}
                <span className="stat-of">/{load.state === "live" ? load.data.months : "—"}</span>
              </span>
              <span className="stat-sub">aggregate runs</span>
            </div>
            <div className="stat-cell">
              <span className="stat-label">Runway</span>
              <span className="stat-value accent">
                {load.state === "live"
                  ? (load.data.balanceMicro / load.data.monthlyBudgetMicro).toFixed(1)
                  : "—"}
              </span>
              <span className="stat-sub">months</span>
            </div>
          </div>

          <div className="public-grid">
            <section className="card panel">
              <div className="panel-head">
                <div>
                  <p className="section-label">Deployment</p>
                  <h2>What was published</h2>
                </div>
                <Chip tone="lime">
                  <Check /> Committed
                </Chip>
              </div>
              <div className="deploy-rows">
                <Row label="Network" value="Tari Ootle mainnet" />
                <Row label="Template" value={MAINNET.template} mono copy />
                <Row label="Component" value={MAINNET.contract} mono copy link={explorerComponent(MAINNET.contract)} />
                <Row label="Publish tx" value={MAINNET.publishTx} mono copy link={explorerTx(MAINNET.publishTx)} />
                <Row label="Published" value={MAINNET.publishedAt ? dateUtc(MAINNET.publishedAt) : "—"} />
                <Row label="Publication epoch" value={String(MAINNET.publicationEpoch)} mono />
                <Row
                  label="Publish fee"
                  value={MAINNET.feeMicro ? `${(MAINNET.feeMicro / 1_000_000).toFixed(4)} XTM` : "—"}
                  mono
                />
                {load.state === "live" && load.receipt && (
                  <Row label="Receipt SHA-256" value={load.receipt} mono copy />
                )}
              </div>
              <div className="stack-row">
                <a className="btn btn-ghost btn-small" href={explorerComponent(MAINNET.contract)} target="_blank" rel="noreferrer">
                  Open on Veil <Arrow size={13} />
                </a>
                <a className="btn btn-ghost btn-small" href={indexerComponent(MAINNET.contract)} target="_blank" rel="noreferrer">
                  Raw indexer state
                </a>
              </div>
            </section>

            <section className="card panel">
              <div className="panel-head">
                <div>
                  <p className="section-label">Live state</p>
                  <h2>Read from the indexer</h2>
                </div>
              </div>
              {load.state === "live" ? (
                <div className="mini-rows">
                  <div>
                    <span>Label</span>
                    <b>{load.data.label || "—"}</b>
                  </div>
                  <div>
                    <span>Monthly budget</span>
                    <b>{xtm(load.data.monthlyBudgetMicro)} XTM</b>
                  </div>
                  <div>
                    <span>Headcount</span>
                    <b>{load.data.payeeCount} people</b>
                  </div>
                  <div>
                    <span>Committed months</span>
                    <b>{load.data.months}</b>
                  </div>
                  <div>
                    <span>Roster hash</span>
                    <b className="mono small">{shortHex(load.data.rosterHash, 16, 10)}</b>
                  </div>
                  <div>
                    <span>Indexer verified</span>
                    <b>{load.data.verified ? "yes" : "not proven"}</b>
                  </div>
                </div>
              ) : load.state === "error" ? (
                <div className="flash warn">{load.message}</div>
              ) : (
                <p className="muted small">Reading the live component…</p>
              )}
              <p className="fine">
                The page decodes the public component substate and its vault. It does not prove
                validator consensus; the explorer and indexer are the independent sources.
              </p>
            </section>
          </div>

          <section className="card panel">
            <div className="panel-head">
              <div>
                <p className="section-label">Why it matters</p>
                <h2>What the mainnet contract proves</h2>
              </div>
            </div>
            <div className="absent-grid">
              <div>
                <Lock />
                <h3>No early exit</h3>
                <p>
                  The employer cannot withdraw the vault early. Each month unlocks only at its
                  epoch, and only the employer key can release it.
                </p>
              </div>
              <div>
                <Check />
                <h3>Funding is capped</h3>
                <p>
                  Funding cannot exceed the committed payroll, so the public runway is not diluted
                  or accidentally overfunded.
                </p>
              </div>
              <div>
                <Eye />
                <h3>Aggregates are public</h3>
                <p>
                  Headcount, monthly total, runway and release epochs are readable by anyone. No
                  salary, name or recipient is in the state.
                </p>
              </div>
            </div>
            <div className="verify-box">
              <p className="section-label">Verify it yourself</p>
              <pre>
                <code>{`cargo test --test payroll
cargo build-wasm
# then read the component live:
# ${MAINNET.contract}`}</code>
              </pre>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Row({
  label,
  value,
  mono,
  copy,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copy?: boolean;
  link?: string;
}) {
  return (
    <div className="deploy-row">
      <span>{label}</span>
      <div className="deploy-value">
        {link ? (
          <a className={`mono ${mono ? "" : "plain"}`} href={link} target="_blank" rel="noreferrer">
            {shortHex(value, 18, 10)}
          </a>
        ) : (
          <b className={mono ? "mono" : ""}>{mono ? shortHex(value, 18, 10) : value}</b>
        )}
        {copy && <Copy text={value} label="Copy" />}
      </div>
    </div>
  );
}
