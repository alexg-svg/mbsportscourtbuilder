const RECAPTCHA_SITE_KEY = '6LfvCP4sAAAAAEXWAwsFSbLzUaEJq56gvMsjkHWh';

export function trackEvent(name: string, params?: Record<string, unknown>) {
  (window as any).gtag?.('event', name, params);
}

// Give up after this long so a slow or blocked Google never holds up a quote
const RECAPTCHA_TIMEOUT_MS = 5000;

export function getRecaptchaToken(action: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const gr = (window as any).grecaptcha;
    if (!gr) { reject(new Error('reCAPTCHA not loaded')); return; }
    setTimeout(() => reject(new Error('reCAPTCHA timed out')), RECAPTCHA_TIMEOUT_MS);
    gr.ready(() => {
      gr.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve).catch(reject);
    });
  });
}
