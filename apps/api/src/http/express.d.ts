import type { AuthContext } from './middleware/authenticate.js';
import type { BusinessMembership } from './middleware/authorize.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Correlation ID; echoed in the `X-Request-Id` header and every ErrorResponse. */
    requestId: string;
    /** Exact request bytes, retained for webhook signature verification. */
    rawBody?: Buffer;
    /** Set by `authenticate` for routes that require a bearer token. */
    auth?: AuthContext;
    /** Set by `requireBusinessRole` once membership has been verified. */
    membership?: BusinessMembership;
  }

  interface Locals {
    /** Contract path template of the matched operation, e.g. `/stores/{storeId}` (for logs). */
    routeTemplate?: string;
  }
}
