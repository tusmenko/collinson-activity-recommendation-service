import { readFileSync } from 'node:fs';

import { GRAPHIQL_EXAMPLES } from './graphql.const';
import type { GraphiqlTab } from './graphql.types';

// Copied next to the build by nest-cli's assets; read once, when the GraphQL options are built at startup.
const EXAMPLES_DIR = new URL('./examples/', import.meta.url);

export function exampleTabs(): GraphiqlTab[] {
  return GRAPHIQL_EXAMPLES.map(({ file, variables }) => ({
    query: readFileSync(new URL(file, EXAMPLES_DIR), 'utf8'),
    variables: JSON.stringify(variables, null, 2),
  }));
}
