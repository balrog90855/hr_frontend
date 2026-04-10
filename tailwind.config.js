/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-secondary-fixed-variant": "#374763",
        "surface": "#f8f9fb",
        "secondary-fixed-dim": "#b7c7e8",
        "surface-dim": "#d9dadc",
        "tertiary-fixed-dim": "#ffb59b",
        "on-surface-variant": "#434654",
        "outline-variant": "#c3c6d6",
        "primary": "#003d9b",
        "on-primary": "#ffffff",
        "error": "#ba1a1a",
        "surface-container-highest": "#e1e2e4",
        "surface-container-low": "#f3f4f6",
        "on-tertiary": "#ffffff",
        "on-secondary-container": "#51617e",
        "secondary-fixed": "#d6e3ff",
        "surface-container-high": "#e7e8ea",
        "background": "#f8f9fb",
        "tertiary": "#7b2600",
        "on-surface": "#191c1e",
        "on-primary-fixed": "#001848",
        "surface-container": "#edeef0",
        "on-primary-container": "#c4d2ff",
        "inverse-primary": "#b2c5ff",
        "secondary": "#4f5f7b",
        "inverse-surface": "#2e3132",
        "on-tertiary-fixed-variant": "#812800",
        "inverse-on-surface": "#f0f1f3",
        "surface-variant": "#e1e2e4",
        "on-tertiary-fixed": "#380d00",
        "outline": "#737685",
        "on-secondary-fixed": "#091c35",
        "on-secondary": "#ffffff",
        "on-primary-fixed-variant": "#0040a2",
        "surface-tint": "#0c56d0",
        "on-error": "#ffffff",
        "surface-container-lowest": "#ffffff",
        "tertiary-fixed": "#ffdbcf",
        "on-error-container": "#93000a",
        "surface-bright": "#f8f9fb",
        "primary-fixed-dim": "#b2c5ff",
        "primary-container": "#0052cc",
        "error-container": "#ffdad6",
        "secondary-container": "#cdddff",
        "on-background": "#191c1e",
        "tertiary-container": "#a33500",
        "on-tertiary-container": "#ffc6b2",
        "primary-fixed": "#dae2ff"
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"]
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem"
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries")
  ]
};
