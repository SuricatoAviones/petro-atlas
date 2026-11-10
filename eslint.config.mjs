// @ts-check
import js from '@eslint/js';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const testFiles = ['**/*.test.ts', '**/*.test.tsx'];

/**
 * Builds a `no-restricted-imports` rule that rejects every module specifier matching `regex`.
 * @param {string} regex
 * @param {string} message
 * @returns {import('eslint').Linter.RulesRecord}
 */
function restrictImports(regex, message) {
  return { 'no-restricted-imports': ['error', { patterns: [{ regex, message }] }] };
}

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/.next/',
    '**/.next-e2e/',
    '**/next-env.d.ts',
    'coverage/',
    'data/',
    '.agents/',
    '.claude/',
  ]),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['apps/web/**'],
    extends: [nextCoreWebVitals],
    settings: { next: { rootDir: 'apps/web/' } },
  },

  // docs/12: named exports only, except where a framework requires a default export.
  {
    rules: {
      'no-restricted-exports': [
        'error',
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },
  {
    files: [
      '**/*.config.{js,mjs,ts}',
      'apps/web/src/app/**/{page,layout,not-found,error,global-error,loading}.tsx',
    ],
    rules: { 'no-restricted-exports': 'off' },
  },

  // Dependency rules from docs/03-arquitectura.md.
  {
    files: ['packages/petro-calc/src/**/*.ts'],
    ignores: testFiles,
    rules: restrictImports(
      String.raw`^(?!\.{1,2}/)`,
      'petro-calc is pure TypeScript with no runtime dependencies (docs/03, docs/08).',
    ),
  },
  {
    files: ['packages/shared-types/src/**/*.ts'],
    ignores: testFiles,
    rules: restrictImports(
      String.raw`^(?!\.{1,2}/|zod$)`,
      'shared-types only depends on zod (docs/03).',
    ),
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: restrictImports(
      '^@petroatlas/petro-calc(/|$)',
      'The API only serves data; engineering calculations run in the browser (ADR 0001).',
    ),
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: restrictImports(
      '^(pg|@petroatlas/db)(/|$)',
      'The web never accesses the database; it reads from the API (docs/03).',
    ),
  },

  prettier,
]);
