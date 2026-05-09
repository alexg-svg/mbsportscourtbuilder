import React from 'react';
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
    className={`w-8 h-8 rounded-lg border-2 transition-all ${
      selected ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-gray-400 hover:scale-105'
    }`}
    style={{ backgroundColor: color }}
  />
);

const FINISHES: { id: SurfaceFinish; label: string; desc: string }[] = [
  { id: 'smooth',    label: 'Smooth',    desc: 'Standard' },
  { id: 'textured',  label: 'Textured',  desc: 'Slip-resistant' },
  { id: 'cushioned', label: 'Cushioned', desc: 'Joint-friendly' },
];

export const Step4Colors: React.FC<Props> = ({
  courtType, colors, surfaceFinish,
  onColorsChange, onSurfaceFinishChange, onBack, onNext,
}) => {
  const zoneLabel =
    courtType === 'basketball' || courtType === 'multi-sport' ? 'Key / Paint Area' :
    courtType === 'tennis' ? 'Service Box Tint' : 'Kitchen / NVZ Zone';

  const zoneKey: keyof CourtColors =
    courtType === 'basketball' || courtType === 'multi-sport' ? 'keyArea' :
    courtType === 'tennis' ? 'serviceBox' : 'kitchen';

  return (
    <StepShell
      step={4} totalSteps={6}
      title="Pick your colors"
      subtitle="Customize the look of your court surface and markings."
      onBack={onBack}
      onNext={onNext}
    >
      <div className="space-y-5 mt-2">

        {/* Surface */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Court Surface
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {SURFACE_COLORS.map((c) => (
              <Swatch key={c.value} color={c.value} label={c.label} selected={colors.surface === c.value}
                onClick={() => onColorsChange({ ...colors, surface: c.value })} />
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input type="color" value={colors.surface}
              onChange={(e) => onColorsChange({ ...colors, surface: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-gray-600 bg-gray-800" />
            <input type="text" value={colors.surface}
              onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onColorsChange({ ...colors, surface: e.target.value }); }}
              className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 font-mono focus:outline-none focus:border-pink-500" />
          </div>
        </div>

        {/* Lines */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Court Lines
          </label>
          <div className="flex flex-wrap gap-2">
            {LINE_COLORS.map((c) => (
              <Swatch key={c.value} color={c.value} label={c.label} selected={colors.lines === c.value}
                onClick={() => onColorsChange({ ...colors, lines: c.value })} />
            ))}
          </div>
        </div>

        {/* Border */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Border / Out-of-Bounds
          </label>
          <div className="flex flex-wrap gap-2">
            {BORDER_COLORS.map((c) => (
              <Swatch key={c.value} color={c.value} label={c.label} selected={colors.border === c.value}
                onClick={() => onColorsChange({ ...colors, border: c.value })} />
            ))}
          </div>
        </div>

        {/* Zone color */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            {zoneLabel}
          </label>
          <div className="flex flex-wrap gap-2">
            {SURFACE_COLORS.map((c) => (
              <Swatch key={c.value} color={c.value} label={c.label} selected={(colors[zoneKey] ?? '') === c.value}
                onClick={() => onColorsChange({ ...colors, [zoneKey]: c.value })} />
            ))}
          </div>
        </div>

        {/* Surface finish */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Surface Finish
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FINISHES.map((f) => (
              <button key={f.id} onClick={() => onSurfaceFinishChange(f.id)}
                className={`py-2.5 px-2 rounded-xl border-2 text-center transition-all ${
                  surfaceFinish === f.id
                    ? 'border-pink-500 bg-pink-600/15 text-white'
                    : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-xs font-semibold">{f.label}</div>
                <div className={`text-xs mt-0.5 ${surfaceFinish === f.id ? 'text-pink-200' : 'text-gray-500'}`}>{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={() => onColorsChange(DEFAULT_COLORS[courtType])}
          className="w-full py-2 text-xs text-gray-500 hover:text-white border border-gray-800 hover:border-gray-600 rounded-xl transition-all"
        >
          Reset to defaults
        </button>
      </div>
    </StepShell>
  );
};
