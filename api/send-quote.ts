import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { z } from 'zod';
// Type-only imports are erased at build time, so the function never loads
// browser code; they let the compiler check that the lists below match the app.
import type { CourtType, AccessoryId, SurfaceFinish, PropertyType } from '../src/types/court';
import type {
  DIM_LIMITS as APP_DIM_LIMITS, LeadTimeline, LeadSite, LeadSource,
} from '../src/utils/courtData';

/** Compiles only when A and B are the same set of values. */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

// ─── Startup env guard ────────────────────────────────────────────────────────
const REQUIRED_ENV = ['SMTP_USER', 'SMTP_PASS', 'QUOTE_TO'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

// ─── SMTP transporter ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ─── Input validation schema ──────────────────────────────────────────────────
const HEX_COLOR = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color');
const SAFE_STRING = (max: number) =>
  z.string().max(max).transform((s) => s.replace(/[\r\n\0]/g, ' ').trim());

const COURT_TYPES   = [
  'basketball', 'tennis', 'pickleball', 'multi-sport',
  'bocce-ball', 'badminton', 'futsal', 'inline-hockey',
  'handball', 'volleyball', 'shuffleboard', 'four-square',
] as const;
const PROP_TYPES    = ['residential', 'commercial'] as const;
const FINISHES      = ['smooth', 'textured', 'cushioned'] as const;
// Display names for the email; also the list of accepted accessory ids
const ACCESSORY_LABELS: Record<AccessoryId, string> = {
  'custom-logo': 'Custom Logo',
  'basketball-hoop-single': 'Basketball Hoop (1)', 'basketball-hoop-double': 'Basketball Hoops (2)',
  'tennis-net': 'Tennis Net & Posts', 'pickleball-net': 'Pickleball Net & Posts',
  'volleyball-net': 'Volleyball Net & Posts', 'badminton-net': 'Badminton Net & Posts',
  'futsal-goals': 'Futsal Goals (pair)', 'handball-goals': 'Handball Goals (pair)', 'hockey-goals': 'Hockey Goals (pair)',
  'dasher-boards': 'Dasher Boards', 'bocce-side-rails': 'Bocce Side Rails',
  'lighting-2-pole': 'Lighting – 2 Poles', 'lighting-4-pole': 'Lighting – 4 Poles', 'lighting-6-pole': 'Lighting – 6 Poles',
  'chain-link-fence': 'Chain Link Fence', 'vinyl-fence': 'Vinyl Fence', 'windscreen': 'Windscreen',
  'bench-2': 'Player Benches (2)', 'bench-4': 'Player Benches (4)', 'water-fountain': 'Water Fountain',
  'scoreboards': 'Scoreboard',
};
const ACCESSORY_IDS = Object.keys(ACCESSORY_LABELS) as [AccessoryId, ...AccessoryId[]];

const DIM_LIMITS = { length: { min: 10, max: 300 }, width: { min: 4, max: 150 } } as const;

// If the app gains a court type, finish, property type or size limit, these
// lines stop compiling until this file is updated to match.
const _courtsMatch: Exact<typeof COURT_TYPES[number], CourtType> = true;
const _finishesMatch: Exact<typeof FINISHES[number], SurfaceFinish> = true;
const _propsMatch: Exact<typeof PROP_TYPES[number], PropertyType> = true;
const _limitsMatch: Exact<typeof DIM_LIMITS, typeof APP_DIM_LIMITS> = true;
void _courtsMatch; void _finishesMatch; void _propsMatch; void _limitsMatch;

// Optional sales questions (labels mirror src/utils/courtData.ts; the Record
// types make the compiler insist on every key)
const LEAD_TIMELINE: Record<LeadTimeline, string> = {
  asap: 'As soon as possible', '1-3-months': 'In 1–3 months', '3-6-months': 'In 3–6 months',
  '6-plus-months': 'In 6+ months', researching: 'Just researching',
};
const LEAD_SITE: Record<LeadSite, string> = {
  'existing-slab': 'Existing concrete or asphalt slab', resurface: 'Resurfacing an existing court',
  'new-ground': 'New ground (needs a base)', 'not-sure': 'Not sure yet',
};
const LEAD_SOURCE: Record<LeadSource, string> = {
  google: 'Google search', social: 'Facebook / Instagram', referral: 'Friend or neighbor',
  'saw-court': 'Saw one of your courts', other: 'Other',
};
const optionalChoice = <K extends string>(labels: Record<K, string>) =>
  z.union([z.enum(Object.keys(labels) as [K, ...K[]]), z.literal('')]).optional();

const schema = z.object({
  contact: z.object({
    name:    SAFE_STRING(120),
    email:   z.string().email().max(254).transform((s) => s.replace(/[\r\n\0]/g, '')),
    phone:   SAFE_STRING(30).optional(),
    zip:     z.string().regex(/^[0-9A-Za-z\s\-]{3,10}$/),
    city:    SAFE_STRING(100).optional(),
    state:   SAFE_STRING(50).optional(),
    message: SAFE_STRING(2000).optional(),
    timeline: optionalChoice(LEAD_TIMELINE),
    site:     optionalChoice(LEAD_SITE),
    source:   optionalChoice(LEAD_SOURCE),
  }),
  config: z.object({
    type:          z.enum(COURT_TYPES),
    propertyType:  z.enum(PROP_TYPES),
    surfaceFinish: z.enum(FINISHES),
    dimensions: z.object({
      length: z.number().int().min(DIM_LIMITS.length.min).max(DIM_LIMITS.length.max),
      width:  z.number().int().min(DIM_LIMITS.width.min).max(DIM_LIMITS.width.max),
    }),
    colors: z.object({
      surface:    HEX_COLOR,
      lines:      HEX_COLOR,
      border:     HEX_COLOR,
      keyArea:    HEX_COLOR.optional(),
      serviceBox: HEX_COLOR.optional(),
      kitchen:    HEX_COLOR.optional(),
    }),
    selectedAccessories: z.array(z.enum(ACCESSORY_IDS)).max(20),
  }),
  courtImageBase64: z.string().max(700_000).optional(),
  court3DImageBase64: z.string().max(1_000_000).optional(),
  pdfBase64: z.string().max(1_500_000).optional(),
  recaptchaToken: z.string().max(10_000).optional(),
});

// ─── reCAPTCHA verification ───────────────────────────────────────────────────
// 'pass' = Google confirmed a human; 'fail' = Google says likely a bot;
// 'unverified' = no token, no secret configured, or Google unreachable.
// Quotes are only rejected on 'fail'; the customer confirmation email is only
// sent on 'pass', since it goes to an address the visitor typed in.
type Captcha = 'pass' | 'fail' | 'unverified';
async function checkRecaptcha(token: string | undefined): Promise<Captcha> {
  if (!token || !process.env.RECAPTCHA_SECRET) return 'unverified';
  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(process.env.RECAPTCHA_SECRET)}&response=${encodeURIComponent(token)}`,
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json() as { success: boolean; score: number };
    return data.success && data.score >= 0.5 ? 'pass' : 'fail';
  } catch { return 'unverified'; }
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Uses a shared Upstash / Vercel KV counter when one is configured, so limits
// hold across all server instances. Without one (or if it's unreachable) it
// falls back to a per-instance memory counter, which resets on cold starts.
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const ratemap = new Map<string, { count: number; reset: number }>();
function memoryLimited(key: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  const entry = ratemap.get(key);
  if (!entry || now > entry.reset) {
    ratemap.set(key, { count: 1, reset: now + windowSec * 1000 });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

async function kv(commands: (string | number)[][]): Promise<unknown[]> {
  const r = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(1500),
  });
  const out = await r.json() as { result?: unknown }[];
  return out.map((o) => o.result);
}

/** Counts a hit; true when `key` has exceeded `limit` within `windowSec`. */
async function isLimited(key: string, limit: number, windowSec: number): Promise<boolean> {
  if (KV_URL && KV_TOKEN) {
    try {
      const [count] = await kv([['INCR', `mb:rl:${key}`]]);
      const n = Number(count);
      if (n === 1) await kv([['EXPIRE', `mb:rl:${key}`, windowSec]]);
      if (Number.isFinite(n)) return n > limit;
    } catch { /* fall through to memory */ }
  }
  return memoryLimited(key, limit, windowSec);
}

// ─── Attachment checks ────────────────────────────────────────────────────────
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isPdf = (b: Buffer) => b.subarray(0, 5).toString('latin1') === '%PDF-';
const decode = (b64: string | undefined, check: (b: Buffer) => boolean) => {
  if (!b64) return undefined;
  const buf = Buffer.from(b64, 'base64');
  return check(buf) ? buf : undefined;
};

// ─── Email template ───────────────────────────────────────────────────────────
const COURT_LABELS: Record<CourtType, string> = {
  basketball: 'Basketball', tennis: 'Tennis',
  pickleball: 'Pickleball', 'multi-sport': 'Multi-Sport',
  'bocce-ball': 'Bocce Ball', badminton: 'Badminton',
  futsal: 'Futsal', 'inline-hockey': 'Inline Hockey',
  handball: 'Handball', volleyball: 'Volleyball',
  shuffleboard: 'Shuffleboard', 'four-square': 'Four Square',
};
const FINISH_LABELS: Record<SurfaceFinish, string> = {
  smooth: 'Smooth Asphalt', textured: 'Textured Asphalt', cushioned: 'Cushioned Asphalt',
};

function swatch(color: string) {
  // color is already validated as /^#[0-9A-Fa-f]{6}$/ at this point
  return `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${color};border:1px solid #ddd;vertical-align:middle;margin-right:4px;"></span>${color}`;
}

function buildHtml(data: z.infer<typeof schema>, hasImage: boolean, has3D: boolean): string {
  const { contact, config } = data;
  const { dimensions: dims, colors } = config;
  const acc = config.selectedAccessories.map((id) => ACCESSORY_LABELS[id]).join(', ') || 'None';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

        <tr>
          <td style="background:#be185d;padding:24px 32px;">
            <p style="margin:0;color:#fce7f3;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">MB Sports Builders</p>
            <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;">New Quote Request</h1>
          </td>
        </tr>

        ${has3D ? `
        <tr>
          <td style="padding:20px 32px 0;">
            <img src="cid:court-3d" alt="3D Court Render" width="536"
              style="width:100%;border-radius:8px;display:block;border:1px solid #e2e8f0;" />
          </td>
        </tr>` : ''}

        ${hasImage ? `
        <tr>
          <td style="padding:${has3D ? '12px' : '20px'} 32px 0;">
            ${has3D ? '<p style="margin:0 0 6px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.08em;">Court layout</p>' : ''}
            <img src="cid:court-preview" alt="Court Preview" width="536"
              style="width:100%;border-radius:8px;display:block;border:1px solid #e2e8f0;" />
          </td>
        </tr>` : ''}

        <tr>
          <td style="padding:28px 32px 0;">
            <h2 style="margin:0 0 14px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Contact</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:5px 0;width:90px;color:#6b7280;font-size:14px;">Name</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;font-weight:600;">${escHtml(contact.name)}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">Email</td>
                <td style="padding:5px 0;font-size:14px;"><a href="mailto:${escHtml(contact.email)}" style="color:#be185d;">${escHtml(contact.email)}</a></td>
              </tr>
              ${contact.phone ? `<tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">Phone</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${escHtml(contact.phone)}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">ZIP</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${escHtml(contact.zip)}</td>
              </tr>
              ${contact.city && contact.state ? `<tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">Location</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${escHtml(contact.city)}, ${escHtml(contact.state)}</td>
              </tr>` : ''}
              ${contact.timeline ? row('Timeline', LEAD_TIMELINE[contact.timeline]) : ''}
              ${contact.site ? row('Site', LEAD_SITE[contact.site]) : ''}
              ${contact.source ? row('Found us', LEAD_SOURCE[contact.source]) : ''}
              ${contact.message ? `<tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;vertical-align:top;">Notes</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${escHtml(contact.message)}</td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 32px 0;">
            <h2 style="margin:0 0 14px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Court Design</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:5px 0;width:90px;color:#6b7280;font-size:14px;">Sport</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;font-weight:600;">${COURT_LABELS[config.type]}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">Property</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;text-transform:capitalize;">${config.propertyType}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">Size</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${dims.length} × ${dims.width} ft &nbsp;<span style="color:#6b7280;">(${(dims.length * dims.width).toLocaleString()} sq ft)</span></td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">Surface</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${FINISH_LABELS[config.surfaceFinish]}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">Colors</td>
                <td style="padding:5px 0;font-size:14px;">
                  ${swatch(colors.surface)} Surface &nbsp;
                  ${swatch(colors.border)} Border &nbsp;
                  ${swatch(colors.lines)} Lines
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;vertical-align:top;">Extras</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${escHtml(acc)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px;margin-top:8px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;border-top:1px solid #f1f5f9;padding-top:20px;">
              Sent via MB Sports Court Builder &nbsp;·&nbsp; mbsportsbuilders.com
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">${label}</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${escHtml(value)}</td>
              </tr>`;
}

// ─── Customer confirmation email ──────────────────────────────────────────────
/** First name only, with anything link-like removed, so the field can't carry spam. */
function safeFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const clean = /[./:@]|www|http/i.test(first) ? '' : first.replace(/[^\p{L}'-]/gu, '').slice(0, 40);
  return clean || 'there';
}

function buildCustomerHtml(data: z.infer<typeof schema>, has3D: boolean): string {
  const { contact, config } = data;
  const dims = config.dimensions;
  const acc = config.selectedAccessories.map((id) => ACCESSORY_LABELS[id]).join(', ') || 'None';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#be185d;padding:24px 32px;">
            <p style="margin:0;color:#fce7f3;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">MB Sports Builders</p>
            <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;">We received your court design</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0;font-size:15px;color:#374151;line-height:1.55;">
            Thanks, ${escHtml(safeFirstName(contact.name))}! Here is the ${COURT_LABELS[config.type].toLowerCase()} court you designed.
            Our team will review it and send your detailed quote within 24–48 hours.
          </td>
        </tr>
        ${has3D ? `
        <tr>
          <td style="padding:20px 32px 0;">
            <img src="cid:court-3d" alt="Your court design" width="536"
              style="width:100%;border-radius:8px;display:block;border:1px solid #e2e8f0;" />
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:20px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              ${row('Court', COURT_LABELS[config.type])}
              ${row('Size', `${dims.length} × ${dims.width} ft (${(dims.length * dims.width).toLocaleString('en-US')} sq ft)`)}
              ${row('Surface', FINISH_LABELS[config.surfaceFinish])}
              ${row('Extras', acc)}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0;font-size:14px;color:#374151;line-height:1.6;">
            <strong>What happens next</strong><br>
            1. Our team reviews your design<br>
            2. We prepare a detailed written quote<br>
            3. We schedule a free on-site evaluation<br>
            4. Construction begins on your timeline
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 28px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;border-top:1px solid #f1f5f9;padding-top:16px;">
              Questions? Just reply to this email. Your design summary is attached as a PDF.<br>
              MB Sports Builders &nbsp;·&nbsp; mbsportsbuilders.com
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Lead webhook (Zapier, Make, a CRM…) ──────────────────────────────────────
/** Posts the lead as JSON to LEAD_WEBHOOK_URL when set. Never blocks the quote. */
async function postLeadWebhook(data: z.infer<typeof schema>): Promise<void> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url || !url.startsWith('https://')) return;
  const { contact, config } = data;
  const body = {
    submittedAt: new Date().toISOString(),
    source: 'mb-court-builder',
    name: contact.name, email: contact.email, phone: contact.phone ?? '',
    zip: contact.zip, city: contact.city ?? '', state: contact.state ?? '',
    timeline: contact.timeline ? LEAD_TIMELINE[contact.timeline] : '',
    site: contact.site ? LEAD_SITE[contact.site] : '',
    foundUs: contact.source ? LEAD_SOURCE[contact.source] : '',
    notes: contact.message ?? '',
    court: COURT_LABELS[config.type],
    property: config.propertyType,
    lengthFt: config.dimensions.length, widthFt: config.dimensions.width,
    areaSqFt: config.dimensions.length * config.dimensions.width,
    surface: FINISH_LABELS[config.surfaceFinish],
    surfaceColor: config.colors.surface, lineColor: config.colors.lines, borderColor: config.colors.border,
    extras: config.selectedAccessories.map((id) => ACCESSORY_LABELS[id]).join(', '),
  };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) console.error('Lead webhook responded', r.status);
  } catch (err) {
    console.error('Lead webhook failed:', err);
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
  if (await isLimited(`ip:${ip}`, 10, 300)) {
    return res.status(429).json({ error: 'Too many requests — please try again later.' });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    console.error('Validation error:', JSON.stringify(parsed.error.flatten()));
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const { contact, courtImageBase64, court3DImageBase64, pdfBase64, recaptchaToken } = parsed.data;
  const captcha = await checkRecaptcha(recaptchaToken);
  if (captcha === 'fail') {
    return res.status(400).json({ error: 'reCAPTCHA verification failed' });
  }
  // Only genuine JPEGs / PDFs are attached; anything else is dropped
  const imgBuf = decode(courtImageBase64, isJpeg);
  const img3DBuf = decode(court3DImageBase64, isJpeg);
  const pdfBuf = decode(pdfBase64, isPdf);

  const img3DAttachment = img3DBuf
    ? [{ filename: 'court-3d.jpg', content: img3DBuf, contentType: 'image/jpeg', cid: 'court-3d' }] : [];
  const pdfAttachment = pdfBuf
    ? [{ filename: 'court-design.pdf', content: pdfBuf, contentType: 'application/pdf' }] : [];

  try {
    await transporter.sendMail({
      from:    `"MB Sports Court Builder" <${process.env.SMTP_USER}>`,
      to:      process.env.QUOTE_TO,
      cc:      process.env.QUOTE_TO_CC  || undefined,
      bcc:     process.env.QUOTE_TO_BCC || undefined,
      replyTo: contact.email,
      subject: `New Court Quote – ${contact.name} (${contact.zip})`,
      html:    buildHtml(parsed.data, !!imgBuf, !!img3DBuf),
      attachments: [
        ...img3DAttachment,
        ...(imgBuf ? [{
          filename:    'court-preview.jpg',
          content:     imgBuf,
          contentType: 'image/jpeg',
          cid:         'court-preview',
        }] : []),
        ...pdfAttachment,
      ],
    });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }

  // The quote is in. Everything below is best-effort and never fails the request.
  const extras: Promise<unknown>[] = [postLeadWebhook(parsed.data)];

  // Confirmation to the customer: only for verified humans, at most once a day
  // per address, and can be switched off with CUSTOMER_CONFIRMATION=off
  const confirmEnabled = process.env.CUSTOMER_CONFIRMATION !== 'off';
  if (confirmEnabled && captcha === 'pass'
      && !(await isLimited(`confirm:${contact.email.toLowerCase()}`, 1, 86_400))) {
    extras.push(transporter.sendMail({
      from:    `"MB Sports Builders" <${process.env.SMTP_USER}>`,
      to:      contact.email,
      replyTo: process.env.QUOTE_TO,
      subject: 'Your MB Sports Builders court design',
      html:    buildCustomerHtml(parsed.data, !!img3DBuf),
      attachments: [...img3DAttachment, ...pdfAttachment],
    }).catch((err) => console.error('Confirmation email error:', err)));
  } else if (confirmEnabled && captcha !== 'pass') {
    console.warn('Confirmation email skipped: reCAPTCHA not verified');
  }

  await Promise.allSettled(extras);
  return res.status(200).json({ ok: true });
}
