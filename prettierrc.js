// .prettierrc.js
module.exports = {
  printWidth: 80, // Default: 80
  tabWidth: 2, // Default: 2
  useTabs: false, // Default: false
  semi: false, // Default: true - Changed to false as per many modern JS projects
  singleQuote: false, // Default: false - Changed to false for consistency with JSON, etc.
  quoteProps: "as-needed", // Default: 'as-needed'
  jsxSingleQuote: false, // Default: false
  trailingComma: "es5", // Default: 'es5' - e.g. {a,b,c,}
  bracketSpacing: true, // Default: true - e.g. { foo: bar }
  bracketSameLine: false, // Default: false - Puts > of multi-line HTML elements on new line
  arrowParens: "always", // Default: 'always' - e.g. (x) => x
  rangeStart: 0, // Default: 0
  rangeEnd: Number.POSITIVE_INFINITY, // Default: Infinity
  // parser: '', // No need to specify, Prettier infers it
  // filepath: '', // No need to specify
  requirePragma: false, // Default: false
  insertPragma: false, // Default: false
  proseWrap: "preserve", // Default: 'preserve'
  htmlWhitespaceSensitivity: "css", // Default: 'css'
  vueIndentScriptAndStyle: false, // Default: false
  endOfLine: "lf", // IMPORTANT: Ensures Unix-style line endings (LF)
  embeddedLanguageFormatting: "auto", // Default: 'auto'
  singleAttributePerLine: false, // Default: false
};
