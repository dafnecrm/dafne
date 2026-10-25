import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";

/**
 * Better Auth client plugins, mirroring the backend's auth config
 * (libs/auth/src/auth.ts). Shared by the browser and server clients so both
 * infer the same user type (firstname, lastname, role, ...).
 */
export const authPlugins = () => [
  inferAdditionalFields({
    user: {
      firstname: { type: "string", required: true },
      lastname: { type: "string", required: true },
    },
  }),
  adminClient(),
];
