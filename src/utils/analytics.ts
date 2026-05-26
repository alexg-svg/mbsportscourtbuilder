const RECAPTCHA_SITE_KEY = '6LfvCP4sAAAAAEXWAwsFSbLzUaEJq56gvMsjkHWh';

export function trackEvent(name: string, params?: Record<string, unknown>) {
  (window as any).gtag?.('event', name, params);
}

export function getRecaptchaToken(action: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const gr = (window as any).grecaptcha;
    if (!gr) { reject(new Error('reCAPTCHA not loaded')); return; }
    gr.ready(() => {
      gr.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve).catch(reject);
    });
  });
}
