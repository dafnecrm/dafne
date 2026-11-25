import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { join } from 'node:path';

/*
 * The development services of compose.yaml (PostgreSQL, Redis, Gotenberg,
 * and, opt-in, the Grafana stack: otel for the apps' OTLP, alloy for the
 * browser's Faro, the compose profile `telemetry`), started by `dafne dev`
 * before the apps: `docker compose up -d --wait`, which
 * returns at once when they run already. They keep running after dev
 * stops (data in volumes); `dafne services down` stops them. A service
 * whose port another server holds (e.g. Postgres.app) is left to that
 * server, and without Docker nothing starts: the apps use whatever their
 * .env points to.
 */

export const COMPOSE_FILE = 'compose.yaml';

/** The compose profile of the Grafana stack (otel, alloy). */
export const TELEMETRY_PROFILE = 'telemetry';

export interface ServicesOptions {
  /** Also the Grafana stack (otel, alloy): --telemetry, or DAFNE_TELEMETRY=true. */
  telemetry?: boolean;
}

/** Whether the Grafana stack is wanted: the option, else DAFNE_TELEMETRY=true. */
export function wantsTelemetry(options: ServicesOptions = {}, env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(options.telemetry) || env.DAFNE_TELEMETRY === 'true';
}

export interface DevService {
  /** The compose service, e.g. db. */
  name: string;
  /** The host the apps use, e.g. db.dafne.localhost. */
  host: string;
  /** The published port (its DAFNE_*_PORT variable, else the default). */
  port: number;
}

/** The services of compose.yaml, with their hosts and ports; the Grafana stack only with `telemetry`. */
export function devServices(env: NodeJS.ProcessEnv = process.env, { telemetry = false }: ServicesOptions = {}): DevService[] {
  const port = (name: string, fallback: number) => Number(env[name] ?? fallback);
  const services = [
    { name: 'db', host: 'db.dafne.localhost', port: port('DAFNE_DB_PORT', 5432) },
    { name: 'redis', host: 'redis.dafne.localhost', port: port('DAFNE_REDIS_PORT', 6379) },
    { name: 'gotenberg', host: 'gotenberg.dafne.localhost', port: port('DAFNE_GOTENBERG_PORT', 3100) },
  ];
  if (telemetry) {
    services.push(
      // OTLP over HTTP (Grafana is on DAFNE_GRAFANA_PORT, default 3200).
      { name: 'otel', host: 'otel.dafne.localhost', port: port('DAFNE_OTLP_PORT', 4318) },
      { name: 'alloy', host: 'faro.dafne.localhost', port: port('DAFNE_FARO_PORT', 12347) },
    );
  }
  return services;
}

/** `docker compose -f compose.yaml`, with the telemetry profile when asked. */
function composeArgs(root: string, telemetry: boolean): string[] {
  return ['compose', '-f', join(root, COMPOSE_FILE), ...(telemetry ? ['--profile', TELEMETRY_PROFILE] : [])];
}

export type ServicesOutcome =
  | { kind: 'no-compose' }
  | { kind: 'no-docker'; reason: string }
  | { kind: 'started'; running: DevService[]; elsewhere: DevService[] }
  | { kind: 'failed'; output: string };

function compose(root: string, args: string[], env: NodeJS.ProcessEnv) {
  // The profile, so the Grafana stack shows up when it runs.
  return spawnSync('docker', [...composeArgs(root, true), ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
  });
}

/** Whether something accepts connections on the loopback at `port`. */
export function isPortBusy(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((done) => {
    const socket = connect({ port, host, timeout: 500 });
    socket.once('connect', () => {
      socket.destroy();
      done(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      done(false);
    });
    socket.once('error', () => done(false));
  });
}

/** The compose services running now. */
function runningServices(root: string, env: NodeJS.ProcessEnv): Set<string> {
  const result = compose(root, ['ps', '--status', 'running', '--services'], env);
  return new Set(result.status === 0 ? result.stdout.split('\n').filter(Boolean) : []);
}

/** Why Docker can't be used (not installed, daemon down), or null when it can. */
function dockerProblem(env: NodeJS.ProcessEnv): string | null {
  const result = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { env, encoding: 'utf8' });
  if (result.error) {
    return 'Docker is not installed';
  }
  if (result.status !== 0) {
    return "Docker isn't running";
  }
  return null;
}

/**
 * Starts the services of compose.yaml that aren't running, leaving out
 * those whose port another server holds. Waits until they're healthy. The
 * Grafana stack only with `telemetry` (or DAFNE_TELEMETRY=true).
 */
export async function startServices(
  root: string,
  env: NodeJS.ProcessEnv = process.env,
  options: ServicesOptions = {},
): Promise<ServicesOutcome> {
  if (!existsSync(join(root, COMPOSE_FILE))) {
    return { kind: 'no-compose' };
  }
  const problem = dockerProblem(env);
  if (problem) {
    return { kind: 'no-docker', reason: problem };
  }
  const running = runningServices(root, env);
  const telemetry = wantsTelemetry(options, env);
  const services = devServices(env, { telemetry });
  const elsewhere: DevService[] = [];
  const toStart: DevService[] = [];
  for (const service of services) {
    if (running.has(service.name)) {
      continue;
    }
    if (await isPortBusy(service.port)) {
      elsewhere.push(service);
    } else {
      toStart.push(service);
    }
  }
  if (toStart.length) {
    const result = await new Promise<{ status: number | null; output: string }>((done) => {
      const child = spawn('docker', [...composeArgs(root, telemetry), 'up', '-d', '--wait', ...toStart.map((s) => s.name)], {
        cwd: root,
        env,
      });
      let output = '';
      child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
      child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
      child.on('error', (error) => done({ status: 1, output: String(error) }));
      child.on('close', (status) => done({ status, output }));
    });
    if (result.status !== 0) {
      return { kind: 'failed', output: result.output.trim() };
    }
  }
  return {
    kind: 'started',
    running: services.filter((service) => !elsewhere.includes(service)),
    elsewhere,
  };
}

/**
 * `docker compose <args>` on compose.yaml with the terminal attached;
 * resolves with its exit code. `telemetry` adds the Grafana stack's profile.
 */
export function runCompose(root: string, args: string[], { telemetry = false }: ServicesOptions = {}): Promise<number> {
  return new Promise((done, fail) => {
    const child = spawn('docker', [...composeArgs(root, telemetry), ...args], { cwd: root, stdio: 'inherit' });
    child.on('error', fail);
    child.on('exit', (code) => done(code ?? 1));
  });
}
