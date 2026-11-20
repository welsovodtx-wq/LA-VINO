import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          50: "#fbf3f4",
          100: "#f5e1e4",
          200: "#e9bcc3",
          300: "#d68b97",
          400: "#bd5a6b",
          500: "#9e3a4d",
          600: "#7f2a3b",
          700: "#651f2f",
          800: "#4a1622",
          900: "#330e17",
          950: "#1f070d",
        },
        ink: {
          600: "#3a2e32",
          700: "#2a2124",
          800: "#1c1517",
          900: "#140f11",
          950: "#0c0809",
        },
        cream: {
          50: "#fdfaf5",
          100: "#f5ecdf",
          200: "#e8d9c3",
          300: "#cdb89a",
        },
        gold: {
          400: "#d4af6a",
          500: "#b8924a",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
