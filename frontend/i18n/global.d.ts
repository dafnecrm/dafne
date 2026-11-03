import type { ContractMessages } from "@backend/contracts";
import type en from "../messages/en.json";
import type { routing } from "./routing";

/**
 * Typed messages: t("customers.title") only compiles if the key exists in
 * messages/en.json (or, under `contracts`, in the backend's catalog).
 * messages/it.json is checked against en.json in i18n/messages.check.ts.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof en & { contracts: ContractMessages };
  }
}
