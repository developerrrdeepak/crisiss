import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Minified service worker - pre-existing issues
    "public/sw.js",
  ]),
  {
    rules: {
      // Disable set-state-in-effect for intentional hydration/PWA patterns
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
