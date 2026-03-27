/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FDFBF7',
        surface: '#FFFFFF',
        'surface-2': '#FFFFFF',
        border: '#DFE7E3',
        'text-primary': '#2E7D32',
        'text-muted': '#60727A',
        accent: '#2E7D32',
        'accent-bright': '#2E7D32',
        'accent-dark': '#1B5E20',
        brown: '#6D544C',
        'brown-light': '#8D736A',
        'brown-surface': '#FFFFFF',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 3px rgba(46,125,50,0.18)',
        card: '0 8px 24px rgba(38, 50, 56, 0.08)',
      },
    },
  },
  plugins: [],
}

