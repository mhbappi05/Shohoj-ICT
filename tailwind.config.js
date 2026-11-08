/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10202F',
        paper: '#F4F7FA',
        signal: '#00A676', // logic HIGH
        wire: '#9AA7B4',   // logic LOW
        flip: '#F2A900',   // changed / flipped bit
        line: '#D5DDE5',
      },
      fontFamily: {
        sans: ['"Hind Siliguri"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
