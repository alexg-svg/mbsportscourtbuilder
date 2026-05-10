import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { z } from 'zod';

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

const COURT_TYPES   = ['basketball', 'tennis', 'pickleball', 'multi-sport'] as const;
const PROP_TYPES    = ['residential', 'commercial'] as const;
const FINISHES      = ['smooth', 'textured', 'cushioned'] as const;
const ACCESSORY_IDS = [
  'custom-logo',
  'basketball-hoop-single', 'basketball-hoop-double',
  'tennis-net', 'pickleball-net',
  'lighting-2-pole', 'lighting-4-pole', 'lighting-6-pole',
  'chain-link-fence', 'vinyl-fence', 'windscreen',
  'bench-2', 'bench-4', 'water-fountain', 'scoreboards',
] as const;

const schema = z.object({
  contact: z.object({
    name:    SAFE_STRING(120),
    email:   z.string().email().max(254).transform((s) => s.replace(/[\r\n\0]/g, '')),
    phone:   SAFE_STRING(30).optional(),
    zip:     z.string().regex(/^[0-9A-Za-z\s\-]{3,10}$/),
    message: SAFE_STRING(2000).optional(),
  }),
  config: z.object({
    type:          z.enum(COURT_TYPES),
    propertyType:  z.enum(PROP_TYPES),
    surfaceFinish: z.enum(FINISHES),
    dimensions: z.object({
      length: z.number().int().min(20).max(200),
      width:  z.number().int().min(10).max(100),
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
});

// ─── Simple per-instance rate limiter (10 req / 5 min per IP) ─────────────────
const ratemap = new Map<string, { count: number; reset: number }>();
function isRateLimited(ip: string): boolean {
  const now  = Date.now();
  const WINDOW = 5 * 60 * 1000;
  const LIMIT  = 10;
  const entry  = ratemap.get(ip);
  if (!entry || now > entry.reset) {
    ratemap.set(ip, { count: 1, reset: now + WINDOW });
    return false;
  }
  if (entry.count >= LIMIT) return true;
  entry.count++;
  return false;
}

// ─── Email template ───────────────────────────────────────────────────────────
const COURT_LABELS: Record<string, string> = {
  basketball: 'Basketball', tennis: 'Tennis',
  pickleball: 'Pickleball', 'multi-sport': 'Multi-Sport',
};
const FINISH_LABELS: Record<string, string> = {
  smooth: 'Smooth Asphalt', textured: 'Textured Asphalt', cushioned: 'Cushioned Asphalt',
};

function swatch(color: string) {
  // color is already validated as /^#[0-9A-Fa-f]{6}$/ at this point
  return `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${color};border:1px solid #ddd;vertical-align:middle;margin-right:4px;"></span>${color}`;
}

function buildHtml(data: z.infer<typeof schema>, hasImage: boolean): string {
  const { contact, config } = data;
  const { dimensions: dims, colors } = config;
  const acc = config.selectedAccessories.join(', ') || 'None';

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

        ${hasImage ? `
        <tr>
          <td style="padding:20px 32px 0;">
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
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests — please try again later.' });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
  }

  const { contact, courtImageBase64 } = parsed.data;
  const imgBuf = courtImageBase64 ? Buffer.from(courtImageBase64, 'base64') : undefined;

  try {
    await transporter.sendMail({
      from:    `"MB Sports Court Builder" <${process.env.SMTP_USER}>`,
      to:      process.env.QUOTE_TO,
      cc:      process.env.QUOTE_TO_CC  || undefined,
      bcc:     process.env.QUOTE_TO_BCC || undefined,
      replyTo: contact.email,
      subject: `New Court Quote – ${contact.name} (${contact.zip})`,
      html:    buildHtml(parsed.data, !!imgBuf),
      attachments: imgBuf ? [{
        filename:    'court-preview.jpg',
        content:     imgBuf,
        contentType: 'image/jpeg',
        cid:         'court-preview',
      }] : undefined,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
