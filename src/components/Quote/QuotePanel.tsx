import React, { useState } from 'react';
import type { CourtConfig } from '../../types/court';
import { ACCESSORIES, COURT_PRESETS } from '../../utils/courtData';

interface Props {
  config: CourtConfig;
}

const COURT_LABELS: Record<string, string> = {
  basketball: 'Basketball',
  tennis: 'Tennis',
  pickleball: 'Pickleball',
  'multi-sport': 'Multi-Sport',
};

const FINISH_LABELS: Record<string, string> = {
  smooth: 'Smooth Asphalt',
  textured: 'Textured Asphalt',
  cushioned: 'Cushioned Asphalt',
};

export const QuotePanel: React.FC<Props> = ({ config }) => {
  const [formState, setFormState] = useState({
    name: '', email: '', phone: '', zip: '', message: '', submitted: false,
  });

  const { dimensions, type, propertyType, surfaceFinish, selectedAccessories } = config;
  const area = dimensions.length * dimensions.width;

  // Rough cost estimate
  const baseCostPerSqFt = propertyType === 'commercial' ? 8 : 6;
  const finishMultiplier = { smooth: 1, textured: 1.15, cushioned: 1.4 }[surfaceFinish];
  const surfaceCost = Math.round(area * baseCostPerSqFt * finishMultiplier);

  const presetName =
    COURT_PRESETS.find(
      (p) =>
        p.type === type &&
        p.dimensions.width === dimensions.width &&
        p.dimensions.length === dimensions.length,
    )?.name ?? 'Custom Size';

  const selectedAccessoryItems = ACCESSORIES.filter((a) => selectedAccessories.includes(a.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormState((s) => ({ ...s, submitted: true }));
  };

  if (formState.submitted) {
    return (
      <div className="text-center py-8 px-4">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-white mb-2">Request Submitted!</h3>
        <p className="text-gray-400 text-sm">
          Thank you, <span className="text-white">{formState.name}</span>. Our team will reach out
          to <span className="text-white">{formState.email}</span> within 24–48 hours with a
          detailed quote for your {COURT_LABELS[type]} court.
        </p>
        <button
          className="mt-6 text-xs text-pink-400 hover:text-pink-300 underline"
          onClick={() => setFormState((s) => ({ ...s, submitted: false }))}
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="bg-pink-700 px-4 py-2">
          <h3 className="text-sm font-bold text-white">Your Court Summary</h3>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <Row label="Court Type"     value={COURT_LABELS[type]} />
          <Row label="Size"           value={`${dimensions.length} × ${dimensions.width} ft (${presetName})`} />
          <Row label="Area"           value={`${area.toLocaleString()} sq ft`} />
          <Row label="Property"       value={propertyType.charAt(0).toUpperCase() + propertyType.slice(1)} />
          <Row label="Surface"        value={FINISH_LABELS[surfaceFinish]} />
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="text-xs text-gray-400 mb-1">Selected Accessories</div>
            {selectedAccessoryItems.length === 0 ? (
              <div className="text-gray-500 text-xs">None selected</div>
            ) : (
              selectedAccessoryItems.map((a) => (
                <div key={a.id} className="flex justify-between text-xs py-0.5">
                  <span className="text-gray-300">{a.icon} {a.name}</span>
                  <span className="text-gray-500">{a.priceEstimate}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estimate band */}
        <div className="px-4 py-3 bg-pink-900/30 border-t border-pink-800/40">
          <div className="text-xs text-pink-400 font-medium uppercase tracking-wide mb-0.5">
            Estimated Surface Cost
          </div>
          <div className="text-2xl font-bold text-white">
            ${surfaceCost.toLocaleString()}
            <span className="text-sm font-normal text-gray-400 ml-1">– ${Math.round(surfaceCost * 1.25).toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Estimate covers asphalt surface & line markings. Accessories and site prep billed separately.
            Final quote after site evaluation.
          </p>
        </div>
      </div>

      {/* Contact form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Request a Free Quote
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
            <input
              required
              type="text"
              value={formState.name}
              onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
              placeholder="Jane Smith"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs text-gray-400 mb-1">Phone</label>
            <input
              type="tel"
              value={formState.phone}
              onChange={(e) => setFormState((s) => ({ ...s, phone: e.target.value }))}
              placeholder="(555) 000-0000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Email *</label>
            <input
              required
              type="email"
              value={formState.email}
              onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
              placeholder="jane@example.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">ZIP Code *</label>
            <input
              required
              type="text"
              value={formState.zip}
              onChange={(e) => setFormState((s) => ({ ...s, zip: e.target.value }))}
              placeholder="e.g. 90210"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Additional Notes</label>
            <textarea
              rows={3}
              value={formState.message}
              onChange={(e) => setFormState((s) => ({ ...s, message: e.target.value }))}
              placeholder="Any site conditions, timeline, special requests..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-pink-600 hover:bg-pink-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-pink-900/30 text-sm"
        >
          Get My Free Quote →
        </button>

        <p className="text-xs text-gray-600 text-center">
          No commitment required. We'll contact you within 24–48 hours.
        </p>
      </form>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-gray-400">{label}</span>
    <span className="text-white font-medium text-right ml-4">{value}</span>
  </div>
);
