import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import type { TestProjectInlineConfiguration } from 'vitest/config';

// Vite's default transform drops decorator metadata, which Nest needs for constructor injection.
const swcPlugin = swc.vite({
  jsc: { transform: { legacyDecorator: true, decoratorMetadata: true } },
});

function project(
  name: string,
  include: string,
  extra: TestProjectInlineConfiguration['test'] = {},
): TestProjectInlineConfiguration {
  return {
    plugins: [swcPlugin],
    test: {
      name,
      include: [include],
      environment: 'node',
      setupFiles: ['test/setup/network-guard.ts'],
      ...extra,
    },
  };
}

export default defineConfig({
  test: {
    projects: [
      project('unit', 'src/**/*.spec.ts'),
      project('integration', 'test/integration/**/*.spec.ts'),
      // Empty until phase 4; test:schema passes --passWithNoTests, a root-only option in Vitest 4.
      project('schema', 'test/schema/**/*.spec.ts'),
      project('e2e', 'test/e2e/**/*.spec.ts'),
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.module.ts',
        'src/main.ts',
        'src/**/index.ts',
        'src/**/*.types.ts',
        'src/**/*.const.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 75,
        'src/infra/**': { lines: 70, branches: 60 },
        'src/ranking/**': { lines: 90, branches: 85 },
        'src/weather/**': { lines: 85, branches: 80 },
        'src/location/**': { lines: 85, branches: 75 },
        'src/api/**': { lines: 80, branches: 70 },
      },
    },
  },
});
