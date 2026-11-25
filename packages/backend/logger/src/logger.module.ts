import { type DynamicModule, type INestApplication, Module } from '@nestjs/common';
import { Logger, LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { loggerOptions } from './logger-options.js';

export interface LoggerModuleOptions {
  /** The app's name, in every log line (`app`), e.g. sales. */
  app: string;
}

/**
 * The app's logger (pino, through nestjs-pino): one line per request, with
 * its id, status and duration, and every Nest `Logger` of the libs in the
 * same stream, configured by LOG_* (see loggerOptions). Import it once, in
 * the app's root module, then call useAppLogger(app) in main.ts.
 */
@Module({})
export class LoggerModule {
  static forRoot({ app }: LoggerModuleOptions): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        // A factory: LOG_* are read once ConfigModule has loaded .env.
        PinoLoggerModule.forRootAsync({ useFactory: () => loggerOptions(app) }),
      ],
      exports: [PinoLoggerModule],
    };
  }
}

/**
 * Makes pino the app's logger: Nest's own lines and every `new Logger(…)`.
 * Create the app with `bufferLogs: true`, so the lines written before this
 * call go through it too.
 */
export function useAppLogger(app: INestApplication) {
  app.useLogger(app.get(Logger));
}
