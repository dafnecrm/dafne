import { existsSync } from 'node:fs';
import { register } from 'import-in-the-middle/register-hooks.mjs';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ExpressLayerType } from '@opentelemetry/instrumentation-express';
import { NodeSDK } from '@opentelemetry/sdk-node';

export interface TelemetryOptions {
  /** The service's name in Grafana (service.name), e.g. sales-api. OTEL_SERVICE_NAME overrides it. */
  serviceName: string;
  /** Loaded first, as ConfigModule would, so OTEL_* can live in the app's .env. */
  envFile?: string;
}

/** Whether OTLP has somewhere to go: OTEL_EXPORTER_OTLP_ENDPOINT, and no OTEL_SDK_DISABLED. */
export function telemetryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT) && env.OTEL_SDK_DISABLED !== 'true';
}

/**
 * The instrumentations: HTTP in and out (the frontend's and apps/auth's
 * calls, so one trace spans them), Express and Nest's handlers, pg (every
 * Drizzle query), Redis and pino. pino's lines get trace_id and span_id, and
 * are sent to the OpenTelemetry logs (Loki). Off: fs, dns and net, and a
 * span per Express middleware: noise.
 */
function instrumentations() {
  return getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-dns': { enabled: false },
    '@opentelemetry/instrumentation-net': { enabled: false },
    '@opentelemetry/instrumentation-express': { ignoreLayersType: [ExpressLayerType.MIDDLEWARE] },
  });
}

/**
 * Starts OpenTelemetry: traces, metrics and logs to OTLP over HTTP
 * (Grafana: Tempo, Prometheus/Mimir, Loki), configured by the standard
 * OTEL_* variables (OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_EXPORTER_OTLP_HEADERS
 * for Grafana Cloud, OTEL_TRACES_SAMPLER…). Without an endpoint it does
 * nothing.
 *
 * It must run before the app loads its modules, so it can patch them: the
 * app builds it as an entry of its own (dist/telemetry.js) and starts with
 * `node --import ./dist/telemetry.js dist/main`.
 */
export function startTelemetry({ serviceName, envFile = '.env' }: TelemetryOptions): NodeSDK | undefined {
  if (existsSync(envFile)) {
    // Doesn't override variables already set.
    process.loadEnvFile(envFile);
  }
  if (!telemetryEnabled()) {
    return undefined;
  }
  // The app's bundle imports its npm packages as ES modules: this loader
  // hook (module.registerHooks, in-thread) lets the instrumentations patch
  // them as they load.
  register();

  const sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME || serviceName,
    instrumentations: [instrumentations()],
  });
  sdk.start();

  // Send what's still buffered before the process ends.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      void sdk.shutdown().finally(() => process.exit(0));
    });
  }
  return sdk;
}
