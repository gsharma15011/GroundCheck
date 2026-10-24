/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14',
          900: '#0b1120',
          850: '#0f172a',
          800: '#17223b',
          700: '#1e2d4d',
          600: '#2c3e66',
        },
        canvas: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
        brand: {
          primary: '#4f46e5',
          cyan: '#0891b2',
          accent: '#06b6d4',
        },
        status: {
          supported: '#10b981',
          unsupported: '#f59e0b',
          contradicted: '#ef4444',
          review: '#8b5cf6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
}
