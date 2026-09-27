import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // MSA Center brand scale, taken from the logo and marketing assets:
        // deep navy (headlines, dark panels) fading to the primary CTA blue.
        brand: {
          50: "#f5f8fe",
          100: "#e4eefc",
          200: "#bfd6f5",
          300: "#7fb0f0",
          400: "#4a8fe8",
          500: "#2f6fde",
          600: "#2554a6",
          700: "#1e3f82",
          800: "#132b5e",
          900: "#0b1a3d",
          950: "#050b18",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0b1a3d 0%, #2f6fde 100%)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Tajawal", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
