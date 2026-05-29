import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'surface-0': '#0C0B09',
        'surface-1': '#141210',
        'surface-2': '#1C1916',
        'surface-3': '#252118',
        'maison-border': '#2E2A22',
        'maison-border-subtle': '#201D18',
        'maison-amber': '#D4975A',
        'maison-amber-light': '#E8B278',
        'maison-amber-dim': '#7A5530',
        'maison-amber-glow': 'rgba(212, 151, 90, 0.12)',
        'maison-cream': '#F0EDE6',
        'maison-cream-muted': '#9A9690',
        'maison-cream-dim': '#5C5850',
        'maison-sage': '#5A8C68',
        'maison-sage-bg': 'rgba(90, 140, 104, 0.12)',
        'maison-ruby': '#B83C30',
        'maison-ruby-bg': 'rgba(184, 60, 48, 0.12)',
        'maison-gold': '#E8C040',
        'maison-gold-bg': 'rgba(232, 192, 64, 0.12)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)',
        'amber-glow': '0 0 20px rgba(212, 151, 90, 0.2)',
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-400% 0' },
          '100%': { backgroundPosition: '400% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      backgroundImage: {
        'shimmer-gradient':
          'linear-gradient(90deg, #1C1916 0%, #252118 25%, #2E2A22 50%, #252118 75%, #1C1916 100%)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
