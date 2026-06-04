import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Surface layers — CSS variable backed, auto light/dark switch
        'surface-0': 'rgb(var(--color-bg) / <alpha-value>)',
        'surface-1': 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--color-surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--color-surface-3) / <alpha-value>)',

        // Borders
        'maison-border': 'rgb(var(--color-border) / <alpha-value>)',
        'maison-border-subtle': 'rgb(var(--color-border-2) / <alpha-value>)',

        // Text — mapped to semantic tokens
        'maison-cream': 'rgb(var(--color-text) / <alpha-value>)',
        'maison-cream-muted': 'rgb(var(--color-text-2) / <alpha-value>)',
        'maison-cream-dim': 'rgb(var(--color-muted) / <alpha-value>)',

        // Accent — amber (adapts intensity between modes)
        'maison-amber': 'rgb(var(--color-accent) / <alpha-value>)',
        'maison-amber-light': 'rgb(var(--color-accent-light) / <alpha-value>)',
        'maison-amber-dim': 'rgb(var(--color-accent-dim) / <alpha-value>)',
        'maison-amber-glow': 'var(--color-accent-glow)',

        // Semantic status colors
        'maison-sage': 'rgb(var(--color-success) / <alpha-value>)',
        'maison-sage-bg': 'var(--color-success-bg)',
        'maison-ruby': 'rgb(var(--color-danger) / <alpha-value>)',
        'maison-ruby-bg': 'var(--color-danger-bg)',
        'maison-gold': 'rgb(var(--color-warning) / <alpha-value>)',
        'maison-gold-bg': 'var(--color-warning-bg)',
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
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
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
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
