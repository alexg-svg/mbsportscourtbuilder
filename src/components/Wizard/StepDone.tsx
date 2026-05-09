import React from 'react';
import { CheckCircle, Phone, FileText, MapPin, HardHat } from 'lucide-react';

interface Props {
  name: string;
  email: string;
  onReset: () => void;
}

export const StepDone: React.FC<Props> = ({ name, email, onReset }) => (
  <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center">
    <div className="w-20 h-20 rounded-full bg-pink-600/20 border-2 border-pink-500 flex items-center justify-center mb-6 animate-scale-in">
      <CheckCircle className="w-10 h-10 text-pink-400" />
    </div>

    <h2 className="text-2xl font-bold text-theme-primary mb-2 animate-fade-in" style={{ animationDelay: '120ms' }}>Design Submitted!</h2>
    <p className="text-theme-muted text-sm leading-relaxed mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
      Thanks, <span className="text-theme-primary font-medium">{name}</span>! We've received your custom
      court design and will send a detailed quote to{' '}
      <span className="text-pink-400">{email}</span> within 24–48 hours.
    </p>

    <div className="w-full bg-theme-raised/60 border border-theme-mid rounded-2xl p-4 text-left space-y-3 mb-8 animate-slide-up" style={{ animationDelay: '280ms' }}>
      <div className="text-xs text-theme-muted font-semibold uppercase tracking-wider mb-1">What happens next</div>
      <NextStep Icon={Phone}    text="Our team reviews your court design" delay={340} />
      <NextStep Icon={FileText} text="We prepare a detailed written quote" delay={400} />
      <NextStep Icon={MapPin}   text="We schedule a free on-site evaluation" delay={460} />
      <NextStep Icon={HardHat}  text="Construction begins on your timeline" delay={520} />
    </div>

    <div className="text-xs text-theme-muted mb-6 animate-fade-in" style={{ animationDelay: '560ms' }}>
      Questions? Visit <span className="text-pink-400">mbsportsbuilders.com</span>
    </div>

    <button
      onClick={onReset}
      className="text-xs text-theme-muted hover:text-theme-primary/80 underline underline-offset-2 transition-colors animate-fade-in active:scale-[0.97]"
      style={{ animationDelay: '600ms' }}
    >
      Start a new design
    </button>
  </div>
);

const NextStep: React.FC<{ Icon: React.FC<{ className?: string }>; text: string; delay: number }> = ({ Icon, text, delay }) => (
  <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
    <Icon className="w-4 h-4 text-pink-400 flex-shrink-0" />
    <span className="text-sm text-theme-primary/80">{text}</span>
  </div>
);

export type { Props as StepDoneProps };
