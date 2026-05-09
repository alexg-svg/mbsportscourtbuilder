import React from 'react';
import { Ruler } from 'lucide-react';
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
                ? 'border-pink-500 bg-pink-600/15 text-theme-primary'
                : 'border-theme-mid bg-theme-raised/60 text-theme-primary/80 hover:border-theme-mid hover:text-theme-primary'
            }`}
          >
            <div>
              <div className="text-sm font-semibold">{preset.name}</div>
              <div className={`text-xs mt-0.5 ${isMatch(preset.dimensions) ? 'text-pink-200' : 'text-theme-muted'}`}>
                {preset.description}
              </div>
            </div>
            <div className={`text-xs font-mono ml-4 whitespace-nowrap ${isMatch(preset.dimensions) ? 'text-pink-300' : 'text-theme-muted'}`}>
              {preset.dimensions.length} × {preset.dimensions.width} ft
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
          <Ruler className={`w-5 h-5 flex-shrink-0 ${customDimensions ? 'text-pink-400' : 'text-theme-muted'}`} />
          <div>
            <div className="text-sm font-semibold">Custom Dimensions</div>
            <div className={`text-xs mt-0.5 ${customDimensions ? 'text-pink-200' : 'text-theme-muted'}`}>
              Enter your own length and width
            </div>
          </div>
        </button>

        {customDimensions && (
          <div className="grid grid-cols-2 gap-3 p-4 bg-theme-raised rounded-xl border border-theme-mid">
            <div>
              <label className="block text-xs text-theme-muted mb-1">Length (ft)</label>
              <input
                type="number" min={20} max={200}
                value={dimensions.length}
                onChange={(e) => onDimensionsChange({ ...dimensions, length: Math.max(20, +e.target.value) })}
                className="w-full bg-theme-panel border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-xs text-theme-muted mb-1">Width (ft)</label>
              <input
                type="number" min={10} max={100}
                value={dimensions.width}
                onChange={(e) => onDimensionsChange({ ...dimensions, width: Math.max(10, +e.target.value) })}
                className="w-full bg-theme-panel border border-theme-mid rounded-lg px-3 py-2 text-sm text-theme-primary focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="col-span-2 text-xs text-theme-muted bg-theme-panel/50 rounded-lg p-2 text-center">
              Total area: <span className="text-theme-primary font-medium">{(dimensions.length * dimensions.width).toLocaleString()} sq ft</span>
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
};
