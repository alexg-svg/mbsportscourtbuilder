import React, { useId } from 'react';
import type { CourtColors, CourtType, SurfaceFinish } from '../../types/court';
import { SURFACE_COLORS, LINE_COLORS, BORDER_COLORS, DEFAULT_COLORS } from '../../utils/courtData';
import { StepShell } from './StepShell';

interface Props {
  courtType: CourtType;
  colors: CourtColors;
  surfaceFinish: SurfaceFinish;
  onColorsChange: (c: CourtColors) => void;
  onSurfaceFinishChange: (f: SurfaceFinish) => void;
  onBack: () => void;
  onNext: () => void;
}

const Swatch: React.FC<{ color: string; label: string; selected: boolean; onClick: () => void }> = ({
  color, label, selected, onClick,
}) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={selected}
    className={`w-8 h-8 rounded-lg border border-black/15 transition-all ${
      selected ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-theme-panel scale-105 shadow-md' : 'hover:scale-105'
    }`}
    style={{ backgroundColor: color }}
  />
);

/** Section heading that also names the selected color. */
const Heading: React.FC<{ title: string; value?: string; palette: { label: string; value: string }[] }> = ({ title, value, palette }) => {
  const name = palette.find((c) => c.value.toLowerCase() === (value ?? '').toLowerCase())?.label ?? (value ? 'Custom' : '');
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-theme-muted mb-2">
      {title}
      {name && <span className="normal-case tracking-normal font-medium text-theme-primary/80"> · {name}</span>}
    </label>
  );
};

// Ready-made combinations; the zone color covers the key, service boxes or kitchen
const COMBOS: { name: string; surface: string; border: string; lines: string; zone: string }[] = [
  { name: 'Classic Red & Navy', surface: '#C8440C', border: '#1A3A6B', lines: '#FFFFFF', zone: '#1A3A6B' },
  { name: 'Pro Blue',           surface: '#3B82F6', border: '#1A3A6B', lines: '#FFFFFF', zone: '#1A3A6B' },
  { name: 'Park Green',         surface: '#2D7D3A', border: '#14532D', lines: '#FFFFFF', zone: '#0F766E' },
  { name: 'Midnight',           surface: '#374151', border: '#111827', lines: '#FCD34D', zone: '#1A3A6B' },
  { name: 'Desert Clay',        surface: '#D97706', border: '#7F1D1D', lines: '#FFFFFF', zone: '#7F1D1D' },
  { name: 'Team Purple',        surface: '#7C3AED', border: '#4C1D95', lines: '#FFFFFF', zone: '#4C1D95' },
];

/**
 * Close-up of a surface finish in the chosen court color: a satin sheen for
 * Smooth, fine sand grit for Textured, a soft dimpled look for Cushioned.
 */
const FinishSample: React.FC<{ finish: SurfaceFinish; color: string }> = ({ finish, color }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="w-full h-9 rounded-md mb-1.5 border border-black/10" preserveAspectRatio="none" viewBox="0 0 100 36" aria-hidden>
      <defs>
        <linearGradient id={`sheen-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.28" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.04" />
          <stop offset="1" stopColor="black" stopOpacity="0.12" />
        </linearGradient>
        <filter id={`grit-${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={finish === 'textured' ? 1.6 : 0.28}
            numOctaves={finish === 'textured' ? 1 : 3} seed={3} stitchTiles="stitch" />
          <feColorMatrix type="matrix"
            values={finish === 'textured'
              ? '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.25'
              : '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.1 -0.45'} />
        </filter>
      </defs>
      <rect width="100" height="36" fill={color} />
      {finish === 'smooth' && <rect width="100" height="36" fill={`url(#sheen-${id})`} />}
      {finish !== 'smooth' && (
        <rect width="100" height="36" filter={`url(#grit-${id})`} opacity={finish === 'textured' ? 0.55 : 0.35} />
      )}
    </svg>
  );
};

const FINISHES: { id: SurfaceFinish; label: string; desc: string }[] = [
  { id: 'smooth',    label: 'Smooth',    desc: 'Standard' },
  { id: 'textured',  label: 'Textured',  desc: 'Slip-resistant' },
  { id: 'cushioned', label: 'Cushioned', desc: 'Joint-friendly' },
];

export const Step4Colors: React.FC<Props> = ({
  courtType, colors, surfaceFinish,
  onColorsChange, onSurfaceFinishChange, onBack, onNext,
}) => {
  // Only these courts have a separately colored zone
  const zone: { label: string; key: keyof CourtColors } | null =
    courtType === 'basketball' || courtType === 'multi-sport' ? { label: 'Key / Paint Area', key: 'keyArea' } :
    courtType === 'tennis' ? { label: 'Service Box Tint', key: 'serviceBox' } :
    courtType === 'pickleball' ? { label: 'Kitchen / NVZ Zone', key: 'kitchen' } :
    null;

  const applyCombo = (c: typeof COMBOS[number]) => onColorsChange({
    ...colors, surface: c.surface, border: c.border, lines: c.lines,
    ...(zone ? { [zone.key]: c.zone } : {}),
  });
  const isCombo = (c: typeof COMBOS[number]) =>
    colors.surface === c.surface && colors.border === c.border && colors.lines === c.lines;

  return (
    <StepShell
      step={4} totalSteps={6}
      title="Pick your colors"
      subtitle="Customize the look of your court surface and markings."
      onBack={onBack}
      onNext={onNext}
    >
      <div className="space-y-5 mt-2">

        {/* Popular combinations */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-theme-muted mb-2">
            Popular Combos
          </label>
          <div className="grid grid-cols-2 gap-2">
            {COMBOS.map((c) => (
              <button key={c.name} onClick={() => applyCombo(c)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border-2 text-left transition-all ${
                  isCombo(c) ? 'border-pink-500 bg-pink-600/10' : 'border-theme-mid bg-theme-raised/60 hover:border-pink-500/50'
                }`}
              >
                <span className="flex -space-x-1.5 flex-shrink-0">
                  {[c.surface, c.border, c.lines].map((v, i) => (
                    <span key={i} className="w-4 h-4 rounded-full border border-black/20" style={{ backgroundColor: v }} />
                  ))}
                </span>
                <span className="text-xs font-semibold text-theme-primary truncate">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Surface */}
        <div>
          <Heading title="Court Surface" value={colors.surface} palette={SURFACE_COLORS} />
          <div className="flex flex-wrap gap-2 mb-2">
            {SURFACE_COLORS.map((c) => (
              <Swatch key={c.value} color={c.value} label={c.label} selected={colors.surface === c.value}
                onClick={() => onColorsChange({ ...colors, surface: c.value })} />
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input type="color" value={colors.surface} aria-label="Pick a custom surface color"
              onChange={(e) => onColorsChange({ ...colors, surface: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-theme-mid bg-theme-raised" />
            <input type="text" value={colors.surface} aria-label="Surface color hex code"
              onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onColorsChange({ ...colors, surface: e.target.value }); }}
              className="w-24 bg-theme-panel border border-theme-mid rounded-lg px-2 py-1 text-xs text-theme-primary/80 font-mono focus:outline-none focus:border-pink-500" />
          </div>
        </div>

        {/* Lines */}
        <div>
          <Heading title="Court Lines" value={colors.lines} palette={LINE_COLORS} />
          <div className="flex flex-wrap gap-2">
            {LINE_COLORS.map((c) => (
              <Swatch key={c.value} color={c.value} label={c.label} selected={colors.lines === c.value}
                onClick={() => onColorsChange({ ...colors, lines: c.value })} />
            ))}
          </div>
        </div>

        {/* Border */}
        <div>
          <Heading title="Border / Out-of-Bounds" value={colors.border} palette={BORDER_COLORS} />
          <div className="flex flex-wrap gap-2">
            {BORDER_COLORS.map((c) => (
              <Swatch key={c.value} color={c.value} label={c.label} selected={colors.border === c.value}
                onClick={() => onColorsChange({ ...colors, border: c.value })} />
            ))}
          </div>
        </div>

        {/* Zone color */}
        {zone && (
          <div>
            <Heading title={zone.label} value={colors[zone.key]} palette={SURFACE_COLORS} />
            <div className="flex flex-wrap gap-2">
              {SURFACE_COLORS.map((c) => (
                <Swatch key={c.value} color={c.value} label={c.label} selected={(colors[zone.key] ?? '') === c.value}
                  onClick={() => onColorsChange({ ...colors, [zone.key]: c.value })} />
              ))}
            </div>
          </div>
        )}

        {/* Surface finish */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-theme-muted mb-2">
            Surface Finish
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FINISHES.map((f) => (
              <button key={f.id} onClick={() => onSurfaceFinishChange(f.id)}
                className={`py-2.5 px-2 rounded-xl border-2 text-center transition-all ${
                  surfaceFinish === f.id
                    ? 'border-pink-500 bg-pink-600/15 text-theme-primary'
                    : 'border-theme-mid bg-theme-raised/60 text-theme-primary/80 hover:border-theme-mid'
                }`}
              >
                <FinishSample finish={f.id} color={colors.surface} />
                <div className="text-xs font-semibold">{f.label}</div>
                <div className={`text-xs mt-0.5 ${surfaceFinish === f.id ? 'text-pink-700 dark:text-pink-200' : 'text-theme-muted'}`}>{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={() => onColorsChange(DEFAULT_COLORS[courtType])}
          className="w-full py-2 text-xs text-theme-muted hover:text-theme-primary border border-theme-border hover:border-theme-mid rounded-xl transition-all"
        >
          Reset to defaults
        </button>
      </div>
    </StepShell>
  );
};
