import base from '@aca/eslint-config/base';

export default [
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      'web-build/**',
      'coverage/**',
      'scripts/opsx/**',
      '.claude/**',
      'openspec/**'
    ]
  },
  ...base
];
