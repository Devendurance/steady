import type { Payroll } from "../lib/data";
import { balanceMicro, runwayMonths } from "../lib/data";
import { months, xtm } from "../lib/format";
import { Arrow, Chip, Eye, Lock, RunwayStrip } from "../components/ui";

export function Landing({ payroll }: { payroll: Payroll }) {
  const runway = runwayMonths(payroll);
  const balance = balanceMicro(payroll);
  const funded = Math.min(
    payroll.months - payroll.monthsReleased,
    Math.floor(balance / payroll.monthlyBudgetMicro),
  );

  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" />
            Private payroll on Tari Ootle
          </p>
          <h1>
            Pay your team.
            <br />
            <em>Keep the numbers between you.</em>
          </h1>
          <p className="lede">
            Steady locks the whole payroll in a public vault. Anyone can verify the runway. No one
            can see a salary.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#/demo">
              Open the demo
            </a>
            <a className="btn btn-ghost" href="#/public">
              See what the chain sees <Arrow />
            </a>
          </div>
          <p className="micro">
            No wallet needed · Live on Ootle mainnet · Open source, MIT
          </p>
        </div>

        <div className="vault-card" aria-label="Public payroll view">
          <div className="vault-head">
            <div>
              <span className="mono faint">PAYROLL / 001</span>
              <h3>{payroll.label}</h3>
            </div>
            <Chip tone="lime">
              <Eye /> Public view
            </Chip>
          </div>

          <div className="vault-big">
            <span className="vault-number">{months(runway)}</span>
            <span className="vault-unit">
              months of runway
              <br />
              locked on chain
            </span>
          </div>

          <RunwayStrip
            months={payroll.months}
            released={payroll.monthsReleased}
            funded={funded}
          />

          <div className="vault-rows">
            <div>
              <span>Monthly payroll</span>
              <b>{xtm(payroll.monthlyBudgetMicro)} XTM</b>
            </div>
            <div>
              <span>Team</span>
              <b>{payroll.payeeCount} people</b>
            </div>
            <div>
              <span>Released</span>
              <b>
                {payroll.monthsReleased} of {payroll.months}
              </b>
            </div>
          </div>

          <div className="vault-foot">
            <Lock />
            Individual salaries are not in this view — or in the contract.
          </div>
        </div>
      </section>

      <section className="shell section">
        <div className="section-head">
          <p className="section-label">Two truths at once</p>
          <h2>
            Transparency is a feature.
            <br />
            <em>So is privacy.</em>
          </h2>
        </div>

        <div className="split">
          <div className="split-side private">
            <div className="split-title">
              <Lock size={16} />
              <h3>Stays private</h3>
            </div>
            <ul>
              <li>Every individual salary</li>
              <li>Names, roles and team structure</li>
              <li>Payment recipients and amounts</li>
              <li>Claim links and pay stubs</li>
            </ul>
            <p className="split-note">
              Salaries never touch the chain. The roster is committed as a hash, not published.
            </p>
          </div>
          <div className="split-side public">
            <div className="split-title">
              <Eye size={16} />
              <h3>Stays public</h3>
            </div>
            <ul>
              <li>Team size</li>
              <li>Total monthly payroll</li>
              <li>Runway, in months</li>
              <li>Release epochs and roster hash</li>
            </ul>
            <p className="split-note">
              Enough for anyone to check the payroll is funded, without learning who earns what.
            </p>
          </div>
        </div>
      </section>

      <section className="shell section how">
        <div className="section-head">
          <p className="section-label">How it works</p>
          <h2>
            Payroll you can prove.
            <br />
            <em>Not payroll you have to trust.</em>
          </h2>
        </div>
        <div className="steps">
          <div className="step">
            <span className="step-num">01</span>
            <h3>Commit the roster</h3>
            <p>
              Your team file is hashed in the browser. The contract receives the hash, the
              headcount and the monthly total — never the names or salaries.
            </p>
          </div>
          <div className="step">
            <span className="step-num">02</span>
            <h3>Lock the runway</h3>
            <p>
              Fund the committed months up front. The contract caps the total and refuses every
              early release, so the money cannot be pulled out from under the team.
            </p>
          </div>
          <div className="step">
            <span className="step-num">03</span>
            <h3>Pay privately</h3>
            <p>
              Each month unlocks one aggregate slice. The employer pays the team with native Tari
              stealth transfers. The chain sees the run, not the people.
            </p>
          </div>
        </div>
      </section>

      <section className="shell statement">
        <p>
          “Your team can prove you can pay them.{" "}
          <em>They still can’t see each other’s pay.</em>”
        </p>
        <span className="statement-by">The Steady principle</span>
      </section>

      <section className="shell final">
        <div className="cta-panel">
          <div>
            <p className="section-label dark">Start with the demo</p>
            <h2>
              Run a payroll
              <br />
              you can prove.
            </h2>
            <p>
              A complete employer dashboard, a public runway page and an employee claim flow — no
              wallet, no sign-up.
            </p>
          </div>
          <div className="cta-actions">
            <a className="btn btn-ink" href="#/demo">
              Open employer demo <Arrow />
            </a>
            <a className="btn btn-outline-ink" href="#/public">
              View public payroll
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
