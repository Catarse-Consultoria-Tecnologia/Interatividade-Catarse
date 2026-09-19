import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Identidade Catarse — ver EF-01 §36 "Paleta visual"
        navy: {
          950: "#050b16",
          900: "#0a1526",
          800: "#0f1f38",
          700: "#16294a",
          600: "#1f375f",
          500: "#2c4a78",
        },
        gold: {
          400: "#f2c75c",
          500: "#e6b93d",
          600: "#c99a24",
        },
        paper: {
          50: "#fdfbf5",
          100: "#f8f3e6",
          200: "#efe6d0",
          300: "#e2d5b6",
        },
        info: {
          400: "#7dc4f0",
          500: "#4aa8e0",
          600: "#2f86c2",
        },
        confirm: {
          400: "#5fd6b8",
          500: "#2fb794",
          600: "#1f9378",
        },
        alert: {
          400: "#f07d6b",
          500: "#e2543f",
          600: "#c23e2b",
        },
        ink: {
          900: "#1a1508",
          700: "#3c3421",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        cork: "radial-gradient(circle at 20% 20%, rgba(230, 185, 61, 0.06), transparent 45%), radial-gradient(circle at 80% 60%, rgba(47, 183, 148, 0.05), transparent 40%)",
        "noir-fade":
          "linear-gradient(180deg, #050b16 0%, #0a1526 55%, #0f1f38 100%)",
      },
      boxShadow: {
        card: "0 2px 0 rgba(26,21,8,0.08), 0 12px 24px -12px rgba(5,11,22,0.45)",
        "card-lift":
          "0 4px 0 rgba(26,21,8,0.1), 0 24px 40px -16px rgba(5,11,22,0.55)",
        stamp: "0 0 0 2px rgba(226,84,63,0.15)",
      },
      keyframes: {
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(2.2) rotate(-14deg)" },
          "60%": { opacity: "1", transform: "scale(0.94) rotate(-8deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-6deg)" },
        },
        "card-snap": {
          "0%": { transform: "scale(1.04) translateY(-4px)" },
          "100%": { transform: "scale(1) translateY(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(230,185,61,0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(230,185,61,0)" },
        },
      },
      animation: {
        "stamp-in": "stamp-in 420ms cubic-bezier(.2,1.4,.4,1) forwards",
        "card-snap": "card-snap 220ms ease-out forwards",
        "fade-up": "fade-up 300ms ease-out forwards",
        "pulse-glow": "pulse-glow 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
