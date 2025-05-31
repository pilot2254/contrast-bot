module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "prettier"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  rules: {
    "prettier/prettier": ["error", { endOfLine: "auto" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-var-requires": "error",
    "no-console": "off",
    "prefer-const": "error",
    "no-var": "error",
  },
  ignorePatterns: ["dist/", "node_modules/", "coverage/", "logs/", "backups/", "*.log", "data/bot.db*", ".github/"],
}
