# Architecture

## Components

```
Helius RPC           Event Ingestor       Detector Plugins       Alert Fan-out
WebSocket       ───→ deserialize,    ───→ 4 at MVP,         ───→ Discord, Slack,
(devnet/main)        filter by program    independent, pure       webhook, CLI
```

## Watched programs (MVP)

| Program | Address | Why |
|---|---|---|
| Squads v4 | `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf` | Multisig config changes, threshold, signer set |
| SPL Governance | `GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw` | Realm config, timelock, voter weight |
| System Program | `11111111111111111111111111111111` | `AdvanceNonceAccount` ix for durable nonces |

Addresses verified against Solana mainnet as of 2026-04. Update if programs redeploy.

## Detector plugin contract

```ts
interface Detector {
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  inspect(event: SolanaEvent): Promise<Alert | null>;
}
```

Each detector is pure (no shared state), takes a deserialized Solana event, returns an `Alert` or `null`. Tests are table-driven.

## Alert contract

```ts
interface Alert {
  detector: string;
  severity: Detector['severity'];
  subject: string;              // "Timelock removed on realm XYZ"
  txSignature: string;
  cluster: 'mainnet' | 'devnet' | 'testnet';
  timestamp: number;
  explorerLink: string;
  context: Record<string, unknown>;
}
```

Fan-out is pluggable. MVP channels: Discord webhook, Slack webhook, generic HTTP POST, stdout.

## Config

Single YAML per deployment, user-controlled:

```yaml
rpc:
  endpoint: wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
watch:
  - multisig: <squads-pda>
    channels: [discord, slack]
  - realm: <spl-governance-pda>
    channels: [webhook]
thresholds:
  stale_nonce_hours: 48
```

No secrets stored by Custos. Webhook URLs are user-owned.

## Deploy targets

- **Daemon:** Fly.io or Render free tier (24/7 Node process)
- **Dashboard:** Vercel (Next.js, v2 scope)
- **CI:** GitHub Actions

## Out of MVP scope

- Multi-tenant SaaS
- Dashboard web UI (text alerts first, UI in v2)
- Collateral-risk scorer (Drift fell partly because of washed CVT — v2)
- Historical replay UI (CLI replay in MVP)
- SAS on-chain attestation (v3)
