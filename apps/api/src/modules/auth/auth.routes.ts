import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * Credentials and sessions: registration, email verification, login, token
 * refresh/revocation and password reset. Issues the access tokens verified by
 * `http/middleware/authenticate.ts` (HS256, JWT_ISSUER, JWT_AUDIENCE).
 * Credential endpoints use the stricter `auth` rate-limit tier.
 */
export function createAuthModule() {
  return defineModule('auth', [
    plannedRoute('post', '/auth/register', { access: 'public', rateLimit: 'auth' }),
    plannedRoute('post', '/auth/verify-email', { access: 'public', rateLimit: 'auth' }),
    plannedRoute('post', '/auth/login', { access: 'public', rateLimit: 'auth' }),
    plannedRoute('post', '/auth/refresh', { access: 'public', rateLimit: 'auth' }),
    plannedRoute('post', '/auth/logout', { access: 'authenticated' }),
    plannedRoute('post', '/auth/forgot-password', { access: 'public', rateLimit: 'auth' }),
    plannedRoute('post', '/auth/reset-password', { access: 'public', rateLimit: 'auth' }),
  ]);
}
