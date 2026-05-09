import React from 'react';
import { Home, Building2 } from 'lucide-react';
import type { PropertyType } from '../../types/court';
import { StepShell } from './StepShell';

interface Props {
  propertyType: PropertyType;
  onChange: (v: PropertyType) => void;
  onNext: () => void;
}

const OPTIONS: { id: PropertyType; label: string; Icon: React.FC<{ className?: string }>; desc: string }[] = [
  { id: 'residential', label: 'Residential', Icon: Home,      desc: 'Backyard, driveway, or private property' },
  { id: 'commercial',  label: 'Commercial',  Icon: Building2, desc: 'School, park, club, or business' },
];

export const Step1Property: React.FC<Props> = ({ propertyType, onChange, onNext }) => (
  <StepShell
    step={1} totalSteps={6}
    title="What type of property?"
    subtitle="This helps us recommend the right court size and specs."
    onNext={onNext}
  >
    <div className="grid grid-cols-1 gap-3 mt-2">
      {OPTIONS.map(({ id, label, Icon, desc }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`w-full p-5 rounded-2xl border-2 text-left transition-all flex items-start gap-4 ${
            propertyType === id
              ? 'border-pink-500 bg-pink-600/15 text-theme-primary'
              : 'border-theme-mid bg-theme-raised/60 text-theme-primary/80 hover:border-theme-mid hover:text-theme-primary'
          }`}
        >
          <Icon className={`w-8 h-8 mt-0.5 flex-shrink-0 ${propertyType === id ? 'text-pink-400' : 'text-theme-muted'}`} />
          <div>
            <div className="text-lg font-bold">{label}</div>
            <div className={`text-sm mt-1 ${propertyType === id ? 'text-pink-200' : 'text-theme-muted'}`}>{desc}</div>
          </div>
        </button>
      ))}
    </div>
  </StepShell>
);
