import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** The Nx workspace root: the nearest folder with an nx.json. */
export function findWorkspaceRoot(from: string = process.cwd()): string {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, 'nx.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`No Nx workspace (nx.json) found from ${from}.`);
    dir = parent;
  }
}

function nxBin(root: string) {
  const bin = join(root, 'node_modules', '.bin', 'nx');
  if (!existsSync(bin)) throw new Error(`${bin} not found: run pnpm install first.`);
  return bin;
}

/**
 * Runs `nx <args>` in the workspace with the terminal attached, and
 * resolves with its exit code. Ctrl+C reaches Nx, which stops its tasks.
 */
export function runNx(root: string, args: string[]): Promise<number> {
  return new Promise((done, fail) => {
    const child = spawn(nxBin(root), args, { cwd: root, stdio: 'inherit' });
    child.on('error', fail);
    child.on('exit', (code, signal) => done(code ?? (signal ? 1 : 0)));
  });
}

/** The workspace's projects (optionally only those with `target`). */
export function listProjects(root: string, target?: string): string[] {
  const args = ['show', 'projects', '--json', ...(target ? ['--with-target', target] : [])];
  const result = spawnSync(nxBin(root), args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`nx ${args.join(' ')} failed:\n${result.stderr}`);
  return (JSON.parse(result.stdout) as string[]).sort();
}
