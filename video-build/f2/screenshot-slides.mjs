import { chromium } from 'playwright-chromium';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DECK_PATH = path.resolve(__dirname, '../../assets/pitch-slides/deck-v2.html');
const OUT_DIR = path.resolve(__dirname, 'slides-screenshots');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 }
});
const page = await ctx.newPage();
await page.goto(`file:///${DECK_PATH.replace(/\\/g, '/')}`);
await page.addStyleTag({ content: '.hud { display: none !important; }' });
await page.waitForTimeout(400);

for (let idx = 0; idx < 8; idx++) {
  const slideNum = idx + 1;

  if (idx > 0) {
    await page.evaluate((targetIdx) => {
      const all = document.querySelectorAll('.slide');
      all.forEach(s => {
        s.style.transition = 'none';
        s.classList.remove('active');
        s.style.display = 'none';
        s.style.opacity = '0';
      });
      const target = all[targetIdx];
      target.style.display = 'flex';
      target.getBoundingClientRect();
      target.classList.add('active');
      target.style.opacity = '1';
      if (typeof onSlideEnter === 'function') onSlideEnter(targetIdx);
    }, idx);
  }

  // Wait for animations to settle to FINAL frame (count-ups 1500-1800ms, stagger ~1.5s for 5 items)
  await page.waitForTimeout(2200);

  const out = path.join(OUT_DIR, `slide-${slideNum}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`✓ slide-${slideNum}.png`);
}

await ctx.close();
await browser.close();
console.log(`\nScreenshots in ${OUT_DIR}`);
