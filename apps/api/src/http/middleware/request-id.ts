import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

/** Accept caller-supplied IDs (e.g. from a gateway) only if they are short and safe to log. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;

/** Assigns `req.requestId` and echoes it back in `X-Request-Id`. Must run first. */
export function requestId(): RequestHandler {
  return (req, res, next) => {
    const incoming = req.get(REQUEST_ID_HEADER);
    req.requestId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, req.requestId);
    next();
  };
}
