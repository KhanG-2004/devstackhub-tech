/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#090D16',
          surface: '#0F172A',
          card: '#131D31',
          border: 'rgba(16, 185, 129, 0.2)',
          accent: '#10B981',
          mint: '#34D399',
          glow: 'rgba(16, 185, 129, 0.15)',
        },
        alpine: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E2E8F0',
          accent: '#047857',
          forest: '#065F46',
          text: '#0F172A',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.3)',
        'luxury-card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
      transitionTimingFunction: {
        'luxury-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};