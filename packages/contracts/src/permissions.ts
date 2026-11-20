import { z } from 'zod';
import { msg } from './messages/index.ts';

/*
 * What user groups can be allowed to do, by subject. Reading stays open to
 * every user of the app; these are the writes. Admins (global, or of the
 * app) can do everything. The rules are built with CASL (@dafne/permissions)
 * on both sides: the API's guards (@Can) and the frontend's buttons.
 *
 * Adding one: its action here, its labels in the frontend
 * (@dafne/frontend-user-groups messages), then @Can on the route.
 */
export const PERMISSIONS = {
  Customer: ['create', 'update', 'delete'],
  Activity: ['create', 'update', 'delete', 'close'],
  Product: ['create', 'update', 'delete'],
  Uom: ['create', 'update', 'delete'],
  UomConversion: ['create', 'update', 'delete'],
  SalesOrder: ['create', 'update', 'delete', 'changeStatus'],
  Quotation: ['create', 'update', 'delete', 'changeStatus'],
} as const;

export type PermissionSubject = keyof typeof PERMISSIONS;
export type PermissionAction = (typeof PERMISSIONS)[PermissionSubject][number];

/** A permission as groups store it, e.g. "Customer.create". */
export type Permission = {
  [S in PermissionSubject]: `${S}.${(typeof PERMISSIONS)[S][number]}`;
}[PermissionSubject];

export const PERMISSION_SUBJECTS = Object.keys(PERMISSIONS) as PermissionSubject[];

export const PERMISSION_KEYS = PERMISSION_SUBJECTS.flatMap((subject) =>
  PERMISSIONS[subject].map((action) => `${subject}.${action}` as Permission),
);

/** A group's permissions: known keys only, each once. */
export const permissionsSchema = z
  .array(z.enum(PERMISSION_KEYS as [Permission, ...Permission[]], { error: msg('permissions.unknown') }))
  .max(PERMISSION_KEYS.length)
  .nullish()
  .transform((permissions) => [...new Set(permissions ?? [])]);

/**
 * Body of PUT /user-groups/:id/permissions (the app's API): what a group's
 * members can do in this app, the whole list (PUT replaces it).
 */
export const groupPermissionsBodySchema = z.strictObject({
  permissions: permissionsSchema,
});
export type GroupPermissionsBody = z.output<typeof groupPermissionsBodySchema>;

/** Response of GET and PUT /user-groups/:id/permissions. */
export interface GroupPermissions {
  groupId: number;
  /** Sorted. */
  permissions: Permission[];
}

/** Response of GET /me/permissions: what the signed-in user can do. */
export interface MyPermissions {
  /** Admins (global or of the app): everything. */
  admin: boolean;
  permissions: Permission[];
}
