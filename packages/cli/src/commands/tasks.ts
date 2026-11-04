import * as p from '@clack/prompts';
import { Command } from 'commander';
import { findWorkspaceRoot, listProjects, runNx } from '../core/nx.ts';
import { cancelled } from './field-prompts.ts';

/*
 * Shortcuts for Nx tasks: `dafne dev`, `dafne test`… run `nx run-many`
 * over the given projects (with their dependencies, as Nx does), with the
 * terminal attached.
 */

/** What `dafne dev` starts without projects. */
const DEV_DEFAULT = ['@dafne/api', '@dafne/frontend'];

interface TaskOptions {
  pick?: boolean;
  skipNxCache?: boolean;
}

/** Projects to run: the arguments, else picked from those with the target (--pick), else `fallback`. */
async function projectsFor(root: string, target: string, given: string[], options: TaskOptions, fallback: string[]) {
  if (given.length || !options.pick) return given.length ? given : fallback;
  const available = listProjects(root, target);
  if (!available.length) throw new Error(`No project has a "${target}" target.`);
  return cancelled<string[]>(
    await p.multiselect<string>({
      message: `Projects to ${target} (space to toggle, enter to confirm)`,
      options: available.map((value) => ({ value, label: value })),
      initialValues: fallback.filter((project) => available.includes(project)),
      required: true,
    }),
  );
}

async function runTarget(target: string, projects: string[], options: TaskOptions, fallback: string[] = []) {
  const root = findWorkspaceRoot();
  const chosen = await projectsFor(root, target, projects, options, fallback);
  const args = ['run-many', '-t', target, ...(chosen.length ? ['-p', chosen.join(',')] : [])];
  if (options.skipNxCache) args.push('--skip-nx-cache');
  process.exitCode = await runNx(root, args);
}

function taskCommand(name: string, description: string, fallback: string[] = []) {
  return new Command(name)
    .description(description)
    .argument('[projects...]', `projects (e.g. @dafne/api); none: ${fallback.length ? fallback.join(', ') : 'every project'}`)
    .option('--pick', 'choose the projects from those with the target')
    .option('--skip-nx-cache', 'run even what is cached')
    .action((projects: string[], options: TaskOptions) => runTarget(name, projects, options, fallback));
}

export function taskCommands(): Command[] {
  return [
    taskCommand('dev', 'Start projects in watch mode (their "dev" script)', DEV_DEFAULT),
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
        for (const project of listProjects(findWorkspaceRoot(), options.target)) console.log(project);
      }),
  ];
}
