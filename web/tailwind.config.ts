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
          300: "#f04747",
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
        tightest: "-0.045em",
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(153,0,0,.55), 0 0 24px -4px rgba(217,38,38,.55)",
        glass: "inset 0 1px 0 0 rgba(255,255,255,.08)",
        lift: "0 1px 2px rgba(7,8,12,.06), 0 12px 32px -12px rgba(7,8,12,.22)",
        liftDark: "0 1px 0 0 rgba(255,255,255,.06) inset, 0 24px 48px -24px rgba(0,0,0,.9)",
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,.12) 1px, transparent 1px)",
        "dot-grid": "radial-gradient(circle at 1px 1px, rgba(148,163,184,.22) 1px, transparent 0)",
        shine: "linear-gradient(110deg, transparent 25%, rgba(255,255,255,.35) 50%, transparent 75%)",
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
        aurora: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)", opacity: "0.55" },
          "33%": { transform: "translate3d(6%,-4%,0) scale(1.12)", opacity: "0.75" },
          "66%": { transform: "translate3d(-5%,3%,0) scale(0.95)", opacity: "0.45" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        shine: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        gradientPan: {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        drawLine: {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 4s ease-in-out infinite",
        scan: "scan 4s linear infinite",
        float: "float 6s ease-in-out infinite",
        aurora: "aurora 18s ease-in-out infinite",
        marquee: "marquee 32s linear infinite",
        shine: "shine 6s linear infinite",
        gradientPan: "gradientPan 8s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
