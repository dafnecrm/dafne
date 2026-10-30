import { resolveScripts } from '../src/commands/run.js';

const available = {
  backend: ['dev', 'build', 'start:debug', 'test'],
  frontend: ['dev', 'build', 'lint'],
};

describe('resolveScripts', () => {
  it('runs dev in both by default', () => {
    expect(resolveScripts(available, undefined, {})).toEqual([
      ['backend', 'dev'],
      ['frontend', 'dev'],
    ]);
  });

  it('takes the argument for both, and --backend/--frontend over it', () => {
    expect(resolveScripts(available, 'build', {})).toEqual([
      ['backend', 'build'],
      ['frontend', 'build'],
    ]);
    expect(resolveScripts(available, undefined, { backend: 'start:debug' })).toEqual([
      ['backend', 'start:debug'],
      ['frontend', 'dev'],
    ]);
  });

  it('runs one package with --only, and uses what was picked', () => {
    expect(resolveScripts(available, 'test', { only: 'backend' })).toEqual([['backend', 'test']]);
    expect(resolveScripts(available, undefined, {}, { frontend: 'lint' })).toEqual([
      ['backend', 'dev'],
      ['frontend', 'lint'],
    ]);
  });

  it('fails on a script the package lacks', () => {
    expect(() => resolveScripts(available, 'test', {})).toThrow(/frontend\/package.json has no "test" script; it has: dev, build, lint/);
  });
});
