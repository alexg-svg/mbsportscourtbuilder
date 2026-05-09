/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media', // respects prefers-color-scheme
  theme: {
    extend: {
      colors: {
        // MB Sports Builders brand: hot pink/magenta + cyan accent
        brand: {
          50:  '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },
        // Semantic theme tokens (mapped to CSS vars in index.css)
        theme: {
          base:   'var(--bg-base)',
          panel:  'var(--bg-panel)',
          raised: 'var(--bg-raised)',
          input:  'var(--bg-input)',
          border: 'var(--border)',
          mid:    'var(--border-mid)',
          primary:'var(--text-primary)',
          muted:  'var(--text-muted)',
          faint:  'var(--text-faint)',
          canvas: 'var(--canvas-bg)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'step-enter':      'step-enter 0.22s ease-out both',
        'step-enter-back': 'step-enter-back 0.22s ease-out both',
        'fade-in':         'fade-in 0.3s ease-out both',
        'scale-in':        'scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-up':        'slide-up 0.3s ease-out both',
      },
      keyframes: {
        'step-enter': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'step-enter-back': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.4)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
