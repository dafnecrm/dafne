import { cache } from "react";
import { BackendError } from "@dafne/frontend-api";
import { backendFetch } from "@dafne/frontend-api/server";
import type { MyPermissions } from "@dafne/contracts";

/** Nothing allowed. */
const NONE: MyPermissions = { admin: false, permissions: [] };

/**
 * What the signed-in user can do: the backend's GET /me/permissions, once
 * per request. The app's layout passes the promise, not awaited, to
 * <PermissionsProvider>: only the components that ask (<Can>) wait for it.
 * Without a valid session (401: expired, revoked, a database reset) it's
 * nothing allowed: the layout's requireUser() sends the user to sign in,
 * so a rejected promise would only add an error to the server's log.
 */
export const loadMyPermissions = cache(async (): Promise<MyPermissions> => {
  try {
    return await (await backendFetch("/me/permissions")).json();
  } catch (error) {
    if (error instanceof BackendError && error.status === 401) {
      return NONE;
    }
    throw error;
  }
});
