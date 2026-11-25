// Public API of @dafne/frontend-logger, compiled by Next from its sources.
// Import the entry for where the code runs:
// - @dafne/frontend-logger/client: client components;
// - @dafne/frontend-logger/telemetry: <Telemetry /> and <TelemetryUser />
//   (Grafana Faro), rendered by the app's layouts;
// - @dafne/frontend-logger/server: server components, route handlers, server actions.
// This one holds what both share (levels, types, redaction).
export * from "./levels.ts";
export * from "./redact.ts";
