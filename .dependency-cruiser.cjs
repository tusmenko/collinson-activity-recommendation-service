// Encodes the allowed-imports table of design D-1; change the design first, then this file.
//   api      -> ranking, location, weather (public barrels only), infra
//   ranking  -> location, weather, infra
//   weather  -> infra
//   location -> infra
//   infra    -> nothing in the application
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
      comment: 'Another module is reached only through its index.ts.',
      severity: 'error',
      from: { path: '^src/([^/]+)/' },
      to: { path: '^src/[^/]+/', pathNot: ['^src/$1/', '^src/[^/]+/index\\.ts$'] },
    },
    {
      name: 'composition-root-through-barrel',
      comment: 'main.ts and app.module.ts wire modules through their barrels.',
      severity: 'error',
      from: { path: '^src/[^/]+\\.ts$' },
      to: { path: '^src/[^/]+/', pathNot: '^src/[^/]+/index\\.ts$' },
    },
    {
      name: 'client-libraries-in-adapters-only',
      comment:
        'ioredis and bullmq are wrapped by repositories, adapters, queues, processors and infra.',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: ['^src/infra/', '\\.(repository|adapter|queue|processor)\\.ts$'],
      },
      to: { path: CLIENT_LIBRARIES },
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
