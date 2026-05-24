/** @type {import("prettier").Config} */
export default {
  singleQuote: true,
  trailingComma: 'none',
  semi: true,
  printWidth: 100,
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  importOrder: ['<BUILTIN_MODULES>', '', '<THIRD_PARTY_MODULES>', '', '^@aca/(.*)$', '', '^[./]']
};
