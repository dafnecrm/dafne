import { Command } from 'commander';
import { runCompose, wantsTelemetry } from '../core/dev-services.ts';
import { findWorkspaceRoot } from '../core/nx.ts';

/*
 * `dafne services …`: the development services of compose.yaml
 * (PostgreSQL, Redis, Gotenberg; the Grafana stack, otel and alloy, is the
 * opt-in `telemetry` profile), which `dafne dev` starts by itself. Thin
 * wrappers of `docker compose` on that file, from any folder of the
 * workspace. down, status and logs always include the profile, so they
 * reach the Grafana stack when it runs.
 */

async function compose(args: string[], telemetry = true) {
  process.exitCode = await runCompose(findWorkspaceRoot(), args, { telemetry });
}

export function servicesCommand() {
  const services = new Command('services').description(
    'PostgreSQL, Redis and Gotenberg for development (compose.yaml), the Grafana stack with --telemetry: dafne dev starts them',
  );
  services
    .command('up')
    .description('Start them, and wait until they are healthy')
    .option('--telemetry', 'also the Grafana stack (otel, alloy; or DAFNE_TELEMETRY=true)')
    .action((options: { telemetry?: boolean }) => compose(['up', '-d', '--wait'], wantsTelemetry(options)));
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
    .argument('[service]', 'db, redis, gotenberg, otel or alloy; none: all')
    .action((service?: string) => compose(['logs', '-f', ...(service ? [service] : [])]));
  return services;
}
