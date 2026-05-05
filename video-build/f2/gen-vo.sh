#!/usr/bin/env bash
# gen-vo.sh — генерирует vo-f2.mp3 из чанков с точными паузами
# Запуск: из папки video-build/f2/ → bash gen-vo.sh
set -e
VOICE="en-US-AriaNeural"
CDIR="chunks"
OUT="vo-f2.mp3"
mkdir -p "$CDIR"

echo "→ Generating VO chunks (22 calls to edge-tts)..."
edge-tts --voice "$VOICE" --text "March twenty-third, twenty-twenty-six. Nine days before the drain."   --write-media "$CDIR/c01.mp3"
edge-tts --voice "$VOICE" --text "An attacker initialized a privileged durable nonce on Solana mainnet." --write-media "$CDIR/c02.mp3"
edge-tts --voice "$VOICE" --text "Nobody noticed."                                                        --write-media "$CDIR/c03.mp3"
edge-tts --voice "$VOICE" --text "March twenty-sixth — governance timelock dropped to zero."              --write-media "$CDIR/c04.mp3"
edge-tts --voice "$VOICE" --text "Nobody noticed."                                                        --write-media "$CDIR/c05.mp3"
edge-tts --voice "$VOICE" --text "March twenty-sixth — multisig threshold weakened."                      --write-media "$CDIR/c06.mp3"
edge-tts --voice "$VOICE" --text "Nobody noticed."                                                        --write-media "$CDIR/c07.mp3"
edge-tts --voice "$VOICE" --text "April first."                                                           --write-media "$CDIR/c08.mp3"
edge-tts --voice "$VOICE" --text "Two hundred eighty-five million dollars."                               --write-media "$CDIR/c09.mp3"
edge-tts --voice "$VOICE" --text "Gone. In twelve minutes."                                               --write-media "$CDIR/c10.mp3"
edge-tts --voice "$VOICE" --text "Every single step was publicly visible on Solana mainnet. All four. In sequence. For nine days." --write-media "$CDIR/c11.mp3"
edge-tts --voice "$VOICE" --text "There just wasn't anyone watching."                                     --write-media "$CDIR/c12.mp3"
edge-tts --voice "$VOICE" --text "Solana Foundation's STRIDE program covers protocols above ten million TVL. Below that line — ninety-nine percent of Solana treasuries — there is nothing." --write-media "$CDIR/c13.mp3"
edge-tts --voice "$VOICE" --text "This is Custos Nox."                                                   --write-media "$CDIR/c14.mp3"
edge-tts --voice "$VOICE" --text "Four detectors — the exact same four steps Drift's attackers used as their preparation checklist." --write-media "$CDIR/c15.mp3"
edge-tts --voice "$VOICE" --text "The moment one fires — your Discord gets a message. Your Slack channel gets a ping. You have days to respond. Not minutes." --write-media "$CDIR/c16.mp3"
edge-tts --voice "$VOICE" --text "Self-host in five minutes. Watch any Squads multisig or SPL Governance account on mainnet." --write-media "$CDIR/c17.mp3"
edge-tts --voice "$VOICE" --text "I'm Yasya. I build in Kyiv."                                          --write-media "$CDIR/c18.mp3"
edge-tts --voice "$VOICE" --text "I built Custos Nox because small DAOs deserve to know about an attack before it happens — not from Twitter after the treasury is empty." --write-media "$CDIR/c19.mp3"
edge-tts --voice "$VOICE" --text "MIT licensed. Free, forever."                                          --write-media "$CDIR/c20.mp3"
edge-tts --voice "$VOICE" --text "Not a product — permanent open-source infrastructure for every Solana treasury." --write-media "$CDIR/c21.mp3"
edge-tts --voice "$VOICE" --text "Custos Nox."                                                           --write-media "$CDIR/c22.mp3"

echo "→ Generating silence padding..."
# паузы (секунды): после каждого чанка c01..c21
silence() { ffmpeg -y -f lavfi -i anullsrc=r=24000:cl=mono -t "$1" -ar 24000 -ac 1 -b:a 48k "$CDIR/s${2}.mp3" -loglevel quiet; }
silence 0.9  01; silence 1.1  02; silence 1.2  03
silence 0.4  04; silence 0.7  05; silence 0.4  06
silence 0.9  07; silence 0.3  08; silence 0.3  09
silence 0.9  10; silence 0.7  11; silence 0.5  12
silence 0.7  13; silence 0.5  14; silence 0.7  15
silence 0.6  16; silence 0.7  17; silence 0.4  18
silence 0.7  19; silence 0.4  20; silence 0.4  21

echo "→ Building concat list..."
LIST="$CDIR/list.txt"
rm -f "$LIST"
for i in 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21; do
  echo "file 'c${i}.mp3'" >> "$LIST"
  echo "file 's${i}.mp3'" >> "$LIST"
done
echo "file 'c22.mp3'" >> "$LIST"

echo "→ Concatenating..."
cd "$CDIR"
ffmpeg -y -f concat -safe 0 -i list.txt -ar 24000 -ac 1 -b:a 128k "../$OUT" -loglevel quiet
cd ..

DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUT")
echo "✓ $OUT ready — ${DUR}s ($(echo "$DUR / 60" | bc)m)"
