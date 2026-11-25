// Logging in client components: createLogger("customers").info("Saved", { customerId }).
// Lines go to Grafana (Loki) through Faro once <Telemetry /> runs
// (@dafne/frontend-logger/telemetry), and to the browser's console. Server
// code imports @dafne/frontend-logger/server.
import "client-only";
import type { LogLevel as FaroLogLevel } from "@grafana/faro-web-sdk";
import { levelEnabled, type LogAttributes, type Logger, type LogLevel } from "./levels.ts";
import { redact } from "./redact.ts";
import { browser } from "./state.ts";

export * from "./levels.ts";

function write(scope: string, level: LogLevel, message: string, attributes?: LogAttributes) {
  if (!levelEnabled(level, browser.level)) {
    return;
  }
  const context = { scope, ...redact(attributes) };
  const { faro } = browser;
  if (faro) {
    // Faro's LogLevel values are these same strings.
    faro.api.pushLog([message], { level: level as FaroLogLevel, context });
    // Faro captures console.warn/error: its unpatched console doesn't send twice.
    faro.unpatchedConsole[level](`[${scope}] ${message}`, context);
    return;
  }
  console[level](`[${scope}] ${message}`, context);
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, attributes) => write(scope, "debug", message, attributes),
    info: (message, attributes) => write(scope, "info", message, attributes),
    warn: (message, attributes) => write(scope, "warn", message, attributes),
    error: (message, attributes) => write(scope, "error", message, attributes),
  };
}
