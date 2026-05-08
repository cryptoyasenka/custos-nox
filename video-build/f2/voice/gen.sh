#!/usr/bin/env bash
# F2 Pitch — voiceover generation (PITCH-SCRIPT-F2.md v3, 2026-05-08).
# 9 chunks, one per slide of deck-v2.html (was 8 in v2 — v3 adds team slide).
# Run: cd video-build/f2/voice && bash gen.sh
set -e

VOICE="en-US-AriaNeural"
RATE="+0%"

mkdir -p "$(dirname "$0")"
cd "$(dirname "$0")"

echo "→ Generating F2 voiceover (9 chunks, voice=$VOICE)..."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media slide-1.mp3 \
  --text "Custos Nox is a real-time security monitor for Solana DAO multisigs — open-source, sub-second alerts, M I T licensed. DAOs on Solana hold their treasuries through multisig wallets — three-of-five signatures, like a corporate bank account. Last April, one of them lost two hundred eighty-five million dollars in twelve minutes. Nine days of on-chain preparation. Zero alerts fired."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media slide-2.mp3 \
  --text "Chainalysis traced the attack. Every config change was visible on-chain for nine days — the approval threshold was lowered, safety delays removed, a drain transaction pre-armed. The DAO had no tool watching. Nothing flagged it."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media slide-3.mp3 \
  --text "Solana Foundation's STRIDE program monitors fifty protocols above ten million in TVL. The other ten thousand have nothing."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media slide-4.mp3 \
  --text "Custos Nox. Open-source TypeScript daemon. One detector per step in the Drift chain — plus one for adjacent attacks. Any single alert would have bought hours of response time."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media slide-5.mp3 \
  --text "It's built. Over two hundred tests, sub-second alert latency, M I T licensed. If Drift had this on March twenty-third, the first CRITICAL alert would have fired nine days before the drain."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media slide-6.mp3 \
  --text "Five minutes to set up. Copy your Squads P D A, set one env variable, run N P M. No paid tiers ever — Public Goods Award sustainability, covered by Solana Foundation grant and Superteam Ukraine."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media slide-7.mp3 \
  --text "v1 lives today, self-hosted, free forever. v2 hosted alert feed. v3 mainnet watchlist for the whole ecosystem."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media slide-8.mp3 \
  --text "Custos Nox is built solo by Yana — a Solana developer based in Kyiv, with a background in Web3 security tooling. Three open-source security models published on the OpenGradient T E E hub: MEV sandwich detection, account-abstraction safety, and EigenLayer monitoring. All free, all live. Custos Nox follows the same line — built as a public good, free forever."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media slide-9.mp3 \
  --text "github dot com slash cryptoyasenka slash custos hyphen nox. STRIDE covers fifty. Ten thousand DAOs have nothing. Custos Nox is for them."

echo "✓ Done. 9 mp3 files in $(pwd)"
ls -la *.mp3
