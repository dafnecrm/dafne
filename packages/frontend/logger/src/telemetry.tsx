"use client";

import type { TransportItem } from "@grafana/faro-web-sdk";
import { useEffect } from "react";
import { isLogLevel } from "./levels.ts";
import { stripQuery } from "./redact.ts";
import { browser } from "./state.ts";

export interface TelemetryProps {
  /** The app's name in Grafana (service_name), e.g. sales-web. */
  app: string;
  version?: string;
  environment?: string;
  /** Where Faro posts: the app's own origin, which forwards it (next.config.ts rewrite). */
  url?: string;
  /** Share of sessions sent, 0 to 1 (default 1). */
  sampleRate?: number;
  /** Lowest level of createLogger's lines (default: debug in development, info in production). */
  level?: string;
}

/** Faro's items without query strings in their URLs (search terms, tokens in links). */
function beforeSend(item: TransportItem): TransportItem {
  const page = item.meta.page;
  if (page?.url) {
    page.url = stripQuery(page.url);
  }
  return item;
}

async function start({ app, version, environment, url = "/telemetry", sampleRate = 1, level }: TelemetryProps) {
  // Loaded only when telemetry is on: Faro and its OpenTelemetry tracing are large.
  const [{ initializeFaro, getWebInstrumentations, LogLevel }, { TracingInstrumentation }] = await Promise.all([
    import("@grafana/faro-web-sdk"),
    import("@grafana/faro-web-tracing"),
  ]);
  if (browser.faro) {
    return;
  }
  if (isLogLevel(level)) {
    browser.level = level;
  }
  browser.faro = initializeFaro({
    url,
    app: { name: app, version, environment },
    sessionTracking: { samplingRate: sampleRate },
    // console.warn and console.error (React's errors too); not the chatter below.
    consoleInstrumentation: {
      disabledLevels: [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.LOG, LogLevel.INFO],
    },
    instrumentations: [
      // Errors, web vitals, page views and sessions.
      ...getWebInstrumentations({ captureConsole: true }),
      // A trace per fetch, with traceparent on same-origin requests: it
      // continues on the Next server and in the APIs.
      new TracingInstrumentation(),
    ],
    ignoreUrls: [/\/telemetry/],
    beforeSend,
    ...(browser.userId && { user: { id: browser.userId } }),
  });
}

/**
 * Starts Grafana Faro in the browser (errors, web vitals, console.warn/error,
 * createLogger's lines and fetch traces). Render it once, in the root
 * layout, only when telemetry is on.
 */
export function Telemetry(props: TelemetryProps) {
  useEffect(() => {
    void start(props);
    // Started once per page load: later prop changes don't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Tags the browser's telemetry with the signed-in user's id (never name or email). */
export function TelemetryUser({ id }: { id: string }) {
  useEffect(() => {
    browser.userId = id;
    browser.faro?.api.setUser({ id });
    return () => {
      browser.userId = undefined;
      browser.faro?.api.resetUser();
    };
  }, [id]);
  return null;
}
