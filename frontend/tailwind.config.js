/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void:    '#08080a',
        surface: '#0f0f12',
        card:    '#161619',
        card2:   '#1c1c20',
        muted:   '#26262c',
        border:  '#2e2e35',
        dim:     '#68687a',
        text:    '#f2f2f7',
        lime:    '#a8f04a',
        ember:   '#f97316',
        ice:     '#7dd3fc',
        rose:    '#fb7185',
      },
      fontFamily: {
        display: ['"SF Pro Display"', '"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        body:    ['"SF Pro Text"',    '"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:    ['"SF Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans:    ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        card:        '0 1px 3px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
        'card-lg':   '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glow-lime': '0 0 24px rgba(168,240,74,0.18)',
        'modal':     '0 24px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
      },
      keyframes: {
        'fade-up':  { '0%': { opacity:'0', transform:'translateY(14px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        'fade-in':  { '0%': { opacity:'0' },                               '100%': { opacity:'1' } },
        'scale-in': { '0%': { opacity:'0', transform:'scale(0.94)' },      '100%': { opacity:'1', transform:'scale(1)' } },
        'slide-up': { '0%': { opacity:'0', transform:'translateY(32px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        'shimmer':  { '0%': { backgroundPosition:'-800px 0' }, '100%': { backgroundPosition:'800px 0' } },
        'spin':     { '0%': { transform:'rotate(0deg)' }, '100%': { transform:'rotate(360deg)' } },
      },
      animation: {
        'fade-up':  'fade-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':  'fade-in 0.3s ease forwards',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer':  'shimmer 1.8s infinite linear',
        'spin':     'spin 0.7s linear infinite',
      },
    },
  },
  plugins: [
    function ({ matchUtilities, addUtilities }) {
      matchUtilities(
        { 'animate-delay': v => ({ animationDelay: v }) },
        {
          values: {
            50:'50ms', 75:'75ms', 100:'100ms', 150:'150ms', 200:'200ms',
            300:'300ms', 400:'400ms', 500:'500ms', 600:'600ms', 700:'700ms',
          },
        }
      )
      addUtilities({
        '.glass': {
          background: 'rgba(22, 22, 25, 0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        },
        '.no-select': { userSelect: 'none', WebkitUserSelect: 'none' },
        '.tap-none':  { WebkitTapHighlightColor: 'transparent' },
      })
    },
  ],
}
