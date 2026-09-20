/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        'app-bg': '#080910',
        'panel-bg': '#0F1119',
        'card-bg': '#161826',
        primary: '#FF9500',
        accent: '#00D9FF',
        secondary: '#9FB3C8',
        muted: '#5A6B80',
      },
    },
  },
  plugins: [],
}
