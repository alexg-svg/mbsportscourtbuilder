import React from 'react';
import type { AccessoryId, CourtType } from '../../types/court';
import { ACCESSORIES, ACCESSORY_CATEGORIES } from '../../utils/courtData';
import { StepShell } from './StepShell';

interface Props {
  courtType: CourtType;
  selected: AccessoryId[];
  onToggle: (id: AccessoryId) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step5Accessories: React.FC<Props> = ({ courtType, selected, onToggle, onBack, onNext }) => {
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {cat.label}
              </label>
              <div className="space-y-2">
                {items.map((acc) => {
                  const isSelected = selected.includes(acc.id);
                  const isExclusive =
                    acc.category === 'lighting' ||
                    acc.id === 'basketball-hoop-single' ||
                    acc.id === 'basketball-hoop-double';

                  return (
                    <button
                      key={acc.id}
                      onClick={() => onToggle(acc.id)}
                      className={`w-full p-3 rounded-xl border-2 text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? 'border-pink-500 bg-pink-600/15 text-white'
                          : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-500 hover:text-white'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-pink-500 border-pink-400' : 'border-gray-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span>{acc.icon}</span>
                          <span className="text-sm font-medium">{acc.name}</span>
                          {isExclusive && (
                            <span className="text-xs text-gray-600">(pick one)</span>
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

        <p className="text-xs text-gray-600 text-center pt-1">
          Not sure? No problem — skip this step and we'll discuss options during your consultation.
        </p>
      </div>
    </StepShell>
  );
};
