import type { IncomingMessage, ServerResponse } from 'node:http';

// What every resolver and the throttler guard see; built once per HTTP request.
export interface GraphqlContext {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
  // From x-request-id, or generated; carried into the ranking event (D-7).
  readonly requestId: string;
}

// What the Express integration hands to the context builder.
export interface HttpPair {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
}

// One GraphiQL example: an operation file under examples/ and the variables it opens with.
export interface GraphiqlExample {
  readonly file: string;
  readonly variables: Readonly<Record<string, unknown>>;
}

// GraphiQL 3's tab definition (`defaultTabs`); variables are the editor's text.
export interface GraphiqlTab {
  readonly query: string;
  readonly variables: string;
}
