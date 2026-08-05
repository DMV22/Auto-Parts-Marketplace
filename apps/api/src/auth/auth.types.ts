import { IncomingMessage, ServerResponse } from 'node:http';

export type BetterAuthInstance = {
  handler: (request: Request) => Promise<Response>;
};

export type BetterAuthNodeHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void>;
