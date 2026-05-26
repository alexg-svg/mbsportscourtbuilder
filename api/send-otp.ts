import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { createHmac, randomInt } from 'crypto';

// ─── Startup env guard ────────────────────────────────────────────────────────
const REQUIRED_ENV = ['SMTP_USER', 'SMTP_PASS', 'OTP_SECRET'] as const;
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
const schema = z.object({
  email: z.string().email().max(254),
});

// ─── Rate limiter: 3 requests per 10 minutes per email ───────────────────────
const ratemap = new Map<string, { count: number; reset: number }>();
function isRateLimited(email: string): boolean {
  const now    = Date.now();
  const WINDOW = 10 * 60 * 1000;
  const LIMIT  = 3;
  const key    = email.toLowerCase();
  const entry  = ratemap.get(key);
  if (!entry || now > entry.reset) {
    ratemap.set(key, { count: 1, reset: now + WINDOW });
    return false;
  }
  if (entry.count >= LIMIT) return true;
  entry.count++;
  return false;
}

// ─── Token generation ─────────────────────────────────────────────────────────
function generateToken(email: string, code: string, timestamp: number): string {
  const hmac = createHmac('sha256', process.env.OTP_SECRET!)
    .update(`${email}:${code}:${timestamp}`)
    .digest('hex');
  return `${timestamp}.${hmac}`;
}

// ─── Email template ───────────────────────────────────────────────────────────
function buildOtpHtml(email: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

        <!-- Header -->
        <tr>
          <td style="background:#be185d;padding:28px 36px;">
            <p style="margin:0;color:#fce7f3;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">MB Sports Builders</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:800;line-height:1.2;">Your Verification Code</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 24px;">
            <p style="margin:0 0 24px;color:#94a3b8;font-size:15px;line-height:1.6;">
              Use the code below to verify your email address and access the Court Designer.
              This code is valid for <strong style="color:#e2e8f0;">10 minutes</strong>.
            </p>

            <!-- Code block -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:28px 24px;background:#0f172a;border-radius:12px;border:1px solid #334155;">
                  <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">Verification Code</p>
                  <p style="margin:0;color:#be185d;font-size:48px;font-weight:900;letter-spacing:.25em;font-family:'Courier New',monospace;">${code}</p>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
              If you didn't request this code, you can safely ignore this email.
              Someone may have entered your email address by mistake.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px 28px;border-top:1px solid #1e293b;">
            <p style="margin:0;font-size:12px;color:#475569;">
              Sent to ${escHtml(email)} &nbsp;·&nbsp;
              <a href="https://mbsportsbuilders.com" style="color:#be185d;text-decoration:none;">mbsportsbuilders.com</a>
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
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const { email } = parsed.data;

  if (isRateLimited(email)) {
    return res.status(429).json({ error: 'Too many requests — please try again in a few minutes.' });
  }

  const code      = String(randomInt(100000, 999999));
  const timestamp = Date.now();
  const token     = generateToken(email, code, timestamp);

  try {
    await transporter.sendMail({
      from:    `"MB Sports Builders" <${process.env.SMTP_USER}>`,
      to:      email,
      subject: `Your MB Sports Builders verification code: ${code}`,
      html:    buildOtpHtml(email, code),
    });

    return res.status(200).json({ token });
  } catch (err) {
    console.error('OTP email send error:', err);
    return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
}
