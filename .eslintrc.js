module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: [
    "@typescript-eslint/eslint-plugin",
    // "prettier" // plugin:prettier/recommended already enables this
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking', // Optional: for type-aware linting
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier, eslint-config-prettier, and sets prettier/prettier rule to "error"
  ],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    // project: './tsconfig.json', // Uncomment if using type-aware linting
  },
  rules: {
    // "prettier/prettier": "error", // This is already set by plugin:prettier/recommended
    "linebreak-style": ["error", "unix"], // Enforce LF line endings

    // Your existing rules (or customize as needed)
    "no-unused-vars": "off", // Handled by @typescript-eslint/no-unused-vars
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    ".github/",
    "coverage/",
    "logs/",
    "backups/",
    "*.log",
    "data/bot.db", // Ignore the SQLite database file itself
    "data/bot.db-journal", // Ignore SQLite journal files
    "data/bot.db-wal", // Ignore SQLite WAL files
    "data/bot.db-shm", // Ignore SQLite SHM files
  ],
};
