import React from 'react';
import {
  Target, Minus, Zap, Grid2X2, Square, Wind,
  Armchair, Droplets, ClipboardList, Check,
} from 'lucide-react';
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

const ACC_ICONS: Record<AccessoryId, React.FC<{ className?: string }>> = {
  'basketball-hoop-single': Target,
  'basketball-hoop-double': Target,
  'tennis-net':             Minus,
  'pickleball-net':         Minus,
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-theme-muted mb-2">
                {cat.label}
              </label>
              <div className="space-y-2">
                {items.map((acc) => {
                  const isSelected = selected.includes(acc.id);
                  const Icon = ACC_ICONS[acc.id];
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
                          ? 'border-pink-500 bg-pink-600/15 text-theme-primary'
                          : 'border-theme-mid bg-theme-raised/60 text-theme-primary/80 hover:border-theme-mid hover:text-theme-primary'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-pink-500 border-pink-400' : 'border-theme-mid'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-theme-primary" strokeWidth={3} />}
                      </div>

                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSelected ? 'text-pink-400' : 'text-theme-muted'}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{acc.name}</span>
                          {isExclusive && (
                            <span className="text-xs text-theme-faint">(pick one)</span>
                          )}
                        </div>
                        <div className={`text-xs mt-0.5 leading-snug ${isSelected ? 'text-pink-200' : 'text-theme-muted'}`}>
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

        <p className="text-xs text-theme-faint text-center pt-1">
          Not sure? Skip this step — we'll discuss options during your consultation.
        </p>
      </div>
    </StepShell>
  );
};
