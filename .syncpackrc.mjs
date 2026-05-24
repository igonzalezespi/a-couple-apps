// @ts-check
/** @type {import("syncpack").RcFile} */
export default {
  indent: '  ',
  versionGroups: [
    {
      label: 'Peer dependencies are intentionally loose',
      dependencyTypes: ['peer'],
      dependencies: ['**'],
      packages: ['**'],
      isIgnored: true
    },
    {
      label: 'Internal @aca/* packages use the workspace protocol',
      dependencyTypes: ['prod', 'dev', 'peer'],
      dependencies: ['@aca/**'],
      packages: ['**'],
      pinVersion: 'workspace:*'
    }
  ],
  semverGroups: [
    {
      label: 'Use caret ranges for prod and dev dependencies',
      range: '^',
      dependencyTypes: ['prod', 'dev'],
      dependencies: ['**'],
      packages: ['**']
    }
  ]
};
