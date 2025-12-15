/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#F97316',
        'primary-hover': '#EA580C',
        success: '#22C55E',
        'success-hover': '#16A34A',
        danger: '#EF4444',
        'danger-hover': '#DC2626',
        info: '#3B82F6',
        warning: '#F59E0B',
        'bg-app': '#262624',
        'bg-content': '#FFFFFF',
        'bg-secondary': '#FAFAFA',
        'bg-tertiary': '#F5F5F5',
        'sidebar-bg': '#262624',
        'sidebar-border': '#525252',
        'sidebar-hover': '#242424',
        'sidebar-active': '#2D2D2D',
        'sidebar-text': '#E0E0E0',
        'sidebar-text-secondary': '#A0A0A0',
        'text-primary': '#171717',
        'text-secondary': '#737373',
        'text-tertiary': '#A3A3A3',
        'border-light': '#F0F0F0',
        'border-medium': '#E5E5E5',
        'border-dark': '#D4D4D4',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
