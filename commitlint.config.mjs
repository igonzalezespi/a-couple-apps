export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'ui',
        'config',
        'i18n',
        'core',
        'eslint-config',
        'typescript-config',
        'movies',
        'plans',
        'openspec',
        'ci',
        'docs',
        'deps',
        'tooling',
        'repo',
        'release'
      ]
    ],
    'body-max-line-length': [0]
  }
};
