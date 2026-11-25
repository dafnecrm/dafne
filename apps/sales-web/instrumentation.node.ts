import { NodeSDK } from "@opentelemetry/sdk-node";

// Traces, metrics and logs to OTLP over HTTP, configured by the standard
// OTEL_* variables, like the APIs (@dafne/backend-telemetry).
new NodeSDK({ serviceName: process.env.OTEL_SERVICE_NAME || "sales-web" }).start();
