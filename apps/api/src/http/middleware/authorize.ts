import type { Request, RequestHandler } from 'express';
import type { Schema } from '@sellonit/shared';
import { AppError } from '../app-error.js';

type UserRole = Schema<'UserRole'>;

export interface BusinessMembership {
  businessId: string;
  userId: string;
  role: UserRole;
}

/**
 * Port for resolving a user's ACTIVE membership in a business. Implemented by
 * the businesses module once memberships are persisted.
 */
export interface MembershipLookup {
  findActiveMembership(userId: string, businessId: string): Promise<BusinessMembership | null>;
}

/**
 * Default until the businesses module provides a real lookup: nobody is a
 * member of anything, so business-scoped routes fail closed with 403.
 */
export const noMemberships: MembershipLookup = {
  findActiveMembership: () => Promise.resolve(null),
};

export interface RequireBusinessRoleOptions {
  /** Extract the business ID the request targets (path param, loaded resource, ...). */
  businessId: (req: Request) => string | undefined;
  /** Roles allowed to proceed. Omit to allow any active member. */
  roles?: readonly UserRole[];
}

/**
 * Tenant authorization: a valid JWT alone is never sufficient. Requires
 * `authenticate` to have run, then verifies an active membership (and role)
 * in the targeted business. Sets `req.membership`.
 */
export function requireBusinessRole(
  lookup: MembershipLookup,
  options: RequireBusinessRoleOptions,
): RequestHandler {
  return async (req, _res, next) => {
    if (!req.auth) {
      next(AppError.unauthorized());
      return;
    }
    const businessId = options.businessId(req);
    if (!businessId) {
      next(AppError.forbidden());
      return;
    }
    try {
      const membership = await lookup.findActiveMembership(req.auth.userId, businessId);
      if (!membership || (options.roles && !options.roles.includes(membership.role))) {
        next(AppError.forbidden());
        return;
      }
      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
}
