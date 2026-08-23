import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-mode="dark"]'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        // Text
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        // Accent (theme-driven)
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--c-accent-soft) / <alpha-value>)',
        'accent-ink': 'rgb(var(--c-accent-ink) / <alpha-value>)',
        // Fixed pastel family
        honey: {
          DEFAULT: 'rgb(var(--p-honey) / <alpha-value>)',
          soft: 'rgb(var(--p-honey-soft) / <alpha-value>)',
        },
        blush: {
          DEFAULT: 'rgb(var(--p-blush) / <alpha-value>)',
          soft: 'rgb(var(--p-blush-soft) / <alpha-value>)',
        },
        lilac: {
          DEFAULT: 'rgb(var(--p-lilac) / <alpha-value>)',
          soft: 'rgb(var(--p-lilac-soft) / <alpha-value>)',
        },
        sage: {
          DEFAULT: 'rgb(var(--p-sage) / <alpha-value>)',
          soft: 'rgb(var(--p-sage-soft) / <alpha-value>)',
        },
        sky: {
          DEFAULT: 'rgb(var(--p-sky) / <alpha-value>)',
          soft: 'rgb(var(--p-sky-soft) / <alpha-value>)',
        },
        clay: {
          DEFAULT: 'rgb(var(--p-clay) / <alpha-value>)',
          soft: 'rgb(var(--p-clay-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '1.75rem',
        pill: '999px',
        blob: '42% 58% 55% 45% / 48% 42% 58% 52%',
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgb(var(--c-shadow) / 0.06), 0 8px 24px -8px rgb(var(--c-shadow) / 0.10)',
        lift: '0 4px 12px -3px rgb(var(--c-shadow) / 0.09), 0 16px 40px -12px rgb(var(--c-shadow) / 0.16)',
        float: '0 8px 20px -4px rgb(var(--c-shadow) / 0.14), 0 24px 56px -16px rgb(var(--c-shadow) / 0.22)',
        inset: 'inset 0 1px 2px rgb(255 255 255 / 0.35)',
      },
      spacing: { safe: 'env(safe-area-inset-bottom, 0px)', 13: '3.25rem', 18: '4.5rem' },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.32, 0.72, 0, 1)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        'blob-drift': {
          '0%,100%': { transform: 'translate(0,0) rotate(0deg) scale(1)' },
          '33%': { transform: 'translate(2%,-3%) rotate(4deg) scale(1.03)' },
          '66%': { transform: 'translate(-2%,2%) rotate(-3deg) scale(0.98)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'blob-drift': 'blob-drift 18s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.32,0.72,0,1) both',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
