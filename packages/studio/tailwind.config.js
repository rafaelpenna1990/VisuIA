/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        'app-bg': '#0D0810',
        'panel-bg': '#150E1C',
        'card-bg': '#1D1226',
        primary: '#FF5A36',
        secondary: '#B8A8CE',
        muted: '#6B5C82',
      },
    },
  },
  plugins: [],
}