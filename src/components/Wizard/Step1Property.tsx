import React from 'react';
import type { PropertyType } from '../../types/court';
import { StepShell } from './StepShell';

interface Props {
  propertyType: PropertyType;
  onChange: (v: PropertyType) => void;
  onNext: () => void;
}

const OPTIONS: { id: PropertyType; label: string; icon: string; desc: string }[] = [
  { id: 'residential', label: 'Residential', icon: '🏠', desc: 'Backyard, driveway, or private property' },
  { id: 'commercial',  label: 'Commercial',  icon: '🏢', desc: 'School, park, club, or business' },
];

export const Step1Property: React.FC<Props> = ({ propertyType, onChange, onNext }) => (
  <StepShell
    step={1} totalSteps={6}
    title="What type of property?"
    subtitle="This helps us recommend the right court size and specs."
    onNext={onNext}
  >
    <div className="grid grid-cols-1 gap-3 mt-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${
            propertyType === opt.id
              ? 'border-pink-500 bg-pink-600/15 text-white'
              : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-500 hover:text-white'
          }`}
        >
          <div className="text-4xl mb-3">{opt.icon}</div>
          <div className="text-lg font-bold">{opt.label}</div>
          <div className={`text-sm mt-1 ${propertyType === opt.id ? 'text-pink-200' : 'text-gray-500'}`}>
            {opt.desc}
          </div>
        </button>
      ))}
    </div>
  </StepShell>
);
