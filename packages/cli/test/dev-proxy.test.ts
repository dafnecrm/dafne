import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createServer as createNetServer, connect } from 'node:net';
import type { Duplex } from 'node:stream';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { devRoutes, startDevProxy, type DevProxy } from '../src/core/dev-proxy.ts';

/** The fake apps' upgraded sockets (they leave the server: closed by hand). */
const upgradedSockets = new Set<Duplex>();

/** An app that answers with its name, the Host it got and the forwarded headers. */
async function fakeApp(name: string): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ name, host: req.headers.host, proto: req.headers['x-forwarded-proto'] }));
  });
  server.on('upgrade', (_req, socket) => {
    upgradedSockets.add(socket);
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
    socket.on('data', (data) => socket.write(`${name}:${data.toString()}`));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  return { server, port: (server.address() as { port: number }).port };
}

/** A free port (listened on, then released). */
async function freePort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as { port: number };
  await new Promise((done) => server.close(done));
  return port;
}

/** GET through the proxy with a given Host. */
function get(port: number, host: string, path = '/'): Promise<{ status: number; body: string }> {
  return new Promise((done, fail) => {
    const req = request({ host: '127.0.0.1', port, path, headers: { host } }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => (body += chunk.toString()));
      res.on('end', () => done({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', fail);
    req.end();
  });
}

describe('dev proxy', () => {
  const apps: Server[] = [];
  const proxies: DevProxy[] = [];
  let web: number;
  let api: number;

  beforeAll(async () => {
    const a = await fakeApp('web');
    const b = await fakeApp('api');
    apps.push(a.server, b.server);
    web = a.port;
    api = b.port;
  });

  afterEach(async () => {
    for (const proxy of proxies.splice(0).reverse()) {
      await proxy.close();
    }
  });

  afterAll(async () => {
    for (const socket of upgradedSockets) {
      socket.destroy();
    }
    for (const app of apps) {
      app.closeAllConnections();
      await new Promise((done) => app.close(done));
    }
  });

  async function start(routes: { host: string; port: number }[], port: number) {
    const proxy = await startDevProxy(
      routes.map((route) => ({ project: `@dafne/${route.host}`, ...route })),
      { port },
    );
    proxies.push(proxy);
    return proxy;
  }

  it('routes by Host and keeps it', async () => {
    const proxy = await start([{ host: 'web', port: web }, { host: 'api', port: api }], await freePort());
    const res = await get(proxy.port, `web.dafne.localhost:${proxy.port}`);
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ name: 'web', host: `web.dafne.localhost:${proxy.port}`, proto: 'http' });
    expect(JSON.parse((await get(proxy.port, 'api.dafne.localhost')).body).name).toBe('api');
    expect(proxy.hosts).toEqual([`web.dafne.localhost:${proxy.port}`, `api.dafne.localhost:${proxy.port}`]);
  });

  it('answers 404 for an unknown host, 502 for an app that is down', async () => {
    const down = await freePort();
    const proxy = await start([{ host: 'web', port: web }, { host: 'down', port: down }], await freePort());
    const unknown = await get(proxy.port, 'other.dafne.localhost');
    expect(unknown.status).toBe(404);
    expect(unknown.body).toContain(`http://web.dafne.localhost:${proxy.port}`);
    expect((await get(proxy.port, 'down.dafne.localhost')).status).toBe(502);
  });

  it('passes WebSocket upgrades through', async () => {
    const proxy = await start([{ host: 'web', port: web }], await freePort());
    const reply = await new Promise<string>((done, fail) => {
      const socket = connect(proxy.port, '127.0.0.1', () => {
        socket.write('GET /_next/webpack-hmr HTTP/1.1\r\nHost: web.dafne.localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      });
      let data = '';
      socket.on('data', (chunk) => {
        data += chunk.toString();
        if (data.includes('\r\n\r\n') && !data.includes('ping')) {
          socket.write('ping');
        }
        if (data.includes('web:ping')) {
          socket.end();
          done(data);
        }
      });
      socket.on('error', fail);
    });
    expect(reply).toContain('101 Switching Protocols');
  });

  it('adds its routes to a dafne proxy that has the port, and removes them on close', async () => {
    const first = await start([{ host: 'web', port: web }], await freePort());
    const second = await start([{ host: 'api', port: api }], first.port);
    expect(second).toMatchObject({ port: first.port, joined: true });
    expect(JSON.parse((await get(first.port, 'api.dafne.localhost')).body).name).toBe('api');
    await proxies.pop()?.close();
    expect((await get(first.port, 'api.dafne.localhost')).status).toBe(404);
  });

  it("leaves the routes the other proxy had, and puts back those it replaced", async () => {
    const first = await start([{ host: 'web', port: web }, { host: 'api', port: api }], await freePort());
    // The same web, another api (e.g. a second checkout of the API).
    const other = await fakeApp('api2');
    apps.push(other.server);
    await start([{ host: 'web', port: web }, { host: 'api', port: other.port }], first.port);
    expect(JSON.parse((await get(first.port, 'api.dafne.localhost')).body).name).toBe('api2');
    await proxies.pop()?.close();
    expect(JSON.parse((await get(first.port, 'web.dafne.localhost')).body).name).toBe('web');
    expect(JSON.parse((await get(first.port, 'api.dafne.localhost')).body).name).toBe('api');
  });

  it('fails on a fixed port taken by something else', async () => {
    const other = await fakeApp('other');
    apps.push(other.server);
    await expect(start([{ host: 'web', port: web }], other.port)).rejects.toThrow(/is taken/);
  });

  it('refuses route changes that are not JSON', async () => {
    const proxy = await start([{ host: 'web', port: web }], await freePort());
    const res = await fetch(`http://127.0.0.1:${proxy.port}/__dafne/routes`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ routes: [{ host: 'evil', port: 1 }] }),
    });
    expect(res.status).toBe(415);
  });
});

describe('devRoutes', () => {
  it("reads the apps' dafne.dev, of the given projects", () => {
    const root = mkdtempSync(join(tmpdir(), 'dafne-routes-'));
    const app = (dir: string, pkg: object) => {
      mkdirSync(join(root, 'apps', dir), { recursive: true });
      writeFileSync(join(root, 'apps', dir, 'package.json'), JSON.stringify(pkg));
    };
    app('sales-web', { name: '@dafne/sales-web', dafne: { dev: { host: 'sales-web', port: 4000 } } });
    app('auth', { name: '@dafne/auth', dafne: { dev: { host: 'auth', port: 3001 } } });
    app('worker', { name: '@dafne/worker' });
    expect(devRoutes(root)).toEqual([
      { project: '@dafne/auth', host: 'auth', port: 3001 },
      { project: '@dafne/sales-web', host: 'sales-web', port: 4000 },
    ]);
    expect(devRoutes(root, ['@dafne/sales-web', '@dafne/worker'])).toEqual([
      { project: '@dafne/sales-web', host: 'sales-web', port: 4000 },
    ]);
  });
});

/** A self-signed certificate for *.dafne.localhost (openssl), or null without openssl. */
function selfSigned(): { key: string; cert: string } | null {
  const dir = mkdtempSync(join(tmpdir(), 'dafne-cert-'));
  const made = spawnSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=dafne.localhost',
    '-addext', 'subjectAltName=DNS:*.dafne.localhost,DNS:dafne.localhost,IP:127.0.0.1,IP:::1',
    '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem'),
  ]);
  if (made.error || made.status !== 0) {
    return null;
  }
  return { key: readFileSync(join(dir, 'key.pem'), 'utf8'), cert: readFileSync(join(dir, 'cert.pem'), 'utf8') };
}

/** GET over HTTPS through the proxy, trusting `ca`, with SNI and Host set to `host`. */
function getTls(port: number, host: string, ca: string): Promise<{ status: number; body: string }> {
  return new Promise((done, fail) => {
    const req = httpsRequest(
      { host: '127.0.0.1', port, path: '/', servername: host.replace(/:\d+$/, ''), ca, headers: { host } },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => (body += chunk.toString()));
        res.on('end', () => done({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('error', fail);
    req.end();
  });
}

const tls = selfSigned();

describe.skipIf(!tls)('dev proxy over HTTPS', () => {
  let app: { server: Server; port: number };
  const proxies: DevProxy[] = [];

  beforeAll(async () => {
    app = await fakeApp('web');
  });

  afterEach(async () => {
    for (const proxy of proxies.splice(0).reverse()) {
      await proxy.close();
    }
  });

  afterAll(async () => {
    app.server.closeAllConnections();
    await new Promise((done) => app.server.close(done));
  });

  async function start(port: number, redirectPort?: number) {
    const proxy = await startDevProxy([{ project: '@dafne/web', host: 'web', port: app.port }], {
      port,
      tls: tls ?? undefined,
      redirectPort,
    });
    proxies.push(proxy);
    return proxy;
  }

  it('ends TLS and tells the app the request was HTTPS', async () => {
    const proxy = await start(await freePort(), await freePort());
    expect(proxy.protocol).toBe('https');
    expect(proxy.urls).toEqual([`https://web.dafne.localhost:${proxy.port}`]);
    const res = await getTls(proxy.port, `web.dafne.localhost:${proxy.port}`, tls?.cert ?? '');
    expect(JSON.parse(res.body)).toMatchObject({ name: 'web', proto: 'https' });
  });

  it('redirects plain HTTP to HTTPS', async () => {
    const proxy = await start(await freePort(), await freePort());
    const res = await new Promise<{ status: number; location?: string }>((done, fail) => {
      const req = request(
        { host: '127.0.0.1', port: proxy.redirectPort, path: '/customers?x=1', headers: { host: 'web.dafne.localhost' } },
        (r) => {
          r.resume();
          done({ status: r.statusCode ?? 0, location: r.headers.location });
        },
      );
      req.on('error', fail);
      req.end();
    });
    expect(res).toEqual({ status: 308, location: `https://web.dafne.localhost:${proxy.port}/customers?x=1` });
  });

  it('joins another dafne proxy over HTTPS', async () => {
    const first = await start(await freePort(), await freePort());
    const second = await start(first.port);
    expect(second).toMatchObject({ joined: true, port: first.port, protocol: 'https' });
  });
});

describe('dev proxy index page', () => {
  it('lists the running apps on the bare domain, and on an unknown host with a 404', async () => {
    const app = await fakeApp('web');
    const port = await freePort();
    const proxy = await startDevProxy([{ project: '@dafne/web', host: 'web', port: app.port }], { port });
    try {
      expect(proxy.indexUrl).toBe(`http://dafne.localhost:${port}`);
      const index = await get(port, `dafne.localhost:${port}`);
      expect(index.status).toBe(200);
      expect(index.body).toContain(`<a href="http://web.dafne.localhost:${port}">`);
      const unknown = await get(port, 'nope.dafne.localhost');
      expect(unknown.status).toBe(404);
      expect(unknown.body).toContain('No Dafne app on <b>nope.dafne.localhost</b>');
    } finally {
      await proxy.close();
      app.server.closeAllConnections();
      await new Promise((done) => app.server.close(done));
    }
  });
});
