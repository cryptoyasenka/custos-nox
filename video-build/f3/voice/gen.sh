#!/usr/bin/env bash
# F3 Tech Demo — voiceover generation (TECH-DEMO-SCRIPT-F3.md v4, 2026-05-08).
# 17 chunks: 16 main narration + 1 architecture overlay (03b) for CapCut overlay 0:45–0:55.
# Run: cd video-build/f3/voice && bash gen.sh
set -e

VOICE="en-US-AriaNeural"
RATE="+0%"

mkdir -p "$(dirname "$0")"
cd "$(dirname "$0")"

echo "→ Generating F3 voiceover (17 chunks, voice=$VOICE)..."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 01-intro.mp3 \
  --text "DAOs — decentralized organizations on Solana — manage their funds through multisig wallets. A multisig works like a company bank account that requires multiple signatures: three out of five people must approve before any money moves. Squads is the most popular multisig tool on Solana — hundreds of DAOs, grant committees, and protocol treasuries use it. And right now, most of them have zero monitoring. In April 2026 that cost one protocol two hundred eighty-five million dollars."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 02-drift-timeline.mp3 \
  --text "The Drift attack wasn't a sudden hack. The attacker spent nine days making config changes — in full public view, on-chain. No tool sent a single alert. Custos Nox is that tool."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 03-detectors.mp3 \
  --text "Five detectors running today. Four of them map to one step each in the Drift attack chain. The fifth covers an adjacent attack vector that has hit other Solana protocols. Timelock removal. Multisig weakening. Privileged nonce. Stale nonce execution. Any single one firing would have given the DAO days to respond."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 03b-architecture.mp3 \
  --text "WebSocket subscription to Solana RPC. Five detectors run in parallel on every event. When one fires, fan-out to Discord, Slack, and console — none of them block the others. Sub-second alert latency end to end."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 04-terminals-intro.mp3 \
  --text "Left terminal — Custos Nox, watching a Squads multisig on devnet. That's the DAO's security monitor. Right terminal — me, playing the attacker. Same steps, same order as Drift. Watch the left terminal."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 05a-timelock-setup.mp3 \
  --text "The attacker's first move: remove the governance timelock. The timelock is the DAO's reaction window — the time the community has to notice something is wrong and respond."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 05b-timelock-result.mp3 \
  --text "CRITICAL. Timelock gone. No buffer left for the DAO."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 06a-weaken-setup.mp3 \
  --text "Next: weaken the multisig. Change the rule from three people must approve to one person must approve. The treasury is now under single-signer control."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 06b-weaken-result.mp3 \
  --text "HIGH. Three-of-five dropped to one-of-five. The attacker can now approve any transaction alone."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 07a-nonce-setup.mp3 \
  --text "Third: create a durable nonce under an attacker-controlled key. This lets you pre-sign a transaction that stays valid forever — and execute it whenever you want. This is the moment the drain was armed."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 07b-nonce-result.mp3 \
  --text "CRITICAL. Pre-signed drain transaction is now live and waiting."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 08a-rotate-setup.mp3 \
  --text "And one more — not from the Drift attack specifically, but from similar exploits: the attacker silently swaps out a legitimate co-signer for their own key. The threshold looks the same. The quorum is not."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 08b-rotate-result.mp3 \
  --text "HIGH. Legitimate signer evicted, attacker key added."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 09-discord.mp3 \
  --text "This is what the DAO team would see in Discord. Not a log file — a clear alert with severity level, exactly what changed, and a direct link to the transaction on Solscan. If Drift had this running on March twenty-third, that first CRITICAL alert would have landed nine days before the drain. Discord, Slack, and terminal all fire simultaneously. One failing webhook never blocks the others."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 10-stale-test.mp3 \
  --text "The fourth Drift-chain detector catches the drain itself — when the pre-signed transaction executes from a stale nonce. Fourteen unit tests cover the exact Drift pattern, all green."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 11-install.mp3 \
  --text "How does a DAO actually set this up? Step one: open app dot squads dot so — your multisig address, the P D A, is visible right there. Copy it. Step two: paste it into one line in the config — CUSTOS WATCH equals your P D A. Step three: add a Discord or Slack webhook U R L. Run N P M run dev. That's it. From that moment, any config change on your multisig — threshold, signers, timelock, nonce — fires an alert to your team within a second. Free Helius R P C. M I T licensed. No paid tiers. No vendor lock-in."

edge-tts --voice "$VOICE" --rate "$RATE" --write-media 12-close.mp3 \
  --text "Solana Foundation's STRIDE program covers protocols above ten million in TVL — about fifty protocols. The other ten thousand DAO treasuries, grant multisigs, and community funds on Solana have nothing. Custos Nox is for them. github dot com slash cryptoyasenka slash custos hyphen nox."

echo "✓ Done. 17 mp3 files in $(pwd)"
ls -la *.mp3
