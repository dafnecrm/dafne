import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { connect } from 'node:net';
import { join } from 'node:path';

/*
 * The development services of compose.yaml (PostgreSQL, Redis), started
 * by `dafne dev` before the apps: `docker compose up -d --wait`, which
 * returns at once when they run already. They keep running after dev
 * stops (data in volumes); `dafne services down` stops them. A service
 * whose port another server holds (e.g. Postgres.app) is left to that
 * server, and without Docker nothing starts: the apps use whatever their
 * .env points to.
 */

export const COMPOSE_FILE = 'compose.yaml';

export interface DevService {
  /** The compose service, e.g. db. */
  name: string;
  /** The host the apps use, e.g. db.dafne.localhost. */
  host: string;
  /** The published port (its DAFNE_*_PORT variable, else the default). */
  port: number;
}

/** The services of compose.yaml, with their hosts and ports. */
export function devServices(env: NodeJS.ProcessEnv = process.env): DevService[] {
  const port = (name: string, fallback: number) => Number(env[name] ?? fallback);
  return [
    { name: 'db', host: 'db.dafne.localhost', port: port('DAFNE_DB_PORT', 5432) },
    { name: 'redis', host: 'redis.dafne.localhost', port: port('DAFNE_REDIS_PORT', 6379) },
  ];
}

export type ServicesOutcome =
  | { kind: 'no-compose' }
  | { kind: 'no-docker'; reason: string }
  | { kind: 'started'; running: DevService[]; elsewhere: DevService[] }
  | { kind: 'failed'; output: string };

function compose(root: string, args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync('docker', ['compose', '-f', join(root, COMPOSE_FILE), ...args], {
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
 * those whose port another server holds. Waits until they're healthy.
 */
export async function startServices(root: string, env: NodeJS.ProcessEnv = process.env): Promise<ServicesOutcome> {
  if (!existsSync(join(root, COMPOSE_FILE))) {
    return { kind: 'no-compose' };
  }
  const problem = dockerProblem(env);
  if (problem) {
    return { kind: 'no-docker', reason: problem };
  }
  const running = runningServices(root, env);
  const services = devServices(env);
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
      const child = spawn('docker', ['compose', '-f', join(root, COMPOSE_FILE), 'up', '-d', '--wait', ...toStart.map((s) => s.name)], {
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

/** `docker compose <args>` on compose.yaml with the terminal attached; resolves with its exit code. */
export function runCompose(root: string, args: string[]): Promise<number> {
  return new Promise((done, fail) => {
    const child = spawn('docker', ['compose', '-f', join(root, COMPOSE_FILE), ...args], { cwd: root, stdio: 'inherit' });
    child.on('error', fail);
    child.on('exit', (code) => done(code ?? 1));
  });
}
