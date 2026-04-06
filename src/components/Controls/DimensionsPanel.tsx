import React from 'react';
import type { CourtType, CourtDimensions } from '../../types/court';
import { COURT_PRESETS } from '../../utils/courtData';

interface Props {
  courtType: CourtType;
  dimensions: CourtDimensions;
  customDimensions: boolean;
  onDimensionsChange: (d: CourtDimensions) => void;
  onCustomToggle: (custom: boolean) => void;
}

export const DimensionsPanel: React.FC<Props> = ({
  courtType, dimensions, customDimensions, onDimensionsChange, onCustomToggle,
}) => {
  const presets = COURT_PRESETS.filter((p) => p.type === courtType);

  return (
    <div className="space-y-4">
      {/* Preset sizes */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
          Standard Sizes
        </label>
        <div className="space-y-1.5">
          {presets.map((preset) => {
            const active =
              !customDimensions &&
              dimensions.width  === preset.dimensions.width &&
              dimensions.length === preset.dimensions.length;
            return (
              <button
                key={preset.id}
                onClick={() => { onCustomToggle(false); onDimensionsChange(preset.dimensions); }}
                className={`w-full p-2.5 rounded-lg text-left transition-all border flex items-center justify-between ${
                  active
                    ? 'bg-sky-600 border-sky-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{preset.name}</div>
                  <div className={`text-xs ${active ? 'text-sky-200' : 'text-gray-500'}`}>{preset.description}</div>
                </div>
                <div className={`text-xs font-mono ml-2 whitespace-nowrap ${active ? 'text-sky-200' : 'text-gray-500'}`}>
                  {preset.dimensions.length}×{preset.dimensions.width} ft
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom dimensions */}
      <div>
        <button
          onClick={() => onCustomToggle(true)}
          className={`w-full p-2.5 rounded-lg text-left transition-all border flex items-center gap-2 ${
            customDimensions
              ? 'bg-sky-600 border-sky-500 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
          }`}
        >
          <span className="text-lg">📐</span>
          <div>
            <div className="text-sm font-medium">Custom Dimensions</div>
            <div className={`text-xs ${customDimensions ? 'text-sky-200' : 'text-gray-500'}`}>Enter your own size</div>
          </div>
        </button>

        {customDimensions && (
          <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Length (ft)</label>
              <input
                type="number"
                min={20}
                max={200}
                value={dimensions.length}
                onChange={(e) => onDimensionsChange({ ...dimensions, length: Math.max(20, +e.target.value) })}
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Width (ft)</label>
              <input
                type="number"
                min={10}
                max={100}
                value={dimensions.width}
                onChange={(e) => onDimensionsChange({ ...dimensions, width: Math.max(10, +e.target.value) })}
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="col-span-2 text-xs text-gray-500 bg-gray-900/50 rounded p-2">
              Area: <span className="text-gray-300 font-medium">{(dimensions.length * dimensions.width).toLocaleString()} sq ft</span>
              {' · '}
              {(dimensions.length * dimensions.width / 9).toFixed(0)} sq yd
            </div>
          </div>
        )}
      </div>

      {/* Area summary */}
      <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
        <div className="text-xs text-gray-400 mb-1">Selected Area</div>
        <div className="text-lg font-bold text-white">
          {dimensions.length} × {dimensions.width} ft
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {(dimensions.length * dimensions.width).toLocaleString()} sq ft total
        </div>
      </div>
    </div>
  );
};
