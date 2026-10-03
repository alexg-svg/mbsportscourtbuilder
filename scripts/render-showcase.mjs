// Renders the Step 1 showcase pictures from the sample designs in
// src/utils/showcase.ts, using the app's own 3D renderer: public/showcase/<id>.jpg
// (960 wide) and <id>-1600.jpg for large and high-resolution screens.
//
// Usage: start the dev server (npm run dev), then: npm run render:showcase
// Optional: BASE_URL (default http://localhost:5173), CHROMIUM_PATH.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.goto(BASE_URL, { waitUntil: 'networkidle' });

const shots = await page.evaluate(async () => {
  const { SHOWCASE } = await import('/src/utils/showcase.ts');
  const { renderCourtSnapshot } = await import('/src/components/Court/Court3D.tsx');
  const out = [];
  for (const item of SHOWCASE) {
    out.push({ file: `${item.id}.jpg`, b64: await renderCourtSnapshot(item.config, 960, 600, item.time) });
    out.push({ file: `${item.id}-1600.jpg`, b64: await renderCourtSnapshot(item.config, 1600, 1000, item.time) });
  }
  return out;
});

for (const { file, b64 } of shots) {
  if (!b64) throw new Error(`Render failed for ${file}`);
  writeFileSync(`public/showcase/${file}`, Buffer.from(b64, 'base64'));
  console.log(`public/showcase/${file}`);
}
await browser.close();
