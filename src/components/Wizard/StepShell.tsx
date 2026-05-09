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
      <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto px-6 pb-4">
      {children}
    </div>

    {/* Navigation */}
    <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="px-4 py-2.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-all"
        >
          ← Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
          nextDisabled
            ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
            : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-900/30'
        }`}
      >
        {nextLabel}
      </button>
    </div>
  </div>
);
