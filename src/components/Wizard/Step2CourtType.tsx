import React from 'react';
import { MdSportsBasketball, MdSportsTennis, MdSports, MdSportsVolleyball } from 'react-icons/md';
import { FaTableTennisPaddleBall } from 'react-icons/fa6';
import { Circle, Square, Target, Layers, Zap, Shield, Grid3X3 } from 'lucide-react';
import type { CourtType } from '../../types/court';
import { StepShell } from './StepShell';

interface Props {
  courtType: CourtType;
  onChange: (v: CourtType) => void;
  onBack: () => void;
  onNext: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OPTIONS: { id: CourtType; label: string; Icon: React.ComponentType<any>; desc: string }[] = [
  { id: 'basketball',    label: 'Basketball',    Icon: MdSportsBasketball,      desc: 'Half court or full court' },
  { id: 'tennis',        label: 'Tennis',        Icon: MdSportsTennis,          desc: 'Singles or doubles' },
  { id: 'pickleball',    label: 'Pickleball',    Icon: FaTableTennisPaddleBall, desc: 'Standard or with clearance zones' },
  { id: 'multi-sport',   label: 'Multi-Sport',   Icon: MdSports,                desc: 'Basketball + Pickleball combo' },
  { id: 'bocce-ball',    label: 'Bocce Ball',    Icon: Circle,                  desc: 'Residential or tournament lane' },
  { id: 'shuffleboard',  label: 'Shuffleboard',  Icon: Target,                  desc: 'Scoring triangles · 1-2-3 zones' },
  { id: 'volleyball',    label: 'Volleyball',    Icon: MdSportsVolleyball,       desc: 'Regulation hard court' },
  { id: 'badminton',     label: 'Badminton',     Icon: Layers,                  desc: 'Singles & doubles lines' },
  { id: 'futsal',        label: 'Futsal',        Icon: Circle,                  desc: 'Indoor soccer · penalty arcs' },
  { id: 'inline-hockey', label: 'Inline Hockey', Icon: Zap,                     desc: 'Rink · blue lines · goal creases' },
  { id: 'handball',      label: 'Handball',      Icon: Shield,                  desc: 'Goal areas · free-throw arc' },
  { id: 'four-square',   label: 'Four Square',   Icon: Grid3X3,                 desc: 'Four quadrant court' },
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
      {OPTIONS.map(({ id, label, Icon, desc }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.97] ${
            courtType === id
              ? 'border-pink-500 bg-pink-600/15 text-theme-primary shadow-lg shadow-pink-500/25 ring-1 ring-pink-500/30'
              : 'border-theme-mid bg-theme-raised/60 text-theme-primary/80 hover:border-pink-500/50 hover:text-theme-primary hover:shadow-md hover:shadow-pink-500/10'
          }`}
        >
          <Icon size={28} className={`mb-3 ${courtType === id ? 'text-pink-400' : 'text-theme-muted'}`} />
          <div className="text-sm font-bold">{label}</div>
          <div className={`text-xs mt-1 leading-snug ${courtType === id ? 'text-pink-700 dark:text-pink-200' : 'text-theme-muted'}`}>{desc}</div>
        </button>
      ))}
    </div>
  </StepShell>
);
