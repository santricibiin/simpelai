import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        crimson: {
          DEFAULT: "#8B0000",
          600: "#990000",
          500: "#b30f0f",
          400: "#d92626",
        },
        slateDeep: {
          900: "#07080c",
          800: "#0d1018",
          700: "#141924",
        },
        offwhite: "#f4f6fb",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tight: "-0.015em",
        tighter: "-0.03em",
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(153,0,0,.55), 0 0 24px -4px rgba(217,38,38,.55)",
        glass: "inset 0 1px 0 0 rgba(255,255,255,.08)",
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.12) 1px, transparent 1px)",
      },
      keyframes: {
        pulseRing: {
          "0%,100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(400%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 4s ease-in-out infinite",
        scan: "scan 4s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
