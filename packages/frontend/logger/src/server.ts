// Logging in server components, route handlers and server actions:
// createLogger("customers").info("Saved", { customerId }).
// Each line goes to stdout (JSON in production, readable in development)
// and, when OpenTelemetry runs (the app's instrumentation.ts), to its logs
// (Loki), with the request's trace. Client code imports @dafne/frontend-logger/client.
import "server-only";
import { context, logs, SeverityNumber, trace, type LogRecord } from "@opentelemetry/api";
import { after } from "next/server";
import { levelEnabled, minLevel, type LogAttributes, type Logger, type LogLevel } from "./levels.ts";
import { formatLine, now } from "./format.ts";
import { redact } from "./redact.ts";

export * from "./levels.ts";

const SEVERITY: Record<LogLevel, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

const production = process.env.NODE_ENV === "production";
const min = minLevel(process.env.LOG_LEVEL, production);

function write(scope: string, level: LogLevel, message: string, attributes?: LogAttributes) {
  if (!levelEnabled(level, min)) {
    return;
  }
  const fields = redact(attributes);
  const time = now();
  const traceId = trace.getActiveSpan()?.spanContext().traceId;
  console[level](formatLine({ level, scope, message, attributes: fields, time, traceId }, production));
  emit({
    timestamp: time,
    severityNumber: SEVERITY[level],
    severityText: level.toUpperCase(),
    body: message,
    attributes: { scope, ...fields },
    // The request's trace, kept for after().
    context: context.active(),
  });
}

/**
 * The OpenTelemetry log record (a no-op without the SDK). The SDK reads
 * Date.now() for every record, which Next refuses while it prerenders a
 * page: it is sent in after(), once the render is done. Outside a request
 * or a render (no after()), at once.
 */
function emit(record: LogRecord) {
  const send = () => logs.getLogger("@dafne/frontend-logger").emit(record);
  try {
    after(send);
  } catch {
    send();
  }
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, attributes) => write(scope, "debug", message, attributes),
    info: (message, attributes) => write(scope, "info", message, attributes),
    warn: (message, attributes) => write(scope, "warn", message, attributes),
    error: (message, attributes) => write(scope, "error", message, attributes),
  };
}
