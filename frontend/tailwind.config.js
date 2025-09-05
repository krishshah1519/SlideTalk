/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gh-dark-bg': '#0d1117',
        'gh-dark-header': '#161b22',
        'gh-dark-border': '#30363d',
        'gh-dark-text': '#c9d1d9',
        'gh-dark-secondary-text': '#8b949e',
        'gh-blue': '#58a6ff',
        'gh-green': '#238636',
      },
    },
  },
  plugins: [],
}