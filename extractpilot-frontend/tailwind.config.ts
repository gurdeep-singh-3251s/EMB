import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./views/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "rgb(var(--paper) / <alpha-value>)",
          elevated: "rgb(var(--paper-elevated) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        night: "rgb(var(--night) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          light: "rgb(var(--accent-light) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
        },
        rust: {
          DEFAULT: "rgb(var(--rust) / <alpha-value>)",
          light: "rgb(var(--rust-light) / <alpha-value>)",
        },
        moss: "rgb(var(--moss) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        body: ["17px", { lineHeight: "1.65" }],
        "body-lg": ["18px", { lineHeight: "1.65" }],
      },
      boxShadow: {
        premium: "0 2px 4px rgba(11,18,30,0.04), 0 24px 56px -16px rgba(11,18,30,0.14)",
        ledger: "0 1px 0 rgba(11,18,30,0.04), 0 12px 32px -12px rgba(11,18,30,0.12)",
        "ledger-lg": "0 4px 0 rgba(11,18,30,0.04), 0 28px 60px -20px rgba(11,18,30,0.2)",
        glow: "0 0 0 1px rgba(179,134,74,0.15), 0 12px 32px -8px rgba(179,134,74,0.35)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
