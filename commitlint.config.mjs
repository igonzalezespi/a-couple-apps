export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Studio-canonical type-enum (identical across every repo): config-conventional's
    // defaults plus the studio's `ops`. Set explicitly so the contract is enforced here,
    // not merely inherited.
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'ops',
        'perf',
        'refactor',
        'revert',
        'style',
        'test'
      ]
    ],
    'scope-enum': [
      2,
      'always',
      [
        'ci',
        'config',
        'core',
        'deps',
        'docs',
        'eslint-config',
        'i18n',
        'movies',
        'openspec',
        'plans',
        'release',
        'repo',
        'tooling',
        'typescript-config',
        'ui'
      ]
    ],
    'body-max-line-length': [0]
  }
};
