// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cosmic: {
          bg:    '#0b0b28',
          card:  '#29195a',
          surface:'#38215c',
          gold:  '#FFCE4D',
          pink:  '#ff6e7e',
          peach: '#ffe27c',
          text:  '#F0F1F5',
        },
      },
      boxShadow: {
        glow: '0 0 0 3px rgba(251,191,36,.25), 0 20px 40px rgba(0,0,0,.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      backgroundImage: {
        'cta-grad':
          'linear-gradient(120deg, #FFCE4D, #ffe27c, #ff6e7e)',
        'space-nebula':
          'radial-gradient(#ffffff14 1px, transparent 1px), radial-gradient(#ffffff0f 1px, transparent 1px), radial-gradient(60% 50% at 50% -10%, rgba(110,0,255,.28), transparent 60%), radial-gradient(40% 30% at 120% 10%, rgba(192,38,211,.22), transparent 60%), radial-gradient(30% 20% at -20% 10%, rgba(251,191,36,.15), transparent 60%)',
      },
    },
  },
  plugins: [],
}

export default config
