import { spawnSync } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devCert } from '../src/core/dev-cert.ts';

const hasMkcert = !spawnSync('mkcert', ['-CAROOT']).error;

describe.skipIf(!hasMkcert)('devCert', () => {
  it('creates a certificate for *.dafne.localhost once, then reuses it', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'dafne-devcert-')), 'certs');
    const first = devCert(dir);
    expect(first?.created).toBe(true);
    expect(new X509Certificate(first?.cert ?? '').subjectAltName).toContain('DNS:*.dafne.localhost');
    const second = devCert(dir);
    expect(second).toMatchObject({ created: false, cert: first?.cert });
  });
});
