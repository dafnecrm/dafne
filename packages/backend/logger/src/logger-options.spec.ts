import type { IncomingMessage } from 'node:http';
import type { Options } from 'pino-http';
import type { TransportMultiOptions, TransportTargetOptions } from 'pino';
import { loggerOptions, REDACTED_PATHS } from './logger-options.js';

function http(env: NodeJS.ProcessEnv) {
  return loggerOptions('sales', env).pinoHttp as Options;
}

function targets(env: NodeJS.ProcessEnv) {
  return (http(env).transport as TransportMultiOptions).targets as TransportTargetOptions[];
}

describe('loggerOptions', () => {
  it('logs readable lines at debug in development', () => {
    expect(http({}).level).toBe('debug');
    const [console] = targets({});
    expect(console.target).toMatch(/pino-pretty/);
    expect(console.level).toBe('debug');
  });

  it('logs JSON to stdout at info in production', () => {
    expect(http({ NODE_ENV: 'production' }).level).toBe('info');
    expect(targets({ NODE_ENV: 'production' })).toEqual([
      { target: 'pino/file', level: 'info', options: { destination: 1 } },
    ]);
  });

  it('follows LOG_LEVEL and LOG_PRETTY', () => {
    const env = { LOG_LEVEL: 'warn', LOG_PRETTY: 'false' };
    expect(http(env).level).toBe('warn');
    expect(targets(env)).toEqual([{ target: 'pino/file', level: 'warn', options: { destination: 1 } }]);
  });

  it('adds a rotated file with LOG_FILE, at its own level', () => {
    const env = { NODE_ENV: 'production', LOG_FILE: 'logs/sales.log', LOG_FILE_LEVEL: 'debug', LOG_FILE_SIZE: '50m' };
    const file = targets(env)[1];
    expect(file.target).toMatch(/pino-roll/);
    expect(file.level).toBe('debug');
    expect(file.options).toMatchObject({ file: 'logs/sales.log', frequency: 'daily', size: '50m', limit: { count: 7 }, mkdir: true });
    // pino itself lets the lowest of the two through.
    expect(http(env).level).toBe('debug');
  });

  it('takes a numeric LOG_FILE_FREQUENCY as milliseconds', () => {
    const file = targets({ LOG_FILE: 'x.log', LOG_FILE_FREQUENCY: '60000' })[1];
    expect(file.options).toMatchObject({ frequency: 60000 });
  });

  it('names the app, redacts secrets and adds the signed-in user', () => {
    const options = http({});
    expect(options.base).toEqual({ app: 'sales' });
    expect(options.redact).toEqual({ paths: REDACTED_PATHS, censor: '[redacted]' });
    const customProps = options.customProps as (req: IncomingMessage) => object;
    expect(customProps({ user: { id: 'u1' } } as unknown as IncomingMessage)).toEqual({ userId: 'u1' });
    expect(customProps({} as IncomingMessage)).toEqual({});
  });

  it('logs failed requests as warn (4xx) or error (5xx)', () => {
    const level = http({}).customLogLevel as (req: unknown, res: { statusCode: number }, err?: Error) => string;
    expect(level({}, { statusCode: 200 })).toBe('info');
    expect(level({}, { statusCode: 404 })).toBe('warn');
    expect(level({}, { statusCode: 503 })).toBe('error');
    expect(level({}, { statusCode: 200 }, new Error('x'))).toBe('error');
  });
});
