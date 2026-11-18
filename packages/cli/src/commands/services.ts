import { Command } from 'commander';
import { runCompose } from '../core/dev-services.ts';
import { findWorkspaceRoot } from '../core/nx.ts';

/*
 * `dafne services …`: the development services of compose.yaml
 * (PostgreSQL, Redis), which `dafne dev` starts by itself. Thin wrappers
 * of `docker compose` on that file, from any folder of the workspace.
 */

async function compose(args: string[]) {
  process.exitCode = await runCompose(findWorkspaceRoot(), args);
}

export function servicesCommand() {
  const services = new Command('services').description(
    'PostgreSQL and Redis for development (compose.yaml): dafne dev starts them',
  );
  services
    .command('up')
    .description('Start them, and wait until they are healthy')
    .action(() => compose(['up', '-d', '--wait']));
  services
    .command('down')
    .description('Stop them (the data stays in the volumes)')
    .option('-v, --volumes', 'also delete the data')
    .action((options: { volumes?: boolean }) => compose(['down', ...(options.volumes ? ['-v'] : [])]));
  services
    .command('status')
    .description('Show them, with their ports and health')
    .action(() => compose(['ps']));
  services
    .command('logs')
    .description('Follow their logs')
    .argument('[service]', 'db or redis; none: both')
    .action((service?: string) => compose(['logs', '-f', ...(service ? [service] : [])]));
  return services;
}
