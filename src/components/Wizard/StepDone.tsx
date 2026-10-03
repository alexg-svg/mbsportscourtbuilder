import React from 'react';
import { CheckCircle, Phone, FileText, MapPin, HardHat, Download, FileDown, Loader2, Link2, Check } from 'lucide-react';
import { trackEvent } from '../../utils/analytics';

interface Props {
  name: string;
  email: string;
  render3D?: string;
  onDownloadPdf?: () => void;
  pdfBusy?: boolean;
  onShare?: () => void;
  linkCopied?: boolean;
  onReset: () => void;
}

const doneBtn =
  'inline-flex items-center justify-center gap-1.5 px-2 py-2 whitespace-nowrap rounded-lg border border-pink-500/60 bg-theme-raised ' +
  'text-xs font-semibold text-pink-700 dark:text-pink-300 hover:bg-pink-700 hover:text-white hover:border-pink-500 transition-colors disabled:opacity-60';

export const StepDone: React.FC<Props> = ({ name, email, render3D, onDownloadPdf, pdfBusy, onShare, linkCopied, onReset }) => (
  <div className="h-full overflow-y-auto">
  <div className="min-h-full flex flex-col items-center justify-center px-8 py-10 text-center">
    <div className="w-20 h-20 flex-shrink-0 rounded-full bg-pink-600/20 border-2 border-pink-500 flex items-center justify-center mb-6 animate-scale-in">
      <CheckCircle className="w-10 h-10 text-pink-700 dark:text-pink-300" />
    </div>

    <h2 className="text-2xl font-bold text-theme-primary mb-2 animate-fade-in" style={{ animationDelay: '120ms' }}>Design Submitted!</h2>
    <p className="text-theme-muted text-sm leading-relaxed mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
      Thanks, <span className="text-theme-primary font-medium">{name}</span>! We've received your custom
      court design and will send a detailed quote to{' '}
      <span className="text-pink-700 dark:text-pink-300">{email}</span> within 24–48 hours.
    </p>

    {render3D && (
      <img
        src={`data:image/jpeg;base64,${render3D}`}
        alt="3D render of your court design"
        className="w-full rounded-xl border border-theme-mid shadow-lg mb-3 animate-fade-in"
        style={{ animationDelay: '240ms' }}
      />
    )}

    {/* Keep or share the design: only offered once the quote request is in */}
    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6 animate-fade-in" style={{ animationDelay: '260ms' }}>
      {render3D && (
        <a
          href={`data:image/jpeg;base64,${render3D}`}
          download="my-court-design.jpg"
          onClick={() => trackEvent('design_downloaded')}
          className={doneBtn}
        >
          <Download className="w-3.5 h-3.5" /> Save picture
        </a>
      )}
      {onDownloadPdf && (
        <button onClick={onDownloadPdf} disabled={pdfBusy} className={doneBtn}>
          {pdfBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
          {pdfBusy ? 'Preparing…' : 'Save PDF'}
        </button>
      )}
      {onShare && (
        <button onClick={onShare} className={doneBtn}>
          {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
          {linkCopied ? 'Link copied' : 'Share link'}
        </button>
      )}
    </div>

    <div className="w-full bg-theme-raised/60 border border-theme-mid rounded-2xl p-4 text-left space-y-3 mb-8 animate-slide-up" style={{ animationDelay: '280ms' }}>
      <div className="text-xs text-theme-muted font-semibold uppercase tracking-wider mb-1">What happens next</div>
      <NextStep Icon={Phone}    text="Our team reviews your court design" delay={340} />
      <NextStep Icon={FileText} text="We prepare a detailed written quote" delay={400} />
      <NextStep Icon={MapPin}   text="We schedule a free on-site evaluation" delay={460} />
      <NextStep Icon={HardHat}  text="Construction begins on your timeline" delay={520} />
    </div>

    <div className="text-xs text-theme-muted mb-6 animate-fade-in" style={{ animationDelay: '560ms' }}>
      Questions? Visit <span className="text-pink-700 dark:text-pink-300">mbsportsbuilders.com</span>
    </div>

    <button
      onClick={onReset}
      className="text-xs text-theme-muted hover:text-theme-primary/80 underline underline-offset-2 transition-colors animate-fade-in active:scale-[0.97]"
      style={{ animationDelay: '600ms' }}
    >
      Start a new design
    </button>
  </div>
  </div>
);

const NextStep: React.FC<{ Icon: React.FC<{ className?: string }>; text: string; delay: number }> = ({ Icon, text, delay }) => (
  <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
    <Icon className="w-4 h-4 text-pink-700 dark:text-pink-300 flex-shrink-0" />
    <span className="text-sm text-theme-primary/80">{text}</span>
  </div>
);

export type { Props as StepDoneProps };
