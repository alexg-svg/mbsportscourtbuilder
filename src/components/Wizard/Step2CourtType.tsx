import React from 'react';
import type { CourtType } from '../../types/court';
import { StepShell } from './StepShell';

interface Props {
  courtType: CourtType;
  onChange: (v: CourtType) => void;
  onBack: () => void;
  onNext: () => void;
}

const OPTIONS: { id: CourtType; label: string; icon: string; desc: string }[] = [
  { id: 'basketball',  label: 'Basketball',  icon: '🏀', desc: 'Half court or full court' },
  { id: 'tennis',      label: 'Tennis',      icon: '🎾', desc: 'Singles or doubles' },
  { id: 'pickleball',  label: 'Pickleball',  icon: '🏓', desc: 'Standard or with clearance zones' },
  { id: 'multi-sport', label: 'Multi-Sport', icon: '🏆', desc: 'Basketball + Pickleball combo' },
];

export const Step2CourtType: React.FC<Props> = ({ courtType, onChange, onBack, onNext }) => (
  <StepShell
    step={2} totalSteps={6}
    title="Which sport?"
    subtitle="We'll pre-load the right lines, markings, and standard sizes."
    onBack={onBack}
    onNext={onNext}
  >
    <div className="grid grid-cols-2 gap-3 mt-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`p-4 rounded-2xl border-2 text-left transition-all ${
            courtType === opt.id
              ? 'border-pink-500 bg-pink-600/15 text-white'
              : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-500 hover:text-white'
          }`}
        >
          <div className="text-3xl mb-2">{opt.icon}</div>
          <div className="text-sm font-bold">{opt.label}</div>
          <div className={`text-xs mt-1 leading-snug ${courtType === opt.id ? 'text-pink-200' : 'text-gray-500'}`}>
            {opt.desc}
          </div>
        </button>
      ))}
    </div>
  </StepShell>
);
