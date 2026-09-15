import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
export default [
  { ignores: ['node_modules/**', 'dist/**', 'test-results/**', 'playwright-report/**', 'firebase-export-*/**', '**/*.ts', '**/*.tsx'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { import: importPlugin, 'react-hooks': reactHooks },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
      'import/no-unresolved': 'error',
      'import/no-duplicates': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
