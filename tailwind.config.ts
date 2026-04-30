import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand teal from volleymonster.com
        teal: {
          50: '#f0f9fa',
          100: '#d9f1f4',
          200: '#b3e4ea',
          300: '#7ecfdb',
          400: '#7EBEC5', // existing site accent — use as primary-400
          500: '#4fa8b3',
          600: '#3a8a96',
          700: '#2e707a',
          800: '#265d64',
          900: '#234e54',
        },
        // Punchy orange pulled from tournament flier art
        flame: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea6c0f',
          700: '#c2570a',
          800: '#9a4510',
          900: '#7c3a0f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [forms],
}

export default config
