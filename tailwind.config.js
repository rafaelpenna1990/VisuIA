/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./app/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./packages/studio/src/**/*.{js,jsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#FC6305',
                    hover: '#E05400',
                },
                accent: '#FC6305',
                'app-bg': '#000000',
                'panel-bg': '#080808',
                'card-bg': '#141414',
                secondary: '#a3a3a3',
                muted: '#737373',
            },
            fontFamily: {
                sans: ['Baloo 2', 'system-ui', '-apple-system', 'sans-serif'],
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            boxShadow: {
                'glow': '0 0 24px rgba(252, 99, 5, 0.55)',
                'glow-accent': '0 0 24px rgba(252, 99, 5, 0.55)',
                '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.8)',
            }
        },
    },
    plugins: [],
}
