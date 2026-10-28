import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const env = Object.fromEntries((await readFile('.env.docker', 'utf8')).split('\n')
  .filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const api = `http://localhost:${env.API_PORT || 4300}`;
const teacher = `http://localhost:${env.FRONTEND_PORT || 5173}`;
const play = `http://127.0.0.1:${env.PLAY_PORT || 4178}`;
const request = (url, options) => fetch(url, { signal: AbortSignal.timeout(10000), ...options });

test('builds estáticas, rutas y cabeceras conservan los orígenes separados', async () => {
  for (const [origin, path, directives] of [
    [teacher, '/recuperar-acceso/confirmar', [`connect-src ${api}`, `frame-src ${play}`, "frame-ancestors 'none'"]],
    [play, '/pendientes', [`connect-src 'self' ${api}`, `frame-ancestors ${teacher}`]],
  ]) {
    const response = await request(`${origin}${path}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    for (const directive of directives) assert(response.headers.get('content-security-policy')?.includes(directive));
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    const html = await response.text();
    const asset = html.match(/src="(\/assets\/[^" ]+\.js)"/)?.[1];
    assert(asset, 'La página debe cargar su build JavaScript local');
    assert.equal((await request(`${origin}${asset}`)).status, 200);
    assert.equal((await request(`${origin}/_headers`)).status, 404);
  }
  for (const path of ['/demo.html', '/laboratorio.html', '/.env', '/assets/missing.js']) {
    assert.equal((await request(`${play}${path}`)).status, 404);
  }
  assert.equal((await request(`${teacher}/assets/missing.js`)).status, 404);
  const worker = await request(`${play}/sw.js`);
  assert.equal(worker.status, 200);
  assert.match(worker.headers.get('content-type'), /javascript/);
  assert.equal(worker.headers.get('cache-control'), 'no-cache');
});

test('API real: documentación, CORS, sesión persistida, login y logout del administrador local', async () => {
  assert.equal((await request(`${api}/docs`)).status, 200);
  assert.equal((await request(`${api}/api/v1/accounts`)).status, 401);
  const anonymous = await request(`${api}/api/auth/get-session`, { headers: { Origin: teacher } });
  assert.equal(anonymous.status, 401);
  assert.equal(anonymous.headers.get('access-control-allow-origin'), teacher);
  assert.equal(anonymous.headers.get('access-control-allow-credentials'), 'true');
  const runtime = await request(`${api}/api/v1/game-runtime/access/claim`, {
    method: 'OPTIONS', headers: { Origin: play, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type' },
  });
  assert.equal(runtime.status, 204);
  assert.equal(runtime.headers.get('access-control-allow-origin'), play);
  assert.equal(runtime.headers.get('access-control-allow-credentials'), null);
  const login = await request(`${api}/api/auth/sign-in/email`, {
    method: 'POST', headers: { Origin: teacher, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@kudlab.example.edu.co', password: env.BOOTSTRAP_ADMIN_PASSWORD, rememberMe: false }),
  });
  assert.equal(login.status, 200, 'Login del administrador local');
  const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  assert(cookie, 'El login debe emitir cookie de sesión');
  try {
    const session = await request(`${api}/api/auth/get-session`, { headers: { Origin: teacher, Cookie: cookie } });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.role, 'ADMIN');
  } finally {
    const logout = await request(`${api}/api/auth/sign-out`, {
      method: 'POST', headers: { Origin: teacher, Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(logout.status, 200);
  }
  assert.equal((await request(`${api}/api/auth/get-session`, { headers: { Origin: teacher, Cookie: cookie } })).status, 401);
});
