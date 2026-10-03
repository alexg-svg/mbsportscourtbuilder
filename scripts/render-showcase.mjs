// Renders the Step 1 showcase pictures (public/showcase/*.jpg) from the sample
// designs in src/utils/showcase.ts, using the app's own 3D renderer.
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
    out.push({ id: item.id, b64: await renderCourtSnapshot(item.config, 960, 600, item.time) });
  }
  return out;
});

for (const { id, b64 } of shots) {
  if (!b64) throw new Error(`Render failed for ${id}`);
  writeFileSync(`public/showcase/${id}.jpg`, Buffer.from(b64, 'base64'));
  console.log(`public/showcase/${id}.jpg`);
}
await browser.close();
