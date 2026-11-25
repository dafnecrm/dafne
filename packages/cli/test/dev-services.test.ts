import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devServices, isPortBusy, startServices, wantsTelemetry } from '../src/core/dev-services.ts';

const ROOT = join(import.meta.dirname, '..', '..', '..');

describe('devServices', () => {
  it('reads the ports from DAFNE_DB_PORT, DAFNE_REDIS_PORT and DAFNE_GOTENBERG_PORT', () => {
    expect(devServices({})).toEqual([
      { name: 'db', host: 'db.dafne.localhost', port: 5432 },
      { name: 'redis', host: 'redis.dafne.localhost', port: 6379 },
      { name: 'gotenberg', host: 'gotenberg.dafne.localhost', port: 3100 },
    ]);
    expect(devServices({ DAFNE_DB_PORT: '5433' })[0].port).toBe(5433);
  });

  it('adds the Grafana stack only with telemetry', () => {
    expect(devServices({ DAFNE_OTLP_PORT: '4319' }, { telemetry: true }).slice(3)).toEqual([
      { name: 'otel', host: 'otel.dafne.localhost', port: 4319 },
      { name: 'alloy', host: 'faro.dafne.localhost', port: 12347 },
    ]);
  });
});

describe('wantsTelemetry', () => {
  it('is on with the option or DAFNE_TELEMETRY=true', () => {
    expect(wantsTelemetry({}, {})).toBe(false);
    expect(wantsTelemetry({ telemetry: true }, {})).toBe(true);
    expect(wantsTelemetry({}, { DAFNE_TELEMETRY: 'true' })).toBe(true);
  });
});

describe('startServices', () => {
  it('does nothing without compose.yaml', async () => {
    expect(await startServices(mkdtempSync(join(tmpdir(), 'dafne-nocompose-')))).toEqual({ kind: 'no-compose' });
  });

  it('says so without Docker', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dafne-nodocker-'));
    copyFileSync(join(ROOT, 'compose.yaml'), join(root, 'compose.yaml'));
    expect(await startServices(root, { PATH: '/nonexistent' })).toEqual({
      kind: 'no-docker',
      reason: 'Docker is not installed',
    });
  });

  it('leaves a service whose port another server holds', async () => {
    const hasDocker = spawnSync('docker', ['info']).status === 0;
    // Real containers: on a developer's machine only, not in CI.
    if (!hasDocker || process.env.CI) {
      return;
    }
    // Something else on the db, gotenberg, otel and alloy ports; redis on a port nobody uses. With the Grafana stack.
    const other = createServer();
    await new Promise<void>((done) => other.listen(0, '127.0.0.1', done));
    const dbPort = (other.address() as { port: number }).port;
    const env = {
      ...process.env,
      COMPOSE_PROJECT_NAME: 'dafne-test-services',
      DAFNE_DB_PORT: String(dbPort),
      DAFNE_REDIS_PORT: '56391',
      DAFNE_GOTENBERG_PORT: String(dbPort),
      DAFNE_OTLP_PORT: String(dbPort),
      DAFNE_FARO_PORT: String(dbPort),
    };
    try {
      const outcome = await startServices(ROOT, env, { telemetry: true });
      expect(outcome).toMatchObject({
        kind: 'started',
        running: [{ name: 'redis', port: 56391 }],
        elsewhere: [
          { name: 'db', port: dbPort },
          { name: 'gotenberg', port: dbPort },
          { name: 'otel', port: dbPort },
          { name: 'alloy', port: dbPort },
        ],
      });
      expect(await isPortBusy(56391)).toBe(true);
      // Running already: nothing to start.
      expect(await startServices(ROOT, env, { telemetry: true })).toMatchObject({ kind: 'started', running: [{ name: 'redis' }] });
    } finally {
      spawnSync('docker', ['compose', '-f', join(ROOT, 'compose.yaml'), '--profile', 'telemetry', 'down', '-v'], { env });
      await new Promise((done) => other.close(done));
    }
  }, 120_000);
});
