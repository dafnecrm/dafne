/* The layout of a Dafne workspace, relative to its root (the Nx workspace root). */

/** The default backend app: the one the CLI wires new libs into. */
export const DEFAULT_APP = 'sales-api';
export const BACKEND = backendApp(DEFAULT_APP);
export const FRONTEND = 'apps/sales-web';
export const CONTRACTS_SRC = 'packages/contracts/src';
/** The backend's libs: one workspace package each, `@dafne/backend-<lib>`. */
export const BACKEND_LIBS = 'packages/backend';
/** The frontend's libs: one workspace package each, `@dafne/frontend-<lib>`. */
export const FRONTEND_LIBS = 'packages/frontend';

/** A backend app's folder, e.g. apps/sales-api. */
export function backendApp(app: string) {
  return `apps/${app}`;
}
/** A backend app's root module, e.g. apps/sales-api/src/sales-api.module.ts. */
export function appModule(app: string) {
  return `${backendApp(app)}/src/${app}.module.ts`;
}
/** A backend app's package name, e.g. @dafne/sales-api. */
export const appPackage = (app: string) => `@dafne/${app}`;

/** A backend lib's folder, e.g. packages/backend/customers. */
export const backendLib = (lib: string) => `${BACKEND_LIBS}/${lib}`;
/** A backend lib's package name, e.g. @dafne/backend-customers. */
export const backendPackage = (lib: string) => `@dafne/backend-${lib}`;

/** A frontend lib's folder, e.g. packages/frontend/auth. */
export const frontendLib = (lib: string) => `${FRONTEND_LIBS}/${lib}`;
/** A frontend lib's package name, e.g. @dafne/frontend-auth. */
export const frontendPackage = (lib: string) => `@dafne/frontend-${lib}`;
