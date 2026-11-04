import * as p from '@clack/prompts';
import { Command } from 'commander';
import { generateCommand } from './commands/generate.js';
import { fieldCommand } from './commands/field.js';
import { migrationCommand } from './commands/migration.js';
import { devCommand } from './commands/dev.js';
import { syncCommand } from './commands/sync.js';

const program = new Command('dafne')
  .description('Dafne code generator for the backend (NestJS) and the frontend (Next.js)')
  .version('0.1.0')
  .addCommand(generateCommand())
  .addCommand(fieldCommand())
  .addCommand(migrationCommand())
  .addCommand(syncCommand())
  .addCommand(devCommand());

try {
  await program.parseAsync();
} catch (error) {
  p.log.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
