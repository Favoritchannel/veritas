import js from "@eslint/js";

const nodeGlobals = {
  AbortSignal: "readonly",
  Buffer: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  fetch: "readonly",
  process: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
};

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/out/**",
      "src/templates/graph/_three.js",
      "src/templates/graph/_3dfg.js",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: nodeGlobals,
      sourceType: "module",
    },
    rules: {
      "no-duplicate-imports": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["src/stages/collect/web.mjs"],
    languageOptions: {
      globals: {
        document: "readonly",
      },
    },
  },
];
