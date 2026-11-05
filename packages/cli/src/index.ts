#!/usr/bin/env node
import * as p from '@clack/prompts';
import { Command } from 'commander';
import { dbCommand } from './commands/db.ts';
import { generateCommand } from './commands/generate.ts';
import { taskCommands } from './commands/tasks.ts';

const program = new Command('dafne')
  .description('Dafne CLI: generators (Nx), database migrations and shortcuts for Nx tasks.')
  .version('0.2.0')
  .addCommand(generateCommand())
  .addCommand(dbCommand());
for (const command of taskCommands()) program.addCommand(command);

try {
  await program.parseAsync();
} catch (error) {
  p.log.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
