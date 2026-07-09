/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fantasy/Mage theme colors
        'mage-dark': '#1a1625',
        'mage-darker': '#0f0d14',
        'mage-purple': '#6b46c1',
        'mage-purple-light': '#8b5cf6',
        'mage-purple-dark': '#4c1d95', // Darker purple for panels
        'mage-blue': '#3b82f6',
        'mage-cyan': '#06b6d4',
        'mage-gold': '#f59e0b',
        'mage-gold-light': '#fbbf24',
        'mage-gold-dark': '#d97706',
        'mage-red': '#ef4444',
        'mage-green': '#10b981',
        'chalk': '#e5e7eb',
        'chalk-dim': '#9ca3af',
      },
      fontFamily: {
        'fantasy': ['Cinzel', 'serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.8), 0 0 30px rgba(139, 92, 246, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}

