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
