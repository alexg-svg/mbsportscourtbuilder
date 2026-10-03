import type { CourtConfig } from '../types/court';
import {
  ACCESSORIES, COURT_LABELS, FINISH_LABELS, COURT_PRESETS,
  SURFACE_COLORS, LINE_COLORS, BORDER_COLORS,
} from './courtData';

// A small PDF writer for the design summary: two Letter pages with JPEG
// pictures, text and color swatches. Written by hand (built-in Helvetica,
// JPEG pass-through) so no PDF library has to be downloaded.

interface Img { data: Uint8Array; w: number; h: number }

const PAGE_W = 612, PAGE_H = 792; // US Letter in points
const M = 40;                      // page margin
const PINK = [0.745, 0.094, 0.365] as const; // #be185d

// Helvetica in WinAnsiEncoding: map the few non-ASCII characters we use
const WIN_ANSI: Record<string, number> = { '×': 0xd7, '–': 0x96, '—': 0x97, '·': 0xb7, '•': 0x95, '’': 0x92, '©': 0xa9 };
function pdfText(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    const b = WIN_ANSI[ch] ?? (code < 128 ? code : 63); // '?' for anything else
    const c = String.fromCharCode(b);
    out += c === '(' || c === ')' || c === '\\' ? '\\' + c : c;
  }
  return out;
}

/** Approximate Helvetica width (points) for wrapping. */
const textWidth = (s: string, size: number, bold = false) => s.length * size * (bold ? 0.58 : 0.52);

function wrap(s: string, size: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (textWidth(next, size) > maxW && cur) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const colorName = (hex: string | undefined, palettes: { label: string; value: string }[][]) => {
  if (!hex) return '';
  for (const p of palettes) {
    const hit = p.find((c) => c.value.toLowerCase() === hex.toLowerCase());
    if (hit) return hit.label;
  }
  return 'Custom';
};

/** Builds one page's drawing commands. */
class Page {
  ops: string[] = [];
  images: { name: string; img: Img }[] = [];
  fill(r: number, g: number, b: number) { this.ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`); return this; }
  rect(x: number, y: number, w: number, h: number) { this.ops.push(`${x} ${PAGE_H - y - h} ${w} ${h} re f`); return this; }
  strokeRect(x: number, y: number, w: number, h: number, gray = 0.8) {
    this.ops.push(`${gray} G 0.75 w ${x} ${PAGE_H - y - h} ${w} ${h} re S`); return this;
  }
  text(x: number, y: number, s: string, size = 10, bold = false) {
    this.ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${PAGE_H - y - size} Td (${pdfText(s)}) Tj ET`);
    return this;
  }
  image(img: Img, x: number, y: number, w: number) {
    const h = (w * img.h) / img.w;
    const name = `Im${this.images.length + 1}`;
    this.images.push({ name, img });
    this.ops.push(`q ${w} 0 0 ${h.toFixed(2)} ${x} ${(PAGE_H - y - h).toFixed(2)} cm /${name} Do Q`);
    return h;
  }
}

function header(p: Page, subtitle: string) {
  p.fill(...PINK).rect(0, 0, PAGE_W, 64);
  p.fill(0.99, 0.91, 0.95).text(M, 16, 'MB SPORTS BUILDERS', 9, true);
  p.fill(1, 1, 1).text(M, 30, subtitle, 18, true);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  p.fill(0.99, 0.91, 0.95).text(PAGE_W - M - textWidth(date, 9), 20, date, 9);
}

function footer(p: Page, n: number) {
  p.fill(0.6, 0.62, 0.66).text(M, PAGE_H - 30, 'mbsportsbuilders.com', 8, true);
  p.text(PAGE_W - M - 30, PAGE_H - 30, `Page ${n}`, 8);
}

function serialize(pages: Page[]): Blob {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? latin1(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  // Strings here are already WinAnsi bytes (one char per byte)
  const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

  let nextId = 1;
  const alloc = () => nextId++;
  const catalogId = alloc(), pagesId = alloc(), fontId = alloc(), boldId = alloc();
  const pagePlan = pages.map((p) => ({
    page: p, pageId: alloc(), contentId: alloc(), imageIds: p.images.map(() => alloc()),
  }));

  const obj = (id: number, body: string | Uint8Array[], ) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    if (typeof body === 'string') push(body); else body.forEach(push);
    push('\nendobj\n');
  };

  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  obj(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  obj(pagesId, `<< /Type /Pages /Count ${pages.length} /Kids [${pagePlan.map((p) => `${p.pageId} 0 R`).join(' ')}] >>`);
  obj(fontId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(boldId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  for (const { page, pageId, contentId, imageIds } of pagePlan) {
    const xobjects = page.images.map((im, i) => `/${im.name} ${imageIds[i]} 0 R`).join(' ');
    obj(pageId, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> /XObject << ${xobjects} >> >> ` +
      `/Contents ${contentId} 0 R >>`);
    const stream = page.ops.join('\n');
    obj(contentId, `<< /Length ${latin1(stream).length} >>\nstream\n${stream}\nendstream`);
    page.images.forEach(({ img }, i) => {
      obj(imageIds[i], [
        latin1(`<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB ` +
          `/BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>\nstream\n`),
        img.data,
        latin1('\nendstream'),
      ]);
    });
  }

  const xrefAt = length;
  const count = nextId;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let id = 1; id < count; id++) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${count} /Root ${catalogId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Two-page design summary. Images are base64 JPEGs (no data: prefix). */
export function buildDesignPdf(config: CourtConfig, render3D?: { b64: string; w: number; h: number }, plan2D?: { b64: string; w: number; h: number }): Blob {
  const { dimensions: { length: L, width: W }, colors } = config;
  const preset = COURT_PRESETS.find((p) => p.type === config.type && p.dimensions.length === L && p.dimensions.width === W);
  const contentW = PAGE_W - M * 2;

  // ── Page 1: 3D picture and specifications ──
  const p1 = new Page();
  header(p1, 'Your Court Design');
  let y = 84;
  if (render3D) {
    y += p1.image({ data: fromBase64(render3D.b64), w: render3D.w, h: render3D.h }, M, y, contentW) + 18;
  }

  p1.fill(0.07, 0.09, 0.15).text(M, y, `${COURT_LABELS[config.type]} Court`, 16, true);
  y += 26;
  const rows: [string, string][] = [
    ['Property', config.propertyType === 'commercial' ? 'Commercial' : 'Residential'],
    ['Size', `${L} × ${W} ft  ·  ${(L * W).toLocaleString('en-US')} sq ft${preset ? `  ·  ${preset.name}` : '  ·  Custom size'}`],
    ['Surface', FINISH_LABELS[config.surfaceFinish]],
  ];
  for (const [k, v] of rows) {
    p1.fill(0.42, 0.45, 0.5).text(M, y, k.toUpperCase(), 8, true);
    p1.fill(0.07, 0.09, 0.15).text(M + 90, y - 1, v, 10.5);
    y += 20;
  }

  // Colors with swatches
  p1.fill(0.42, 0.45, 0.5).text(M, y, 'COLORS', 8, true);
  const swatches: [string, string | undefined, string][] = [
    ['Surface', colors.surface, colorName(colors.surface, [SURFACE_COLORS])],
    ['Lines', colors.lines, colorName(colors.lines, [LINE_COLORS])],
    ['Border', colors.border, colorName(colors.border, [BORDER_COLORS])],
  ];
  const zone = config.type === 'basketball' || config.type === 'multi-sport' ? ['Key area', colors.keyArea]
    : config.type === 'tennis' ? ['Service boxes', colors.serviceBox]
    : config.type === 'pickleball' ? ['Kitchen', colors.kitchen] : null;
  if (zone && zone[1]) swatches.push([zone[0] as string, zone[1], colorName(zone[1], [SURFACE_COLORS, BORDER_COLORS])]);
  for (const [label, hex, name] of swatches) {
    if (!hex) continue;
    const [r, g, b] = hexRgb(hex);
    p1.fill(r, g, b).rect(M + 90, y - 1, 12, 12);
    p1.strokeRect(M + 90, y - 1, 12, 12, 0.75);
    p1.fill(0.07, 0.09, 0.15).text(M + 108, y, `${label}: ${name} (${hex.toUpperCase()})`, 10);
    y += 17;
  }
  y += 4;

  // Accessories
  const acc = ACCESSORIES.filter((a) => config.selectedAccessories.includes(a.id)).map((a) => a.name);
  p1.fill(0.42, 0.45, 0.5).text(M, y, 'EXTRAS', 8, true);
  const accLines = acc.length ? wrap(acc.join(', '), 10.5, contentW - 90) : ['None selected'];
  accLines.forEach((line, i) => p1.fill(0.07, 0.09, 0.15).text(M + 90, y - 1 + i * 15, line, 10.5));
  footer(p1, 1);

  // ── Page 2: court layout and next steps ──
  const p2 = new Page();
  header(p2, 'Court Layout');
  y = 84;
  if (plan2D) {
    y += p2.image({ data: fromBase64(plan2D.b64), w: plan2D.w, h: plan2D.h }, M, y, contentW) + 22;
  }
  p2.fill(0.07, 0.09, 0.15).text(M, y, 'Next steps', 14, true);
  y += 24;
  const steps = [
    'Request your free quote at mbsportsbuilders.com, or reply to us with this design.',
    'We review your design and site details and prepare a written quote.',
    'We schedule a free on-site evaluation to confirm measurements and drainage.',
    'Construction begins on your timeline.',
  ];
  steps.forEach((s, i) => {
    p2.fill(...PINK).text(M, y, `${i + 1}.`, 10.5, true);
    wrap(s, 10.5, contentW - 20).forEach((line, j) => p2.fill(0.2, 0.22, 0.27).text(M + 18, y + j * 15, line, 10.5));
    y += 15 * wrap(s, 10.5, contentW - 20).length + 6;
  });
  y += 8;
  p2.fill(0.42, 0.45, 0.5);
  wrap('Colors on screen and in print are approximate. Final colors, dimensions and equipment are confirmed in your written quote.', 8.5, contentW)
    .forEach((line, i) => p2.text(M, y + i * 12, line, 8.5));
  footer(p2, 2);

  return serialize([p1, p2]);
}
