import * as p from '@clack/prompts';
import { Command, Option } from 'commander';
import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { styleText } from 'node:util';
import { findRoot } from '../core/workspace.js';
import { BACKEND } from '../wiring/backend.js';
import { FRONTEND } from '../wiring/frontend.js';

/*
 * `dafne-old dev`: package scripts of the backend and the frontend, as child
 * processes of this terminal. One package gets the terminal as it is; two
 * run side by side, each output line prefixed with its package.
 */

export const PACKAGES = ['backend', 'frontend'] as const;
export type Package = (typeof PACKAGES)[number];

/** Each package's folder under the root. */
const DIRS: Record<Package, string> = { backend: BACKEND, frontend: FRONTEND };

interface RunOptions {
  backend?: string;
  frontend?: string;
  only?: Package;
  pick?: boolean;
  root?: string;
  yes?: boolean;
}

/** The scripts in the package's package.json. */
function scriptsOf(root: string, pkg: Package): string[] {
  const json = JSON.parse(readFileSync(join(root, DIRS[pkg], 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
  return Object.keys(json.scripts ?? {});
}

/**
 * The script for each package: --backend/--frontend, else the argument,
 * else `picked` (asked with --pick), else dev. Fails on a script the package
 * doesn't have.
 */
export function resolveScripts(
  available: Record<Package, string[]>,
  script: string | undefined,
  options: Pick<RunOptions, 'backend' | 'frontend' | 'only'>,
  picked: Partial<Record<Package, string>> = {},
): [Package, string][] {
  return (options.only ? [options.only] : PACKAGES).map((pkg) => {
    const chosen = options[pkg] ?? script ?? picked[pkg] ?? 'dev';
    if (!available[pkg].includes(chosen))
      throw new Error(`${DIRS[pkg]}/package.json has no "${chosen}" script; it has: ${available[pkg].join(', ')}.`);
    return [pkg, chosen];
  });
}

async function pickScripts(available: Record<Package, string[]>, packages: readonly Package[]) {
  const picked: Partial<Record<Package, string>> = {};
  for (const pkg of packages) {
    const answer = await p.select({
      message: `Script for ${pkg}`,
      initialValue: available[pkg].includes('dev') ? 'dev' : available[pkg][0],
      options: available[pkg].map((value) => ({ value, label: value })),
    });
    if (p.isCancel(answer)) {
      p.cancel('Nothing started.');
      process.exit(1);
    }
    picked[pkg] = answer;
  }
  return picked;
}

const COLORS = { backend: 'magenta', frontend: 'cyan' } as const;

/** Copies a stream to `out` line by line, each line after `prefix`. */
function prefixLines(stream: NodeJS.ReadableStream, out: NodeJS.WriteStream, prefix: string) {
  createInterface({ input: stream, crlfDelay: Infinity }).on('line', (line) => out.write(`${prefix} ${line}\n`));
}

/**
 * Runs the scripts and resolves with the exit code: the first failure's,
 * else 0. Ctrl+C stops them all.
 */
function runScripts(root: string, runs: [Package, string][]): Promise<number> {
  const together = runs.length > 1;
  const width = Math.max(...runs.map(([pkg]) => pkg.length));
  const children: ChildProcess[] = [];
  let stopping = false;

  // Each child leads its own process group, so stopping it also stops what
  // it started (nest --watch, next dev…).
  const stopAll = (signal: NodeJS.Signals) => {
    stopping = true;
    for (const child of children)
      if (child.exitCode === null && child.pid)
        try {
          process.kill(-child.pid, signal);
        } catch {
          // Already gone.
        }
  };
  const onSignal = (signal: NodeJS.Signals) => () => stopAll(signal);
  const onInt = onSignal('SIGINT');
  const onTerm = onSignal('SIGTERM');
  process.on('SIGINT', onInt);
  process.on('SIGTERM', onTerm);

  return new Promise((resolve) => {
    let running = runs.length;
    let code = 0;
    for (const [pkg, script] of runs) {
      const prefix = styleText(COLORS[pkg], `[${pkg.padEnd(width)}]`);
      const child = spawn('pnpm', ['run', script], {
        cwd: join(root, DIRS[pkg]),
        // One script keeps the terminal (colors, prompts); two share it.
        stdio: together ? ['ignore', 'pipe', 'pipe'] : 'inherit',
        env: together ? { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? (process.stdout.isTTY ? '1' : '0') } : process.env,
        detached: process.platform !== 'win32',
        shell: process.platform === 'win32',
      });
      children.push(child);
      if (together) {
        prefixLines(child.stdout!, process.stdout, prefix);
        prefixLines(child.stderr!, process.stderr, prefix);
      }
      child.on('error', (error) => {
        process.stderr.write(`${prefix} ${error.message}\n`);
        child.emit('exit', 1, null);
      });
      child.once('exit', (exitCode, signal) => {
        const failed = exitCode !== 0 && !stopping;
        if (together || failed)
          process.stderr.write(
            `${prefix} ${signal ? `stopped (${signal})` : `exited with code ${exitCode}`}${failed && together ? '; stopping the others' : ''}\n`,
          );
        if (failed) {
          code ||= exitCode ?? 1;
          // A crashed dev server isn't worth keeping the other one for.
          stopAll('SIGTERM');
        }
        if (--running === 0) {
          process.off('SIGINT', onInt);
          process.off('SIGTERM', onTerm);
          resolve(code);
        }
      });
    }
  });
}

export function devCommand() {
  return new Command('dev')
    .description('Run a package script (default: dev) in apps/api/ and apps/frontend/, in this terminal')
    .argument('[script]', 'the script for both packages (default: dev)')
    .option('-b, --backend <script>', 'the script for the backend')
    .option('-f, --frontend <script>', 'the script for the frontend')
    .addOption(new Option('--only <package>', 'run in one package only').choices(PACKAGES))
    .option('-p, --pick', "choose each package's script from its package.json")
    .option('--root <dir>', 'Dafne folder (with apps/api/ and apps/frontend/)')
    .option('-y, --yes', 'never prompt')
    .addHelpText(
      'after',
      `
Both packages run side by side, each output line prefixed with [backend] or
[frontend]; with --only, the script has the terminal to itself. Ctrl+C stops
everything; if one script fails, the other is stopped too.

Examples:
  dafne-old dev                          # pnpm run dev in both
  dafne-old dev build                    # pnpm run build in both
  dafne-old dev -b start:debug           # start:debug in the backend, dev in the frontend
  dafne-old dev test --only backend
  dafne-old dev --pick                   # choose from each package.json`,
    )
    .action(async (script: string | undefined, options: RunOptions) => {
      const root = findRoot(options.root);
      const packages = options.only ? [options.only] : PACKAGES;
      const available = Object.fromEntries(PACKAGES.map((pkg) => [pkg, scriptsOf(root, pkg)])) as Record<Package, string[]>;
      let picked: Partial<Record<Package, string>> = {};
      if (options.pick) {
        if (options.yes || !process.stdin.isTTY) throw new Error('--pick needs a terminal to ask in.');
        // Only what the arguments leave open.
        picked = await pickScripts(available, packages.filter((pkg) => !options[pkg] && !script));
      }
      const runs = resolveScripts(available, script, options, picked);
      p.log.step(runs.map(([pkg, name]) => `${pkg}: pnpm run ${name}`).join('\n'));
      process.exitCode = await runScripts(root, runs);
    });
}
