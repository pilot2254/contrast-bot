module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint/eslint-plugin"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    // Consider enabling this for stricter type checking if your project setup allows.
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
    "plugin:prettier/recommended",
  ],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    // project: './tsconfig.json', // Required for 'recommended-requiring-type-checking'
  },
  rules: {
    "prettier/prettier": ["error", { endOfLine: "auto" }], // Let Prettier handle line endings, but ESLint can warn if they are inconsistent before Prettier runs.
    "linebreak-style": ["error", "unix"], // Enforce LF line endings

    // Stricter 'any' rule - we'll fix these, but for now, it's a warning.
    // Change to "error" for a zero-tolerance policy once all 'any' types are resolved.
    "@typescript-eslint/no-explicit-any": "warn",

    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/explicit-module-boundary-types": "off", // Can be enabled for more explicitness if desired.
    "@typescript-eslint/no-var-requires": "error", // Ensure this remains an error.
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    ".github/",
    "coverage/",
    "logs/",
    "backups/",
    "*.log",
    "data/bot.db",
    "data/bot.db-journal",
    "data/bot.db-wal",
    "data/bot.db-shm",
  ],
};
