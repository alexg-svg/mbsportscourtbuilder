import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const COURT_LABELS: Record<string, string> = {
  basketball:    'Basketball',
  tennis:        'Tennis',
  pickleball:    'Pickleball',
  'multi-sport': 'Multi-Sport',
};

const FINISH_LABELS: Record<string, string> = {
  smooth:    'Smooth Asphalt',
  textured:  'Textured Asphalt',
  cushioned: 'Cushioned Asphalt',
};

function swatch(color: string) {
  return `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${color};border:1px solid #ddd;vertical-align:middle;margin-right:4px;"></span>${color}`;
}

function buildHtml(b: Record<string, unknown>): string {
  const config   = b.config   as Record<string, unknown>;
  const contact  = b.contact  as Record<string, string>;
  const dims     = config.dimensions as Record<string, number>;
  const colors   = config.colors    as Record<string, string>;
  const acc      = (config.selectedAccessories as string[]).join(', ') || 'None';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#be185d;padding:24px 32px;">
            <p style="margin:0;color:#fce7f3;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;">MB Sports Builders</p>
            <h1 style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;">New Quote Request</h1>
          </td>
        </tr>

        <!-- Contact -->
        <tr>
          <td style="padding:28px 32px 0;">
            <h2 style="margin:0 0 14px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Contact</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:5px 0;width:90px;color:#6b7280;font-size:14px;">Name</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;font-weight:600;">${contact.name}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">Email</td>
                <td style="padding:5px 0;font-size:14px;"><a href="mailto:${contact.email}" style="color:#be185d;">${contact.email}</a></td>
              </tr>
              ${contact.phone ? `<tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">Phone</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${contact.phone}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;">ZIP</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${contact.zip}</td>
              </tr>
              ${contact.message ? `<tr>
                <td style="padding:5px 0;color:#6b7280;font-size:14px;vertical-align:top;">Notes</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;">${contact.message}</td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- Court Config -->
        <tr>
          <td style="padding:24px 32px 0;">
            <h2 style="margin:0 0 14px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Court Design</h2>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:5px 0;width:90px;color:#6b7280;font-size:14px;">Sport</td>
                <td style="padding:5px 0;color:#111827;font-size:14px;font-weight:600;">${COURT_LABELS[config.type as string] ?? config.type}</td>
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
                <td style="padding:5px 0;color:#111827;font-size:14px;">${FINISH_LABELS[config.surfaceFinish as string] ?? config.surfaceFinish}</td>
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
                <td style="padding:5px 0;color:#111827;font-size:14px;">${acc}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as Record<string, unknown>;
  if (!body?.contact || !body?.config) {
    return res.status(400).json({ error: 'Missing contact or config' });
  }

  const contact = body.contact as Record<string, string>;
  if (!contact.name || !contact.email || !contact.zip) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await transporter.sendMail({
      from:    `"MB Sports Court Builder" <${process.env.SMTP_USER}>`,
      to:      process.env.QUOTE_TO,
      replyTo: contact.email,
      subject: `New Court Quote – ${contact.name} (${contact.zip})`,
      html:    buildHtml(body),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
