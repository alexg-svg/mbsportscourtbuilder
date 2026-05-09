import React from 'react';
import type { CourtType, CourtDimensions } from '../../types/court';
import { COURT_PRESETS } from '../../utils/courtData';
import { StepShell } from './StepShell';

interface Props {
  courtType: CourtType;
  dimensions: CourtDimensions;
  customDimensions: boolean;
  onDimensionsChange: (d: CourtDimensions) => void;
  onCustomToggle: (v: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step3Size: React.FC<Props> = ({
  courtType, dimensions, customDimensions,
  onDimensionsChange, onCustomToggle, onBack, onNext,
}) => {
  const presets = COURT_PRESETS.filter((p) => p.type === courtType);

  const isMatch = (d: CourtDimensions) =>
    !customDimensions && dimensions.width === d.width && dimensions.length === d.length;

  return (
    <StepShell
      step={3} totalSteps={6}
      title="Choose your court size"
      subtitle="Pick a standard size or enter custom measurements."
      onBack={onBack}
      onNext={onNext}
    >
      <div className="space-y-2 mt-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => { onCustomToggle(false); onDimensionsChange(preset.dimensions); }}
            className={`w-full px-4 py-3.5 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
              isMatch(preset.dimensions)
                ? 'border-pink-500 bg-pink-600/15 text-white'
                : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-500 hover:text-white'
            }`}
          >
            <div>
              <div className="text-sm font-semibold">{preset.name}</div>
              <div className={`text-xs mt-0.5 ${isMatch(preset.dimensions) ? 'text-pink-200' : 'text-gray-500'}`}>
                {preset.description}
              </div>
            </div>
            <div className={`text-xs font-mono ml-4 whitespace-nowrap ${isMatch(preset.dimensions) ? 'text-pink-300' : 'text-gray-500'}`}>
              {preset.dimensions.length} × {preset.dimensions.width} ft
            </div>
          </button>
        ))}

        {/* Custom */}
        <button
          onClick={() => onCustomToggle(true)}
          className={`w-full px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
            customDimensions
              ? 'border-pink-500 bg-pink-600/15 text-white'
              : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-500 hover:text-white'
          }`}
        >
          <div className="text-sm font-semibold">📐 Custom Dimensions</div>
          <div className={`text-xs mt-0.5 ${customDimensions ? 'text-pink-200' : 'text-gray-500'}`}>
            Enter your own length and width
          </div>
        </button>

        {customDimensions && (
          <div className="grid grid-cols-2 gap-3 p-4 bg-gray-800 rounded-xl border border-gray-700">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Length (ft)</label>
              <input
                type="number" min={20} max={200}
                value={dimensions.length}
                onChange={(e) => onDimensionsChange({ ...dimensions, length: Math.max(20, +e.target.value) })}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Width (ft)</label>
              <input
                type="number" min={10} max={100}
                value={dimensions.width}
                onChange={(e) => onDimensionsChange({ ...dimensions, width: Math.max(10, +e.target.value) })}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="col-span-2 text-xs text-gray-500 bg-gray-900/50 rounded-lg p-2 text-center">
              Total area: <span className="text-white font-medium">{(dimensions.length * dimensions.width).toLocaleString()} sq ft</span>
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
};
