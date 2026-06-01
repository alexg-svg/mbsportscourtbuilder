import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
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

// ─── Validation helpers ───────────────────────────────────────────────────────

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
  if (!phone.trim()) return null; // optional
  const digits = phone.replace(/\D/g, '');
  // Accept +1 or 1 country code prefix
  const local = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  if (local.length !== 10) return 'Enter a 10-digit US phone number.';
  if (/^[01]/.test(local)) return 'Enter a valid area code.';
  if (/^(\d)\1{9}$/.test(local)) return 'Enter a valid phone number.'; // all same digit
  if (local === '1234567890' || local === '0123456789') return 'Enter a valid phone number.';
  if (local.slice(3, 6) === '555' && /^01[0-9]{2}$/.test(local.slice(6))) return 'Enter a valid phone number.'; // 555-01xx (fictional)
  return null;
}

function validateZip(zip: string): string | null {
  if (!zip.trim()) return 'ZIP code is required.';
  const trimmed = zip.trim();
  // US 5-digit ZIP
  if (/^\d{5}$/.test(trimmed)) {
    if (trimmed === '00000') return 'Enter a valid ZIP code.';
    if (/^(\d)\1{4}$/.test(trimmed)) return 'Enter a valid ZIP code.'; // 11111, 22222, etc.
    return null;
  }
  // US ZIP+4
  if (/^\d{5}-\d{4}$/.test(trimmed)) return null;
  // Canadian postal code (A1A 1A1 or A1A1A1)
  if (/^[A-Za-z]\d[A-Za-z][\s\-]?\d[A-Za-z]\d$/.test(trimmed)) return null;
  return 'Enter a valid ZIP or postal code.';
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Step6Contact: React.FC<Props> = ({ config, onBack, onSubmit, getCaptureImage, verifiedEmail }) => {
  const [form, setForm]       = useState<ContactData>({ name: '', email: verifiedEmail ?? '', phone: '', zip: '', message: '' });
  const [touched, setTouched] = useState<Partial<Record<keyof ContactData, boolean>>>({});
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fieldErrors: Partial<Record<keyof ContactData, string | null>> = {
    email: validateEmail(form.email),
    phone: validatePhone(form.phone),
    zip:   validateZip(form.zip),
  };

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);

  const set = (k: keyof ContactData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const blur = (k: keyof ContactData) => () => setTouched((t) => ({ ...t, [k]: true }));

  const showError = (k: keyof ContactData) => touched[k] ? fieldErrors[k] : null;

  const { dimensions, type, propertyType, surfaceFinish, selectedAccessories } = config;
  const presetName =
    COURT_PRESETS.find(
      (p) => p.type === type && p.dimensions.width === dimensions.width && p.dimensions.length === dimensions.length,
    )?.name ?? 'Custom';

  const accItems  = ACCESSORIES.filter((a) => selectedAccessories.includes(a.id));
  const canSubmit = !sending && form.name.trim() && !hasFieldErrors && form.email.trim() && form.zip.trim();

  const handleSubmit = async () => {
    // Touch all validated fields to reveal any hidden errors
    setTouched({ email: true, phone: true, zip: true });
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      const [courtImageBase64, recaptchaToken] = await Promise.all([
        getCaptureImage?.(),
        getRecaptchaToken('submit_quote').catch(() => undefined),
      ]);
      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: form, config, courtImageBase64, recaptchaToken }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Server error ${res.status}`);
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
    `w-full bg-theme-raised border rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-faint focus:outline-none transition-colors ${
      showError(k)
        ? 'border-red-500/60 focus:border-red-500'
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
          <SumRow label="Court"    value={`${COURT_LABELS[type]} · ${propertyType}`} />
          <SumRow label="Size"     value={`${dimensions.length}×${dimensions.width} ft (${presetName})`} />
          <SumRow label="Surface"  value={FINISH_LABELS[surfaceFinish]} />
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
            <input required type="text" value={form.name} onChange={set('name')}
              placeholder="Jane Smith"
              className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-theme-faint focus:outline-none focus:border-pink-500" />
          </div>

          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-theme-muted mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={set('phone')} onBlur={blur('phone')}
              placeholder="(555) 000-0000"
              className={inputClass('phone')} />
            {showError('phone') && <FieldError msg={showError('phone')!} />}
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-theme-muted mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={set('email')} onBlur={blur('email')}
              placeholder="jane@example.com"
              className={inputClass('email')} />
            {showError('email') && <FieldError msg={showError('email')!} />}
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-theme-muted mb-1">ZIP Code *</label>
            <input required type="text" value={form.zip} onChange={set('zip')} onBlur={blur('zip')}
              placeholder="e.g. 90210"
              className={inputClass('zip')} />
            {showError('zip') && <FieldError msg={showError('zip')!} />}
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-theme-muted mb-1">Notes (optional)</label>
            <textarea rows={2} value={form.message} onChange={set('message')}
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
