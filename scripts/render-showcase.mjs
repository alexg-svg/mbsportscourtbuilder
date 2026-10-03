// Renders the Step 1 showcase pictures from the sample designs in
// src/utils/showcase.ts, using the app's own 3D renderer: public/showcase/<id>.webp
// (960 wide) and <id>-1600.webp for large and high-resolution screens.
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
  // Re-encode the renderer's JPEG as WebP (about a third smaller)
  const toWebp = async (jpegB64) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${jpegB64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', 0.82).split(',')[1];
  };
  const out = [];
  for (const item of SHOWCASE) {
    out.push({ file: `${item.id}.webp`, b64: await toWebp(await renderCourtSnapshot(item.config, 960, 600, item.time)) });
    out.push({ file: `${item.id}-1600.webp`, b64: await toWebp(await renderCourtSnapshot(item.config, 1600, 1000, item.time)) });
  }
  return out;
});

for (const { file, b64 } of shots) {
  if (!b64) throw new Error(`Render failed for ${file}`);
  writeFileSync(`public/showcase/${file}`, Buffer.from(b64, 'base64'));
  console.log(`public/showcase/${file}`);
}
await browser.close();
