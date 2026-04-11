/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f6faf7',
        surface: '#f6faf7',
        'surface-container-low': '#f1f5f2',
        'surface-container': '#ebefec',
        'surface-container-high': '#e5e9e6',
        'surface-container-highest': '#dfe3e1',
        'surface-container-lowest': '#ffffff',
        primary: '#0d631b',
        'primary-container': '#2e7d32',
        secondary: '#006a63',
        tertiary: '#774c00',
        error: '#ba1a1a',
        outline: '#707a6c',
        'outline-variant': '#bfcaba',
        'on-surface': '#181d1b',
        'on-surface-variant': '#40493d',
        'on-primary': '#ffffff',
      },
      fontFamily: {
        headline: ['Public Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
      },
      boxShadow: {
        ghost: '0px 12px 32px rgba(24, 29, 27, 0.06)',
      },
      letterSpacing: {
        blueprint: '0.05em',
      },
    },
  },
  plugins: [],
}
