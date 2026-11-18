import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import * as https from 'node:https';
import { connect, type Socket } from 'node:net';
import { join } from 'node:path';

/*
 * The dev proxy of `dafne dev`: https://<host>.dafne.localhost (with a
 * certificate, see dev-cert.ts; else http://) → the app's port.
 * *.localhost resolves to the loopback by itself (RFC 6761: browsers,
 * macOS, Node), so no hosts file. Each app declares its host in its
 * package.json: "dafne": { "dev": { "host", "port" } }. TLS ends here: the
 * apps get plain HTTP, with X-Forwarded-Proto.
 */

/** The parent domain of the dev hosts. */
export const DEV_DOMAIN = 'dafne.localhost';
/** The proxy's own endpoints (identity, routes of another `dafne dev`). */
const CONTROL = '/__dafne';
type Protocol = 'http' | 'https';
type Server = http.Server | https.Server;

/** The usual port, and where the proxy goes when that one belongs to something else. */
const PORTS: Record<Protocol, number[]> = {
  http: [80, ...Array.from({ length: 20 }, (_, i) => 8080 + i)],
  https: [443, ...Array.from({ length: 20 }, (_, i) => 8443 + i)],
};
const DEFAULT_PORT: Record<Protocol, number> = { http: 80, https: 443 };

export interface DevRoute {
  /** The package, e.g. @dafne/sales-web. */
  project: string;
  /** The subdomain, e.g. sales-web (→ sales-web.dafne.localhost). */
  host: string;
  /** The app's own port. */
  port: number;
}

/** The apps' dev routes (apps/<app>/package.json, "dafne.dev"), of `projects` or every app. */
export function devRoutes(root: string, projects: string[] = []): DevRoute[] {
  const apps = join(root, 'apps');
  if (!existsSync(apps)) {
    return [];
  }
  const routes: DevRoute[] = [];
  for (const dir of readdirSync(apps).sort()) {
    const file = join(apps, dir, 'package.json');
    if (!existsSync(file)) {
      continue;
    }
    const pkg = JSON.parse(readFileSync(file, 'utf8')) as { name: string; dafne?: { dev?: { host?: string; port?: number } } };
    const dev = pkg.dafne?.dev;
    if (!dev?.host || !dev.port || (projects.length && !projects.includes(pkg.name))) {
      continue;
    }
    routes.push({ project: pkg.name, host: dev.host, port: dev.port });
  }
  return routes;
}

/** The browser's host of a route, e.g. sales-web.dafne.localhost[:8443]. */
export const devHost = (host: string, port: number, protocol: Protocol = 'http') =>
  `${host}.${DEV_DOMAIN}${port === DEFAULT_PORT[protocol] ? '' : `:${port}`}`;

export interface DevProxy {
  /** https with a certificate, else http. */
  protocol: Protocol;
  /** The port the routes are served on (this proxy's or the one it joined). */
  port: number;
  /** True when another `dafne dev` proxy serves the routes. */
  joined: boolean;
  /** The browser hosts served, e.g. sales-web.dafne.localhost. */
  hosts: string[];
  /** Their URLs, e.g. https://sales-web.dafne.localhost. */
  urls: string[];
  /** The page listing the running apps, e.g. https://dafne.localhost. */
  indexUrl: string;
  /** The HTTP port redirecting to HTTPS (80), if it got it. */
  redirectPort?: number;
  close(): Promise<void>;
}

export interface DevProxyOptions {
  /** A fixed port: no fallback when it's taken. Default 443 (8443…) with `tls`, else 80 (8080…). */
  port?: number;
  /** The certificate: HTTPS, and port 80 redirecting to it. */
  tls?: { key: string; cert: string };
  /** The port of the HTTP → HTTPS redirect (default 80; 0: any, for tests). */
  redirectPort?: number;
  /** Where the apps listen. */
  upstream?: string;
}

/** The subdomain of a Host header, if it's one of ours. */
function subdomain(hostHeader: string | undefined): string | undefined {
  const name = (hostHeader ?? '').replace(/:\d+$/, '').toLowerCase();
  const suffix = `.${DEV_DOMAIN}`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : undefined;
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

/** The proxy's server: routes by Host, plus the control endpoints. */
interface ServerSetup {
  routes: Map<string, number>;
  upstream: string;
  upgraded: Set<Socket>;
  id: string;
  protocol: Protocol;
  tls?: { key: string; cert: string };
}

function newServer(tls: ServerSetup['tls'], handler: http.RequestListener): Server {
  return tls ? https.createServer({ key: tls.key, cert: tls.cert }, handler) : http.createServer(handler);
}

function proxyServer({ routes, upstream, upgraded, id, protocol, tls }: ServerSetup): Server {
  const list = () => [...routes].map(([host, port]) => ({ host, port }));

  async function handleControl(req: IncomingMessage, res: ServerResponse) {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
    };
    if (req.url === CONTROL && req.method === 'GET') {
      return send(200, { dafne: true, id, routes: list() });
    }
    if (req.url === `${CONTROL}/routes` && (req.method === 'POST' || req.method === 'DELETE')) {
      // JSON only: a web page can't send it here without a CORS preflight, which this never allows.
      if (req.headers['content-type'] !== 'application/json') {
        return send(415, { error: 'application/json only' });
      }
      const body = await readJson<{ routes: { host: string; port: number }[] }>(req);
      for (const route of body.routes) {
        if (req.method === 'POST') {
          routes.set(route.host, route.port);
        } else if (routes.get(route.host) === route.port) {
          routes.delete(route.host);
        }
      }
      return send(200, { routes: list() });
    }
    return send(404, { error: 'unknown endpoint' });
  }

  /**
   * The running apps, as links: the page of the bare domain
   * (https://dafne.localhost), and the 404 of a host no app has.
   */
  function index(res: ServerResponse, port: number, unknownHost?: string) {
    const items = list()
      .sort((a, b) => a.host.localeCompare(b.host))
      .map((route) => {
        const url = `${protocol}://${devHost(route.host, port, protocol)}`;
        return `<li><a href="${escapeHtml(url)}">${escapeHtml(url)}</a> <small>localhost:${route.port}</small></li>`;
      });
    const notice = unknownHost ? `<p>No Dafne app on <b>${escapeHtml(unknownHost)}</b>.</p>` : '';
    res.writeHead(unknownHost ? 404 : 200, { 'content-type': 'text/html; charset=utf-8' }).end(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dafne dev</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;color-scheme:light dark}
li{margin:.4rem 0}small{color:GrayText;margin-left:.5rem}</style></head>
<body><h1>Dafne dev</h1>${notice}<p>Running apps:</p><ul>${items.join('') || '<li>none</li>'}</ul></body></html>
`);
  }

  const server = newServer(tls, (req, res) => {
    const localPort = req.socket.localPort ?? DEFAULT_PORT[protocol];
    if (req.url?.startsWith(CONTROL)) {
      // Only from this machine: listen() drops the others.
      handleControl(req, res).catch((error: unknown) => {
        res.writeHead(400).end(String(error));
      });
      return;
    }
    const target = routes.get(subdomain(req.headers.host) ?? '');
    if (!target) {
      const name = (req.headers.host ?? '').replace(/:\d+$/, '').toLowerCase();
      index(res, localPort, name === DEV_DOMAIN || name === 'localhost' ? undefined : name);
      return;
    }
    const forwarded = req.headers['x-forwarded-for'];
    // The Host stays the browser's (Next and Better Auth read it).
    const upstreamReq = http.request(
      {
        host: upstream,
        port: target,
        method: req.method,
        path: req.url,
        headers: {
          ...req.headers,
          'x-forwarded-proto': protocol,
          'x-forwarded-for': [forwarded, req.socket.remoteAddress].filter(Boolean).join(', '),
        },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.rawHeaders);
        upstreamRes.pipe(res);
      },
    );
    upstreamReq.on('error', () => {
      if (!res.headersSent) {
        res
          .writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
          .end(`${req.headers.host} (localhost:${target}) isn't answering: still starting, or stopped.\n`);
      } else {
        res.destroy();
      }
    });
    req.pipe(upstreamReq);
  });

  // WebSockets (Next's HMR): the raw upgrade request, then both ways.
  server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const target = routes.get(subdomain(req.headers.host) ?? '');
    if (!target) {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n');
      return;
    }
    // Upgraded sockets leave the server: close() ends them itself.
    upgraded.add(socket);
    socket.on('close', () => upgraded.delete(socket));
    const upstreamSocket = connect(target, upstream, () => {
      const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        if (req.rawHeaders[i].toLowerCase() !== 'x-forwarded-proto') {
          lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
        }
      }
      lines.push(`X-Forwarded-Proto: ${protocol}`);
      upstreamSocket.write(`${lines.join('\r\n')}\r\n\r\n`);
      if (head.length) {
        upstreamSocket.write(head);
      }
      upstreamSocket.pipe(socket).pipe(upstreamSocket);
    });
    upstreamSocket.on('error', () => socket.destroy());
    upstreamSocket.on('close', () => socket.destroy());
    socket.on('close', () => upstreamSocket.destroy());
    socket.on('error', () => upstreamSocket.destroy());
  });
  return server;
}

/** Whether a connection comes from this machine. */
const isLoopback = (address = '') => /^(127\.|::1$|::ffff:127\.)/.test(address);

function listenOn(server: Server, port: number, host: string): Promise<void> {
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, host, () => {
      server.off('error', fail);
      done();
    });
  });
}

/**
 * Listens on every address, IPv4 and IPv6 (*.localhost resolves to both
 * loopbacks): macOS lets a non-root process take port 80 only there, not
 * on 127.0.0.1. Connections from other machines are dropped.
 */
async function listen(server: Server, port: number, protocol: Protocol, id?: string): Promise<Server> {
  server.on('connection', (socket) => {
    if (!isLoopback(socket.remoteAddress)) {
      socket.destroy();
    }
  });
  try {
    await listenOn(server, port, '::');
  } catch (error) {
    // No IPv6 at all: IPv4 only.
    if ((error as NodeJS.ErrnoException).code !== 'EAFNOSUPPORT') {
      throw error;
    }
    await listenOn(server, port, '0.0.0.0');
  }
  // Another process on 127.0.0.1 or ::1 alone would still get that
  // loopback's requests (the more specific address wins): this port is taken.
  const actual = (server.address() as { port: number }).port;
  const answers = await Promise.all(['127.0.0.1', '::1'].map((host) => proxyId(protocol, host, actual)));
  if (answers.some((answer) => answer !== 'unreachable' && (id ? answer !== id : answer !== 'ours'))) {
    await closeAll([server]);
    throw Object.assign(new Error(`Port ${port} is taken on a loopback address.`), { code: 'EADDRINUSE' });
  }
  return server;
}

interface ControlAnswer {
  status: number;
  body: { dafne?: boolean; id?: string; redirect?: boolean; routes?: { host: string; port: number }[] };
}

/**
 * A call to the control endpoints of the proxy on host:port. Over HTTPS
 * the certificate isn't checked: it's the loopback, and the answer only
 * says whether it's a dafne proxy.
 */
function control(protocol: Protocol, host: string, port: number, method: string, path: string, body?: unknown): Promise<ControlAnswer> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((done, fail) => {
    const req = (protocol === 'https' ? https : http).request(
      {
        host,
        port,
        method,
        path,
        servername: protocol === 'https' ? DEV_DOMAIN : undefined,
        rejectUnauthorized: false,
        timeout: 1500,
        headers: payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {},
      },
      (res) => {
        let text = '';
        res.on('data', (chunk: Buffer) => (text += chunk.toString()));
        res.on('end', () => {
          let parsed: ControlAnswer['body'] = {};
          try {
            parsed = JSON.parse(text) as ControlAnswer['body'];
          } catch {
            // Not a dafne proxy.
          }
          done({ status: res.statusCode ?? 0, body: parsed });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', fail);
    req.end(payload);
  });
}

/**
 * Who answers on host:port: a dafne proxy's id ('ours' for a redirect
 * server, which has none), null for anything else, 'unreachable' when that
 * loopback doesn't exist (no IPv6).
 */
async function proxyId(protocol: Protocol, host: string, port: number): Promise<string | null | 'unreachable'> {
  try {
    const { status, body } = await control(protocol, host, port, 'GET', CONTROL);
    if (status !== 200 || !body.dafne) {
      return null;
    }
    return body.redirect ? 'ours' : (body.id ?? null);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'EADDRNOTAVAIL' || code === 'EAFNOSUPPORT' || code === 'ENETUNREACH' ? 'unreachable' : null;
  }
}

/** Port 80 with TLS: sends every request to the same URL over HTTPS. */
function redirectServer(httpsPort: number): Server {
  return http.createServer((req, res) => {
    if (req.url === CONTROL) {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ dafne: true, redirect: true }));
      return;
    }
    const host = (req.headers.host ?? DEV_DOMAIN).replace(/:\d+$/, '');
    const port = httpsPort === 443 ? '' : `:${httpsPort}`;
    res.writeHead(308, { location: `https://${host}${port}${req.url ?? '/'}` }).end();
  });
}

function closeAll(servers: Server[], upgraded = new Set<Socket>()): Promise<void> {
  for (const socket of upgraded) {
    socket.destroy();
  }
  return Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((done) => {
          server.closeAllConnections();
          server.close(() => done());
        }),
    ),
  ).then(() => undefined);
}

const isTaken = (error: unknown) => ['EADDRINUSE', 'EACCES'].includes((error as NodeJS.ErrnoException).code ?? '');

/** Whether a `dafne dev` proxy (not a redirect) answers on `port`. */
async function isDafneProxy(protocol: Protocol, port: number): Promise<boolean> {
  const id = await proxyId(protocol, '127.0.0.1', port);
  return typeof id === 'string' && id !== 'ours' && id !== 'unreachable';
}

/** The routes of the dafne proxy on `port`, host → port. */
async function routesOf(protocol: Protocol, port: number): Promise<Map<string, number>> {
  const { body } = await control(protocol, '127.0.0.1', port, 'GET', CONTROL);
  return new Map((body.routes ?? []).map((route) => [route.host, route.port]));
}

/**
 * Adds `routes` to the dafne proxy on `port`, only those it doesn't have
 * already (another `dafne dev` running the same app keeps it). Returns
 * what undoes it: removes the added routes, puts back those it replaced.
 */
async function joinProxy(protocol: Protocol, port: number, routes: DevRoute[]): Promise<() => Promise<void>> {
  const existing = await routesOf(protocol, port);
  const added = routes.filter((route) => existing.get(route.host) !== route.port);
  const replaced = added
    .filter((route) => existing.has(route.host))
    .map((route) => ({ project: route.project, host: route.host, port: existing.get(route.host) ?? 0 }));
  if (added.length) {
    await sendRoutes(protocol, port, 'POST', added);
  }
  return async () => {
    if (added.length) {
      await sendRoutes(protocol, port, 'DELETE', added);
    }
    if (replaced.length) {
      await sendRoutes(protocol, port, 'POST', replaced);
    }
  };
}

async function sendRoutes(protocol: Protocol, port: number, method: 'POST' | 'DELETE', routes: DevRoute[]) {
  const body = { routes: routes.map(({ host, port: target }) => ({ host, port: target })) };
  const { status } = await control(protocol, '127.0.0.1', port, method, `${CONTROL}/routes`, body);
  if (status !== 200) {
    throw new Error(`The dafne dev proxy on port ${port} refused the routes (${status}).`);
  }
}

/** The HTTP → HTTPS redirect, on port 80 if it's free (else none: it's a convenience). */
async function startRedirect(httpsPort: number, port: number): Promise<Server | undefined> {
  try {
    return await listen(redirectServer(httpsPort), port, 'http');
  } catch {
    return undefined;
  }
}

/**
 * Serves `routes` on 443 with `tls` (and redirects 80 to it), else on 80.
 * When the port is taken by another `dafne dev`, adds the routes to that
 * proxy; by anything else, uses 8443… / 8080… (a fixed `port` fails
 * instead).
 */
export async function startDevProxy(routes: DevRoute[], options: DevProxyOptions = {}): Promise<DevProxy> {
  const upstream = options.upstream ?? '127.0.0.1';
  const protocol: Protocol = options.tls ? 'https' : 'http';
  const table = new Map(routes.map((route) => [route.host, route.port]));
  const candidates = options.port !== undefined ? [options.port] : PORTS[protocol];
  const served = (port: number) => {
    const hosts = routes.map((route) => devHost(route.host, port, protocol));
    const suffix = port === DEFAULT_PORT[protocol] ? '' : `:${port}`;
    return {
      protocol,
      port,
      hosts,
      urls: hosts.map((host) => `${protocol}://${host}`),
      indexUrl: `${protocol}://${DEV_DOMAIN}${suffix}`,
    };
  };

  for (const port of candidates) {
    try {
      const upgraded = new Set<Socket>();
      const id = randomUUID();
      const server = await listen(proxyServer({ routes: table, upstream, upgraded, id, protocol, tls: options.tls }), port, protocol, id);
      const actual = (server.address() as { port: number }).port;
      const redirect = options.tls ? await startRedirect(actual, options.redirectPort ?? 80) : undefined;
      const servers = redirect ? [server, redirect] : [server];
      return {
        ...served(actual),
        joined: false,
        redirectPort: redirect ? (redirect.address() as { port: number }).port : undefined,
        close: () => closeAll(servers, upgraded),
      };
    } catch (error) {
      if (!isTaken(error)) {
        throw error;
      }
      if (await isDafneProxy(protocol, port)) {
        const leave = await joinProxy(protocol, port, routes);
        return {
          ...served(port),
          joined: true,
          close: () => leave().catch(() => undefined),
        };
      }
      if (options.port !== undefined) {
        throw new Error(`Port ${port} is taken (DAFNE_PROXY_PORT): free it or pick another one.`, { cause: error });
      }
    }
  }
  const [first, ...rest] = PORTS[protocol];
  throw new Error(`No free port for the dev proxy (tried ${first} and ${rest[0]}–${rest.at(-1)}).`);
}
