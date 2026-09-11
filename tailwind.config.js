/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        teal: {
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
        },
        navy: {
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        dark: {
          50: "#f8fafc",
          100: "#f1f5f9",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #1a2035 0%, #00b4d8 50%, #22c55e 100%)",
        "gradient-card": "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      },
    },
  },
  plugins: [],
};
