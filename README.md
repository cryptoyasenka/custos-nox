# Custos

Open-source real-time monitor for Solana multisigs and DAOs. Detects the attack chain that drained $285M from Drift on April 1, 2026.

## What it catches

Four detectors run 24/7 against your Squads multisig or SPL Governance realm:

- **TimelockRemovalDetector** — alerts when a governance timelock is removed or bypassed
- **MultisigWeakeningDetector** — alerts on signer threshold reductions (e.g. 5/5 → 2/5)
- **PrivilegedNonceDetector** — alerts when an authority creates a durable nonce account
- **StaleNonceExecutionDetector** — alerts when a pre-signed transaction older than N hours executes

Alerts fan out to Discord, Slack, webhook, or CLI.

## Positioning

Solana Foundation's STRIDE program funds commercial monitoring for protocols with $10M+ TVL. Custos is for the 99% below that line — small DAOs, grant committees, treasury multisigs, solo-builder wallets. Self-host in five minutes. MIT licensed.

## Status

Pre-release. Built for the Solana Frontier Hackathon (submission 2026-05-11).
First detector lands on devnet late April 2026.

## Quick start

See [DEV-ENV-SETUP.md](./DEV-ENV-SETUP.md).

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md).

## License

MIT. See [LICENSE](./LICENSE).
