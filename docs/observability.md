# Logs and observability

The apps' logs, traces and metrics go to the **Grafana stack** over
OpenTelemetry (OTLP): **Loki** for logs, **Tempo** for traces, **Prometheus**
(or Mimir) for metrics, and **Grafana Faro** for the browser. One `trace_id`
links them: a click in the browser, the Next server's render, the API's
request and its SQL queries are one trace, and each log line names it.

Where the data goes is configuration only: the `otel` service of
`compose.yaml` in development, Grafana Cloud (EU region) or a self-hosted
stack in production.

| Where           | Package                     | Logs                                      | Traces and metrics                       |
| --------------- | --------------------------- | ----------------------------------------- | ---------------------------------------- |
| APIs (Nest)     | `@dafne/backend-logger`     | pino: console (readable or JSON), rotated files | —                                   |
|                 | `@dafne/backend-telemetry`  | pino's lines to Loki, with `trace_id`     | HTTP, Express, Nest, pg, Redis           |
| Next server     | `@dafne/frontend-logger/server` | stdout, and Loki                      | Next's own spans (`instrumentation.ts`)  |
| Browser         | `@dafne/frontend-logger/client`, `/telemetry` | Faro: `createLogger`'s lines, `console.warn/error`, errors | Faro: fetch traces, web vitals |

Everything is off without its variables: no `OTEL_EXPORTER_OTLP_ENDPOINT`, no
OpenTelemetry; no `FARO_URL`, no browser telemetry. The logs still go to the
console.

## Development

`pnpm dafne dev` (or `pnpm dafne services up`) starts two more services:

- **`otel`** (`grafana/otel-lgtm`): Grafana, Loki, Tempo, Prometheus and an
  OpenTelemetry collector in one image. Grafana at
  <http://otel.dafne.localhost:3200> (no sign-in), OTLP over HTTP at
  `http://otel.dafne.localhost:4318`. Its data goes with the container.
- **`alloy`** (`grafana/alloy`, `tools/alloy/config.alloy`): receives the
  browser's Faro data at `http://faro.dafne.localhost:12347/collect` and
  forwards it to `otel`. Its UI, at <http://faro.dafne.localhost:12345>,
  shows its components and their health, and *Live debugging* shows what
  each one receives (the Faro payloads, as they arrive).

`DAFNE_GRAFANA_PORT`, `DAFNE_OTLP_PORT`, `DAFNE_FARO_PORT` and
`DAFNE_ALLOY_PORT` move them. The `.env.example` files point the apps at
both. In Grafana, *Explore*:

- Loki: `{service_name="sales-api"}`, `{service_name="sales-web", kind="exception"}`;
- Tempo: search by service, or open a log line's `trace_id`;
- Prometheus: `http_server_request_duration_seconds_bucket{job="sales-api"}`.

### The browser's measurements

Faro sends web vitals (LCP, INP, CLS, FCP, TTFB) as log lines,
`kind=measurement type=web-vitals lcp=…`, so they are in Loki, not
Prometheus. LogQL charts them, e.g. the 75th percentile of LCP per page:

```logql
quantile_over_time(0.75,
  {service_name="sales-web", kind="measurement"} | logfmt | type="web-vitals" | unwrap lcp [5m]
) by (page_url)
```

### Alloy's own metrics

Alloy scrapes itself every 15s and sends its metrics to Prometheus as
`job="alloy"`: whether the browser's data gets in and goes on.

| Query                                                    |                                       |
| -------------------------------------------------------- | ------------------------------------- |
| `rate(faro_receiver_logs_total{job="alloy"}[5m])`         | logs received (also `_exceptions_`, `_measurements_`, `_events_`) |
| `faro_receiver_request_duration_seconds_count{job="alloy"}` | requests, by `status_code` (429: rate limited) |
| `loki_write_dropped_entries_total{job="alloy"}`           | lines Loki didn't take                |
| `otelcol_exporter_sent_spans_total{job="alloy"}`          | traces sent on to Tempo (`_send_failed_spans_total` appears once a send fails) |

## The APIs

### Logger (`@dafne/backend-logger`)

pino through nestjs-pino. `LoggerModule.forRoot({ app: 'sales' })` in the
root module, then in `main.ts`:

```ts
const app = await NestFactory.create(SalesApiModule, { bufferLogs: true });
useAppLogger(app);
```

Every `new Logger('Context')` of the libs goes through it unchanged. Each
request gets one line (method, URL, status, duration, `req.id`, `userId`
once signed in): 5xx as `error`, 4xx as `warn`. Cookies, the
`Authorization` header and `password` / `token` / `secret` fields are
`[redacted]`. A service that wants structured fields injects pino:

```ts
constructor(@InjectPinoLogger(QuotationsService.name) private readonly logger: PinoLogger) {}
this.logger.info({ quotationId }, 'Quotation sent');
```

| Variable             | Default                                    |                                        |
| -------------------- | ------------------------------------------ | -------------------------------------- |
| `LOG_LEVEL`          | `debug`, `info` with `NODE_ENV=production` | `trace` … `fatal`, `silent`            |
| `LOG_PRETTY`         | `true`, `false` with `NODE_ENV=production` | readable lines (pino-pretty) or JSON   |
| `LOG_FILE`           | none                                       | also JSON to this file, rotated by pino-roll |
| `LOG_FILE_LEVEL`     | `LOG_LEVEL`                                |                                        |
| `LOG_FILE_FREQUENCY` | `daily`                                    | `daily`, `hourly` or milliseconds      |
| `LOG_FILE_SIZE`      | `10m`                                      | rotates at this size too               |
| `LOG_FILE_COUNT`     | `7`                                        | files kept                             |

Set `NODE_ENV=production` in production: JSON on stdout is what log
collectors read.

### OpenTelemetry (`@dafne/backend-telemetry`)

It must load before the app, to patch the modules the bundle imports: each
API builds `src/telemetry.ts` as an entry of its own (`dist/telemetry.js`,
`rspack.config.js`), and its scripts start with
`node --import ./dist/telemetry.js dist/main` (`nest start --exec …` in
development). It reads the app's `.env` itself, and takes the standard
variables:

| Variable                      |                                                              |
| ----------------------------- | ------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | the OTLP endpoint (HTTP); empty: off                         |
| `OTEL_EXPORTER_OTLP_HEADERS`  | e.g. Grafana Cloud's `Authorization=Basic <base64 of instanceId:token>` |
| `OTEL_SERVICE_NAME`           | default the app's name (`sales-api`, `auth`)                 |
| `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_SAMPLER_ARG` | sampling, e.g. `parentbased_traceidratio`, `0.2` |
| `OTEL_SDK_DISABLED=true`      | off, endpoint or not                                         |

The npm packages of both libs (pino and its transports, the OpenTelemetry
SDK, `import-in-the-middle`) are in each API's `package.json`: rspack leaves
them external, and pino loads its transports by name in a worker thread.
`dafne g backend-app` sets all of this up.

## The frontend

### Logger (`@dafne/frontend-logger`)

One API, an entry per place the code runs:

```ts
import { createLogger } from "@dafne/frontend-logger/server"; // server components, actions, route handlers
import { createLogger } from "@dafne/frontend-logger/client"; // client components

const log = createLogger("quotations");
log.info("Quotation sent", { quotationId });
log.error("Send failed", { quotationId, error });
```

- **Server:** a line on stdout (readable in development, JSON in
  production, with `trace_id`) and an OpenTelemetry log record (Loki) when
  `instrumentation.ts` runs. `LOG_LEVEL` sets the level.
- **Browser:** the console, and Faro once it has started. `NEXT_PUBLIC_LOG_LEVEL`
  sets the level.
- **Attributes** become strings. Keys that look like credentials or
  personal data (`password`, `token`, `email`, `phone`, `iban`, `vat`…) are
  `[redacted]`, but the rule is simpler: **log ids, never customer data.**
  Feature libs log through this lib, never through Faro directly.

### Browser telemetry (Faro)

`<Telemetry app="sales-web" />` (`@dafne/frontend-logger/telemetry`, in the
root layout) starts Faro when `FARO_URL` is set. It loads Faro only then,
and collects errors, web vitals, page views, `console.warn` and
`console.error`, `createLogger`'s lines and a trace per same-origin fetch.
`<TelemetryUser id>` (the `(app)` layout) adds the user's id, never the
name or email. URLs lose their query strings before they leave the browser.

The browser posts to `/telemetry` on the app's own origin (so ad blockers
let it through), and `next.config.ts` forwards it to `FARO_URL`; `proxy.ts`
lets it through without a session. `FARO_URL` and `FARO_SAMPLE_RATE` (share
of sessions sent, default 1) are read when the app is built, since the
layout is prerendered and the rewrites are fixed at build time.

### Next server

`apps/sales-web/instrumentation.ts` starts the OpenTelemetry SDK when
`OTEL_EXPORTER_OTLP_ENDPOINT` is set (`instrumentation.node.ts`). Next
traces requests, rendering and `fetch`, and `backendFetch` calls carry
`traceparent` to the APIs.

## Production: Grafana Cloud

1. In the Grafana Cloud stack, *Connections → OpenTelemetry*: the OTLP
   endpoint and a token. On each API and the Next server:
   `OTEL_EXPORTER_OTLP_ENDPOINT=<endpoint>`,
   `OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64 of instanceId:token>`.
2. *Frontend Observability*: create the app, then build the frontend with
   `FARO_URL=<its collector URL>`. Upload the source maps there to read
   the stack traces.
3. Self-hosted instead: Loki, Tempo and Prometheus (or Mimir) behind an
   OpenTelemetry collector or Alloy, and an Alloy with `faro.receiver` like
   `tools/alloy/config.alloy` for `FARO_URL`.

Keep the logs' retention and access in line with the data protection rules
(GDPR): the logs hold user ids and request paths, never customer data.
