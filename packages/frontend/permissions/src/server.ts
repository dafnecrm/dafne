import { cache } from "react";
import { backendFetch } from "@dafne/frontend-api/server";
import type { MyPermissions } from "@dafne/contracts";

/**
 * What the signed-in user can do: the backend's GET /me/permissions, once
 * per request. The app's layout passes the promise, not awaited, to
 * <PermissionsProvider>: only the components that ask (<Can>) wait for it.
 */
export const loadMyPermissions = cache(async (): Promise<MyPermissions> => {
  return (await backendFetch("/me/permissions")).json();
});
