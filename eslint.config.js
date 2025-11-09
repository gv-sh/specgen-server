// eslint.config.js
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'semi': 'off',
      'quotes': 'off',
      'no-redeclare': 'off'
    },
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**'
    ]
  }
];