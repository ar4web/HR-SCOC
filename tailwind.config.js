const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './engines/**/*.{js,ts,jsx,tsx,mdx}',
    './modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#009B77',
          50: '#e6f5f0',
          100: '#b3e3d3',
          200: '#80d1b6',
          300: '#4dbf99',
          400: '#26b08a',
          500: '#009B77',
          600: '#008a6a',
          700: '#00755a',
          800: '#00604a',
          900: '#004d3a',
        },
        secondary: {
          DEFAULT: '#00205B',
          50: '#e6e9ef',
          100: '#b3bccf',
          200: '#808faf',
          300: '#4d628f',
          400: '#263f77',
          500: '#00205B',
          600: '#001d52',
          700: '#001847',
          800: '#00133c',
          900: '#000e2e',
        },
        accent: {
          DEFAULT: '#FFC72C',
          50: '#fff9e6',
          100: '#ffecb3',
          200: '#ffdf80',
          300: '#ffd24d',
          400: '#ffc92b',
          500: '#FFC72C',
          600: '#e6b328',
          700: '#cc9f24',
          800: '#b38b20',
          900: '#99771c',
        },
        background: '#F5F5DC',
        surface: '#F8F9FA',
        warning: '#FD7E14',
        success: '#198754',
        error: '#DC3545',
        info: '#0DCAF0',
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
        arabic: ['Cairo', ...fontFamily.sans],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        dropdown: '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        modal: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      transitionTimingFunction: {
        'scos': 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      },
      animation: {
        'shake': 'shake 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        'scale-up': 'scaleUp 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        scaleUp: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
