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
                    DEFAULT: '#FF9500',
                    hover: '#E68200',
                },
                accent: '#00D9FF',
                'app-bg': '#080910',
                'panel-bg': '#0F1119',
                'card-bg': '#161826',
                secondary: '#9FB3C8',
                muted: '#5A6B80',
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
                'glow': '0 0 24px rgba(255, 149, 0, 0.55)',
                'glow-accent': '0 0 24px rgba(0, 217, 255, 0.55)',
                '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.8)',
            }
        },
    },
    plugins: [],
}
