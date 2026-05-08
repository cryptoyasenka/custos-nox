import { chromium } from 'playwright-chromium';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DECK_PATH = path.resolve(__dirname, '../../assets/pitch-slides/deck-v2.html');
const OUT_DIR = path.resolve(__dirname, 'slides-individual');

const SLIDE_DURATIONS_MS = [
  16000, // s1 — incident + product reveal + 9-days punch
  16000, // s2 — Drift attack chain timeline
  14000, // s3 — STRIDE vs 10,000+ gap
  14000, // s4 — 5 detector cards (now with daemon type label)
  14000, // s5 — 4 proof cards (200+/<1s/MIT/Discord mockup)
  14000, // s6 — setup in 5 min
  13000, // s7 — vision (now with Public Good badge)
  10000, // s8 — CTA + team
];
// Per-slide lead-in: ~500ms (browser settle + slide reveal). Trim in CapCut if needed.

if (!fs.existsSync(DECK_PATH)) {
  console.error('✗ deck not found at', DECK_PATH);
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });

for (let idx = 0; idx < SLIDE_DURATIONS_MS.length; idx++) {
  const slideNum = idx + 1;
  const tmpDir = path.join(OUT_DIR, `tmp-${slideNum}`);
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`▶ recording slide ${slideNum}/${SLIDE_DURATIONS_MS.length} — ${SLIDE_DURATIONS_MS[idx]}ms`);

  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: tmpDir, size: { width: 1920, height: 1080 } }
  });
  const page = await ctx.newPage();
  await page.goto(`file:///${DECK_PATH.replace(/\\/g, '/')}`);

  // Hide HUD so it doesn't appear in recording
  await page.addStyleTag({ content: '.hud { display: none !important; }' });

  // Settle: let initial paint + onSlideEnter(0) finish
  await page.waitForTimeout(300);

  // Jump straight to target slide WITHOUT fade transition, then re-fire animations
  if (idx > 0) {
    await page.evaluate((targetIdx) => {
      const all = document.querySelectorAll('.slide');
      all.forEach((s, i) => {
        s.style.transition = 'none';
        s.classList.remove('active');
        s.style.display = 'none';
        s.style.opacity = '0';
      });
      const target = all[targetIdx];
      target.style.display = 'flex';
      // Force reflow so opacity transition is consistent
      target.getBoundingClientRect();
      target.classList.add('active');
      target.style.opacity = '1';
      // Re-fire entrance animations
      if (typeof onSlideEnter === 'function') onSlideEnter(targetIdx);
    }, idx);
  }

  // Hold for slide duration
  await page.waitForTimeout(SLIDE_DURATIONS_MS[idx]);

  const videoPath = await page.video()?.path();
  await ctx.close();

  if (videoPath && fs.existsSync(videoPath)) {
    const out = path.join(OUT_DIR, `slide-${slideNum}.webm`);
    if (fs.existsSync(out)) fs.unlinkSync(out);
    fs.renameSync(videoPath, out);
    console.log(`  ✓ saved ${out}`);
    // Clean tmp dir
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) { /* ignore */ }
  } else {
    console.error(`  ✗ no video for slide ${slideNum}`);
  }
}

await browser.close();

console.log(`\n✓ all ${SLIDE_DURATIONS_MS.length} slides saved to ${OUT_DIR}`);
console.log('  Files: slide-1.webm ... slide-8.webm');
console.log('  Sequence in CapCut by filename order.');
