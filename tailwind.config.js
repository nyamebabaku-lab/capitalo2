import colors from 'tailwindcss/colors';

const scale = (name) => Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, `rgb(var(--${name}-${k}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', '"Plus Jakarta Sans"', 'serif'],
      },
      colors: {
        slate: colors.stone,
        // Owner-themable colours (set as CSS variables by lib/theme.js).
        brand: scale('brand'),
        accent: scale('accent'),
        gold: { 50: '#fdf8e9', 100: '#faeec6', 200: '#f4db8c', 300: '#ecc552', 400: '#e2b232', 500: '#c99a1e', 600: '#a87b16', 700: '#865c15', 800: '#6e4a18', 900: '#5d3e19' },
        ivory: { 50: '#fdfcf8', 100: '#faf7ef', 200: '#f2ecdc', 300: '#e4dbc4' },
        // Dark mode surfaces.
        navy: { 700: '#1f2a26', 800: '#161f1c', 900: '#101714', 950: '#0a0f0d' },
        cream: { 50: '#fdfcf8', 100: '#faf7ef', 200: '#f2ecdc', 300: '#e4dbc4' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,20,.04), 0 4px 18px rgba(16,24,20,.06)',
        lift: '0 12px 36px rgba(16,24,20,.14)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(.96)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'pulse-soft': { '50%': { opacity: 0.6 } },
        float: { '50%': { transform: 'translateY(-8px)' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: 0 }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'none', opacity: 1 } },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease-out',
        'scale-in': 'scale-in .18s ease-out',
        'slide-in': 'slide-in .22s ease-out',
        'slide-up': 'slide-up .25s cubic-bezier(.2,.8,.2,1)',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        float: 'float 5s ease-in-out infinite',
        pop: 'pop .5s cubic-bezier(.2,.8,.2,1) both',
      },
    },
  },
  plugins: [],
};
