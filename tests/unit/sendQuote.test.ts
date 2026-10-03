import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Quote API with email, Google reCAPTCHA, the lead webhook and the KV
// counter all replaced by in-memory fakes.
const sent: any[] = [];
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: async (m: any) => { sent.push(m); return {}; } }) },
}));

let googleScore = 0.9;
let hooks: any[] = [];
const kvStore = new Map<string, number>();
vi.stubGlobal('fetch', async (url: string, opts: any) => {
  url = String(url);
  if (url.includes('recaptcha/api/siteverify')) return { json: async () => ({ success: true, score: googleScore }) };
  if (url.startsWith('https://hooks.example.com')) { hooks.push(JSON.parse(opts.body)); return { ok: true, status: 200 }; }
  if (url.startsWith('https://kv.example.com/pipeline')) {
    const cmds = JSON.parse(opts.body) as [string, string][];
    return { json: async () => cmds.map(([c, k]) => {
      if (c !== 'INCR') return { result: 1 };
      const n = (kvStore.get(k) ?? 0) + 1; kvStore.set(k, n); return { result: n };
    }) };
  }
  throw new Error(`unexpected fetch ${url}`);
});

Object.assign(process.env, {
  SMTP_USER: 'quotes@example.com', SMTP_PASS: 'x', QUOTE_TO: 'team@example.com', RECAPTCHA_SECRET: 's',
  LEAD_WEBHOOK_URL: 'https://hooks.example.com/abc', KV_REST_API_URL: 'https://kv.example.com', KV_REST_API_TOKEN: 't',
});

let handler: (req: any, res: any) => Promise<unknown>;
beforeAll(async () => { handler = (await import('../../api/send-quote')).default as any; });
beforeEach(() => { sent.length = 0; hooks = []; googleScore = 0.9; delete process.env.CUSTOMER_CONFIRMATION; });

let ipCounter = 0;
const call = (body: unknown, ip = `10.0.0.${++ipCounter}`) => new Promise<[number, any]>((resolve) => {
  const res = {
    statusCode: 0,
    status(c: number) { this.statusCode = c; return this; },
    json(b: unknown) { resolve([this.statusCode, b]); },
    end() { resolve([this.statusCode, undefined]); },
  };
  handler({ method: 'POST', headers: { 'x-forwarded-for': ip }, socket: {}, body }, res);
});

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64');
const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
let n = 0;
const quote = (contact: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  contact: { name: 'Jane Smith', email: `jane${++n}@gmail.com`, phone: '', zip: '90210', message: '',
    timeline: '1-3-months', site: 'existing-slab', source: '', ...contact },
  config: { type: 'tennis', propertyType: 'residential', surfaceFinish: 'smooth', dimensions: { length: 78, width: 36 },
    colors: { surface: '#2D7D3A', lines: '#FFFFFF', border: '#14532D' },
    selectedAccessories: ['tennis-net', 'lighting-4-pole'], customDimensions: false },
  court3DImageBase64: jpeg, pdfBase64: pdf, recaptchaToken: 'tok', ...extra,
});

describe('send-quote API', () => {
  it('emails the team and the verified customer, and posts the lead', async () => {
    const [status] = await call(quote({ email: 'jane@gmail.com' }));
    expect(status).toBe(200);
    expect(sent.map((m) => m.to)).toEqual(['team@example.com', 'jane@gmail.com']);
    const [team, customer] = sent;
    expect(team.html).toContain('In 1–3 months');
    expect(team.html).toContain('Existing concrete or asphalt slab');
    expect(team.html).toContain('Tennis Net &amp; Posts');
    expect(team.attachments.map((a: any) => a.filename)).toEqual(['court-3d.jpg', 'court-design.pdf']);
    expect(customer.html).toContain('Thanks, Jane!');
    expect(customer.attachments.map((a: any) => a.filename)).toEqual(['court-3d.jpg', 'court-design.pdf']);
    expect(hooks).toHaveLength(1);
    expect(hooks[0]).toMatchObject({ court: 'Tennis', timeline: 'In 1–3 months', extras: 'Tennis Net & Posts, Lighting – 4 Poles' });
  });

  it('sends at most one confirmation per address per day', async () => {
    await call(quote({ email: 'repeat@gmail.com' }));
    sent.length = 0;
    await call(quote({ email: 'repeat@gmail.com' }));
    expect(sent.map((m) => m.to)).toEqual(['team@example.com']);
  });

  it('rejects a bot and sends nothing', async () => {
    googleScore = 0.1;
    const [status] = await call(quote());
    expect(status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it('accepts an unverified quote but skips the confirmation', async () => {
    const [status] = await call(quote({}, { recaptchaToken: undefined }));
    expect(status).toBe(200);
    expect(sent.map((m) => m.to)).toEqual(['team@example.com']);
  });

  it('drops attachments that are not really JPEG / PDF', async () => {
    await call(quote({}, {
      court3DImageBase64: Buffer.from('<html>').toString('base64'),
      pdfBase64: Buffer.from('MZ not a pdf').toString('base64'),
    }));
    for (const m of sent) expect(m.attachments ?? []).toHaveLength(0);
  });

  it('strips link-like names from the confirmation', async () => {
    await call(quote({ name: 'www.cheap-pills.biz Bob' }));
    expect(sent[1].html).toContain('Thanks, there!');
    expect(sent[1].html).not.toContain('cheap-pills');
  });

  it('can switch the confirmation off', async () => {
    process.env.CUSTOMER_CONFIRMATION = 'off';
    await call(quote());
    expect(sent.map((m) => m.to)).toEqual(['team@example.com']);
  });

  it('limits one IP to 10 quotes per 5 minutes', async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) [last] = await call(quote(), '192.0.2.1');
    expect(last).toBe(429);
  });

  it('rejects decimal sizes, oversized courts and unknown accessories', async () => {
    const bad = (config: Record<string, unknown>) => call({ ...quote(), config: { ...quote().config, ...config } });
    expect((await bad({ dimensions: { length: 52.5, width: 6 } }))[0]).toBe(400);
    expect((await bad({ dimensions: { length: 400, width: 36 } }))[0]).toBe(400);
    expect((await bad({ selectedAccessories: ['jetpack'] }))[0]).toBe(400);
  });

  it('accepts narrow courts like shuffleboard', async () => {
    const [status] = await call({ ...quote(), config: { ...quote().config, type: 'shuffleboard', dimensions: { length: 52, width: 6 }, selectedAccessories: [] } });
    expect(status).toBe(200);
  });

  it('accepts long reCAPTCHA tokens', async () => {
    const [status] = await call(quote({}, { recaptchaToken: 'x'.repeat(5000) }));
    expect(status).toBe(200);
  });
});
