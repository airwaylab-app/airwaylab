import nextConfig from 'eslint-config-next';
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import tsConfig from 'eslint-config-next/typescript';
import noSilentCatch from './scripts/eslint-rules/no-silent-catch.mjs';

const config = [
  { ignores: ['.claude/', '.next/', '**/.next/'] },
  ...nextConfig,
  ...coreWebVitals,
  ...tsConfig,
  {
    plugins: {
      airwaylab: {
        rules: {
          'no-silent-catch': noSilentCatch,
        },
      },
    },
    rules: {
      'airwaylab/no-silent-catch': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // New rules in React 19 / eslint-config-next 16 — disabling for now.
      // set-state-in-effect: flags setState inside useEffect (common data loading pattern).
      // refs: flags ref.current access during render (React Compiler compat, not adopted).
      // preserve-manual-memoization: React Compiler compat, not adopted.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  // ── Import boundary: Workers must not depend on React/Next.js ──
  {
    files: ['workers/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'next', 'next/*'],
              message:
                'Workers must not import React or Next.js — they run in a Web Worker context.',
            },
            {
              group: ['@/components/*', '@/hooks/*'],
              message: 'Workers must not import UI-layer modules.',
            },
          ],
        },
      ],
    },
  },
  // ── Import boundary: API routes must not import client-side hooks ──
  {
    files: ['app/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/hooks/*'],
              message:
                'API routes run server-side — do not import client hooks.',
            },
          ],
        },
      ],
    },
  },
  // ── Import boundary: Analysis/parser modules must not depend on UI ──
  {
    files: ['lib/analyzers/**/*.ts', 'lib/parsers/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'next', 'next/*'],
              message:
                'Analysis modules must not depend on React or Next.js.',
            },
            {
              group: ['@/components/*', '@/hooks/*', '@/app/*'],
              message:
                'Analysis modules must not depend on UI-layer code.',
            },
          ],
        },
      ],
    },
  },
  // ── Disable no-silent-catch in e2e tests (catch-and-return-false is idiomatic) ──
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'airwaylab/no-silent-catch': 'off',
    },
  },
  // ── Exclude custom ESLint rule definitions from project rules ──
  {
    files: ['scripts/eslint-rules/**/*.mjs'],
    rules: {
      'airwaylab/no-silent-catch': 'off',
    },
  },
];

export default config;
