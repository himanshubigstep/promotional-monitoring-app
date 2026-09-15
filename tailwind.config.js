/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sephora: {
          black: "#141824",
          charcoal: "#31374a",
          dark: "#1f2433",
          red: "#fa3b1d",
          "red-hover": "#c92e13",
          "red-light": "#ffe2dc",
          gold: "#e5780b",
          "gold-light": "#fdf1e3",
          gray: {
            50: "#f5f7fa",
            100: "#eff2f6",
            200: "#e3e6ed",
            300: "#cbd0dd",
            400: "#9fa6bc",
            500: "#767e94",
            600: "#525b75",
            700: "#3e465b",
            800: "#31374a",
            900: "#141824",
          },
        },
      },
      fontFamily: {
        sans: [
          "Nunito Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: ["'Playfair Display'", "Didot", "Bodoni MT", "serif"],
        brand: ["Nunito Sans", "sans-serif"],
        editorial: ["'Playfair Display'", "serif"],
      },
    },
  },
  plugins: [],
};
