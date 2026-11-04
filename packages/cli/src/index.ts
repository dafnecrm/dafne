#!/usr/bin/env node
import * as p from '@clack/prompts';
import { Command } from 'commander';
import { generateCommand } from './commands/generate.ts';
import { taskCommands } from './commands/tasks.ts';

const program = new Command('dafne')
  .description('Dafne CLI: backend generators (Nx) and shortcuts for Nx tasks. Frontend, sync, field and migration: dafne-old.')
  .version('0.2.0')
  .addCommand(generateCommand());
for (const command of taskCommands()) program.addCommand(command);

try {
  await program.parseAsync();
} catch (error) {
  p.log.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
