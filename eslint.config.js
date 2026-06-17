// @ts-check
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  { ignores: ['dist/', 'node_modules/', '**/*.spec.ts'] },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { project: './tsconfig.app.json' },
    },
    rules: {
      'no-console':  'error',
      'no-debugger': 'error',
      '@typescript-eslint/no-unused-vars':   ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any':  'warn',
    },
  },
);
