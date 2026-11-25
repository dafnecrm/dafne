import { telemetryEnabled } from './telemetry.js';

describe('telemetryEnabled', () => {
  it('is off without an OTLP endpoint', () => {
    expect(telemetryEnabled({})).toBe(false);
    expect(telemetryEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: '' })).toBe(false);
  });

  it('is on with an endpoint', () => {
    expect(telemetryEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel.dafne.localhost:4318' })).toBe(true);
  });

  it('is off with OTEL_SDK_DISABLED=true', () => {
    expect(
      telemetryEnabled({ OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel.dafne.localhost:4318', OTEL_SDK_DISABLED: 'true' }),
    ).toBe(false);
  });
});
