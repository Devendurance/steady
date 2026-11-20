# Steady: guide for judges

**Private payroll with a public runway.** The contract publishes the aggregate; individual salaries never reach the chain.

Pick the depth you have time for. Nothing below needs a wallet or money.

## 1. Two minutes, in the browser

1. Open the [live app](https://devendurance.github.io/steady/).
2. On the landing page, the right-hand card is the **public view**: 3.0 months of runway, 5 people, a monthly total, and one month released. That is everything the chain knows.
3. Click **Open the demo**. This is the employer view. Change nothing; note that the salary column and names exist only in this browser. Click **Release month 2** and watch the runway fall by exactly one month.
4. Open **Public runway**. There are still no names and no salaries. Scroll to **Sealed roster**, click **Use the demo roster**, and the page hashes the team file to the same commitment shown on chain.
5. Open a **pay stub** from the team table. Claim it. The receipt is simulated here; on mainnet this is a native Tari stealth transfer.
6. Open **Mainnet proof**. The page reads the published component and its vault live from Tari's public indexer.

## 2. Ten minutes, on your machine, no money

Needs Rust with the WASM target.

```sh
git clone https://github.com/Devendurance/steady && cd steady
rustup target add wasm32-unknown-unknown
cargo test --test payroll          # 7 tests in the real Ootle engine
cargo build-wasm                   # 165 KiB WASM
```

The key tests:

- `employer_funds_and_releases_a_month_only_when_due` — one epoch early is refused; at the epoch, exactly one monthly slice leaves the vault.
- `only_the_employer_can_release_payroll` — an employee and a stranger are both refused.
- `funding_is_capped_at_the_committed_payroll` — one micro-TARI over the commitment is refused; partial funding still works.
- `each_month_releases_once_and_a_fourth_release_fails` — three monthly runs, then a fourth is refused.
- `info_exposes_only_public_aggregates` — the state contains headcount, totals, epochs and the roster hash; no salary or recipient.
- `constructor_rejects_bad_inputs` — zero/oversized budgets, months, payees and epochs, a past start epoch, and oversized strings are refused.

## 3. Verify the mainnet deployment (optional)

The mainnet proof page links the template, the component and the publish transaction on [Veil](https://explorer.tari.mw). The page also fetches the component substate and its vault from `https://indexer-a.ootle.tari.com` and decodes them in the browser.

To check the contract yourself, clone the repo and run `cargo test`. To reproduce the publish, use the official `tari_ootle_walletd` and `scripts/wallet.py`; the exact commands are in the [README](README.md).

## Where each claim is proven

| Claim | Code | How to check |
|---|---|---|
| Aggregate-only payroll state | `src/lib.rs` | `info()` returns no salary or recipient |
| Early withdrawal is impossible | `src/lib.rs` | `release_month` is the only outflow and is epoch-gated |
| Funding cannot exceed the commitment | `src/lib.rs` | `fund` cap, covered by engine tests |
| Only the employer can release | `src/lib.rs` | signer check, covered by engine tests |
| Real mainnet contract | `src/lib.rs` + deployment table | mainnet proof page, Veil |
| App reads live chain state | `web/src/lib/indexer.ts` | mainnet proof page |

## Limits

- The contract enforces the aggregate runway and schedule, not individual payment delivery. Payouts are native Tari stealth transfers made by the employer.
- Monthly total and headcount are public. With a tiny team those narrow the range of individual salaries.
- The roster hash is a commitment, not a zero-knowledge inclusion proof.
- The employer and claim flows in the demo are a simulation; the mainnet contract is real.
- No audit, no outside users, no claim of perfect anonymity.
