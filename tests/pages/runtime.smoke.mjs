import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const observed = [];
const upstream = createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  observed.push({ url: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks) });
  if (req.url === '/api/timeout') return;
  if (req.url === '/api/redirect') { res.writeHead(302, { Location: '/api/target' }); res.end(); return; }
  res.writeHead(201, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'public', 'Set-Cookie': [
    'one=synthetic; Path=/; Secure; HttpOnly; SameSite=Lax',
    'two=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Secure; HttpOnly; SameSite=Lax',
  ] });
  res.end(Buffer.concat(chunks));
});
await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const teacher = `http://127.0.0.1:${port}`;
const child = spawn('npx', ['--yes', 'wrangler@4.160.0', 'pages', 'dev', 'dist', '--ip', '127.0.0.1',
  '--port', String(port), '--inspector-port', '0', '--compatibility-date', '2026-11-10',
  '--binding', `VITE_API_ORIGIN=${teacher}`, '--binding', `API_UPSTREAM_ORIGIN=http://127.0.0.1:${upstream.address().port}`,
], { detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false', BROWSER: 'none' } });
let logs = '';
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Pages startup timeout')), 60_000);
    const receive = chunk => {
      logs += chunk;
      if (logs.includes(`Ready on ${teacher}`)) { clearTimeout(timeout); resolve(); }
    };
    child.stdout.on('data', receive); child.stderr.on('data', receive);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(Error(`Pages exited ${code}`)); });
  });
  const binary = new Uint8Array([0, 1, 255, 12]);
  const response = await fetch(`${teacher}/api/echo?next=https://evil.example`, { method: 'POST', body: binary,
    headers: { Origin: teacher, Cookie: 'session=synthetic', Forwarded: 'host=evil.example', 'X-Forwarded-Host': 'evil.example' } });
  assert.equal(response.status, 201);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), binary);
  assert.equal(observed[0].url, '/api/echo?next=https://evil.example');
  assert.equal(observed[0].headers.origin, teacher);
  assert.equal(observed[0].headers.cookie, 'session=synthetic');
  assert.equal(observed[0].headers.forwarded, undefined);
  assert.equal(observed[0].headers['x-forwarded-host'], undefined);
  const form = new FormData(); form.set('file', new Blob([binary]), 'synthetic.bin');
  const upload = await fetch(`${teacher}/api/upload`, { method: 'POST', headers: { Origin: teacher }, body: form });
  assert.equal(upload.status, 201);
  assert.match(await upload.text(), /synthetic\.bin/);
  const before = observed.length;
  for (const path of ['/api', '/api//evil', '/api/%252e%252e/private']) {
    const result = await fetch(teacher + path, { redirect: 'manual' }); assert.equal(result.status, 404, path); await result.arrayBuffer();
  }
  for (const headers of [{}, { Origin: 'https://evil.example' }]) {
    const denied = await fetch(teacher + '/api/echo', { method: 'POST', headers, body: '{}' });
    assert.equal(denied.status, 403); await denied.arrayBuffer();
  }
  assert.equal(observed.length, before);
  const redirect = await fetch(teacher + '/api/redirect', { redirect: 'manual' });
  assert.equal(redirect.status, 302); assert.equal(redirect.headers.get('location'), '/api/target');
  assert.equal(observed.length, before + 1);
  const html = await readFile('dist/index.html', 'utf8');
  const asset = html.match(/src="([^"]+\.js)"/)[1];
  for (const path of ['/acceso', '/acceso/invitacion', asset]) {
    const staticResponse = await fetch(teacher + path); assert.equal(staticResponse.status, 200); await staticResponse.arrayBuffer();
  }
  assert.equal(observed.length, before + 1);
  assert.deepEqual(JSON.parse(await readFile('dist/_routes.json', 'utf8')), { version: 1, include: ['/api', '/api/*'], exclude: [] });
  const started = Date.now();
  const timedOut = await fetch(teacher + '/api/timeout', { signal: AbortSignal.timeout(45_000) });
  assert.equal(timedOut.status, 503);
  assert.equal((await timedOut.json()).code, 'UNAVAILABLE');
  assert(Date.now() - started >= 29_000, 'Upstream must actually wait for the proxy deadline');
  assert.equal(observed.length, before + 2, 'Timeout must not retry');
  console.log('Pages/workerd: cookies, body/multipart, Origin, forwarded, redirects, API 404, static routes and real 30s timeout passed.');
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  const exited = once(child, 'exit');
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Already stopped. */ }
  if (child.exitCode === null) await exited;
  upstream.closeAllConnections();
  await new Promise(resolve => upstream.close(resolve));
}
