// @ts-check
const tseslint                  = require('typescript-eslint');
const angularEslint             = require('@angular-eslint/eslint-plugin');
const angularTemplateEslint     = require('@angular-eslint/eslint-plugin-template');
const angularTemplateParser     = require('@angular-eslint/template-parser');

module.exports = tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/', 'test-results/'] },

  // ── TypeScript spec/test files (no project parser ─ avoids TS error) ───
  {
    files: ['**/*.spec.ts', '**/*.d.ts'],
    extends: [...tseslint.configs.recommended],
    plugins: { '@angular-eslint': angularEslint },
    rules: {
      'no-console':                         'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars':  'warn',
      '@angular-eslint/component-class-suffix': 'off',
    },
  },

  // ── TypeScript source files ─────────────────────────────────────────────
  {
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.d.ts'],
    extends: [...tseslint.configs.recommended],
    plugins: {
      '@angular-eslint': angularEslint,
    },
    languageOptions: {
      parserOptions: { project: './tsconfig.app.json' },
    },
    rules: {
      // General quality
      'no-console':  ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      '@typescript-eslint/no-unused-vars':  ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // Angular TypeScript rules
      '@angular-eslint/component-class-suffix':         'error',
      '@angular-eslint/directive-class-suffix':         'error',
      '@angular-eslint/no-empty-lifecycle-method':      'warn',
      '@angular-eslint/no-input-rename':                'warn',
      '@angular-eslint/no-output-rename':               'warn',
      '@angular-eslint/use-lifecycle-interface':        'warn',
    },
  },

  // ── Angular HTML templates ───────────────────────────────────────────────
  {
    files: ['**/*.html'],
    plugins: {
      '@angular-eslint/template': angularTemplateEslint,
    },
    languageOptions: {
      parser: angularTemplateParser,
    },
    rules: {
      '@angular-eslint/template/banana-in-box':         'error',
      '@angular-eslint/template/use-track-by-function': 'warn',
      '@angular-eslint/template/no-negated-async':     'warn',
      '@angular-eslint/template/eqeqeq':               'warn',
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus':   'warn',
    },
  },

  // ── Spec / test files (relaxed rules) ───────────────────────────────────
  {
    files: ['**/*.spec.ts'],
    rules: {
      'no-console':                         'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
