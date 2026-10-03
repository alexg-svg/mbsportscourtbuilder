const RECAPTCHA_SITE_KEY = '6LfvCP4sAAAAAEXWAwsFSbLzUaEJq56gvMsjkHWh';

export function trackEvent(name: string, params?: Record<string, unknown>) {
  (window as any).gtag?.('event', name, params);
}

// Give up after this long so a slow or blocked Google never holds up a quote
const RECAPTCHA_TIMEOUT_MS = 5000;

let recaptchaLoading: Promise<void> | null = null;

/**
 * Loads the reCAPTCHA script on demand (it is only needed for the quote, so
 * it no longer slows down the first page load). Safe to call repeatedly.
 */
export function loadRecaptcha(): Promise<void> {
  if ((window as any).grecaptcha) return Promise.resolve();
  if (!recaptchaLoading) {
    recaptchaLoading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { recaptchaLoading = null; reject(new Error('reCAPTCHA failed to load')); };
      document.head.appendChild(s);
    });
  }
  return recaptchaLoading;
}

export function getRecaptchaToken(action: string): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('reCAPTCHA timed out')), RECAPTCHA_TIMEOUT_MS);
    loadRecaptcha().then(() => {
      const gr = (window as any).grecaptcha;
      if (!gr) { reject(new Error('reCAPTCHA not loaded')); return; }
      gr.ready(() => {
        gr.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve).catch(reject);
      });
    }).catch(reject);
  });
}
