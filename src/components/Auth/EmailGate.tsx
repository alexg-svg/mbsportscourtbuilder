import React, { useState, useEffect } from 'react';

interface Props {
  onVerified: (email: string) => void;
}

export const EmailGate: React.FC<Props> = ({ onVerified }) => {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('mb_verified_email');
    if (stored) onVerified(stored);
  }, [onVerified]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    localStorage.setItem('mb_verified_email', trimmed);
    onVerified(trimmed);
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-orb-float"
          style={{ background: 'var(--orb-pink)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl animate-orb-float-alt"
          style={{ background: 'var(--orb-cyan)', animationDelay: '-10s' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/mb-sports-builders-logo.webp" alt="MB Sports Builders" className="w-32" />
        </div>

        {/* Card */}
        <div className="bg-theme-panel border border-theme-border rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
          <div className="bg-pink-700/20 border-b border-theme-border px-7 py-6">
            <h1 className="text-xl font-bold text-theme-primary leading-tight">
              Welcome to the Court Designer
            </h1>
            <p className="text-sm text-theme-muted mt-1.5 leading-relaxed">
              Enter your email to get started designing your custom court.
            </p>
          </div>

          <div className="px-7 py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-theme-muted mb-1.5 font-medium">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3.5 py-2.5 text-sm text-theme-primary placeholder-theme-faint focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={!email.trim()}
                className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all relative overflow-hidden group ${
                  !email.trim()
                    ? 'bg-theme-raised text-theme-faint cursor-not-allowed'
                    : 'bg-pink-600 hover:bg-pink-500 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-white shadow-lg shadow-pink-900/30 hover:shadow-pink-500/40 hover:shadow-xl'
                }`}
              >
                Get Started →
                {email.trim() && (
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                )}
              </button>

              <p className="text-xs text-theme-faint text-center leading-relaxed">
                By entering your email you consent to receive occasional marketing
                emails from MB Sports Builders. You can unsubscribe at any time.
              </p>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-theme-faint mt-4 px-4">
          Returning visitor? Your email is remembered on this device.
        </p>
      </div>
    </div>
  );
};
