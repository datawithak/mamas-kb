import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F8F5F0',
        terracotta: '#E07A5F',
        charcoal: '#2D2D2D',
      },
    },
  },
  plugins: [],
}

export default config
