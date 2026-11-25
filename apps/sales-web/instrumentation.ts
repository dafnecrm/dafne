/**
 * OpenTelemetry on the Next server (Next calls register() once at start-up).
 * Next traces its own work (requests, rendering, fetch), and its fetch calls
 * to the APIs carry traceparent: one trace from the browser (Faro) through
 * this server to apps/sales-api and its queries. @dafne/frontend-logger/server's
 * lines go to the OpenTelemetry logs (Loki). Off without
 * OTEL_EXPORTER_OTLP_ENDPOINT. See docs/observability.md.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    await import("./instrumentation.node");
  }
}
