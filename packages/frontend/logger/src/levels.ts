/** The levels, lowest first. */
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/** Extra fields of a line: ids and counts, never customer data. */
export type LogAttributes = Record<string, unknown>;

export interface Logger {
  debug(message: string, attributes?: LogAttributes): void;
  info(message: string, attributes?: LogAttributes): void;
  warn(message: string, attributes?: LogAttributes): void;
  /** `attributes.error`, if any, gives its message and stack. */
  error(message: string, attributes?: LogAttributes): void;
}

export function isLogLevel(value: unknown): value is LogLevel {
  return (LOG_LEVELS as readonly unknown[]).includes(value);
}

/** The lowest level written: `value` when valid, else debug in development and info in production. */
export function minLevel(value: string | undefined, production: boolean): LogLevel {
  if (isLogLevel(value)) {
    return value;
  }
  return production ? "info" : "debug";
}

export function levelEnabled(level: LogLevel, min: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(min);
}
