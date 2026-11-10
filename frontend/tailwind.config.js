/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "#070b10",
          900: "#0c1219",
          800: "#121a24",
          700: "#1a2431",
          600: "#243140",
        },
        mint: {
          300: "#9ff3d5",
          400: "#5ee9b5",
          500: "#2dd4a0",
        },
        signal: {
          400: "#7aa2ff",
        },
      },
      boxShadow: {
        panel: "0 20px 50px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};
