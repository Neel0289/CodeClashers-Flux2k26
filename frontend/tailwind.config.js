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
        'accent-dark': '#2E7D32',
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
        'clay-card': '12px 12px 24px 0 rgba(0, 0, 0, 0.12), inset -8px -8px 12px 0 rgba(0, 0, 0, 0.05), inset 8px 8px 12px 0 rgba(255, 255, 255, 0.8)',
        'clay-btn': '6px 6px 12px 0 rgba(0, 0, 0, 0.15), inset -4px -4px 6px 0 rgba(0, 0, 0, 0.1), inset 4px 4px 6px 0 rgba(255, 255, 255, 0.3)',
        'clay-input': 'inset 4px 4px 8px 0 rgba(0, 0, 0, 0.05), inset -4px -4px 8px 0 rgba(255, 255, 255, 0.5)',
      },
    },
  },
  plugins: [],
}

