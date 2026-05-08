# SF Ukraine Grants — Paste-Ready Application
# URL: https://earn.superteam.fun/grants/solana-foundation-ukraine-grants
# Created: 2026-05-05 | Avg grant: $2,901 | Response: ~7 days

---

## PROJECT NAME
Custos Nox

---

## ONE-LINE DESCRIPTION
Open-source attack detection for Solana multisigs and DAOs

---

## PROJECT DESCRIPTION (paste into the main form field)

In April 2026, Drift Protocol lost $285M to an attack that spent days setting up on-chain before executing. Three governance config changes — timelock removal, multisig weakening, privileged-nonce creation — happened in full public view. No tool alerted anyone.

Solana Foundation's STRIDE monitoring program targets protocols with $10M+ TVL. The other 99% — small DAOs, grant committees, treasury multisigs — have nothing.

Custos Nox is an open-source TypeScript daemon that watches Solana accounts over WebSocket and fires alerts the moment a config change matches a known attack pattern. Five detectors are live today:

• TimelockRemovalDetector — fires when a governance timelock drops to zero (Squads v4 + SPL Governance).
• MultisigWeakeningDetector — fires when a Squads v4 signer threshold is reduced (e.g. 5-of-7 → 1-of-7).
• PrivilegedNonceDetector — fires when a durable nonce account is initialized or has its authority rotated.
• StaleNonceExecutionDetector — fires when a pre-signed drain tx finally lands (the moment of the Drift attack itself).
• SignerSetChangeDetector — fires when a multisig's members vector is mutated.

Four of the five detectors map directly to one step each in the Drift attack chain. Any single alert would have bought hours of response time.

Live dashboard: https://custos-nox.up.railway.app
GitHub (MIT): https://github.com/cryptoyasenka/custos-nox
205 tests, CI green. Self-host in 5 minutes with one Helius free-tier key.

---

## WHY WE NEED FUNDING (paste if asked "project is open-source, why do you need a grant?")

Custos Nox is a public good — MIT licensed, self-hosted, no paid tiers. Every team deploys on their own infrastructure with their own Helius key. There are zero infrastructure costs for the author.

The grant covers developer time only:
1. Outreach to real Squads multisig operators so the tool actually gets used
2. Web dashboard improvements so non-technical DAO teams can configure watching without CLI
3. Hosted alert feed (API mode) — for teams that can't run a daemon themselves

Goal: 10+ real DAOs actively using Custos Nox by the end of the grant period.

---

## MILESTONE PLAN + BUDGET (ask for $2,500–$3,000)

### Milestone 1 — Adoption & Docs ($800, 2 weeks)
- Onboarding guide for non-technical DAO teams (Notion or GitHub Wiki)
- Direct outreach to 10 Squads multisig operators on Discord/X
- Minimum 2 real deployments confirmed (screenshots or GitHub issues as proof)

### Milestone 2 — Dashboard v2 + API mode ($1,200, 4 weeks)
- Web UI for configuring watched accounts (no CLI needed)
- API endpoint that streams alerts — teams without a server can poll instead of self-hosting
- Mainnet pre-seeded watchlist: top-50 Squads multisigs by TVL

### Milestone 3 — Mainnet Hardening ($500, 6 weeks)
- Mainnet stress test: 48h continuous monitoring of real multisigs
- Fix any false positives / missed events found during stress test
- Public incident report if any real attack-precursor is caught

**Total requested: $2,500**
(Can adjust down to $1,500 if the committee prefers a smaller first grant)

---

## LINKS (paste as-is)

GitHub: https://github.com/cryptoyasenka/custos-nox
Live demo: https://custos-nox.up.railway.app
X: https://x.com/CustosNox

---

## CATEGORY / TRACK
Developer Tooling + DAO Tooling

---

## WALLET
Use the same Solana wallet as your Superteam Earn profile (yasya_eth)

---

## STATUS AFTER SUBMIT
[ ] Submitted (note date here)
[ ] Response received (note date + verdict here)
