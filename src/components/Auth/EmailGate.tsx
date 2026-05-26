import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  onVerified: (email: string) => void;
}

export const EmailGate: React.FC<Props> = ({ onVerified }) => {
  const [stage, setStage]     = useState<'email' | 'code'>('email');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [token, setToken]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount: check localStorage for a previously verified email
  useEffect(() => {
    const stored = localStorage.getItem('mb_verified_email');
    if (stored) {
      onVerified(stored);
    }
  }, [onVerified]);

  // Start 60-second countdown
  const startCountdown = () => {
    setCountdown(60);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Auto-focus code input when stage switches
  useEffect(() => {
    if (stage === 'code') {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [stage]);

  // Send OTP
  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to send code. Please try again.');
        return;
      }
      setToken(data.token ?? '');
      setCode('');
      setStage('code');
      startCountdown();
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerify = async (overrideCode?: string) => {
    const codeToVerify = overrideCode ?? code;
    if (!codeToVerify || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: codeToVerify, token }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Verification failed. Please try again.');
        return;
      }
      localStorage.setItem('mb_verified_email', email.trim());
      onVerified(email.trim());
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle code input changes — auto-submit on 6 digits
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(val);
    setError(null);
    if (val.length === 6 && /^\d{6}$/.test(val)) {
      handleVerify(val);
    }
  };

  const handleChangeEmail = () => {
    setStage('email');
    setCode('');
    setToken('');
    setError(null);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background orbs — matching app aesthetic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-orb-float"
          style={{ background: 'var(--orb-pink)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl animate-orb-float-alt"
          style={{ background: 'var(--orb-cyan)', animationDelay: '-10s' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/mb-sports-builders-logo.webp"
            alt="MB Sports Builders"
            className="w-32"
          />
        </div>

        {/* Card */}
        <div className="bg-theme-panel border border-theme-border rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
          {/* Card header */}
          <div className="bg-pink-700/20 border-b border-theme-border px-7 py-6">
            <h1 className="text-xl font-bold text-theme-primary leading-tight">
              Welcome to the Court Designer
            </h1>
            <p className="text-sm text-theme-muted mt-1.5 leading-relaxed">
              Enter your email to get started. We'll send a quick verification code.
            </p>
          </div>

          <div className="px-7 py-6">
            {stage === 'email' ? (
              /* ── Email stage ───────────────────────────────────────────── */
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-xs text-theme-muted mb-1.5 font-medium">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    disabled={loading}
                    className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3.5 py-2.5 text-sm text-theme-primary placeholder-theme-faint focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition-colors disabled:opacity-60"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-xs text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all relative overflow-hidden group ${
                    loading || !email.trim()
                      ? 'bg-theme-raised text-theme-faint cursor-not-allowed'
                      : 'bg-pink-600 hover:bg-pink-500 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-white shadow-lg shadow-pink-900/30 hover:shadow-pink-500/40 hover:shadow-xl'
                  }`}
                >
                  {loading ? 'Sending…' : 'Send Code →'}
                  {!loading && email.trim() && (
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                  )}
                </button>

                <p className="text-xs text-theme-faint text-center leading-relaxed">
                  By entering your email you consent to receive occasional marketing
                  emails from MB Sports Builders. You can unsubscribe at any time.
                </p>
              </form>
            ) : (
              /* ── Code stage ────────────────────────────────────────────── */
              <div className="space-y-4">
                <p className="text-sm text-theme-muted leading-relaxed">
                  We sent a 6-digit code to{' '}
                  <span className="text-theme-primary font-semibold">{email}</span>.{' '}
                  <button
                    onClick={handleChangeEmail}
                    className="text-pink-400 hover:text-pink-300 underline underline-offset-2 transition-colors text-xs"
                  >
                    Change email
                  </button>
                </p>

                <div>
                  <label className="block text-xs text-theme-muted mb-1.5 font-medium">
                    Verification Code
                  </label>
                  <input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="\d{6}"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    disabled={loading}
                    className="w-full bg-theme-raised border border-theme-mid rounded-lg px-3.5 py-3 text-2xl font-mono tracking-[0.4em] text-center text-theme-primary placeholder-theme-faint focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30 transition-colors disabled:opacity-60"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5 text-xs text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={() => handleVerify()}
                  disabled={loading || code.length !== 6}
                  className={`w-full py-2.5 text-sm font-semibold rounded-xl transition-all relative overflow-hidden group ${
                    loading || code.length !== 6
                      ? 'bg-theme-raised text-theme-faint cursor-not-allowed'
                      : 'bg-pink-600 hover:bg-pink-500 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] text-white shadow-lg shadow-pink-900/30 hover:shadow-pink-500/40 hover:shadow-xl'
                  }`}
                >
                  {loading ? 'Verifying…' : 'Verify →'}
                  {!loading && code.length === 6 && (
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                  )}
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <span className="text-xs text-theme-faint">
                      Resend in {countdown}s
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendCode()}
                      disabled={loading}
                      className="text-xs text-pink-400 hover:text-pink-300 underline underline-offset-2 transition-colors disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Small print */}
        <p className="text-center text-xs text-theme-faint mt-4 px-4">
          Already verified? Your email is remembered on this device.
        </p>
      </div>
    </div>
  );
};
