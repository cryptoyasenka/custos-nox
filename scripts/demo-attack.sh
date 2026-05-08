#!/usr/bin/env bash
# F3 Tech Demo — attacker terminal (Terminal 1)
# Run AFTER the daemon is live in Terminal 2.

set -euo pipefail
cd "$(dirname "$0")/.."

PDA="9FcLMW5fF2VRemKQPjvSB9nV4ANCTdktZ7RcwmjHDWsD"

echo ""
echo "┌─────────────────────────────────────────────────┐"
echo "│  CUSTOS NOX — devnet attack chain replay        │"
echo "│  Watching: Squads multisig + durable nonce      │"
echo "└─────────────────────────────────────────────────┘"
echo ""
sleep 3

# ── Step 1: Timelock removal ──────────────────────────
echo "$ npm run smoke:timelock -- $PDA"
npm run smoke:timelock -- "$PDA"
echo ""
sleep 9   # wait for chain confirmation + daemon alert

# ── Step 2: Multisig weakening ────────────────────────
echo "$ npm run smoke:weaken -- $PDA"
npm run smoke:weaken -- "$PDA"
echo ""
sleep 9

# ── Step 3: Privileged nonce init ─────────────────────
echo "$ npm run smoke:nonce-init"
npm run smoke:nonce-init
echo ""
sleep 9

# ── Tests ─────────────────────────────────────────────
echo "$ npm test --silent"
npm test --silent 2>&1 | tail -4
echo ""
sleep 2

echo "github.com/cryptoyasenka/custos-nox"
