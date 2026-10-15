// Encodes the allowed-imports table of design D-1; change the design first, then this file.
//   api      -> ranking, location, weather (public barrels only), infra
//   ranking  -> location, weather, infra
//   weather  -> infra
//   location -> infra
//   infra    -> nothing in the application
// Each feature is a folder of sub-module folders; the rules match by feature prefix, so nesting does not weaken them.
const FEATURES = '(api|ranking|weather|location|infra)';
const CLIENT_LIBRARIES = '(^|/)node_modules/(ioredis|bullmq|@nestjs/bullmq)/';

module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: 'location-imports-infra-only',
      severity: 'error',
      from: { path: '^src/location/' },
      to: { path: '^src/(weather|ranking|api)/' },
    },
    {
      name: 'weather-imports-infra-only',
      severity: 'error',
      from: { path: '^src/weather/' },
      to: { path: '^src/(location|ranking|api)/' },
    },
    {
      name: 'ranking-never-imports-api',
      severity: 'error',
      from: { path: '^src/ranking/' },
      to: { path: '^src/api/' },
    },
    {
      name: 'infra-imports-nothing-in-the-application',
      severity: 'error',
      from: { path: '^src/infra/' },
      to: { path: '^src/', pathNot: '^src/infra/' },
    },
    {
      name: 'cross-module-through-barrel',
      comment:
        'Another feature is reached only through its root index.ts, whatever folder the importer sits in.',
      severity: 'error',
      from: { path: `^src/${FEATURES}/` },
      to: { path: `^src/${FEATURES}/`, pathNot: ['^src/$1/', `^src/${FEATURES}/index\\.ts$`] },
    },
    {
      name: 'no-nested-barrels',
      comment:
        'Inside a feature, folders import each other by relative path; index.ts exists only at the root.',
      severity: 'error',
      from: {},
      to: { path: `^src/${FEATURES}/.+/index\\.ts$` },
    },
    {
      name: 'composition-root-through-barrel',
      comment: 'main.ts and app.module.ts wire modules through their barrels.',
      severity: 'error',
      from: { path: '^src/[^/]+\\.ts$' },
      to: { path: '^src/[^/]+/', pathNot: '^src/[^/]+/index\\.ts$' },
    },
    {
      name: 'client-libraries-in-wrappers-only',
      comment: 'ioredis and bullmq are wrapped by repositories, queues, processors and infra.',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: ['^src/infra/', '\\.(repository|queue|processor)\\.ts$'],
      },
      to: { path: CLIENT_LIBRARIES },
    },
    {
      name: 'utils-are-pure',
      comment: 'A *.util.ts holds pure helpers: no Nest, no client libraries, no services.',
      severity: 'error',
      from: { path: '\\.util\\.ts$' },
      to: { path: [CLIENT_LIBRARIES, '(^|/)node_modules/@nestjs/', '\\.service\\.ts$'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.spec\\.ts$' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
  },
};
