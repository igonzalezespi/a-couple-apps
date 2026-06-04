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
    },
    {
      // Shared studio configs are consumed as git-ref deps pinned to a tag
      // (`github:igonzalezespi/...#vX.Y.Z`), not semver ranges — exempt from
      // version unification.
      label: 'Ignore studio git-ref shared configs (not semver ranges)',
      dependencies: ['@studio/**'],
      packages: ['**'],
      isIgnored: true
    }
  ],
  semverGroups: [
    {
      // A `github:...#tag` specifier is not a semver range, so the caret-range
      // policy below reports it as UnsupportedMismatch — exclude it here.
      label: 'Ignore studio git-ref shared configs (not semver ranges)',
      dependencies: ['@studio/**'],
      packages: ['**'],
      isIgnored: true
    },
    {
      label: 'Use caret ranges for prod and dev dependencies',
      range: '^',
      dependencyTypes: ['prod', 'dev'],
      dependencies: ['**'],
      packages: ['**']
    }
  ]
};
