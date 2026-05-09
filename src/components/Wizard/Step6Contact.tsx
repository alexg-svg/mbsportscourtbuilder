import React, { useState } from 'react';
import type { CourtConfig } from '../../types/court';
import { ACCESSORIES, COURT_PRESETS } from '../../utils/courtData';
import { StepShell } from './StepShell';

interface Props {
  config: CourtConfig;
  onBack: () => void;
  onSubmit: (data: ContactData) => void;
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
};

const FINISH_LABELS: Record<string, string> = {
  smooth: 'Smooth Asphalt', textured: 'Textured Asphalt', cushioned: 'Cushioned Asphalt',
};

export const Step6Contact: React.FC<Props> = ({ config, onBack, onSubmit }) => {
  const [form, setForm] = useState<ContactData>({ name: '', email: '', phone: '', zip: '', message: '' });
  const set = (k: keyof ContactData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const { dimensions, type, propertyType, surfaceFinish, selectedAccessories } = config;
  const presetName =
    COURT_PRESETS.find(
      (p) => p.type === type && p.dimensions.width === dimensions.width && p.dimensions.length === dimensions.length,
    )?.name ?? 'Custom';

  const accItems = ACCESSORIES.filter((a) => selectedAccessories.includes(a.id));
  const canSubmit = form.name.trim() && form.email.trim() && form.zip.trim();

  return (
    <StepShell
      step={6} totalSteps={6}
      title="Almost there!"
      subtitle="Tell us how to reach you and we'll prepare your custom quote."
      onBack={onBack}
      onNext={() => canSubmit && onSubmit(form)}
      nextLabel="Submit My Design →"
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
              className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-gray-600 focus:outline-none focus:border-pink-500" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-theme-muted mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={set('phone')}
              placeholder="(555) 000-0000"
              className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-gray-600 focus:outline-none focus:border-pink-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-theme-muted mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={set('email')}
              placeholder="jane@example.com"
              className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-gray-600 focus:outline-none focus:border-pink-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-theme-muted mb-1">ZIP Code *</label>
            <input required type="text" value={form.zip} onChange={set('zip')}
              placeholder="e.g. 90210"
              className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-gray-600 focus:outline-none focus:border-pink-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-theme-muted mb-1">Notes (optional)</label>
            <textarea rows={2} value={form.message} onChange={set('message')}
              placeholder="Timeline, site conditions, questions..."
              className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary placeholder-gray-600 focus:outline-none focus:border-pink-500 resize-none" />
          </div>
        </div>

        <p className="text-xs text-theme-faint text-center">
          No commitment required · We respond within 24–48 hours
        </p>
      </div>
    </StepShell>
  );
};

const SumRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="text-theme-muted w-14 flex-shrink-0">{label}</span>
    <span className="text-theme-primary/80">{value}</span>
  </div>
);
