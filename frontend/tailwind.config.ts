import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'background-primary': '#1A1A1D',
        'background-secondary': '#252528',
        'text-primary': '#C3E88D',
        'text-secondary': '#8F93A2',
        'text-interactive': '#89DDFF',
        'text-heading': '#FFFFFF',
        'accent-primary': '#89DDFF',
        'accent-secondary': '#82AAFF',
        'state-success': '#76FF03',
        'state-warning': '#FF9100',
        'state-error': '#F44336',
        'state-disabled': '#4A4A4D',
      },
      fontFamily: {
        heading: ['"Press Start 2P"', '"VT323"', 'monospace'],
        body: ['"Fira Code"', '"Roboto Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 12px rgba(137, 221, 255, 0.4)',
        'glow-success': '0 0 12px rgba(118, 255, 3, 0.4)',
        'glow-error': '0 0 12px rgba(244, 67, 54, 0.4)',
      },
      textShadow: {
        'glow-primary': '0 0 8px rgba(137, 221, 255, 0.6)',
        'glow-white': '0 0 8px rgba(255, 255, 255, 0.3)',
        'glow-success': '0 0 5px rgba(118, 255, 3, 0.6)',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' },
        },
      },
      animation: {
        flicker: 'flicker 0.15s infinite alternate',
        glowPulse: 'glowPulse 2s infinite ease-in-out',
        typewriter: 'typewriter 2s steps(40, end)',
      },
    },
  },
  plugins: [
    require('tailwindcss-textshadow')
  ],
}

export default config