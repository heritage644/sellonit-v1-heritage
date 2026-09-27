import { defineModule, plannedRoute } from '../../http/route-definition.js';

/** The authenticated user's own profile (`User` resource). */
export function createUsersModule() {
  return defineModule('users', [plannedRoute('get', '/me', { access: 'authenticated' })]);
}
