import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'src/api/generated/',
      'src/app/explore.tsx',
      'src/components/',
      'src/constants/',
      'src/hooks/',
      'scripts/',
      'tools/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
);
