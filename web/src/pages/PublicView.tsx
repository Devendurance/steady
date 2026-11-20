import { useState } from "react";
import type { Payroll } from "../lib/data";
import { balanceMicro, runwayMonths } from "../lib/data";
import { dateUtc, shortHex, xtm } from "../lib/format";
import { canonicalRoster, sha256Hex } from "../lib/roster";
import { useRosterHash } from "../lib/useRosterHash";
import { Arrow, Check, Chip, Copy, Eye, Lock, RunwayStrip } from "../components/ui";

export function PublicView({ payroll }: { payroll: Payroll }) {
  const hash = useRosterHash(payroll);
  const balance = balanceMicro(payroll);
  const runway = runwayMonths(payroll);
  const funded = Math.min(
    payroll.months - payroll.monthsReleased,
    Math.floor(balance / payroll.monthlyBudgetMicro),
  );
  const [rosterInput, setRosterInput] = useState("");
  const [check, setCheck] = useState<"idle" | "match" | "mismatch" | "error">("idle");

  async function verify(text: string) {
    if (!text.trim()) return;
    try {
      const digest = await sha256Hex(text.trim());
      setCheck(digest === hash ? "match" : "mismatch");
    } catch {
      setCheck("error");
    }
  }

  function useDemoRoster() {
    const text = canonicalRoster(payroll);
    setRosterInput(text);
    verify(text);
  }

  return (
    <main className="shell page">
      <div className="dash-head">
        <div>
          <div className="dash-kicker">
            <Chip tone="lime">
              <Eye /> Public view
            </Chip>
            <span className="mono faint">PAYROLL / {payroll.id}</span>
          </div>
          <h1>{payroll.label}</h1>
          <p className="muted">
            Everything the chain knows about this payroll. No names. No salaries.
          </p>
        </div>
        <div className="dash-actions">
          <a className="btn btn-ghost btn-small" href="#/demo">
            Employer view <Arrow />
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
          <span className="stat-sub">XTM aggregate</span>
        </div>
        <div className="stat-cell">
          <span className="stat-label">Team</span>
          <span className="stat-value">{payroll.payeeCount}</span>
          <span className="stat-sub">people</span>
        </div>
        <div className="stat-cell">
          <span className="stat-label">In the vault</span>
          <span className="stat-value">{xtm(balance)}</span>
          <span className="stat-sub">XTM locked</span>
        </div>
      </div>

      <section className="card panel">
        <div className="panel-head">
          <div>
            <p className="section-label">Public runway</p>
            <h2>Funded, month by month</h2>
          </div>
          <Chip>
            <Lock /> Locked
          </Chip>
        </div>
        <RunwayStrip months={payroll.months} released={payroll.monthsReleased} funded={funded} />
        <div className="legend">
          <span>
            <i className="key key-released" /> Released
          </span>
          <span>
            <i className="key key-locked" /> Funded, locked
          </span>
          <span>
            <i className="key key-empty" /> Not funded
          </span>
        </div>
        <div className="runway-meta">
          <div>
            <span>Next unlock epoch</span>
            <b className="mono">
              {payroll.monthsReleased >= payroll.months
                ? "complete"
                : (payroll.startEpoch + payroll.monthsReleased * payroll.epochsPerMonth).toLocaleString()}
            </b>
          </div>
          <div>
            <span>Months released</span>
            <b>
              {payroll.monthsReleased} of {payroll.months}
            </b>
          </div>
          <div>
            <span>Epochs per month</span>
            <b className="mono">{payroll.epochsPerMonth.toLocaleString()}</b>
          </div>
        </div>
      </section>

      <div className="public-grid">
        <section className="card panel">
          <div className="panel-head">
            <div>
              <p className="section-label">Sealed roster</p>
              <h2>Verify the team file</h2>
            </div>
          </div>
          <p className="muted small">
            The roster is committed as a SHA-256 hash. Paste the team file to check it matches —
            the file itself never goes on chain.
          </p>
          <div className="hash-box">
            <span className="mono">{hash ? shortHex(hash, 24, 16) : "hashing…"}</span>
            {hash && <Copy text={hash} label="Copy" />}
          </div>
          <textarea
            className="roster-input"
            value={rosterInput}
            onChange={(e) => {
              setRosterInput(e.target.value);
              setCheck("idle");
            }}
            placeholder="Paste roster JSON here…"
            rows={5}
          />
          <div className="stack-row">
            <button className="btn btn-primary btn-small" onClick={() => verify(rosterInput)} type="button">
              Verify hash
            </button>
            <button className="btn btn-ghost btn-small" onClick={useDemoRoster} type="button">
              Use the demo roster
            </button>
          </div>
          {check === "match" && (
            <div className="flash ok">
              <Check /> This file matches the committed roster.
            </div>
          )}
          {check === "mismatch" && (
            <div className="flash warn">This file does not match the committed roster.</div>
          )}
          {check === "error" && <div className="flash warn">Could not hash that file.</div>}
        </section>

        <section className="card panel">
          <div className="panel-head">
            <div>
              <p className="section-label">Release history</p>
              <h2>Aggregate payroll runs</h2>
            </div>
          </div>
          {payroll.releases.length === 0 ? (
            <p className="muted small">No payroll has been released yet.</p>
          ) : (
            <ul className="release-list">
              {[...payroll.releases].reverse().map((r) => (
                <li key={r.month}>
                  <div className="release-month">Month {r.month}</div>
                  <div className="release-main">
                    <b>{xtm(r.amountMicro)} XTM</b>
                    <span className="mono small">epoch {r.epoch.toLocaleString()}</span>
                    <span className="mono tiny faint">{shortHex(r.tx, 12, 8)}</span>
                  </div>
                  <div className="release-date">{dateUtc(r.at)}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="fine">
            Each entry is one aggregate release. The contract does not record which people were
            paid, or how much each received.
          </p>
        </section>
      </div>

      <section className="card panel">
        <div className="panel-head">
          <div>
            <p className="section-label">The boundary</p>
            <h2>What is deliberately absent</h2>
          </div>
        </div>
        <div className="absent-grid">
          <div>
            <Lock />
            <h3>Names and roles</h3>
            <p>Never sent to the contract. The public sees a headcount and a hash.</p>
          </div>
          <div>
            <Lock />
            <h3>Individual salaries</h3>
            <p>Only the monthly total is public. Each salary stays in the employer’s browser.</p>
          </div>
          <div>
            <Lock />
            <h3>Payment recipients</h3>
            <p>Paid with native Tari stealth transfers. The chain sees valid transfers, not identities.</p>
          </div>
        </div>
        <a className="text-link" href="#/mainnet">
          See the live mainnet proof <Arrow size={13} />
        </a>
      </section>
    </main>
  );
}
