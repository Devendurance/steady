import { useState } from "react";
import type { Payroll } from "../lib/data";
import { claimMonth, randomHex } from "../lib/data";
import { dateUtc, shortHex, xtm } from "../lib/format";
import { Arrow, Check, Chip, Copy, Lock } from "../components/ui";

export function Claim({
  payroll,
  onChange,
  id,
}: {
  payroll: Payroll;
  onChange: (p: Payroll) => void;
  id: string;
}) {
  const employee = payroll.employees.find((e) => e.id === id);
  const [tx, setTx] = useState<string | null>(null);

  if (!employee) {
    return (
      <main className="shell page">
        <section className="card panel empty-state">
          <p className="section-label">Claim link</p>
          <h1>This pay stub doesn’t exist.</h1>
          <p className="muted">
            The link may be from a different demo. Open the employer view and copy a fresh claim
            link.
          </p>
          <a className="btn btn-primary" href="#/demo">
            Back to the payroll
          </a>
        </section>
      </main>
    );
  }

  const month = payroll.monthsReleased;
  const employeeId = employee.id;
  const release = payroll.releases.find((r) => r.month === month);
  const claimed = month > 0 && employee.claimedMonths.includes(month);
  const period = release
    ? new Date(release.at).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : `Month ${month || 1}`;

  function claim() {
    if (month <= 0) return;
    const next = claimMonth(payroll, employeeId, month);
    onChange(next);
    setTx(randomHex(32));
  }

  return (
    <main className="shell page claim-page">
      <a className="back-link" href="#/demo">
        <Arrow size={13} /> Back to the payroll
      </a>

      <div className="claim-grid">
        <section className="stub">
          <div className="stub-top">
            <span className="mono">STEADY / PAY STUB</span>
            <Chip tone={claimed ? "lime" : "warn"}>{claimed ? "Claimed" : "Ready to claim"}</Chip>
          </div>
          <div className="stub-name">
            <h1>{employee.name}</h1>
            <p>{employee.role}</p>
          </div>
          <div className="stub-amount">
            <span className="stub-label">Net this period</span>
            <span className="stub-value">{xtm(employee.salaryMicro)}</span>
            <span className="stub-currency">XTM</span>
          </div>
          <div className="stub-rows">
            <div>
              <span>Period</span>
              <b>{period}</b>
            </div>
            <div>
              <span>Payroll</span>
              <b>{payroll.label}</b>
            </div>
            <div>
              <span>Paid to</span>
              <b className="mono">{shortHex(employee.address, 14, 8)}</b>
            </div>
            <div>
              <span>Method</span>
              <b>Tari stealth transfer</b>
            </div>
          </div>
          <div className="stub-cut" aria-hidden="true" />
          {claimed ? (
            <div className="stub-foot">
              <div className="flash ok">
                <Check /> Paid privately
              </div>
              {tx && (
                <div className="receipt">
                  <span className="mono tiny faint">SIMULATED TRANSFER</span>
                  <span className="mono small">{shortHex(tx, 20, 12)}</span>
                </div>
              )}
              <p className="fine">
                The demo recorded this claim in your browser. On mainnet, the employer’s wallet
                sends a native Tari stealth transfer and the receipt is the proof.
              </p>
            </div>
          ) : month <= 0 ? (
            <div className="flash warn">No payroll has been released yet.</div>
          ) : (
            <div className="stub-foot">
              <button className="btn btn-primary stub-button" onClick={claim} type="button">
                Claim {xtm(employee.salaryMicro)} XTM
              </button>
              <p className="fine">
                Demo claim: records the pay stub in this browser. On mainnet this step is a native
                Tari stealth transfer from the employer.
              </p>
            </div>
          )}
        </section>

        <aside className="claim-side">
          <section className="card panel">
            <p className="section-label">Why this is private</p>
            <h2>The chain sees a transfer, not a person.</h2>
            <p className="muted small">
              Steady pays each person to a Tari stealth address. The amount and recipient are not
              written into the payroll contract, and the public payroll view only shows the
              aggregate for the month.
            </p>
            <ul className="plain-list">
              <li>
                <Lock size={14} /> Your salary is stored only in the employer’s browser
              </li>
              <li>
                <Lock size={14} /> The contract knows the monthly total, not your share
              </li>
              <li>
                <Lock size={14} /> Payment receipts are yours to keep
              </li>
            </ul>
          </section>

          <section className="card panel muted-panel">
            <p className="section-label">This is a demo</p>
            <p className="muted small">
              No real funds move here. The contract behind Steady is published on Tari mainnet;
              the employer and claim flows above are a faithful simulation of it.
            </p>
            <a className="text-link" href="#/mainnet">
              See the mainnet contract <Arrow size={13} />
            </a>
          </section>

          {claimed && release && (
            <section className="card panel">
              <p className="section-label">Payroll run</p>
              <div className="mini-rows">
                <div>
                  <span>Month</span>
                  <b>{release.month}</b>
                </div>
                <div>
                  <span>Aggregate released</span>
                  <b>{xtm(release.amountMicro)} XTM</b>
                </div>
                <div>
                  <span>Epoch</span>
                  <b className="mono">{release.epoch.toLocaleString()}</b>
                </div>
                <div>
                  <span>Released at</span>
                  <b>{dateUtc(release.at)}</b>
                </div>
              </div>
              <Copy text={release.tx} label="Copy run tx" />
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
