import { useState } from "react";
import type { Payroll } from "../lib/data";
import { balanceMicro, releaseMonth, resetPayroll, runwayMonths, topUpMonth } from "../lib/data";
import { shortHex, timeAgo, xtm } from "../lib/format";
import { canonicalRoster } from "../lib/roster";
import { useRosterHash } from "../lib/useRosterHash";
import { Arrow, Check, Chip, Copy, Initials, Lock, RunwayStrip } from "../components/ui";

export function Dashboard({ payroll, onChange }: { payroll: Payroll; onChange: (p: Payroll) => void }) {
  const [flash, setFlash] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
  const hash = useRosterHash(payroll);
  const balance = balanceMicro(payroll);
  const runway = runwayMonths(payroll);
  const funded = Math.min(
    payroll.months - payroll.monthsReleased,
    Math.floor(balance / payroll.monthlyBudgetMicro),
  );
  const latestMonth = payroll.monthsReleased;

  function doRelease() {
    const { payroll: next, release, error } = releaseMonth(payroll);
    if (error || !release) {
      setFlash({ tone: "warn", text: error ?? "Could not release." });
      return;
    }
    onChange(next);
    setFlash({
      tone: "ok",
      text: `Month ${release.month} released: ${xtm(release.amountMicro)} XTM. Pay the team with stealth transfers.`,
    });
  }

  function doTopUp() {
    const { payroll: next, error } = topUpMonth(payroll);
    if (error) {
      setFlash({ tone: "warn", text: error });
      return;
    }
    onChange(next);
    setFlash({ tone: "ok", text: "One more month funded. Runway extended." });
  }

  function doReset() {
    onChange(resetPayroll());
    setFlash({ tone: "ok", text: "Demo payroll reset." });
  }

  function downloadRoster() {
    const blob = new Blob([canonicalRoster(payroll)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${payroll.id}-roster.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell page">
      <div className="dash-head">
        <div>
          <div className="dash-kicker">
            <Chip tone="lime">Demo payroll</Chip>
            <span className="mono faint">ID {payroll.id}</span>
          </div>
          <h1>{payroll.label}</h1>
          <p className="muted">Employer view · salaries are visible only in this browser</p>
        </div>
        <div className="dash-actions">
          <button className="btn btn-ghost btn-small" onClick={doReset} type="button">
            Reset demo
          </button>
          <a className="btn btn-ghost btn-small" href="#/public">
            Public view <Arrow />
          </a>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-cell">
          <span className="stat-label">Runway</span>
          <span className="stat-value accent">{runway.toFixed(1)}</span>
          <span className="stat-sub">months funded</span>
        </div>
        <div className="stat-cell">
          <span className="stat-label">Monthly payroll</span>
          <span className="stat-value">{xtm(payroll.monthlyBudgetMicro)}</span>
          <span className="stat-sub">XTM per month</span>
        </div>
        <div className="stat-cell">
          <span className="stat-label">Team</span>
          <span className="stat-value">{payroll.payeeCount}</span>
          <span className="stat-sub">people on payroll</span>
        </div>
        <div className="stat-cell">
          <span className="stat-label">Released</span>
          <span className="stat-value">
            {payroll.monthsReleased}
            <span className="stat-of">/{payroll.months}</span>
          </span>
          <span className="stat-sub">monthly runs</span>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-main">
          <section className="card panel">
            <div className="panel-head">
              <div>
                <p className="section-label">The vault</p>
                <h2>Runway</h2>
              </div>
              <Chip>
                <Lock /> Locked
              </Chip>
            </div>
            <RunwayStrip months={payroll.months} released={payroll.monthsReleased} funded={funded} />
            <div className="runway-meta">
              <div>
                <span>Vault balance</span>
                <b>{xtm(balance)} XTM</b>
              </div>
              <div>
                <span>Next unlock</span>
                <b className="mono">
                  {payroll.monthsReleased >= payroll.months
                    ? "complete"
                    : `epoch ${(payroll.startEpoch + payroll.monthsReleased * payroll.epochsPerMonth).toLocaleString()}`}
                </b>
              </div>
              <div>
                <span>Committed</span>
                <b>{xtm(payroll.monthlyBudgetMicro * payroll.months)} XTM</b>
              </div>
            </div>
            <div className="panel-actions">
              <button
                className="btn btn-primary"
                onClick={doRelease}
                disabled={payroll.monthsReleased >= payroll.months || balance < payroll.monthlyBudgetMicro}
                type="button"
              >
                Release month {Math.min(payroll.monthsReleased + 1, payroll.months)}
              </button>
              <button className="btn btn-ghost" onClick={doTopUp} type="button">
                Fund one more month
              </button>
            </div>
            <p className="fine">
              Demo clock: the release button acts immediately. On mainnet,{" "}
              <span className="mono">release_month</span> only succeeds at or after the unlock
              epoch, and only the employer key can call it.
            </p>
            {flash && <div className={`flash ${flash.tone}`}>{flash.text}</div>}
          </section>

          <section className="card panel">
            <div className="panel-head">
              <div>
                <p className="section-label">Private to this browser</p>
                <h2>Team</h2>
              </div>
              <span className="mono faint">{payroll.employees.length} people</span>
            </div>
            <table className="team">
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Monthly</th>
                  <th>Month {latestMonth || "—"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payroll.employees.map((e) => {
                  const claimed = latestMonth > 0 && e.claimedMonths.includes(latestMonth);
                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="person">
                          <Initials name={e.name} />
                          <div>
                            <b>{e.name}</b>
                            <span>{e.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="mono">{xtm(e.salaryMicro)} XTM</td>
                      <td>
                        {latestMonth === 0 ? (
                          <span className="muted">—</span>
                        ) : claimed ? (
                          <Chip tone="lime">
                            <Check /> Paid
                          </Chip>
                        ) : (
                          <Chip tone="warn">Pending</Chip>
                        )}
                      </td>
                      <td className="right">
                        <a className="text-link" href={`#/claim/${e.id}`}>
                          Pay stub <Arrow size={13} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="fine">
              These rows exist only in this browser. The contract stores a hash of this roster and
              the aggregate monthly total — not these names or salaries.
            </p>
          </section>
        </div>

        <aside className="dash-side">
          <section className="card panel">
            <div className="panel-head">
              <div>
                <p className="section-label">Sealed roster</p>
                <h2>Proof</h2>
              </div>
            </div>
            <p className="muted small">
              A SHA-256 commitment to the team file. Share it, or publish it with the payroll.
              Anyone with the file can verify it later.
            </p>
            <div className="hash-box">
              <span className="mono">{hash ? shortHex(hash, 18, 12) : "hashing…"}</span>
              {hash && <Copy text={hash} label="Copy hash" />}
            </div>
            <div className="stack">
              <button className="btn btn-ghost btn-small" onClick={downloadRoster} type="button">
                Download roster JSON
              </button>
              <a className="btn btn-ghost btn-small" href="#/public">
                Verify on the public page <Arrow size={13} />
              </a>
            </div>
          </section>

          <section className="card panel">
            <div className="panel-head">
              <div>
                <p className="section-label">On chain</p>
                <h2>Activity</h2>
              </div>
            </div>
            {payroll.releases.length === 0 ? (
              <p className="muted small">No payroll runs yet.</p>
            ) : (
              <ul className="activity">
                {[...payroll.releases].reverse().map((r) => (
                  <li key={r.month}>
                    <div className="activity-dot" />
                    <div>
                      <b>
                        Month {r.month} released
                      </b>
                      <span className="mono small">
                        {xtm(r.amountMicro)} XTM · epoch {r.epoch.toLocaleString()}
                      </span>
                      <span className="mono tiny faint">
                        {shortHex(r.tx, 10, 6)} · {timeAgo(r.at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="fine">
              The chain records that a month was released and the aggregate amount. Not who was
              paid.
            </p>
          </section>

          <section className="card panel muted-panel">
            <p className="section-label">Mainnet</p>
            <h3 className="small-title">The same contract, on Tari mainnet.</h3>
            <p className="muted small">
              The demo is a simulation. The contract behind it is published on mainnet and its
              state is read live from the public indexer.
            </p>
            <a className="text-link" href="#/mainnet">
              Open the mainnet proof <Arrow size={13} />
            </a>
          </section>
        </aside>
      </div>
    </main>
  );
}
