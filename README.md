# Steady

**Private payroll with a public runway.** Pay your team in TARI without publishing everyone's salary.

[Live app](https://devendurance.github.io/steady/) · [Public runway](https://devendurance.github.io/steady/#/public) · [Mainnet proof](https://devendurance.github.io/steady/#/mainnet) · **[Guide for judges](JUDGES.md)**

## The idea

Public blockchains are bad at payroll. A normal transfer publishes who got paid and how much, forever. Teams work around it with spreadsheets and trust.

Steady splits the problem in two:

- **The aggregate is public.** Anyone can verify the team size, the monthly payroll total, how many months are funded, and when each monthly run happened.
- **The individual is private.** Salaries and recipients never touch the contract. The roster is committed as a SHA-256 hash, not published. Payouts are native Tari stealth transfers.

The employer funds the committed payroll up front. The contract releases exactly one monthly slice at or after each month's epoch, and only to the employer key. The employer cannot withdraw early. That is the runway: transparency where it builds trust, privacy where it matters.

## What is on chain

The `Payroll` component stores:

- the employer public key;
- a TARI vault;
- the monthly aggregate budget and the number of committed months;
- the headcount;
- the start epoch and epochs per month;
- how many months have been released;
- a roster hash;
- a label.

It does **not** store names, roles, individual salaries, payment recipients, or claim links. Those live in the employer's browser and in native Tari stealth transfers.

## Contract rules

- `new(monthly_budget, months, payee_count, start_epoch, epochs_per_month, roster_hash, label)` — the transaction signer becomes the employer.
- `fund(bucket)` — anyone may top up, but total funding can never exceed `monthly_budget * months`.
- `release_month()` — employer only; the month must be due; the vault must hold at least one monthly budget; returns the released bucket for deposit.
- `info()` — public aggregates only.
- No owner, no admin, no upgrade path. Rules are locked at creation.

## Tests

Seven engine tests run against the real Ootle engine in-process:

```sh
rustup target add wasm32-unknown-unknown
cargo test --test payroll
```

Covered: release only when due, employer-only release, funding cap, partial funding, underfunded release refusal, exactly-once monthly release, aggregate-only `info`, and constructor input validation.

## Build

```sh
cargo build-wasm
# target/wasm32-unknown-unknown/release/steady.wasm (165 KiB)
```

Published against `tari_template_lib` 0.41.0 / Ootle engine 0.54.0.

## App

`web/` is a Vite + React + TypeScript app. It has no backend and holds no keys.

- **Employer demo** (`#/demo`): runway, team, private salaries, release and top-up actions, roster download.
- **Public view** (`#/public`): aggregates, runway strip, roster-hash verifier, release history.
- **Pay stub** (`#/claim/<id>`): an employee claim flow, simulated in the browser.
- **Mainnet proof** (`#/mainnet`): reads the published component and its vault live from Tari's public indexer.

```sh
cd web
pnpm install
pnpm dev
pnpm build
```

Every push to `main` deploys `web/dist` to GitHub Pages.

## Mainnet deployment

Published **20 November 2026, 18:24:14 UTC**, epoch **39096**.

| Item | Value |
|---|---|
| Network | Tari Ootle mainnet |
| Template | `template_54d64fdd5af8a40fe9331611e1f37f473c1bf670f32523e2b093d704e76e3983` |
| Component | `component_ac36d00612326df867f634b7e85772d7816ed15c664e01d0592da947b9323187` |
| Publish tx | `3acf52a95f15b82eabc89915b060e743c03bf06786067467e658d3c4f0798cbf` |
| Publish fee | 1.144224 TARI |

The proof run created the payroll, funded 1.5 TARI (3 months at 0.5 TARI/month), and released
month 1. Live state after the run: 1.0 TARI in the vault, 5 people, 3 months committed, 1
released, runway 2.0 months, roster hash `ecb8aadd…`. The proof page reads these values straight
from `indexer-a.ootle.tari.com`.

| Step | Transaction |
|---|---|
| Create payroll | `9b6d40087ee796fa9f3cf37cacf798b55c4cd06246a535d7de8585ce7c5dddbe` |
| Fund 1.5 TARI | `7de7dd8959652a7e324a7ae197f850f34a454b62dfa69f74e990b220ac1d793f` |
| Release month 1 | `b0402fedca3d0e52cb6ebfa571981c5dad8a29708cf0944afd8c65d03064ba6f` |

## Privacy model and limits

- The contract enforces the **aggregate** runway and the release schedule. It does not enforce that every employee is paid a specific amount; that remains the employer's job and is why payouts use stealth transfers.
- The monthly total and headcount are public by design. With a very small team, those aggregates narrow the range of individual salaries even though no salary is stored.
- The roster hash proves a team file later; it is not a zero-knowledge proof of inclusion.
- The demo is a browser simulation. Mainnet publication and a funded run are separate, verifiable steps.
- No external audit and no outside users are claimed.

## Licence

MIT. The indexer helper in `web/src/lib/indexer.ts` is adapted from the MIT-licensed [Semvi](https://github.com/emmaGH1/semvi) indexer module. Built with AI assistance.
