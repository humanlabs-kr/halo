/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Open Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        "abc-favorit": ["ABC Favorit Variable", "sans-serif"],
      },
      borderWidth: {
        7: "7px",
      },
    },
  },
  plugins: [],
};
