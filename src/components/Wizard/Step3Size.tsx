import React, { useEffect, useId, useState } from 'react';
import { Ruler, Maximize2, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { CourtType, CourtDimensions } from '../../types/court';
import { COURT_PRESETS, DIM_LIMITS, SPACE_LIMITS, fitsInSpace } from '../../utils/courtData';
import { trackEvent } from '../../utils/analytics';
import { StepShell } from './StepShell';

interface Props {
  courtType: CourtType;
  dimensions: CourtDimensions;
  customDimensions: boolean;
  onDimensionsChange: (d: CourtDimensions) => void;
  onCustomToggle: (v: boolean) => void;
  space?: CourtDimensions;
  onSpaceChange: (space: CourtDimensions | undefined) => void;
  onBack: () => void;
  onNext: () => void;
}

/**
 * Whole-feet input. Accepts any text while typing and only commits values
 * inside the allowed range; on blur it rounds and clamps, so the quote API
 * never sees a size it would reject.
 */
const FeetInput: React.FC<{ label: string; value: number; min: number; max: number; onChange: (v: number) => void }> = ({
  label, value, min, max, onChange,
}) => {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = (raw: string) => {
    const n = Math.round(Number(raw));
    const v = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value;
    setText(String(v));
    if (v !== value) onChange(v);
  };
  return (
    <div>
      <label className="block text-xs text-theme-muted mb-1">{label}</label>
      <input
        type="number" inputMode="numeric" min={min} max={max} step={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (Number.isInteger(n) && n >= min && n <= max) onChange(n);
        }}
        onBlur={(e) => commit(e.target.value)}
        className="w-full bg-theme-panel border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary focus:outline-none focus:border-pink-500"
      />
      <p className="text-[10px] text-theme-muted mt-1">{min}–{max} ft</p>
    </div>
  );
};

/** Optional whole-feet input for the customer's space; empty means "not entered". */
const SpaceInput: React.FC<{ label: string; value?: number; onChange: (v: number | undefined) => void }> = ({ label, value, onChange }) => {
  const [text, setText] = useState(value ? String(value) : '');
  // Only overwrite what's typed when a different valid value arrives from outside
  useEffect(() => {
    if (value !== undefined && Number(text) !== value) setText(String(value));
  }, [value]);
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-theme-muted mb-1">{label}</label>
      <input
        id={id} type="number" inputMode="numeric" min={SPACE_LIMITS.min} max={SPACE_LIMITS.max} step={1}
        placeholder="ft" value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Math.round(Number(e.target.value));
          onChange(e.target.value && n >= SPACE_LIMITS.min && n <= SPACE_LIMITS.max ? n : undefined);
        }}
        className="w-full bg-theme-panel border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary focus:outline-none focus:border-pink-500"
      />
    </div>
  );
};

const FitBadge: React.FC<{ fits: boolean }> = ({ fits }) => fits ? (
  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-400">
    <CheckCircle2 className="w-3 h-3" /> Fits
  </span>
) : (
  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
    <AlertTriangle className="w-3 h-3" /> Too big
  </span>
);

export const Step3Size: React.FC<Props> = ({
  courtType, dimensions, customDimensions,
  onDimensionsChange, onCustomToggle, space, onSpaceChange, onBack, onNext,
}) => {
  const presets = COURT_PRESETS.filter((p) => p.type === courtType);
  const isMatch = (d: CourtDimensions) =>
    !customDimensions && dimensions.width === d.width && dimensions.length === d.length;

  // Partially typed space is kept locally until both sides are valid
  const [draftLen, setDraftLen] = useState<number | undefined>(space?.length);
  const [draftWid, setDraftWid] = useState<number | undefined>(space?.width);
  const setSpace = (l: number | undefined, w: number | undefined) => {
    setDraftLen(l); setDraftWid(w);
    const next = l && w ? { length: l, width: w } : undefined;
    onSpaceChange(next);
    if (next) trackEvent('space_entered', { court_type: courtType, length_ft: l, width_ft: w });
  };
  const fitting = space ? presets.filter((p) => fitsInSpace(p.dimensions, space)) : [];
  // Largest court that fits, capped to the allowed sizes
  const useMySpace = () => {
    if (!space) return;
    const long = Math.max(space.length, space.width), short = Math.min(space.length, space.width);
    onCustomToggle(true);
    onDimensionsChange({
      length: Math.min(Math.max(long, DIM_LIMITS.length.min), DIM_LIMITS.length.max),
      width: Math.min(Math.max(short, DIM_LIMITS.width.min), DIM_LIMITS.width.max),
    });
  };

  return (
    <StepShell
      step={3} totalSteps={6}
      title="Choose your court size"
      subtitle="Pick a standard size or enter custom measurements."
      onBack={onBack}
      onNext={onNext}
    >
      <div className="space-y-2 mt-2">
        {/* Will it fit? */}
        <div className="p-3 rounded-xl border border-dashed border-theme-mid bg-theme-raised/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-theme-primary">
            <Maximize2 className="w-4 h-4 text-pink-700 dark:text-pink-300" /> Will it fit?
          </div>
          <p className="text-xs text-theme-muted mt-0.5 mb-2">Enter the space you have (optional) and we'll check each size.</p>
          <div className="grid grid-cols-2 gap-3">
            <SpaceInput label="Space length (ft)" value={draftLen} onChange={(l) => setSpace(l, draftWid)} />
            <SpaceInput label="Space width (ft)" value={draftWid} onChange={(w) => setSpace(draftLen, w)} />
          </div>
          {space && (
            <div className="mt-2 text-xs text-theme-muted" aria-live="polite">
              {fitting.length > 0
                ? <>{fitting.length} of {presets.length} standard size{presets.length === 1 ? '' : 's'} fit your {space.length} × {space.width} ft space.</>
                : <>None of the standard sizes fit your {space.length} × {space.width} ft space.</>}
              {' '}
              <button onClick={useMySpace} className="font-semibold text-pink-700 dark:text-pink-300 underline underline-offset-2">
                Use a custom size that fills my space
              </button>
              <p className="mt-1">Allow a few extra feet around the court for run-off; we'll confirm on site.</p>
            </div>
          )}
        </div>

        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => { onCustomToggle(false); onDimensionsChange(preset.dimensions); }}
            className={`w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
              isMatch(preset.dimensions)
                ? 'border-pink-500 bg-pink-600/15 text-theme-primary'
                : 'border-theme-mid bg-theme-raised/60 text-theme-primary/80 hover:border-theme-mid hover:text-theme-primary'
            }`}
          >
            <div>
              <div className="text-sm font-semibold">{preset.name}</div>
              <div className={`text-xs mt-0.5 ${isMatch(preset.dimensions) ? 'text-pink-700 dark:text-pink-200' : 'text-theme-muted'}`}>
                {preset.description}
              </div>
            </div>
            <div className="ml-4 flex flex-col items-end gap-0.5">
              <div className={`text-xs font-mono whitespace-nowrap ${isMatch(preset.dimensions) ? 'text-pink-700 dark:text-pink-300' : 'text-theme-muted'}`}>
                {preset.dimensions.length} × {preset.dimensions.width} ft
              </div>
              {space && <FitBadge fits={fitsInSpace(preset.dimensions, space)} />}
            </div>
          </button>
        ))}

        {/* Custom */}
        <button
          onClick={() => onCustomToggle(true)}
          className={`w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
            customDimensions
              ? 'border-pink-500 bg-pink-600/15 text-theme-primary'
              : 'border-theme-mid bg-theme-raised/60 text-theme-primary/80 hover:border-theme-mid hover:text-theme-primary'
          }`}
        >
          <Ruler className={`w-5 h-5 flex-shrink-0 ${customDimensions ? 'text-pink-700 dark:text-pink-300' : 'text-theme-muted'}`} />
          <div>
            <div className="text-sm font-semibold">Custom Dimensions</div>
            <div className={`text-xs mt-0.5 ${customDimensions ? 'text-pink-700 dark:text-pink-200' : 'text-theme-muted'}`}>
              Enter your own length and width
            </div>
          </div>
        </button>

        {customDimensions && (
          <div className="grid grid-cols-2 gap-3 p-4 bg-theme-raised rounded-xl border border-theme-mid">
            <FeetInput label="Length (ft)" value={dimensions.length}
              min={DIM_LIMITS.length.min} max={DIM_LIMITS.length.max}
              onChange={(length) => onDimensionsChange({ ...dimensions, length })} />
            <FeetInput label="Width (ft)" value={dimensions.width}
              min={DIM_LIMITS.width.min} max={DIM_LIMITS.width.max}
              onChange={(width) => onDimensionsChange({ ...dimensions, width })} />
            <div className="col-span-2 text-xs text-theme-muted bg-theme-panel/50 rounded-lg p-2 text-center">
              Total area: <span className="text-theme-primary font-medium">{(dimensions.length * dimensions.width).toLocaleString()} sq ft</span>
              {space && !fitsInSpace(dimensions, space) && (
                <p className="mt-1 text-amber-700 dark:text-amber-400 font-semibold">
                  This is larger than your {space.length} × {space.width} ft space.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
};
