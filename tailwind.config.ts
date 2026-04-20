import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Menlo",
          "Consolas",
          "Courier New",
          "monospace",
        ],
      },
      colors: {
        ink: {
          DEFAULT: "#333333",
          muted: "#999999",
          faint: "#bbbbbb",
        },
      },
      animation: {
        shiver: "shiver 0.18s infinite",
      },
      keyframes: {
        shiver: {
          "0%, 100%": { transform: "translate(0, 0)" },
          "25%": { transform: "translate(0.5px, -0.3px)" },
          "50%": { transform: "translate(-0.3px, 0.4px)" },
          "75%": { transform: "translate(0.4px, 0.3px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
