/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Keep in sync with src/core/theme/tokens.ts (duplicated here because this
      // file is loaded by plain Node, which can't `require()` a .ts module).
      colors: {
        primary: "#f97316",
        "primary-light": "#fb923c",
        "primary-dark": "#ea580c",
        secondary: "#1e293b",
        accent: "#22c55e",
        background: "#0f1219",
        surface: "#1a1f2e",
        text: "#f8fafc",
        "text-muted": "#94a3b8",
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
      },
    },
  },
  plugins: [],
};
