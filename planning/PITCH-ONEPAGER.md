# Custos Nox — Grant/Bounty Pitch One-Pager

Reusable copy for grant applications, bounty submissions, and ecosystem program forms. Pull paragraphs as needed.

**Author:** Yana (cryptoyasenka, Kyiv) — solo. Background: open-source ML models on OpenGradient TEE hub (MEV, account abstraction, EigenLayer monitoring).

**Repo:** https://github.com/cryptoyasenka/custos-nox
**Live:** https://custos-nox.up.railway.app
**License:** MIT
**Tests:** 215 passing
**Last updated:** 2026-05-08

---

## One-sentence intro (≤5s parse)

Custos Nox is a real-time security monitor for Solana DAO multisigs — open-source, sub-second alerts, MIT licensed.

## Two-sentence pitch

Custos Nox is an open-source daemon that watches Solana governance accounts and Squads multisigs in real time, firing sub-second alerts to Discord, Slack, Telegram, and CLI when a config change matches a known attack pattern. It catches every step of the April 2026 Drift attack chain that drained $285M — timelock removal, multisig threshold reduction, privileged-nonce setup, and stale-nonce execution — plus an adjacent signer-rotation vector that has hit other Solana protocols.

## Problem

Solana Foundation's STRIDE program funds commercial monitoring for protocols with $10M+ TVL. The 99% below that line — small DAOs, grant committees, treasury multisigs, solo-builder wallets — have no real-time alerting and no budget for vendor monitoring. The Drift exploit was discoverable from public on-chain config changes hours before funds were drained; nobody was watching.

## Solution

Five detectors run on a single daemon, self-hostable in five minutes:

| Detector | Catches |
|---|---|
| TimelockRemovalDetector | Squads v4 + SPL Governance timelock dropped to zero or below half |
| MultisigWeakeningDetector | Squads v4 signer threshold reductions (e.g. 5-of-7 → 1-of-7) |
| SignerSetChangeDetector | Squads v4 members vector mutated (rotation/eviction = HIGH, addition = MEDIUM) |
| PrivilegedNonceDetector | System Program nonce account initialized or authority rotated |
| StaleNonceExecutionDetector | Durable nonce advanced significantly after init (pre-signed tx executes) |

Alerts fan out in parallel; detector throws and webhook 429/5xx are handled gracefully (low-severity ops alert, exponential backoff, `Retry-After` honored). WebSocket supervisor reconnects with backoff after dropped connection or failed slot health check; baseline state fetched before subscribing so first change after startup is always diffed correctly.

## Traction

- 215 tests passing on `main`
- Devnet smoke harness reproduces the full Drift attack chain end-to-end on-chain
- Live mainnet daemon deployed on Railway monitoring publicly-known Solana DAO multisigs
- Submitted to Solana Frontier Hackathon (Colosseum) + Ukrainian Sidetrack 2026

## Vision (scaling)

Default watchlist for Solana DAO operators ("you can't run a multisig without it"). Long-term: SDK for plugging custom detectors, signed alert provenance, multi-chain (EVM Safe + Cosmos multisigs).

## Monetization / sustainability

Public good. Free forever. Costs covered by ecosystem grants (Solana Foundation, Helius credits, Superteam Ukraine, Public Goods rounds). No paid tiers planned.

## Why this is grant-worthy

- **Public good:** MIT license, self-host, no token, no extraction
- **Ecosystem-aligned:** uses Helius RPC, monitors Squads v4 + SPL Governance — built on Solana primitives
- **Filling a real gap:** STRIDE covers $10M+ TVL only; everyone else has nothing
- **Drift-shaped:** specifically catches the most expensive Solana exploit of 2026

## Tech stack

TypeScript, Solana web3.js, Helius WebSocket RPC, Docker, Railway deploy, dashboard in Next.js (static).

## Audiences for go-to-market

- Squads operators (`/multisig-monitoring` Discord channel-of-record)
- Realms / SPL Governance DAO operators
- Solana grant committees (Helius, Squads, Marinade, Jito grants)
- Solo Solana developers managing treasury multisigs

## Competitor landscape

- **Sec3 / Sentinel / OtterSec / Trail of Bits:** vendor monitoring for protocols with $10M+ TVL, paid, closed-source.
- **STRIDE (Solana Foundation):** funds commercial monitoring for the same TVL bracket.
- **Open-source / self-host / under-$10M-TVL:** Custos Nox is the only entrant.

## Reusable taglines

- "Sub-second alerts on Solana DAO config changes — open-source, MIT, self-host in 5 min."
- "Built for the 99% below STRIDE's $10M TVL line."
- "Catches every step of the Drift attack chain. Free forever."

## Reusable bullet for short forms

> Real-time Solana DAO/multisig security monitor. 5 detectors mapped to the Drift April 2026 attack chain. Open-source TypeScript daemon, self-host in 5 min, sub-second alerts to Discord/Slack/Telegram. MIT license, 215 tests passing, live on Railway. Built solo to fill the gap STRIDE leaves below $10M TVL.
