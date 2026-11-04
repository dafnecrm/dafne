// Type only (a shared package, no backend code): erased at build time.
import type { AuthOptions } from "@dafne/auth-options";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

/**
 * Better Auth client plugins, shared by the browser and server clients.
 *
 * The user fields (firstname, lastname, ...) are inferred from the auth
 * options (@dafne/auth-options), so they can't drift. Client plugins are runtime code:
 * when the backend adds a server plugin (e.g. passkey, twoFactor), add its
 * client counterpart here.
 */
export const authPlugins = () => [
  inferAdditionalFields<AuthOptions>(),
  adminClient(),
];
