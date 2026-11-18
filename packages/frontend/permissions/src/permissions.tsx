"use client";

import { createContext, Suspense, use, type ReactNode } from "react";
import type { MyPermissions, PermissionAction, PermissionSubject, PERMISSIONS } from "@dafne/contracts";
import { abilityFor, type AppAbility } from "@dafne/permissions";

/** Nothing allowed: before the provider, or when the permissions can't load. */
const NONE: Promise<MyPermissions> = Promise.resolve({ admin: false, permissions: [] });

const PermissionsContext = createContext<Promise<MyPermissions>>(NONE);

/** One ability per answer, shared by every <Can> of the page. */
const abilities = new WeakMap<Promise<MyPermissions>, Promise<AppAbility>>();

function abilityOf(permissions: Promise<MyPermissions>): Promise<AppAbility> {
  let ability = abilities.get(permissions);
  if (!ability) {
    // A failure hides the actions rather than breaking the page; the
    // backend checks every call anyway.
    // Promise.resolve: what crosses from the server is a thenable whose
    // then() returns nothing; adopted, it chains.
    ability = Promise.resolve(permissions).then(abilityFor, () =>
      abilityFor({ admin: false, permissions: [] }),
    );
    abilities.set(permissions, ability);
  }
  return ability;
}

/**
 * Makes the user's permissions available to <Can> and useCan below it.
 * `permissions` is a promise (loadMyPermissions(), not awaited), so the
 * page doesn't wait for it.
 */
export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: Promise<MyPermissions>;
  children: ReactNode;
}) {
  return <PermissionsContext value={permissions}>{children}</PermissionsContext>;
}

/**
 * Whether the user can do `action` on `subject` (see contracts/permissions.ts).
 * Suspends until the permissions arrive: use it below a Suspense boundary,
 * or use <Can>, which has its own.
 */
export function useCan<S extends PermissionSubject>(action: (typeof PERMISSIONS)[S][number], subject: S): boolean {
  return use(abilityOf(use(PermissionsContext))).can(action as PermissionAction, subject);
}

/**
 * Shows `children` only if the user can do `I` on `a`; nothing while the
 * permissions load. The backend refuses the action anyway (@Can).
 *
 *   <Can I="create" a="Customer"><Button>…</Button></Can>
 */
export function Can<S extends PermissionSubject>({
  I,
  a,
  children,
  fallback = null,
}: {
  I: (typeof PERMISSIONS)[S][number];
  a: S;
  children: ReactNode;
  /** What to show instead (e.g. a disabled control). */
  fallback?: ReactNode;
}) {
  return (
    <Suspense fallback={fallback}>
      <Allowed I={I} a={a} fallback={fallback}>
        {children}
      </Allowed>
    </Suspense>
  );
}

function Allowed<S extends PermissionSubject>({
  I,
  a,
  children,
  fallback,
}: {
  I: (typeof PERMISSIONS)[S][number];
  a: S;
  children: ReactNode;
  fallback: ReactNode;
}) {
  return useCan(I, a) ? children : fallback;
}
