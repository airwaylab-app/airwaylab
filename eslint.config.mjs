import nextConfig from 'eslint-config-next';
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import tsConfig from 'eslint-config-next/typescript';

const config = [
  ...nextConfig,
  ...coreWebVitals,
  ...tsConfig,
  {
    rules: {
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
];

export default config;
