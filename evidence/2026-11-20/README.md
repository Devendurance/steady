# Mainnet evidence — 20 November 2026

Every file here is a walletd/RPC response or a request built with Tari's official transaction
builder. No private keys, seed words, wallet cookies or passwords are included.

## Deployment

- `publish-dry-run.json` — `transactions.publish_template` dry run; fee 1,144,236 µT.
- `publish-submit.json` — submitted publish transaction id.
- `publish-receipt.json` — finalized publish receipt. Template
  `template_54d64fdd5af8a40fe9331611e1f37f473c1bf670f32523e2b093d704e76e3983`, epoch 39096,
  fee 1,144,224 µT.

## Payroll run

`state.json` carries the template, component and all transaction ids.

- `create-dry-spec.json` / `create-spec.json` — request spec for `Payroll::new`.
- `create-dry-run.json` — engine dry run; `required_fees` 3,026 µT.
- `create-submitted.json` / `create-receipt.json` — finalized create transaction. Component
  `component_ac36d00612326df867f634b7e85772d7816ed15c664e01d0592da947b9323187`.
- `fund-dry-*.json`, `fund-spec.json`, `fund-submitted.json`, `fund-receipt.json` — fund 1.5 TARI
  (3 months at 0.5 TARI/month).
- `release-dry-*.json`, `release-spec.json`, `release-submitted.json`, `release-receipt.json` —
  release month 1 (0.5 TARI).

## Account funding

- `reveal-dry-run.json` / `reveal-submit.json` — the incoming 20 TARI stealth UTXO was revealed
  into the deploy account with a self-transfer. This created the account component and funded the
  vault; it is not part of the contest flow, but it is the first transaction from the deploy key.

## Roster

`roster.json` is the exact canonical team file whose SHA-256 is
`ecb8aadd4cd3548d1d1ba19c702ae2c0c7eeb8edf26c95a64275f9d49aad9c2c`, the `roster_hash` stored by
the component. The public page hashes it in the browser.
