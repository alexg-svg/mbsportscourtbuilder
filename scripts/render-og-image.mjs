// Builds public/og-image.jpg (1200×630), the picture shown when a link to the
// builder is pasted into a message or social post. Uses a showcase render as
// the background; run after `npm run render:showcase`.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

const bg = `data:image/webp;base64,${readFileSync('public/showcase/backyard-hoops-night-1600.webp').toString('base64')}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
const out = await page.evaluate(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const W = 1200, H = 630;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const k = Math.max(W / img.width, H / img.height);
  x.drawImage(img, (W - img.width * k) / 2 + 140, (H - img.height * k) / 2, img.width * k, img.height * k);
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(10,12,24,0.95)'); g.addColorStop(0.5, 'rgba(10,12,24,0.7)'); g.addColorStop(1, 'rgba(10,12,24,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#ec4899'; x.fillRect(64, 150, 64, 6);
  x.fillStyle = '#f9a8d4'; x.font = '700 24px system-ui, sans-serif';
  x.fillText('MB SPORTS BUILDERS', 64, 120);
  x.fillStyle = '#ffffff'; x.font = '800 64px system-ui, sans-serif';
  x.fillText('Design your court', 64, 240);
  x.fillText('in 3D', 64, 316);
  x.fillStyle = 'rgba(255,255,255,0.85)'; x.font = '500 28px system-ui, sans-serif';
  x.fillText('12 court types · See it in your yard', 64, 386);
  x.fillText('Free quote in 24–48 hours', 64, 428);
  x.fillStyle = '#db2777';
  x.beginPath(); x.roundRect(64, 480, 300, 64, 14); x.fill();
  x.fillStyle = '#ffffff'; x.font = '700 26px system-ui, sans-serif';
  x.fillText('Start designing →', 92, 521);
  return c.toDataURL('image/jpeg', 0.88).split(',')[1];
}, bg);
writeFileSync('public/og-image.jpg', Buffer.from(out, 'base64'));
console.log('public/og-image.jpg');
await browser.close();
