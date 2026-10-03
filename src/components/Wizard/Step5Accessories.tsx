import React, { useRef, useState } from 'react';
import {
  Minus, Zap, Grid2X2, Square, Wind,
  Armchair, Droplets, ClipboardList, Check, Stamp,
  Target, AlignJustify, List, Upload, Trash2,
} from 'lucide-react';
import { GiBasketballBasket } from 'react-icons/gi';
import { MdSportsTennis } from 'react-icons/md';
import { FaTableTennisPaddleBall } from 'react-icons/fa6';
import type { AccessoryId, CourtLogo, CourtType } from '../../types/court';
import { ACCESSORIES, ACCESSORY_CATEGORIES, REQUIRES, isPickOne } from '../../utils/courtData';
import { StepShell } from './StepShell';
import { trackEvent } from '../../utils/analytics';

interface Props {
  courtType: CourtType;
  selected: AccessoryId[];
  onToggle: (id: AccessoryId) => void;
  logo?: CourtLogo;
  onLogoChange: (logo: CourtLogo | undefined) => void;
  onBack: () => void;
  onNext: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACC_ICONS: Record<AccessoryId, React.ComponentType<any>> = {
  'custom-logo':            Stamp,
  'basketball-hoop-single': GiBasketballBasket,
  'basketball-hoop-double': GiBasketballBasket,
  'tennis-net':             MdSportsTennis,
  'pickleball-net':         FaTableTennisPaddleBall,
  'volleyball-net':         Minus,
  'badminton-net':          Minus,
  'futsal-goals':           Target,
  'handball-goals':         Target,
  'hockey-goals':           Square,
  'dasher-boards':          AlignJustify,
  'bocce-side-rails':       List,
  'lighting-2-pole':        Zap,
  'lighting-4-pole':        Zap,
  'lighting-6-pole':        Zap,
  'chain-link-fence':       Grid2X2,
  'vinyl-fence':            Square,
  'windscreen':             Wind,
  'bench-2':                Armchair,
  'bench-4':                Armchair,
  'water-fountain':         Droplets,
  'scoreboards':            ClipboardList,
};

const MAX_LOGO_PX = 512;

/** Reads an image file into a PNG data URL no larger than 512 px, keeping transparency. */
function readLogo(file: File): Promise<CourtLogo> {
  return new Promise((resolve, reject) => {
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || 512, nh = img.naturalHeight || 512;
      const k = Math.min(1, MAX_LOGO_PX / Math.max(nw, nh));
      const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(src);
      resolve({ url: c.toDataURL('image/png'), w, h });
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('That file could not be read as an image.')); };
    img.src = src;
  });
}

const LogoUpload: React.FC<{ logo?: CourtLogo; onChange: (l: CourtLogo | undefined) => void }> = ({ logo, onChange }) => {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Please choose an image under 10 MB.'); return; }
    try {
      onChange(await readLogo(file));
      setError(null);
      trackEvent('logo_uploaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  };
  return (
    <div className="ml-7 mt-2 mb-1 p-3 rounded-xl border border-dashed border-pink-500/50 bg-theme-raised/40">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onFile} />
      {logo ? (
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg border border-theme-mid flex items-center justify-center flex-shrink-0"
            style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #ffffff 0% 50%) 50% / 12px 12px' }}>
            <img src={logo.url} alt="Your logo" className="max-w-full max-h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-theme-primary">Logo added to your court</p>
            <div className="flex gap-3 mt-1">
              <button onClick={() => input.current?.click()} className="text-xs font-semibold text-pink-500 hover:text-pink-400">Replace</button>
              <button onClick={() => onChange(undefined)} className="text-xs font-semibold text-theme-muted hover:text-theme-primary inline-flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => input.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-pink-500 hover:text-pink-400">
          <Upload className="w-4 h-4" /> Upload your logo to preview it
        </button>
      )}
      <p className="text-[11px] text-theme-muted mt-1.5">
        A transparent PNG looks best. We'll confirm the final artwork with you before painting.
      </p>
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export const Step5Accessories: React.FC<Props> = ({ courtType, selected, onToggle, logo, onLogoChange, onBack, onNext }) => {
  const compatible = ACCESSORIES.filter((a) => a.compatibleCourts.includes(courtType));

  return (
    <StepShell
      step={5} totalSteps={6}
      title="Add accessories"
      subtitle="Select any extras you'd like included with your court."
      onBack={onBack}
      onNext={onNext}
      nextLabel={selected.length > 0 ? `Next → (${selected.length} selected)` : 'Next →'}
    >
      <div className="space-y-5 mt-2">
        {ACCESSORY_CATEGORIES.map((cat) => {
          const items = compatible.filter((a) => a.category === cat.id);
          if (!items.length) return null;
          return (
            <div key={cat.id}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-theme-muted mb-2">
                {cat.label}
              </label>
              <div className="space-y-2">
                {items.map((acc) => {
                  const isSelected = selected.includes(acc.id);
                  const Icon = ACC_ICONS[acc.id];
                  const isExclusive = isPickOne(acc.id);
                  const needs = REQUIRES[acc.id];
                  const needsName = needs && !selected.includes(needs)
                    ? ACCESSORIES.find((a) => a.id === needs)?.name : undefined;

                  return (
                    <React.Fragment key={acc.id}>
                    <button
                      onClick={() => onToggle(acc.id)}
                      className={`w-full p-3 rounded-xl border-2 text-left flex items-start gap-3 transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'border-pink-500 bg-pink-600/15 text-theme-primary shadow-md shadow-pink-500/20 ring-1 ring-pink-500/25'
                          : 'border-theme-mid bg-theme-raised/60 text-theme-primary/80 hover:border-pink-500/40 hover:text-theme-primary hover:shadow-sm hover:shadow-pink-500/10'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-pink-500 border-pink-400' : 'border-theme-mid'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>

                      <Icon size={16} className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-pink-400' : 'text-theme-muted'}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{acc.name}</span>
                          {isExclusive && (
                            <span className="text-xs text-theme-faint">(pick one)</span>
                          )}
                          {needsName && (
                            <span className="text-xs text-theme-faint">(adds {needsName})</span>
                          )}
                        </div>
                        <div className={`text-xs mt-0.5 leading-snug ${isSelected ? 'text-pink-700 dark:text-pink-200' : 'text-theme-muted'}`}>
                          {acc.description}
                        </div>
                      </div>
                    </button>
                    {acc.id === 'custom-logo' && isSelected && <LogoUpload logo={logo} onChange={onLogoChange} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-theme-faint text-center pt-1">
          Not sure? Skip this step — we'll discuss options during your consultation.
        </p>
      </div>
    </StepShell>
  );
};
