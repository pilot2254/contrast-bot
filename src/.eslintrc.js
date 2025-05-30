module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "prettier"], // Added prettier plugin explicitly
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier", // Changed to just "prettier" which is the modern way to use eslint-config-prettier
  ],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    // Prettier integration
    "prettier/prettier": ["error", { endOfLine: "auto" }],

    // Enforce Unix line endings
    "linebreak-style": ["error", "unix"],

    // TypeScript specific rules
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
    "run_prettier.sh",
  ],
}
