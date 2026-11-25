export * from './logger.module.js';
export * from './logger-options.js';
// Structured logging in a service: @InjectPinoLogger(MyService.name) logger: PinoLogger.
export { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
