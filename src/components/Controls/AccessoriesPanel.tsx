import React from 'react';
import type { AccessoryId, CourtType } from '../../types/court';
import { ACCESSORIES, ACCESSORY_CATEGORIES } from '../../utils/courtData';

interface Props {
  courtType: CourtType;
  selected: AccessoryId[];
  onToggle: (id: AccessoryId) => void;
}

export const AccessoriesPanel: React.FC<Props> = ({ courtType, selected, onToggle }) => {
  const compatible = ACCESSORIES.filter((a) => a.compatibleCourts.includes(courtType));

  return (
    <div className="space-y-5">
      {ACCESSORY_CATEGORIES.map((cat) => {
        const items = compatible.filter((a) => a.category === cat.id);
        if (!items.length) return null;
        return (
          <div key={cat.id}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              {cat.label}
            </label>
            <div className="space-y-2">
              {items.map((acc) => {
                const isSelected = selected.includes(acc.id);
                // Mutually exclusive lighting options
                const isLighting = acc.category === 'lighting';
                const isHoop = acc.id === 'basketball-hoop-single' || acc.id === 'basketball-hoop-double';

                return (
                  <button
                    key={acc.id}
                    onClick={() => onToggle(acc.id)}
                    className={`w-full p-3 rounded-lg text-left border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-pink-600/20 border-pink-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-pink-500 border-pink-400' : 'border-gray-600'
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Icon + Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{acc.icon}</span>
                        <span className="text-sm font-medium leading-tight">{acc.name}</span>
                        {(isLighting || isHoop) && (
                          <span className="text-xs text-gray-500 ml-1">(select one)</span>
                        )}
                      </div>
                      <div className={`text-xs mt-0.5 leading-snug ${isSelected ? 'text-pink-200' : 'text-gray-500'}`}>
                        {acc.description}
                      </div>
                    </div>

                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {selected.length === 0 && (
        <p className="text-xs text-gray-600 text-center py-2">No accessories selected</p>
      )}
    </div>
  );
};
