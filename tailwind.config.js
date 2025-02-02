/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Apple-style colors
        'apple-gray': {
          50: '#F5F5F7',
          100: '#E8E8ED',
          200: '#D2D2D7',
          300: '#AEAEB2',
          400: '#8E8E93',
          500: '#6E6E73',
          600: '#3F3F41',
          700: '#2F2F30',
          800: '#1D1D1F',
          900: '#0A0A0A',
        },
        'apple-blue': {
          500: '#0071E3',
          600: '#0077ED',
          700: '#0066CC',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
