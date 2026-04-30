# Security Policy

## Supported versions

Custos Nox is pre-release. Security fixes are applied to the latest commit on `main`.

## Reporting a vulnerability

If you find a security vulnerability in Custos Nox itself (not the protocols it monitors),
please **do not open a public GitHub issue**.

Email: **cryptoyasenka@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You will receive a response within 48 hours. Critical issues are patched within 7 days.

## What Custos Nox does NOT do

- It does not hold private keys or sign transactions
- It does not have write access to any on-chain accounts
- It is read-only: it subscribes to account changes via WebSocket RPC
- Alerts go to webhooks you configure — Custos Nox has no access to your Discord/Slack
  except through the webhook URL you provide in your `.env`

## Secrets in `.env`

Your `.env` file contains:
- `CUSTOS_RPC_URL` — your Helius (or other) RPC endpoint with API key
- `CUSTOS_DISCORD_WEBHOOK` / `CUSTOS_SLACK_WEBHOOK` — webhook URLs

These are never logged or transmitted anywhere except to the configured sinks.
The `.env` file is in `.gitignore`. Never commit it.

The startup log line prints only the RPC host (e.g. `mainnet.helius-rpc.com`),
never the full URL with the API key in the path or query string. See
`redactRpcUrl` in `src/daemon.ts`.

## Threat model

Custos Nox is a passive observer. It reads account state from an RPC node and
fires alerts. The attack surface is:

1. **RPC endpoint compromise** — if your Helius API key is leaked, an attacker can
   read the same on-chain data Custos Nox reads. There is no additional risk beyond
   what the RPC key already provides.

2. **Webhook URL leakage** — if your Discord/Slack webhook URL is leaked, an attacker
   can send fake alerts to your channel. Custos Nox does not authenticate outbound
   webhooks. Treat webhook URLs as secrets.

3. **Supply chain** — dependencies are pinned via `package-lock.json`. Run
   `npm audit` before deploying in production. See "Tracked advisories" below
   for the moderate-severity advisories we have evaluated and chosen not to
   patch yet.

## Tracked advisories

### GHSA-w5hq-g745-h8pq — `uuid<14.0.0` buffer-bounds CVE

Reaches the project transitively via
`@solana/web3.js` → `jayson` + `rpc-websockets` → `uuid`. Surfaces as 5 moderate
advisories on `npm audit`.

The vulnerable code path is the `v3` / `v5` / `v6` generators when called with a
caller-supplied `buf` argument. We verified in `node_modules/@solana/web3.js`
that the SDK calls `uuid()` with no `buf` argument (default `v4`, random IDs),
so the vulnerable branch is not invoked from any code path Custos Nox uses.

We intentionally do not run `npm audit fix --force` because it downgrades
`@solana/web3.js` to `0.9.2`, which is incompatible with the rest of the SDK
surface. Resolution will come when the project migrates to `@solana/web3.js v2`
once it reaches stable.

CI runs `npm audit --omit=dev --audit-level=high`, which fails on `high` /
`critical` but lets `moderate` advisories through by design.

Watch [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
for upstream resolution.
