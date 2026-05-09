import React from 'react';

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  step: number;
  totalSteps: number;
}

export const StepShell: React.FC<Props> = ({
  title, subtitle, children,
  onBack, onNext, nextLabel = 'Next →',
  nextDisabled = false,
  step, totalSteps,
}) => (
  <div className="flex flex-col h-full">
    {/* Heading */}
    <div className="px-6 pt-5 pb-4">
      <p className="text-xs text-pink-400 font-semibold uppercase tracking-widest mb-1">
        Step {step} of {totalSteps}
      </p>
      <h2 className="text-xl font-bold text-theme-primary leading-tight">{title}</h2>
      {subtitle && <p className="text-sm text-theme-muted mt-1">{subtitle}</p>}
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto px-6 pb-4">
      {children}
    </div>

    {/* Navigation */}
    <div className="px-6 py-4 border-t border-theme-border flex gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="px-4 py-2.5 text-sm text-theme-muted hover:text-theme-primary border border-theme-mid hover:border-theme-mid rounded-xl transition-all active:scale-[0.96]"
        >
          ← Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
          nextDisabled
            ? 'bg-theme-raised text-theme-faint cursor-not-allowed'
            : 'bg-pink-600 hover:bg-pink-500 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-theme-primary shadow-lg shadow-pink-900/30 active:shadow-md'
        }`}
      >
        {nextLabel}
      </button>
    </div>
  </div>
);
