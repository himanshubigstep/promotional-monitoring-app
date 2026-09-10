/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sephora: {
          black: "#000000",
          charcoal: "#121212",
          dark: "#1e1e1e",
          red: "#e50043",
          "red-hover": "#c8003a",
          "red-light": "#fff0f3",
          gold: "#c59a3f",
          "gold-light": "#faf3e3",
          gray: {
            50: "#fafafa",
            100: "#f5f5f5",
            200: "#eeeeee",
            300: "#e0e0e0",
            400: "#bdbdbd",
            500: "#9e9e9e",
            600: "#757575",
            700: "#424242",
            800: "#212121",
            900: "#111111",
          },
        },
      },
      fontFamily: {
        sans: [
          "Montserrat",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: ["'Playfair Display'", "Didot", "Bodoni MT", "serif"],
        brand: ["Montserrat", "sans-serif"],
        editorial: ["'Playfair Display'", "serif"],
      },
    },
  },
  plugins: [],
};
