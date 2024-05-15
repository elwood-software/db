/** @type {import('prettier').Options} */
module.exports = {
  tabWidth: 2,
  arrowParens: "avoid",
  bracketSameLine: true,
  bracketSpacing: false,
  singleQuote: true,
  trailingComma: "all",
  plugins: ["prettier-plugin-sql-cst"],
  overrides: [
    {
      files: "**/*.json",
      options: {parser: "json"}
    },
    {
      files: ["*.sql"],
      options: {parser: "postgresql"}
    }
  ]
}
