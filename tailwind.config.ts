import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17212b",
        line: "#d9e2ea",
        brand: "#0f766e",
        accent: "#f97316",
        surface: "#f7fafc"
      },
      boxShadow: {
        soft: "0 14px 40px rgba(23, 33, 43, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
