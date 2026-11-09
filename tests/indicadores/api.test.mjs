import test from 'node:test';
import assert from 'node:assert/strict';
import { createIndicatorsApi, filterError } from '../../src/features/indicadores/api.ts';
import { consentAccess } from '../../src/features/academico/consents/api.ts';
import { createHttpClient } from '../../src/lib/http.ts';
const id = '10000000-0000-4000-8000-000000000001';
const signal = () => new AbortController().signal;
const emptyPage = { studentId: id, items: [], nextCursor: null };
function setup(respond) {
  const calls = [], events = [];
  const controller = { getGeneration: () => 1, notify: e => events.push(e.category) };
  const http = createHttpClient('http://localhost:4300', consentAccess(controller), async (url, init) => { calls.push({ url, init }); return respond(url); });
  return { api: createIndicatorsApi(http), calls, events };
}
test('la URL lleva solo filtros validados, con transporte protegido y sin caché', async () => {
  const { api, calls } = setup(() => Response.json(emptyPage));
  const r = await api.history(id, { metricCode: 'rt_cv_pct', scope: 'SEGMENT_2', from: '2026-03-01', to: '2026-03-31' }, signal(), 'abc');
  assert.equal(r.kind, 'success');
  const url = new URL(calls[0].url);
  assert.equal(url.pathname, `/api/v1/students/${id}/indicator-history`);
  assert.deepEqual(Object.fromEntries(url.searchParams), { taskId: 'TG-01', limit: '25', metricCode: 'rt_cv_pct', scope: 'SEGMENT_2', from: '2026-03-01', to: '2026-03-31', cursor: 'abc' });
  assert.equal(calls[0].init.credentials, 'include'); assert.equal(calls[0].init.cache, 'no-store');
});
test('id inválido o rango inválido no consultan', async () => {
  const { api, calls } = setup(() => Response.json(emptyPage));
  assert.equal((await api.history('../x', {}, signal())).status, 404);
  assert.equal((await api.history(id, { from: '2026-03-02', to: '2026-03-01' }, signal())).status, 400);
  assert.equal((await api.history(id, { from: '2026-02-30' }, signal())).status, 400);
  assert.equal(calls.length, 0);
  assert.equal(filterError({ from: '2026-03-01', to: '2026-03-01' }), undefined); assert.equal(filterError({ metricCode: 'x' }), 'metric');
});
test('red, 503 y JSON inválido NO notifican indisponibilidad global; 401 y 403 sí', async () => {
  for (const [respond, kind, status] of [[() => { throw new Error('red'); }, 'unavailable'], [() => new Response('{}', { status: 503 }), 'error', 503],
    [() => new Response('no json', { status: 200, headers: { 'content-type': 'application/json' } }), 'unavailable']]) {
    const { api, events } = setup(respond);
    const r = await api.history(id, {}, signal());
    assert.equal(r.kind, kind); if (status) assert.equal(r.status, status);
    assert.deepEqual(events, []);
  }
  for (const [status, category] of [[401, 'unauthenticated'], [403, 'forbidden']]) {
    const { api, events } = setup(() => Response.json({ code: status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN' }, { status }));
    assert.equal((await api.history(id, {}, signal())).kind, 'error'); assert.deepEqual(events, [category]);
  }
});
test('404 se informa como no disponible; respuesta de otro estudiante o no válida se rechaza', async () => {
  const gone = setup(() => Response.json({ code: 'NOT_FOUND' }, { status: 404 }));
  assert.equal((await gone.api.history(id, {}, signal())).status, 404);
  const wrong = setup(() => Response.json({ ...emptyPage, studentId: '10000000-0000-4000-8000-000000000009' }));
  assert.equal((await wrong.api.history(id, {}, signal())).kind, 'unavailable');
});
test('respuesta de una generación anterior se descarta', async () => {
  let generation = 1; const calls = [];
  const http = createHttpClient('http://localhost:4300', consentAccess({ getGeneration: () => generation, notify() {} }), async () => { generation = 2; return Response.json(emptyPage); });
  assert.equal((await createIndicatorsApi(http).history(id, {}, signal())).kind, 'obsolete'); assert.equal(calls.length, 0);
});
test('catálogo: una sola lectura de solo lectura', async () => {
  const { api, calls } = setup(() => Response.json({ items: [] }));
  assert.equal((await api.definitions(signal())).kind, 'success'); assert.equal(new URL(calls[0].url).pathname, '/api/v1/indicator-definitions'); assert.equal(calls[0].init.method, 'GET');
});
