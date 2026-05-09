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
    },
  },
  plugins: [],
}
