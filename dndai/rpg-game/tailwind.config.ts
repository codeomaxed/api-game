import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark Fantasy Palette (Bloodborne/Dark Souls inspired)
        'dark-bg': '#0a0505',
        'dark-panel': '#1a0a0a',
        'dark-text': '#e0e0e0',
        'dark-muted': '#999999',
        'blood-red': '#7a1a1a',
        'crimson': '#a83232',
        'rose': '#c97a7a',
        'pale': '#d4a5a5',
        'glow': '#ff4444',
      },
      fontFamily: {
        'cinzel': ['Cinzel', 'serif'],
        'lato': ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config














