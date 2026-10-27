/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#1E392A",
        "forest-light": "#2C5240",
        terracotta: "#CC5A37",
        ochre: "#D99C3D",
        sky: "#739EB0",
        sand: "#F4F1EA",
        cream: "#FAFAFA",
      },
      fontFamily: {
        sans: ["Manrope", "Noto Sans Devanagari", "system-ui", "sans-serif"],
        head: ["Cabinet Grotesk", "Noto Sans Devanagari", "Manrope", "sans-serif"],
      },
    },
  },
  plugins: [],
};