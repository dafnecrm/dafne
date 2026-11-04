/* The layout of a Dafne workspace, relative to its root (the Nx workspace root). */

/** The default backend app: the one the CLI wires new libs into. */
export const DEFAULT_APP = 'api';
export const BACKEND = backendApp(DEFAULT_APP);
export const FRONTEND = 'apps/frontend';
export const CONTRACTS_SRC = 'packages/contracts/src';
/** The backend's libs: one workspace package each, `@dafne/backend-<lib>`. */
export const BACKEND_LIBS = 'packages/backend';

/** A backend app's folder, e.g. apps/api. */
export function backendApp(app: string) {
  return `apps/${app}`;
}
/** A backend app's root module, e.g. apps/api/src/api.module.ts. */
export function appModule(app: string) {
  return `${backendApp(app)}/src/${app}.module.ts`;
}
/** A backend app's package name, e.g. @dafne/api. */
export const appPackage = (app: string) => `@dafne/${app}`;

/** A backend lib's folder, e.g. packages/backend/customers. */
export const backendLib = (lib: string) => `${BACKEND_LIBS}/${lib}`;
/** A backend lib's package name, e.g. @dafne/backend-customers. */
export const backendPackage = (lib: string) => `@dafne/backend-${lib}`;
