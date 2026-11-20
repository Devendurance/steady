# Steady — submission kit

Prepared submission for the Tari November Build Contest. Replace the two placeholders before posting.

- **Tari L1 payout address:** `YOUR_TARI_L1_ADDRESS`
- **Public social announcement URL:** `YOUR_SOCIAL_POST_URL`

Everything else is live and verifiable.

---

## November MVP entry (reply to thread 520)

**Steady — private payroll with a public runway**

Public blockchains are bad at payroll: a normal transfer publishes who got paid and how much, forever. Steady splits the problem in two. The aggregate is public — team size, monthly payroll total, months funded, release epochs, roster hash. The individual is private — salaries, names and recipients never touch the contract. Payouts are native Tari stealth transfers.

An employer commits a monthly budget and a number of months, funds the payroll up front, and the contract releases exactly one monthly slice at or after each month's epoch, only to the employer key. Early withdrawal is impossible. That is the runway: transparency where it builds trust, privacy where it matters.

**Code (MIT):** https://github.com/Devendurance/steady
**MVP app (no wallet):** https://devendurance.github.io/steady/
**Public runway view:** https://devendurance.github.io/steady/#/public
**Mainnet proof:** https://devendurance.github.io/steady/#/mainnet

**Why it is new**
- No entry in either November thread covers payroll, and none combines a time-locked aggregate vault with a public runway and private individual pay.
- The contract stores a roster *hash* and aggregates only. It has no owner, no admin and no upgrade path.
- The app reads the published component and its vault live from Tari's public indexer.

**What is on mainnet**
- Template published 20 Nov 2026, 18:24:14 UTC, epoch 39096:
  https://explorer.tari.mw/tx/3acf52a95f15b82eabc89915b060e743c03bf06786067467e658d3c4f0798cbf
- Component: `component_ac36d00612326df867f634b7e85772d7816ed15c664e01d0592da947b9323187`
- A real payroll run: created, funded with 1.5 TARI (3 months), and month 1 released. The vault now holds 1.0 TARI, runway 2.0 months.
  - Create: https://explorer.tari.mw/tx/9b6d40087ee796fa9f3cf37cacf798b55c4cd06246a535d7de8585ce7c5dddbe
  - Fund: https://explorer.tari.mw/tx/7de7dd8959652a7e324a7ae197f850f34a454b62dfa69f74e990b220ac1d793f
  - Release: https://explorer.tari.mw/tx/b0402fedca3d0e52cb6ebfa571981c5dad8a29708cf0944afd8c65d03064ba6f

**Tests:** seven engine tests run against the real Ootle engine (`cargo test --test payroll`). They cover release timing, employer-only authorization, the funding cap, underfunded refusal, exactly-once monthly release, aggregate-only `info`, and constructor validation.

**Tari payment address:** `YOUR_TARI_L1_ADDRESS`
**Public announcement:** `YOUR_SOCIAL_POST_URL`

**Limits, stated plainly**
- The contract enforces the aggregate runway and schedule, not individual payment delivery. Payouts are native stealth transfers made by the employer.
- Monthly total and headcount are public. With a very small team those narrow the range of individual salaries.
- The roster hash is a commitment, not a zero-knowledge inclusion proof.
- The employer and claim flows in the demo are a browser simulation. The mainnet contract and the funded run are real.
- No external audit and no outside users are claimed. Built with AI assistance.

---

## First-to-Launch bonus (reply to thread 521)

**Steady is published and running on Ootle mainnet**

November MVP entry: **[insert thread 520 post URL]**

- Template `54d64fdd5af8a40fe9331611e1f37f473c1bf670f32523e2b093d704e76e3983`, published **2026-11-20 18:24:14 UTC**, epoch 39096:
  https://explorer.tari.mw/tx/3acf52a95f15b82eabc89915b060e743c03bf06786067467e658d3c4f0798cbf
- Live app, configured for mainnet and reading the component directly from the public indexer:
  https://devendurance.github.io/steady/#/mainnet
- Funded payroll run on mainnet:
  - create https://explorer.tari.mw/tx/9b6d40087ee796fa9f3cf37cacf798b55c4cd06246a535d7de8585ce7c5dddbe
  - fund https://explorer.tari.mw/tx/7de7dd8959652a7e324a7ae197f850f34a454b62dfa69f74e990b220ac1d793f
  - release https://explorer.tari.mw/tx/b0402fedca3d0e52cb6ebfa571981c5dad8a29708cf0944afd8c65d03064ba6f
- Component: `component_ac36d00612326df867f634b7e85772d7816ed15c664e01d0592da947b9323187`
- All requests, reports and receipts: https://github.com/Devendurance/steady/tree/main/evidence

Tari payment address: `YOUR_TARI_L1_ADDRESS`

Please consider Steady for First to Launch. Eligibility and ranking are the organizers' call.

---

## Social announcement

### Bluesky (under 300 characters)

> Payroll on a public chain leaks every salary. Steady is private payroll with a public runway: the team size, monthly total and months funded are verifiable; salaries and recipients never touch the chain.
>
> Live on @tari (Ootle mainnet) → https://devendurance.github.io/steady/
>
> #Tari #Ootle #BuildOnTari

### Reddit r/tari

**Title:** Steady — private payroll with a public runway, live on Ootle mainnet

**Body:**

I built Steady for the Tari November Build Contest (MVP theme). The idea: payroll needs two things that public chains usually conflate — enough transparency to trust the runway, and enough privacy to keep salaries private.

Steady locks the committed payroll in a vault. The contract publishes the team size, monthly total, months funded and release epochs. It stores a roster hash, not names or salaries. Each month unlocks one aggregate slice for the employer, who pays the team with native Tari stealth transfers. The employer cannot withdraw early.

- Live app: https://devendurance.github.io/steady/
- Code (MIT): https://github.com/Devendurance/steady
- Mainnet proof: https://devendurance.github.io/steady/#/mainnet

Published on Ootle mainnet at epoch 39096 and ran a real 3-month payroll with month 1 released. Seven engine tests cover the release rules. Happy to answer questions.

---

## Before posting

1. Insert the Tari L1 payout address and the public social URL.
2. Post the thread 520 entry once, then insert its URL into the thread 521 draft.
3. Post the thread 521 bonus claim once.
4. Keep one post per submission; edit rather than duplicate.
