import { defineModule, plannedRoute } from '../../http/route-definition.js';

/**
 * Businesses (tenants) and their members. Owns the membership data behind the
 * `MembershipLookup` port in `http/middleware/authorize.ts`; every
 * tenant-scoped module authorizes through it.
 */
export function createBusinessesModule() {
  return defineModule('businesses', [
    plannedRoute('get', '/businesses', { access: 'authenticated' }),
    plannedRoute('post', '/businesses', { access: 'authenticated' }),
    plannedRoute('get', '/businesses/{businessId}', { access: 'authenticated' }),
    plannedRoute('patch', '/businesses/{businessId}', { access: 'authenticated' }),
    plannedRoute('get', '/businesses/{businessId}/members', { access: 'authenticated' }),
    plannedRoute('post', '/businesses/{businessId}/members', { access: 'authenticated' }),
    plannedRoute('patch', '/businesses/{businessId}/members/{memberId}', {
      access: 'authenticated',
    }),
    plannedRoute('delete', '/businesses/{businessId}/members/{memberId}', {
      access: 'authenticated',
    }),
  ]);
}
