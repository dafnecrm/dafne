import type { LogLevel } from "./levels.ts";

/**
 * The current time in milliseconds, from the timing API: Next refuses
 * `Date.now()` and `new Date()` while it prerenders a page, and a server
 * component may log then.
 */
export function now(): number {
  return performance.timeOrigin + performance.now();
}

/** One line as written to stdout: JSON in production, readable in development. */
export function formatLine(
  line: {
    level: LogLevel;
    scope: string;
    message: string;
    attributes: Record<string, string>;
    /** Milliseconds since the epoch (see now()). */
    time: number;
    traceId?: string;
  },
  json: boolean,
): string {
  if (json) {
    return JSON.stringify({
      level: line.level,
      time: new Date(line.time).toISOString(),
      scope: line.scope,
      msg: line.message,
      ...line.attributes,
      ...(line.traceId && { trace_id: line.traceId }),
    });
  }
  const attributes = Object.keys(line.attributes).length ? ` ${JSON.stringify(line.attributes)}` : "";
  return `${line.level.toUpperCase()} [${line.scope}] ${line.message}${attributes}`;
}
