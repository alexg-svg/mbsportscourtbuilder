import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'crypto';

// ─── Startup env guard ────────────────────────────────────────────────────────
const REQUIRED_ENV = ['OTP_SECRET'] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

// ─── Input validation schema ──────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email().max(254),
  code:  z.string().regex(/^\d{6}$/),
  token: z.string().max(200),
});

// ─── Rate limiter: 5 attempts per 10 minutes per email ───────────────────────
const ratemap = new Map<string, { count: number; reset: number }>();
function isRateLimited(email: string): boolean {
  const now    = Date.now();
  const WINDOW = 10 * 60 * 1000;
  const LIMIT  = 5;
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

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const { email, code, token } = parsed.data;

  if (isRateLimited(email)) {
    return res.status(429).json({ error: 'Too many attempts — please request a new code.' });
  }

  // ── Split token into timestamp + hmac ──────────────────────────────────────
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) {
    return res.status(400).json({ error: 'Invalid token format' });
  }
  const timestamp = token.slice(0, dotIndex);
  const hmac      = token.slice(dotIndex + 1);

  // ── Check expiry (10 minutes) ──────────────────────────────────────────────
  const ts = Number(timestamp);
  if (isNaN(ts) || Date.now() - ts > 10 * 60 * 1000) {
    return res.status(400).json({ error: 'Code expired — please request a new one.' });
  }

  // ── Recompute HMAC and compare in constant time ────────────────────────────
  const expected = createHmac('sha256', process.env.OTP_SECRET!)
    .update(`${email}:${code}:${timestamp}`)
    .digest('hex');

  let valid = false;
  try {
    valid = timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));
  } catch {
    // timingSafeEqual throws if buffers have different lengths
    valid = false;
  }

  if (!valid) {
    return res.status(400).json({ error: 'Incorrect code — please try again.' });
  }

  return res.status(200).json({ ok: true });
}
