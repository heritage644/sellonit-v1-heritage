import type { RequestHandler } from 'express';
import { errors as joseErrors, jwtVerify } from 'jose';
import { z } from 'zod';
import { AppError } from '../app-error.js';

/** Identity established from a verified access token. */
export interface AuthContext {
  userId: string;
  /** `jti` claim, when present — lets future session revocation target a token. */
  tokenId: string | undefined;
}

/**
 * Port for access-token verification. The auth module will issue tokens with
 * matching settings; tests and future key-rotation strategies can substitute
 * their own implementation.
 */
export interface AccessTokenVerifier {
  verify(token: string): Promise<AuthContext>;
}

const claimsSchema = z.object({
  sub: z.uuid(),
  jti: z.string().optional(),
});

/** HS256 JWT verification with mandatory issuer, audience and expiry checks. */
export function createJwtAccessTokenVerifier(options: {
  secret: string;
  issuer: string;
  audience: string;
}): AccessTokenVerifier {
  const key = new TextEncoder().encode(options.secret);

  return {
    async verify(token) {
      try {
        const { payload } = await jwtVerify(token, key, {
          algorithms: ['HS256'],
          issuer: options.issuer,
          audience: options.audience,
          requiredClaims: ['exp', 'sub'],
        });
        const claims = claimsSchema.parse(payload);
        return { userId: claims.sub, tokenId: claims.jti };
      } catch (error) {
        if (error instanceof joseErrors.JWTExpired)
          throw AppError.unauthorized('Access token has expired');
        throw AppError.unauthorized('Invalid access token');
      }
    },
  };
}

/**
 * Used when JWT_ACCESS_SECRET is not configured (development only — production
 * refuses to start without it). Fails closed: every token is rejected.
 */
export const unconfiguredAccessTokenVerifier: AccessTokenVerifier = {
  verify() {
    return Promise.reject(AppError.unauthorized('Authentication is not configured on this server'));
  },
};

const BEARER = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/;

/** Requires `Authorization: Bearer <access token>` and sets `req.auth`. */
export function authenticate(verifier: AccessTokenVerifier): RequestHandler {
  return async (req, _res, next) => {
    const match = BEARER.exec(req.get('authorization') ?? '');
    if (!match?.[1]) {
      next(AppError.unauthorized());
      return;
    }
    try {
      req.auth = await verifier.verify(match[1]);
      next();
    } catch (error) {
      next(error instanceof AppError ? error : AppError.unauthorized('Invalid access token'));
    }
  };
}
