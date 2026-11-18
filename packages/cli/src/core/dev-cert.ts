import { spawnSync } from 'node:child_process';
import { X509Certificate } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEV_DOMAIN } from './dev-proxy.ts';

/*
 * The dev proxy's certificate, from mkcert (https://github.com/FiloSottile/mkcert)
 * when it's installed, as Drizzle Studio does: a local CA the system and
 * the browsers trust (`mkcert -install`, once), and one certificate for
 * *.dafne.localhost kept between runs. Without mkcert, the proxy stays
 * on HTTP.
 */

/** What the certificate covers: every app's host, and the loopback. */
const NAMES = [`*.${DEV_DOMAIN}`, DEV_DOMAIN, 'localhost', '127.0.0.1', '::1'];
/** A certificate is renewed when it has less than this left. */
const RENEW_BEFORE_MS = 30 * 24 * 60 * 60 * 1000;

export interface DevCert {
  key: string;
  cert: string;
  /** Where the files are. */
  dir: string;
  /** True when this run created it (the first run, or a renewal). */
  created: boolean;
}

/** The CLI's data folder, by platform (like env-paths). */
export function dataDir(): string {
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'dafne');
  }
  if (process.platform === 'win32') {
    return join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'dafne');
  }
  return join(process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share'), 'dafne');
}

function mkcert(args: string[], cwd?: string) {
  return spawnSync('mkcert', args, { cwd, encoding: 'utf8' });
}

/** Whether `cert` is valid long enough, for every name, from the CA at `caRoot`. */
function isUsable(cert: string, caRoot: string): boolean {
  try {
    const x509 = new X509Certificate(cert);
    const ca = new X509Certificate(readFileSync(join(caRoot, 'rootCA.pem')));
    const names = (x509.subjectAltName ?? '').split(', ');
    return (
      x509.checkIssued(ca) &&
      new Date(x509.validTo).getTime() - Date.now() > RENEW_BEFORE_MS &&
      // The host names (Node writes IPv6 addresses in full: not compared).
      NAMES.filter((name) => /[a-z]/.test(name)).every((name) => names.includes(`DNS:${name}`))
    );
  } catch {
    return false;
  }
}

/**
 * The certificate of the dev proxy, created with mkcert when missing,
 * expiring or from another CA. Null without mkcert.
 */
export function devCert(dir = join(dataDir(), 'certs')): DevCert | null {
  const caRoot = mkcert(['-CAROOT']);
  if (caRoot.error || caRoot.status !== 0) {
    return null;
  }
  const certFile = join(dir, 'dev.pem');
  const keyFile = join(dir, 'dev-key.pem');
  const root = caRoot.stdout.trim();
  if (existsSync(certFile) && existsSync(keyFile) && isUsable(readFileSync(certFile, 'utf8'), root)) {
    return { key: readFileSync(keyFile, 'utf8'), cert: readFileSync(certFile, 'utf8'), dir, created: false };
  }
  mkdirSync(dir, { recursive: true });
  const made = mkcert(['-cert-file', certFile, '-key-file', keyFile, ...NAMES], dir);
  if (made.status !== 0) {
    throw new Error(`mkcert couldn't create the dev certificate:\n${made.stderr}`);
  }
  return { key: readFileSync(keyFile, 'utf8'), cert: readFileSync(certFile, 'utf8'), dir, created: true };
}
