# Dev environment setup

## Prerequisites

- Node 20+ (`node -v`)
- pnpm 9+ (`npm i -g pnpm`)
- Solana CLI 1.18+ — https://docs.anza.xyz/cli/install
- A Helius account — https://helius.dev (free tier: 1M credits/month, 10 RPS)

## Clone and install

```bash
git clone https://github.com/cryptoyasenka/custos.git
cd custos
pnpm install
```

## Environment

```bash
cp .env.example .env
# HELIUS_API_KEY=...
# DISCORD_WEBHOOK_URL=... (optional)
# SLACK_WEBHOOK_URL=... (optional)
```

Never commit `.env`. It is in `.gitignore`.

## Devnet wallet

```bash
solana-keygen new --outfile ~/.config/solana/custos-dev.json
solana config set --keypair ~/.config/solana/custos-dev.json --url devnet
solana airdrop 2
```

## Run

```bash
pnpm dev       # daemon on devnet, watches demo multisig
pnpm test      # vitest unit tests
pnpm lint      # biome
pnpm build     # tsc emit to dist/
```

## Devnet demo multisig

Phase 1 ships a script `scripts/spin-demo-multisig.ts` that creates a 3-of-5 Squads on devnet for local detector testing.

## Troubleshooting

- `ECONNREFUSED` on WebSocket → wrong Helius key or URL. Check `.env`.
- `Insufficient SOL` on devnet → `solana airdrop 2` (max 2 per 8h).
- Rate limit → Helius free tier is 10 RPS. Backoff is automatic; lower subscription count if persistent.

## Not yet wired

- GitHub Actions CI (Phase 2)
- Dashboard dev server (v2)
- Mainnet config profile (opt-in, Phase 3 after beta)
