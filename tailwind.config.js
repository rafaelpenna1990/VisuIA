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
                    DEFAULT: '#FF5A36',
                    hover: '#E8481F',
                },
                'app-bg': '#0D0810',
                'panel-bg': '#150E1C',
                'card-bg': '#1D1226',
                secondary: '#B8A8CE',
                muted: '#6B5C82',
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
                'glow': '0 0 20px rgba(255, 90, 54, 0.4)',
                'glow-accent': '0 0 20px rgba(139, 92, 246, 0.5)',
                '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.8)',
            }
        },
    },
    plugins: [],
}