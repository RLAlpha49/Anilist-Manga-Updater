import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import eslintPluginPrettierRecommended from "eslint-config-prettier";
import reactCompiler from "eslint-plugin-react-compiler";
import path from "node:path";
import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prettierIgnorePath = path.resolve(__dirname, ".prettierignore");

/** @type {import('eslint').Linter.Config[]} */
export default [
  includeIgnoreFile(prettierIgnorePath),
  // Ignore patterns
  {
    ignores: [
      // Build output
      "dist/**",
      ".vite/**",
      "out/**",

      // Node modules
      "node_modules/**",

      // Configuration files that use CommonJS
      "**/*.config.js",
      "forge.config.js",

      // Problematic test files
      "src/tests/helpers/test-utils.ts",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      "react-compiler": reactCompiler,
    },
    rules: {
      "react-compiler/react-compiler": "error",
    },
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  eslintPluginPrettierRecommended,
  ...tseslint.configs.recommended,

  // Special rules for test files to disable specific linting errors
  {
    files: ["**/*.test.{ts,tsx}", "**/tests/**/*.{ts,tsx}"],
    rules: {
      // Allow unused variables in test files
      "@typescript-eslint/no-unused-vars": "off",

      // Allow any type in test files
      "@typescript-eslint/no-explicit-any": "off",

      // Allow useless catch clauses in test files
      "no-useless-catch": "off",

      // Allow constant conditions in test files
      "no-constant-condition": "off",

      // Allow constant binary expressions in test files
      "no-constant-binary-expression": "off",

      // Ensure React is in scope when using JSX
      "react/react-in-jsx-scope": "error",
    },
  },
];
