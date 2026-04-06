import React from 'react';
import type { CourtColors, CourtType, SurfaceFinish } from '../../types/court';
import { SURFACE_COLORS, LINE_COLORS, BORDER_COLORS, DEFAULT_COLORS } from '../../utils/courtData';

interface Props {
  courtType: CourtType;
  colors: CourtColors;
  surfaceFinish: SurfaceFinish;
  onColorsChange: (colors: CourtColors) => void;
  onSurfaceFinishChange: (finish: SurfaceFinish) => void;
}

const ColorSwatch: React.FC<{
  color: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ color, label, selected, onClick }) => (
  <button
    onClick={onClick}
    title={label}
    className={`w-8 h-8 rounded-md border-2 transition-all ${
      selected ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-gray-400 hover:scale-105'
    }`}
    style={{ backgroundColor: color }}
  />
);

const SURFACE_FINISHES: { id: SurfaceFinish; label: string; desc: string }[] = [
  { id: 'smooth',    label: 'Smooth',    desc: 'Standard asphalt' },
  { id: 'textured',  label: 'Textured',  desc: 'Slip-resistant' },
  { id: 'cushioned', label: 'Cushioned', desc: 'Joint-friendly' },
];

export const ColorsPanel: React.FC<Props> = ({
  courtType, colors, surfaceFinish, onColorsChange, onSurfaceFinishChange,
}) => {
  const defaults = DEFAULT_COLORS[courtType];

  const colorSections = [
    {
      key: 'surface' as keyof CourtColors,
      label: 'Court Surface',
      palette: SURFACE_COLORS,
    },
    {
      key: 'lines' as keyof CourtColors,
      label: 'Court Lines',
      palette: LINE_COLORS,
    },
    {
      key: 'border' as keyof CourtColors,
      label: 'Border / Out-of-Bounds',
      palette: BORDER_COLORS,
    },
    ...(courtType === 'basketball' || courtType === 'multi-sport'
      ? [{ key: 'keyArea' as keyof CourtColors, label: 'Key / Paint Area', palette: SURFACE_COLORS }]
      : []),
    ...(courtType === 'tennis'
      ? [{ key: 'serviceBox' as keyof CourtColors, label: 'Service Box Tint', palette: SURFACE_COLORS }]
      : []),
    ...(courtType === 'pickleball'
      ? [{ key: 'kitchen' as keyof CourtColors, label: 'Kitchen / NVZ Zone', palette: SURFACE_COLORS }]
      : []),
  ];

  return (
    <div className="space-y-5">
      {/* Color Sections */}
      {colorSections.map((section) => (
        <div key={section.key}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {section.label}
            </label>
            <div
              className="w-5 h-5 rounded border border-gray-600"
              style={{ backgroundColor: colors[section.key] ?? '#888' }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {section.palette.map((c) => (
              <ColorSwatch
                key={c.value}
                color={c.value}
                label={c.label}
                selected={(colors[section.key] ?? '') === c.value}
                onClick={() => onColorsChange({ ...colors, [section.key]: c.value })}
              />
            ))}
          </div>
          {/* Custom hex input */}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={colors[section.key] ?? '#888888'}
              onChange={(e) => onColorsChange({ ...colors, [section.key]: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border border-gray-600 bg-gray-800"
              title="Custom color"
            />
            <input
              type="text"
              value={colors[section.key] ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) onColorsChange({ ...colors, [section.key]: val });
              }}
              className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 font-mono focus:outline-none focus:border-sky-500"
              placeholder="#RRGGBB"
            />
          </div>
        </div>
      ))}

      {/* Reset button */}
      <button
        onClick={() => onColorsChange(defaults)}
        className="w-full py-2 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-all"
      >
        Reset to Default Colors
      </button>

      {/* Surface Finish */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Surface Finish
        </label>
        <div className="grid grid-cols-3 gap-2">
          {SURFACE_FINISHES.map((f) => (
            <button
              key={f.id}
              onClick={() => onSurfaceFinishChange(f.id)}
              className={`p-2 rounded-lg text-center border transition-all ${
                surfaceFinish === f.id
                  ? 'bg-sky-600 border-sky-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="text-sm font-medium">{f.label}</div>
              <div className={`text-xs mt-0.5 ${surfaceFinish === f.id ? 'text-sky-200' : 'text-gray-500'}`}>{f.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
