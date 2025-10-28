import type { Config } from 'tailwindcss'
const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',    // keep this
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0b0c10', panel: '#111317', ink: '#eaeef3', muted: '#a7b0bd',
        accent: '#22a6b3', accentAlt: '#3b82f6', success: '#22c55e',
        warn: '#f59e0b', error: '#ef4444', border: '#1c212b'
      },
      borderRadius: { xl: '20px', '2xl': '28px' },
      boxShadow: {
        card: '0 10px 30px rgba(0,0,0,.35)',
        popover: '0 16px 40px rgba(0,0,0,.45)'
      }
    }
  },
  plugins: []
}
export default config


