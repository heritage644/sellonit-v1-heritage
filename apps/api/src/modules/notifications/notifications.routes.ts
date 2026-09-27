import { defineModule, plannedRoute } from '../../http/route-definition.js';

/** In-app notifications for the current user. Delivery (email/SMS) will run in the worker. */
export function createNotificationsModule() {
  return defineModule('notifications', [
    plannedRoute('get', '/notifications', { access: 'authenticated' }),
    plannedRoute('post', '/notifications/{notificationId}/read', { access: 'authenticated' }),
  ]);
}
