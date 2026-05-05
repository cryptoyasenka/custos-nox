#!/usr/bin/env bash
# build-f2.sh — собирает финальное pitch video из трёх частей + VO
#
# Порядок: hook.webm → terminal-f2.mp4 → outro.webm + vo-f2-final.mp3
# Запуск:  cd video-build/f2 && bash build-f2.sh
#
# ТРЕБУЕТ: terminal-f2.mp4 (записать вручную по TERMINAL-RUNBOOK-F2.md)
# ВСЁ ОСТАЛЬНОЕ уже готово: hook.webm, outro.webm, vo-f2-final.mp3
set -e

check_file() {
  if [ ! -f "$1" ]; then
    echo "✗ Не найден: $1"
    echo "  $2"
    exit 1
  fi
}

check_file "hook.webm"       "Запусти: node record-html.mjs"
check_file "outro.webm"      "Запусти: node record-html.mjs"
check_file "vo-f2-final.mp3" "Запусти: bash gen-vo.sh  (уже должен быть)"
check_file "terminal-f2.mp4" "Запиши терминал по TERMINAL-RUNBOOK-F2.md"

echo "→ Converting webm → mp4..."
ffmpeg -y -i hook.webm  -c:v libx264 -preset fast -pix_fmt yuv420p -crf 22 hook-conv.mp4  -loglevel quiet
ffmpeg -y -i outro.webm -c:v libx264 -preset fast -pix_fmt yuv420p -crf 22 outro-conv.mp4 -loglevel quiet

echo "→ Checking frame sizes..."
HOOK_SIZE=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 hook-conv.mp4)
TERM_SIZE=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 terminal-f2.mp4)
OUTR_SIZE=$(ffprobe -v quiet -select_streams v:0 -show_entries stream=width,height -of csv=p=0 outro-conv.mp4)
echo "  hook:  $HOOK_SIZE"
echo "  term:  $TERM_SIZE"
echo "  outro: $OUTR_SIZE"

echo "→ Concatenating video segments..."
printf "file 'hook-conv.mp4'\nfile 'terminal-f2.mp4'\nfile 'outro-conv.mp4'\n" > concat.txt

# Если разные разрешения — масштабируем всё к 1920x1080 через filter_complex
# Если одинаковые — используем простой concat (быстрее)
if [ "$HOOK_SIZE" = "$TERM_SIZE" ] && [ "$HOOK_SIZE" = "$OUTR_SIZE" ]; then
  ffmpeg -y -f concat -safe 0 -i concat.txt -c copy combined-video.mp4 -loglevel quiet
  echo "  (simple concat — all same resolution)"
else
  echo "  (filter_complex concat — normalizing to 1920x1080)"
  ffmpeg -y \
    -i hook-conv.mp4 -i terminal-f2.mp4 -i outro-conv.mp4 \
    -filter_complex \
      "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];
       [1:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];
       [2:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v2];
       [v0][v1][v2]concat=n=3:v=1:a=0[outv]" \
    -map "[outv]" -c:v libx264 -preset fast -crf 22 combined-video.mp4 -loglevel quiet
fi

VIDEO_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 combined-video.mp4)
VO_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 vo-f2-final.mp3)
echo "  video: ${VIDEO_DUR}s  |  VO: ${VO_DUR}s"

echo "→ Muxing video + VO..."
ffmpeg -y \
  -i combined-video.mp4 \
  -i vo-f2-final.mp3 \
  -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 192k \
  -shortest \
  final-f2.mp4 -loglevel quiet

FINAL_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 final-f2.mp4)
echo ""
echo "✓ final-f2.mp4 ready — ${FINAL_DUR}s ($(echo "$FINAL_DUR / 60" | bc 2>/dev/null || awk "BEGIN{printf \"%.1f\", $FINAL_DUR/60}")m)"
echo ""
echo "Следующие шаги:"
echo "  1. Открой final-f2.mp4 и посмотри"
echo "  2. Загрузи в YouTube (unlisted) или Loom"
echo "  3. Вставь ссылку в Arena → Pitch video field"

# Cleanup temp files
rm -f hook-conv.mp4 outro-conv.mp4 combined-video.mp4 concat.txt
