/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Sans"', 'sans-serif'],
        body:    ['"DM Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        teal: {
          50:  '#F0FDFA', 100: '#CCFBF1', 200: '#99F6E4',
          300: '#5EEAD4', 400: '#2DD4BF', 500: '#14B8A6',
          600: '#0D9488', 700: '#0F766E', 800: '#115E59', 900: '#134E4A',
        },
        clinical: {
          50:  '#F7F9FB', 100: '#EEF2F7', 200: '#DCE5F0',
          300: '#B8C9DF', 400: '#8AA5C4', 500: '#6284AA',
          600: '#3D6491', 700: '#2C4F76', 800: '#1E3759', 900: '#131F30',
        }
      },
      animation: {
        'scan':       'scan 2.5s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'fade-up':    'fadeUp 0.5s ease-out forwards',
        'slide-in':   'slideIn 0.4s ease-out forwards',
        'shimmer':    'shimmer 2s linear infinite',
        'draw':       'draw 1.5s ease-in-out forwards',
      },
      keyframes: {
        scan:       { '0%,100%': { top: '0%' }, '50%': { top: '95%' } },
        pulseRing:  { '0%': { transform: 'scale(1)', opacity: '1' }, '100%': { transform: 'scale(1.8)', opacity: '0' } },
        fadeUp:     { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn:    { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        shimmer:    { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        draw:       { from: { strokeDashoffset: '1000' }, to: { strokeDashoffset: '0' } },
      },
      boxShadow: {
        'clinical':    '0 0 0 1px rgba(14,165,150,0.15), 0 4px 24px rgba(14,165,150,0.08)',
        'card-light':  '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'card-dark':   '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
        'danger':      '0 0 0 1px rgba(239,68,68,0.2), 0 4px 24px rgba(239,68,68,0.08)',
        'safe':        '0 0 0 1px rgba(20,184,166,0.2), 0 4px 24px rgba(20,184,166,0.08)',
      }
    }
  },
  plugins: []
};
