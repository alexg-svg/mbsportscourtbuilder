import React from 'react';
import type { ContactData } from './Step6Contact';

interface Props {
  name: string;
  email: string;
  onReset: () => void;
}

export const StepDone: React.FC<Props> = ({ name, email, onReset }) => (
  <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center">
    {/* Animated checkmark */}
    <div className="w-20 h-20 rounded-full bg-pink-600/20 border-2 border-pink-500 flex items-center justify-center mb-6">
      <svg className="w-10 h-10 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <h2 className="text-2xl font-bold text-white mb-2">Design Submitted!</h2>
    <p className="text-gray-400 text-sm leading-relaxed mb-6">
      Thanks, <span className="text-white font-medium">{name}</span>! We've received your custom court design and will send a detailed quote to{' '}
      <span className="text-pink-400">{email}</span> within 24–48 hours.
    </p>

    <div className="w-full bg-gray-800/60 border border-gray-700 rounded-2xl p-4 text-left space-y-2 mb-8 text-sm">
      <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">What happens next</div>
      <Step icon="📞" text="Our team reviews your court design" />
      <Step icon="📋" text="We prepare a detailed written quote" />
      <Step icon="📍" text="We schedule a free on-site evaluation" />
      <Step icon="🏗️" text="Construction begins on your timeline" />
    </div>

    <div className="text-xs text-gray-500 mb-6">
      Questions? Visit{' '}
      <span className="text-pink-400">mbsportsbuilders.com</span>
    </div>

    <button
      onClick={onReset}
      className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 transition-colors"
    >
      Start a new design
    </button>
  </div>
);

const Step: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="flex items-center gap-3">
    <span className="text-lg">{icon}</span>
    <span className="text-gray-300">{text}</span>
  </div>
);

export type { ContactData };
