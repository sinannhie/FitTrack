/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // ── Color Palette ──────────────────────────────────────────
      colors: {
        void:    '#09090b',      // deepest background
        surface: '#111114',      // page background
        card:    '#18181b',      // card background
        muted:   '#27272a',      // subtle fills, dividers
        border:  '#3f3f46',      // default border
        dim:     '#71717a',      // placeholder / secondary text
        text:    '#f4f4f5',      // primary text
        lime:    '#a8f04a',      // primary accent (green)
        ember:   '#f97316',      // carbs / warnings (orange)
        ice:     '#7dd3fc',      // protein / info (blue)
      },

      // ── Typography ─────────────────────────────────────────────
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        sans:    ['DM Sans', 'sans-serif'],   // Tailwind default override
      },

      // ── Animations ─────────────────────────────────────────────
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'spin': {
          '0%':   { transform: 'rotate(0deg)'   },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease forwards',
        'fade-in': 'fade-in 0.3s ease forwards',
        'spin':    'spin 0.8s linear infinite',
      },

      // ── Animation Delays (utility classes) ─────────────────────
      animationDelay: {
        100: '100ms',
        200: '200ms',
        300: '300ms',
        400: '400ms',
        500: '500ms',
      },

      // ── Border Radius ───────────────────────────────────────────
      borderRadius: {
        DEFAULT: '0.5rem',
        xl:  '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [
    // Plugin to support animate-delay-{n} utility classes
    function ({ matchUtilities, theme }) {
      matchUtilities(
        { 'animate-delay': (value) => ({ animationDelay: value }) },
        { values: theme('animationDelay') }
      )
    },
  ],
}