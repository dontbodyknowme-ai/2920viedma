/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          50: '#fdf2f4',
          100: '#fbe6e9',
          500: '#800020',
          700: '#5b132b',
          900: '#3a0a1a'
        },
        charcoal: {
          800: '#1e1e1e',
          900: '#121212',
          950: '#0a0a0a'
        },
        gold: {
          400: '#e5c158',
          500: '#d4af37',
          600: '#aa8c2c'
        },
        cream: {
          100: '#fdfbf7',
          200: '#f4efe6'
        }
      }
    }
  },
  plugins: []
}