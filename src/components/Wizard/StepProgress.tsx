import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  'Property',
  'Court Type',
  'Size',
  'Colors',
  'Accessories',
  'Your Info',
];

interface Props {
  current: number; // 0-based
}

export const StepProgress: React.FC<Props> = ({ current }) => {
  return (
    <div className="px-6 py-4 border-b border-theme-border">
      {/* Bar */}
      <div className="relative h-1 bg-theme-raised rounded-full mb-3">
        <div
          className="absolute left-0 top-0 h-1 bg-pink-500 rounded-full transition-all duration-500"
          style={{ width: `${((current + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      {/* Labels */}
      <div className="flex justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-0.5" style={{ width: `${100 / STEPS.length}%` }}>
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < current
                  ? 'bg-pink-600 text-white'
                  : i === current
                  ? 'bg-pink-500 text-white ring-2 ring-pink-400/40'
                  : 'bg-theme-raised text-theme-faint'
              }`}
            >
              {i < current ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
            </div>
            <span className={`text-[9px] font-medium hidden sm:block ${i === current ? 'text-pink-400' : i < current ? 'text-theme-muted' : 'text-theme-faint'}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
