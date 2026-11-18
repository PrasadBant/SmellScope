/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0B0F19',
          workspace: '#0F1724',
          sidebar: '#0D1420',
          card: '#111827',
          elevated: '#182234',
        },
        border: {
          subtle: '#1E293B',
          DEFAULT: '#263244',
          active: '#3B82F6',
        },
        txt: {
          primary: '#F8FAFC',
          secondary: '#CBD5E1',
          muted: '#94A3B8',
        },
        accent: {
          primary: '#6366F1',
          cyan: '#38BDF8',
        },
        status: {
          success: '#16A34A',
          warning: '#D97706',
          block: '#DC2626',
        },
        evidence: {
          published: '#0284C7',
          synthetic: '#9333EA',
          cached: '#EA580C',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
