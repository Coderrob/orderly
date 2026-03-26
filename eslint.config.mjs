// @ts-check
import eslint from '@eslint/js';
import zeroTolerance from '@coderrob/eslint-plugin-zero-tolerance';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import jsdocPlugin from 'eslint-plugin-jsdoc';

const zeroToleranceStrictConfig = Array.isArray(zeroTolerance.configs.strict)
  ? zeroTolerance.configs.strict
  : [zeroTolerance.configs.strict];

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'reports/**',
      '*.js',
      '*.mjs',
      '**/*.test.ts'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...zeroToleranceStrictConfig,
  {
    plugins: {
      import: importPlugin,
      jsdoc: jsdocPlugin
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // Import sorting
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ],

      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true
        }
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      'jsdoc/require-param-type': 'off', // TypeScript handles this
      'jsdoc/require-returns-type': 'off', // TypeScript handles this

      // Complexity rules (SOLID and Clean Code)
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'zero-tolerance/max-function-lines': ['error', { max: 25 }],
      'max-lines-per-function': ['error', { max: 25, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 5],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', 3],

      // Code quality rules
      'no-console': 'off', // CLI tool needs console
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-template': 'error',

      // Best practices
      eqeqeq: ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-return-await': 'off',
      '@typescript-eslint/return-await': 'error',
      'require-await': 'off',
      '@typescript-eslint/require-await': 'error'
    }
  }
];
