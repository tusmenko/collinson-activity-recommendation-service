import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const QUERIES_DIR = fileURLToPath(new URL('../../schema/queries/', import.meta.url));

interface GraphqlErrorBody {
  readonly message: string;
  readonly extensions?: Record<string, unknown>;
}

export interface GraphqlResponse<Data> {
  readonly status: number;
  readonly headers: Headers;
  // The body as sent, for assertions on keys that must be absent.
  readonly text: string;
  readonly data: Data | null;
  readonly errors: readonly GraphqlErrorBody[];
}

// A contract fixture under test/schema/queries, for example 'default.graphql'.
export function loadQuery(name: string): string {
  return readFileSync(`${QUERIES_DIR}${name}`, 'utf8');
}

export async function postGraphql<Data>(
  baseUrl: string,
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Promise<GraphqlResponse<Data>> {
  const response = await fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ query, variables }),
  });
  const text = await response.text();
  const body = JSON.parse(text) as { data?: Data | null; errors?: GraphqlErrorBody[] };
  return {
    status: response.status,
    headers: response.headers,
    text,
    data: body.data ?? null,
    errors: body.errors ?? [],
  };
}
