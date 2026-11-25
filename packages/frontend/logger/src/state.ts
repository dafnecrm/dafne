import type { Faro } from "@grafana/faro-web-sdk";
import { minLevel, type LogLevel } from "./levels.ts";

/** The browser's logging state: Faro once <Telemetry /> has started it. */
export const browser: { faro: Faro | undefined; level: LogLevel; userId: string | undefined } = {
  faro: undefined,
  // Set by <TelemetryUser />, maybe before Faro has loaded.
  userId: undefined,
  level: minLevel(process.env.NEXT_PUBLIC_LOG_LEVEL, process.env.NODE_ENV === "production"),
};
