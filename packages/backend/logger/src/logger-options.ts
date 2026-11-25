import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { IncomingMessage } from 'node:http';
import type { Params } from 'nestjs-pino';
import { levels, type LevelWithSilent, type TransportTargetOptions } from 'pino';

/**
 * Paths pino masks in every log line: the session cookie, tokens and
 * passwords never reach the console, the files or Grafana.
 */
export const REDACTED_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.secret',
];

/**
 * Where a transport (pino-pretty, pino-roll) is loaded from: pino starts it
 * in a worker thread and resolves its name from its own folder, where pnpm
 * doesn't link it. The app lists them in its package.json (rspack leaves npm
 * packages external), so they resolve from the running script (the app's
 * dist/main.js), else from the cwd. Not import.meta.url: rspack bakes in
 * the source file's path.
 */
export function transportTarget(name: string): string {
  const from = [process.argv[1], join(process.cwd(), 'package.json')].filter(Boolean);
  for (const file of from) {
    try {
      return createRequire(pathToFileURL(file)).resolve(name);
    } catch {
      // Next place.
    }
  }
  return name;
}

function lowest(...names: string[]): LevelWithSilent {
  return names.reduce((a, b) => (levels.values[a] <= levels.values[b] ? a : b)) as LevelWithSilent;
}

function flag(value: string | undefined, fallback: boolean) {
  return value === undefined || value === '' ? fallback : value === 'true';
}

/**
 * nestjs-pino's options for an app, from the environment:
 *
 * - LOG_LEVEL: trace | debug | info | warn | error | fatal | silent
 *   (default debug, info with NODE_ENV=production);
 * - LOG_PRETTY: true prints readable lines (pino-pretty), false JSON
 *   (default true, false with NODE_ENV=production);
 * - LOG_FILE: also writes JSON to this file, rotated by pino-roll
 *   (LOG_FILE_LEVEL, LOG_FILE_FREQUENCY daily | hourly | ms,
 *   LOG_FILE_SIZE e.g. 10m, LOG_FILE_COUNT files kept, default 7).
 *
 * Logs reach Grafana (Loki) through OpenTelemetry (@dafne/backend-telemetry),
 * not through a transport here.
 */
export function loggerOptions(app: string, env: NodeJS.ProcessEnv = process.env): Params {
  const production = env.NODE_ENV === 'production';
  const level = (env.LOG_LEVEL || (production ? 'info' : 'debug')) as LevelWithSilent;
  const targets: TransportTargetOptions[] = [
    flag(env.LOG_PRETTY, !production)
      ? {
          target: transportTarget('pino-pretty'),
          level,
          options: { colorize: true, singleLine: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname,app' },
        }
      : { target: 'pino/file', level, options: { destination: 1 } },
  ];
  const fileLevel = (env.LOG_FILE_LEVEL || level) as LevelWithSilent;
  if (env.LOG_FILE) {
    targets.push({
      target: transportTarget('pino-roll'),
      level: fileLevel,
      options: {
        file: env.LOG_FILE,
        frequency: Number(env.LOG_FILE_FREQUENCY) || env.LOG_FILE_FREQUENCY || 'daily',
        size: env.LOG_FILE_SIZE || '10m',
        limit: { count: Number(env.LOG_FILE_COUNT) || 7 },
        mkdir: true,
      },
    });
  }

  return {
    pinoHttp: {
      // pino drops what's below its own level before any target sees it.
      level: env.LOG_FILE ? lowest(level, fileLevel) : level,
      base: { app },
      redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
      // Failed requests stand out: 5xx (or a thrown error) as error, 4xx as warn.
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) {
          return 'error';
        }
        return res.statusCode >= 400 ? 'warn' : 'info';
      },
      // The signed-in user (SessionGuard's request.user), once known.
      customProps: (req: IncomingMessage) => {
        const user = (req as IncomingMessage & { user?: { id?: string } }).user;
        return user?.id ? { userId: user.id } : {};
      },
      transport: { targets },
    },
  };
}
