import React, { useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, MapPin } from 'lucide-react';
import type { CourtConfig } from '../../types/court';
import { ACCESSORIES, COURT_PRESETS } from '../../utils/courtData';
import { StepShell } from './StepShell';
import { trackEvent, getRecaptchaToken } from '../../utils/analytics';

interface Props {
  config: CourtConfig;
  onBack: () => void;
  onSubmit: (data: ContactData) => void;
  getCaptureImage?: () => Promise<string | undefined>;
  verifiedEmail?: string;
}

export interface ContactData {
  name: string;
  email: string;
  phone: string;
  zip: string;
  city?: string;
  state?: string;
  message: string;
}

const COURT_LABELS: Record<string, string> = {
  basketball: 'Basketball', tennis: 'Tennis',
  pickleball: 'Pickleball', 'multi-sport': 'Multi-Sport',
  'bocce-ball': 'Bocce Ball', shuffleboard: 'Shuffleboard',
  volleyball: 'Volleyball', badminton: 'Badminton',
  futsal: 'Futsal', 'inline-hockey': 'Inline Hockey',
  handball: 'Handball', 'four-square': 'Four-Square',
};

const FINISH_LABELS: Record<string, string> = {
  smooth: 'Smooth Asphalt', textured: 'Textured Asphalt', cushioned: 'Cushioned Asphalt',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BLOCKED_EMAIL_DOMAINS = new Set([
  'example.com', 'example.org', 'example.net',
  'test.com', 'test.org', 'test.net',
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net',
  'guerrillamail.info', 'guerrillamailblock.com',
  'tempmail.com', 'temp-mail.org', 'tempmail.net',
  'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'sharklasers.com', 'guerrillamail.de', 'spam4.me',
  'trashmail.com', 'trashmail.org', 'trashmail.me', 'trashmail.net',
  'fakeinbox.com', 'dispostable.com', 'maildrop.cc',
  'spamgourmet.com', 'spamgourmet.org',
  'throwam.com', 'throwaway.email', 'tempr.email',
  'getairmail.com', 'discard.email', 'mailnull.com',
  'emailondeck.com', '10minutemail.com', '10minemail.com',
  'mailtemp.net', 'getnada.com', 'filzmail.com',
]);

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Enter a valid email address.';
  const domain = email.split('@')[1].toLowerCase();
  if (BLOCKED_EMAIL_DOMAINS.has(domain)) return 'Please use your real email address.';
  return null;
}

function validatePhone(phone: string): string | null {
  if (!phone.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  const local = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  if (local.length !== 10) return 'Enter a 10-digit US phone number.';
  if (/^[01]/.test(local)) return 'Enter a valid area code.';
  if (/^(\d)\1{9}$/.test(local)) return 'Enter a valid phone number.';
  if (local === '1234567890' || local === '0123456789') return 'Enter a valid phone number.';
  if (local.slice(3, 6) === '555' && /^01[0-9]{2}$/.test(local.slice(6))) return 'Enter a valid phone number.';
  return null;
}

function validateZip(zip: string): string | null {
  if (!zip.trim()) return 'ZIP code is required.';
  const trimmed = zip.trim();
  if (/^\d{5}$/.test(trimmed)) {
    if (trimmed === '00000') return 'Enter a valid ZIP code.';
    if (/^(\d)\1{4}$/.test(trimmed)) return 'Enter a valid ZIP code.';
    return null;
  }
  if (/^\d{5}-\d{4}$/.test(trimmed)) return null;
  if (/^[A-Za-z]\d[A-Za-z][\s\-]?\d[A-Za-z]\d$/.test(trimmed)) return null;
  return 'Enter a valid ZIP or postal code.';
}

// Auto-format phone number as (XXX) XXX-XXXX
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Lookup city/state from US ZIP via public API (fail open)
async function lookupZip(zip: string): Promise<{ city: string; state: string } | null> {
  if (!/^\d{5}$/.test(zip.trim())) return null;
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip.trim()}`);
    if (!res.ok) return null;
    const data = await res.json() as { places: Array<{ 'place name': string; 'state abbreviation': string }> };
    const place = data.places?.[0];
    if (!place) return null;
    return { city: place['place name'], state: place['state abbreviation'] };
  } catch { return null; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Step6Contact: React.FC<Props> = ({ config, onBack, onSubmit, getCaptureImage, verifiedEmail }) => {
  const [form, setForm]         = useState<ContactData>({ name: '', email: verifiedEmail ?? '', phone: '', zip: '', message: '' });
  const [touched, setTouched]   = useState<Partial<Record<keyof ContactData, boolean>>>({});
  const [zipLooking, setZipLooking] = useState(false);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fieldErrors: Partial<Record<keyof ContactData, string | null>> = {
    email: validateEmail(form.email),
    phone: validatePhone(form.phone),
    zip:   validateZip(form.zip),
  };

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
  const showError = (k: keyof ContactData) => touched[k] ? fieldErrors[k] : null;
  const isValid   = (k: keyof ContactData) => touched[k] && !fieldErrors[k];

  const blur = (k: keyof ContactData) => () => setTouched(t => ({ ...t, [k]: true }));

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, phone: formatPhone(e.target.value) }));
  };

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, zip: e.target.value, city: undefined, state: undefined }));
  };

  const handleZipBlur = useCallback(async () => {
    setTouched(t => ({ ...t, zip: true }));
    const zip = form.zip.trim();
    if (!/^\d{5}$/.test(zip) || zip === '00000' || /^(\d)\1{4}$/.test(zip)) return;
    setZipLooking(true);
    const result = await lookupZip(zip);
    setZipLooking(false);
    if (result) {
      setForm(f => ({ ...f, city: result.city, state: result.state }));
    }
  }, [form.zip]);

  const { dimensions, type, propertyType, surfaceFinish, selectedAccessories } = config;
  const presetName =
    COURT_PRESETS.find(
      (p) => p.type === type && p.dimensions.width === dimensions.width && p.dimensions.length === dimensions.length,
    )?.name ?? 'Custom';

  const accItems  = ACCESSORIES.filter((a) => selectedAccessories.includes(a.id));
  const canSubmit = !sending && form.name.trim() && !hasFieldErrors && form.email.trim() && form.zip.trim();

  const handleSubmit = async () => {
    setTouched({ email: true, phone: true, zip: true });
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      const [rawImage, recaptchaToken] = await Promise.all([
        getCaptureImage?.(),
        getRecaptchaToken('submit_quote').catch(() => undefined),
      ]);
      const courtImageBase64 = rawImage && rawImage.length <= 650_000 ? rawImage : undefined;
      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: form, config, courtImageBase64, recaptchaToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; details?: { fieldErrors?: Record<string, string[]> } };
        console.error('Quote submission failed:', JSON.stringify(body));
        const fields = body.details?.fieldErrors
          ? Object.entries(body.details.fieldErrors).map(([k, v]) => `${k}: ${v[0]}`).join('; ')
          : '';
        throw new Error(`${body.error ?? `Server error ${res.status}`}${fields ? ` — ${fields}` : ''}`);
      }
      trackEvent('quote_submitted', { court_type: config.type, property_type: config.propertyType, accessories_count: config.selectedAccessories.length });
      onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong sending your quote. Please try again or call us directly.');
    } finally {
      setSending(false);
    }
  };

  const inputClass = (k: keyof ContactData) =>
    `w-full bg-theme-raised border rounded-lg px-3 py-2 pr-8 text-sm text-theme-primary placeholder-theme-faint focus:outline-none transition-colors ${
      showError(k) ? 'border-red-500/60 focus:border-red-500'
      : isValid(k) ? 'border-green-500/60 focus:border-green-500'
      : 'border-theme-mid focus:border-pink-500'
    }`;

  return (
    <StepShell
      step={6} totalSteps={6}
      title="Almost there!"
      subtitle="Tell us how to reach you and we'll prepare your custom quote."
      onBack={onBack}
      onNext={handleSubmit}
      nextLabel={sending ? 'Sending…' : 'Submit My Design →'}
      nextDisabled={!canSubmit}
    >
      <div className="space-y-4 mt-2">
        {/* Mini summary */}
        <div className="bg-theme-raised/60 border border-theme-mid rounded-xl p-3 space-y-1 text-xs">
          <div className="text-theme-muted font-semibold uppercase tracking-wider mb-2">Your Design Summary</div>
          <SumRow label="Court"   value={`${COURT_LABELS[type]} · ${propertyType}`} />
          <SumRow label="Size"    value={`${dimensions.length}×${dimensions.width} ft (${presetName})`} />
          <SumRow label="Surface" value={FINISH_LABELS[surfaceFinish]} />
          {accItems.length > 0 && (
            <SumRow label="Extras" value={accItems.map((a) => a.name).join(', ')} />
          )}
          <div className="flex items-center gap-2 pt-1">
            <div className="w-4 h-4 rounded border" style={{ backgroundColor: config.colors.surface }} />
            <div className="w-4 h-4 rounded border" style={{ backgroundColor: config.colors.border }} />
            <div className="w-4 h-4 rounded border" style={{ backgroundColor: config.colors.lines }} />
            <span className="text-theme-muted">Selected colors</span>
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-theme-muted mb-1">Full Name *</label>
            <input required type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Jane Smith"
              className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-faint focus:outline-none focus:border-pink-500" />
          </div>

          {/* Phone with auto-format */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-theme-muted mb-1">Phone</label>
            <div className="relative">
              <input type="tel" value={form.phone}
                onChange={handlePhoneChange} onBlur={blur('phone')}
                placeholder="(555) 000-0000"
                className={inputClass('phone')} />
              {showError('phone')
                ? <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
                : isValid('phone') && form.phone
                  ? <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
                  : null}
            </div>
            {showError('phone') && <FieldError msg={showError('phone')!} />}
          </div>

          {/* Email with live validation indicator */}
          <div className="col-span-2">
            <label className="block text-xs text-theme-muted mb-1">Email *</label>
            <div className="relative">
              <input required type="email" value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); }}
                onBlur={blur('email')}
                placeholder="jane@example.com"
                className={inputClass('email')} />
              {showError('email')
                ? <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
                : isValid('email')
                  ? <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
                  : null}
            </div>
            {showError('email') && <FieldError msg={showError('email')!} />}
          </div>

          {/* ZIP with city/state lookup */}
          <div className="col-span-2">
            <label className="block text-xs text-theme-muted mb-1">ZIP Code *</label>
            <div className="relative">
              <input required type="text" value={form.zip}
                onChange={handleZipChange} onBlur={handleZipBlur}
                placeholder="e.g. 90210"
                className={inputClass('zip')} />
              {zipLooking
                ? <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-pink-400/40 border-t-pink-400 rounded-full animate-spin pointer-events-none" />
                : showError('zip')
                  ? <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
                  : isValid('zip')
                    ? <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
                    : null}
            </div>
            {showError('zip') && <FieldError msg={showError('zip')!} />}
            {form.city && form.state && !showError('zip') && (
              <p className="flex items-center gap-1 mt-1 text-xs text-green-400">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {form.city}, {form.state}
              </p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-theme-muted mb-1">Notes (optional)</label>
            <textarea rows={2} value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Timeline, site conditions, questions..."
              className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-faint focus:outline-none focus:border-pink-500 resize-none" />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <p className="text-xs text-theme-faint text-center">
          No commitment required · We respond within 24–48 hours
        </p>
      </div>
    </StepShell>
  );
};

const FieldError: React.FC<{ msg: string }> = ({ msg }) => (
  <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
    <AlertCircle className="w-3 h-3 flex-shrink-0" />
    {msg}
  </p>
);

const SumRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="text-theme-muted w-14 flex-shrink-0">{label}</span>
    <span className="text-theme-primary/80">{value}</span>
  </div>
);
