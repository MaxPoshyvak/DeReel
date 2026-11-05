/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
        surface: {
          50: "#18181b",
          100: "#1f1f23",
          200: "#27272a",
          300: "#3f3f46",
          base: "#09090b",
        }
      },
    },
  },
  plugins: [],
}
