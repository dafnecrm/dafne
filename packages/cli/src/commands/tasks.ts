import * as p from '@clack/prompts';
import { Command } from 'commander';
import { devCert } from '../core/dev-cert.ts';
import { devRoutes, startDevProxy, type DevProxy } from '../core/dev-proxy.ts';
import { startServices, wantsTelemetry } from '../core/dev-services.ts';
import { findWorkspaceRoot, listProjects, runNx } from '../core/nx.ts';
import { cancelled } from './field-prompts.ts';

/*
 * Shortcuts for Nx tasks: `dafne dev`, `dafne test`… run `nx run-many`
 * over the given projects (with their dependencies, as Nx does), with the
 * terminal attached.
 */

/** What `dafne dev` starts without projects. */
const DEV_DEFAULT = ['@dafne/auth', '@dafne/sales-api', '@dafne/sales-web'];

interface TaskOptions {
  pick?: boolean;
  skipNxCache?: boolean;
}

interface DevOptions extends TaskOptions {
  /** false with --no-proxy. */
  proxy: boolean;
  /** false with --no-https. */
  https: boolean;
  /** false with --no-services. */
  services: boolean;
  /** --telemetry: also the Grafana stack (otel, alloy). */
  telemetry?: boolean;
}

/**
 * The services of compose.yaml (PostgreSQL, Redis, Gotenberg; the Grafana
 * stack with --telemetry or DAFNE_TELEMETRY=true), before the apps and the
 * migrations they run first. Never fatal: without Docker, or with a port
 * taken by another server, the apps use what their .env points to.
 */
async function devServicesUp(root: string, options: DevOptions) {
  const telemetry = wantsTelemetry(options);
  const spinner = p.spinner();
  spinner.start(`Starting the services${telemetry ? ' and the Grafana stack' : ''} (compose.yaml)`);
  const outcome = await startServices(root, process.env, { telemetry });
  if (outcome.kind === 'no-compose') {
    spinner.stop('No compose.yaml: services left as they are.');
  } else if (outcome.kind === 'no-docker') {
    spinner.stop(`${outcome.reason}: the apps use the database and Redis of their .env (start Docker, or --no-services).`);
  } else if (outcome.kind === 'failed') {
    spinner.stop("docker compose couldn't start the services:");
    p.log.warn(outcome.output);
  } else {
    const used = outcome.running.map((service) => `${service.host}:${service.port}`);
    const others = outcome.elsewhere.map((service) => `${service.name} (port ${service.port} is another server's)`);
    spinner.stop(
      [used.length ? `Services: ${used.join(', ')}` : '', others.length ? `Not started: ${others.join(', ')}` : '']
        .filter(Boolean)
        .join('. '),
    );
  }
}

/** The proxy's certificate (mkcert), or undefined for HTTP: --no-https, or no mkcert. */
function devTls(options: DevOptions) {
  if (!options.https) {
    return undefined;
  }
  const cert = devCert();
  if (!cert) {
    p.log.info('HTTP only: install mkcert (https://github.com/FiloSottile/mkcert) for https://<app>.dafne.localhost.');
    return undefined;
  }
  if (cert.created) {
    p.log.info(`Dev certificate created with mkcert in ${cert.dir}. If the browser warns about it, run \`mkcert -install\` once.`);
  }
  return { key: cert.key, cert: cert.cert };
}

/** Projects to run: the arguments, else picked from those with the target (--pick), else `fallback`. */
async function projectsFor(root: string, target: string, given: string[], options: TaskOptions, fallback: string[]) {
  if (given.length || !options.pick) {
    return given.length ? given : fallback;
  }
  const available = listProjects(root, target);
  if (!available.length) {
    throw new Error(`No project has a "${target}" target.`);
  }
  return cancelled<string[]>(
    await p.multiselect<string>({
      message: `Projects to ${target} (space to toggle, enter to confirm)`,
      options: available.map((value) => ({ value, label: value })),
      initialValues: fallback.filter((project) => available.includes(project)),
      required: true,
    }),
  );
}

function runManyArgs(target: string, chosen: string[], options: TaskOptions) {
  const args = ['run-many', '-t', target, ...(chosen.length ? ['-p', chosen.join(',')] : [])];
  if (options.skipNxCache) {
    args.push('--skip-nx-cache');
  }
  return args;
}

async function runTarget(target: string, projects: string[], options: TaskOptions, fallback: string[] = []) {
  const root = findWorkspaceRoot();
  const chosen = await projectsFor(root, target, projects, options, fallback);
  process.exitCode = await runNx(root, runManyArgs(target, chosen, options));
}

/** The proxy's port from DAFNE_PROXY_PORT (fixed), else undefined (80, then 8080…). */
function proxyPort(): number | undefined {
  const value = process.env.DAFNE_PROXY_PORT;
  if (!value) {
    return undefined;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`DAFNE_PROXY_PORT must be a port number, not "${value}".`);
  }
  return port;
}

/**
 * `dafne dev`: the dev proxy (https://<app>.dafne.localhost with mkcert,
 * else http://, see core/dev-proxy.ts), then the projects' "dev" scripts.
 * The apps get the hosts served in DEV_AUTH_ALLOWED_HOSTS (apps/auth
 * trusts them).
 */
async function runDev(projects: string[], options: DevOptions) {
  const root = findWorkspaceRoot();
  const chosen = await projectsFor(root, 'dev', projects, options, DEV_DEFAULT);
  if (options.services) {
    await devServicesUp(root, options);
  }
  const routes = options.proxy ? devRoutes(root, chosen) : [];
  let proxy: DevProxy | undefined;
  /**
   * The apps' URLs, before Nx starts. Its terminal UI covers them while
   * the apps run: the proxy's index page lists them too.
   */
  const showUrls = () => {
    if (!proxy) {
      return;
    }
    const lines = routes.map((route, i) => `${route.project.padEnd(20)} ${proxy?.urls[i]}`);
    lines.push('', `All running apps: ${proxy.indexUrl}`);
    const redirect = proxy.redirectPort ? `, ${proxy.redirectPort} → https` : '';
    const how = proxy.joined
      ? `added to the dafne dev proxy on port ${proxy.port}`
      : `dev proxy on port ${proxy.port}${redirect}`;
    p.note(lines.join('\n'), `Dafne apps (${how})`);
  };
  if (routes.length) {
    proxy = await startDevProxy(routes, { port: proxyPort(), tls: devTls(options) });
    showUrls();
  }
  const env: Record<string, string> = proxy ? { DEV_AUTH_ALLOWED_HOSTS: proxy.hosts.join(',') } : {};
  // Ctrl+C reaches Nx too: wait for it to stop, then close the proxy.
  const ignore = () => undefined;
  process.on('SIGINT', ignore);
  try {
    process.exitCode = await runNx(root, runManyArgs('dev', chosen, options), env);
  } finally {
    process.off('SIGINT', ignore);
    await proxy?.close();
  }
}

function taskCommand(name: string, description: string, fallback: string[] = []) {
  return new Command(name)
    .description(description)
    .argument('[projects...]', `projects (e.g. @dafne/sales-api); none: ${fallback.length ? fallback.join(', ') : 'every project'}`)
    .option('--pick', 'choose the projects from those with the target')
    .option('--skip-nx-cache', 'run even what is cached')
    .action((projects: string[], options: TaskOptions) => runTarget(name, projects, options, fallback));
}

export function taskCommands(): Command[] {
  return [
    new Command('dev')
      .description('Start PostgreSQL, Redis and Gotenberg (compose.yaml), then projects in watch mode (their "dev" script), at https://<app>.dafne.localhost')
      .argument('[projects...]', `projects (e.g. @dafne/sales-api); none: ${DEV_DEFAULT.join(', ')}`)
      .option('--pick', 'choose the projects from those with the target')
      .option('--skip-nx-cache', 'run even what is cached')
      .option('--no-proxy', 'no dev proxy: the apps only on localhost:<port>')
      .option('--no-https', 'the dev proxy on plain HTTP, even with mkcert')
      .option('--no-services', "don't start the services of compose.yaml")
      .option('--telemetry', 'also start the Grafana stack (otel, alloy; or DAFNE_TELEMETRY=true)')
      .action((projects: string[], options: DevOptions) => runDev(projects, options)),
    taskCommand('test', 'Run the tests'),
    taskCommand('build', 'Build'),
    taskCommand('lint', 'Lint'),
    taskCommand('typecheck', 'Type-check'),
    new Command('run')
      .description('Run any target: dafne run <target> [projects...]')
      .argument('<target>', 'a package.json script or an inferred target, e.g. test:e2e')
      .argument('[projects...]', 'projects; none: every project that has the target')
      .option('--pick', 'choose the projects from those with the target')
      .option('--skip-nx-cache', 'run even what is cached')
      .action((target: string, projects: string[], options: TaskOptions) => runTarget(target, projects, options)),
    new Command('affected')
      .description('lint, typecheck, test and build what changed (as CI does)')
      .argument('[targets...]', 'targets (default: lint typecheck test build)')
      .action(async (targets: string[]) => {
        const chosen = targets.length ? targets : ['lint', 'typecheck', 'test', 'build'];
        process.exitCode = await runNx(findWorkspaceRoot(), ['affected', '-t', ...chosen]);
      }),
    new Command('projects')
      .description('List the workspace projects (optionally those with a target)')
      .option('-t, --target <target>', 'only projects with this target')
      .action((options: { target?: string }) => {
        for (const project of listProjects(findWorkspaceRoot(), options.target)) {
          console.log(project);
        }
      }),
  ];
}
