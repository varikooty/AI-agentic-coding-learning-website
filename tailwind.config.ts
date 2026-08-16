import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        range: {
          bg: "#0b0d10",
          panel: "#14171c",
          panel2: "#1b1f26",
          line: "#262b33",
          text: "#e7e9ec",
          dim: "#8b93a1",
          brass: "#c9a24b",
          brass2: "#e6c874",
          red: "#d1453d",
          amber: "#e0a52c",
          green: "#4caf6d",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        target: "0 0 0 1px rgba(201,162,75,0.15), 0 8px 24px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
