/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                // TripSpot brand colors
                primary: {
                    50: '#E8F4FC',
                    100: '#D1E9F9',
                    200: '#A3D3F3',
                    300: '#75BDED',
                    400: '#47A7E7',
                    500: '#1991E1',
                    600: '#1474B4',
                    700: '#0F5787',
                    800: '#0A3A5A',
                    900: '#051D2D',
                },
                background: '#E8F4FC',
            },
            fontFamily: {
                sans: ['System'],
            },
        },
    },
    plugins: [],
};
