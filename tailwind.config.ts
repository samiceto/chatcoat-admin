import type { Config } from "tailwindcss";

/**
 * ChatCoat Admin design tokens.
 *
 * Principle: colour means state. Surfaces and text are a cool ink-and-fog
 * neutral; green / amber / red appear only to say something about status;
 * cobalt is reserved for links, focus and selection.
 *
 * The stock `gray`, `indigo`, `emerald`, `amber`, `rose`, `purple`, `blue` and
 * `teal` scales are re-pointed at this palette so every page that already
 * uses those class names picks up the new look without per-page edits.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Archivo", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Neutral scale: fog (50-200) → slate (400-600) → ink (800-950)
        gray: {
          50: "#F6F8FA",
          100: "#EEF1F4",
          200: "#DDE2E8",
          300: "#C5CCD6",
          400: "#66717F",
          500: "#4F5A68",
          600: "#3E4854",
          700: "#2C3541",
          800: "#1B2430",
          900: "#0F1B2A",
          950: "#0A121C",
        },
        // Cobalt: links, focus, selection
        indigo: {
          50: "#F0F3FF",
          100: "#E0E6FF",
          200: "#C4CFFF",
          300: "#9AAEFF",
          400: "#6C86FA",
          500: "#3E5CF0",
          600: "#2540D9",
          700: "#1D32B0",
          800: "#182A8C",
          900: "#14236E",
        },
        // Status: ok
        emerald: {
          50: "#E8F5EE",
          100: "#CDE9D9",
          200: "#A6D6BC",
          300: "#74BE98",
          400: "#3FA676",
          500: "#15935F",
          600: "#0E7A4F",
          700: "#0B6642",
          800: "#0A5236",
          900: "#083F2B",
        },
        // Status: watch
        amber: {
          50: "#FCF3E0",
          100: "#F8E3B8",
          200: "#F1CC85",
          300: "#E5B04E",
          400: "#D4950F",
          500: "#C27A0A",
          600: "#A66308",
          700: "#8A5206",
          800: "#6F4205",
          900: "#553304",
        },
        // Status: stop
        rose: {
          50: "#FBEBEC",
          100: "#F6D3D5",
          200: "#EFB1B5",
          300: "#E58A90",
          400: "#DA5F67",
          500: "#D2373F",
          600: "#BC2A32",
          700: "#A3202A",
          800: "#7F1A22",
          900: "#5F141A",
        },
        // Role / category tints used by a few badges
        purple: {
          50: "#F4EEF8",
          100: "#E9DCF1",
          200: "#DCCBE8",
          700: "#5E3A7E",
        },
        blue: {
          50: "#E8F1FA",
          100: "#D2E3F4",
          200: "#BAD5EE",
          700: "#1F5A94",
        },
        teal: {
          100: "#DCEBEA",
          700: "#256A67",
        },
        // Named tokens for new code
        ink: "#0F1B2A",
        fog: "#EEF1F4",
        rule: "#DDE2E8",
        cobalt: "#2540D9",
      },
      borderRadius: {
        // Tighter than stock: an instrument panel, not a bubble.
        md: "4px",
        lg: "6px",
        xl: "8px",
        "2xl": "10px",
      },
      boxShadow: {
        sm: "0 1px 0 rgba(15, 27, 42, 0.04)",
        DEFAULT: "0 1px 2px rgba(15, 27, 42, 0.08)",
        "2xl": "0 24px 60px -12px rgba(15, 27, 42, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
