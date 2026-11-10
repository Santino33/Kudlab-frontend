import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, initialState, reduce, staleView } from '../../src/features/indicadores/history-state.ts';
const s = (id, at = '2026-03-02T15:00:00.000Z') => ({ sessionId: id, occurredAt: at, indicators: [] });
const page = (items, nextCursor = null) => ({ kind: 'success', data: { studentId: 'x', items, nextCursor } });
const err = status => ({ kind: 'error', status, uncertain: false });
const loaded = (key = 'a', items = [s('1')]) => reduce(initialState(key), { type: 'result', key, append: false, result: page(items) });

test('éxito: ready, vacío distinto de error y se guarda la última carga correcta', () => {
  assert.equal(loaded().status, 'ready'); assert.equal(loaded().good.items.length, 1);
  const empty = loaded('a', []); assert.equal(empty.status, 'empty'); assert.equal(empty.failure, undefined);
});
test('fallo transitorio con carga previa: error con última carga correcta rotulada; sin carga previa: nada que mostrar', () => {
  const failed = reduce(reduce(loaded('a'), { type: 'load', key: 'b', append: false }), { type: 'result', key: 'b', append: false, result: { kind: 'unavailable', uncertain: false } });
  assert.equal(failed.status, 'error'); assert.equal(failed.failure, 'transient'); assert.equal(staleView(failed).key, 'a');
  assert.equal(staleView(reduce(initialState('a'), { type: 'result', key: 'a', append: false, result: err(503) })), undefined);
});
test('503, red y JSON inválido son transitorios; 400 inválido; 401/403 y 404 retiran todo contenido, también la última carga', () => {
  assert.equal(classify(err(503)), 'transient'); assert.equal(classify({ kind: 'unavailable', uncertain: false }), 'transient'); assert.equal(classify(err(400)), 'invalid');
  for (const [status, failure] of [[401, 'denied'], [403, 'denied'], [404, 'missing']]) {
    const f = reduce(loaded('a'), { type: 'result', key: 'a', append: false, result: err(status) });
    assert.equal(f.failure, failure); assert.equal(f.items.length, 0); assert.equal(f.good, undefined); assert.equal(staleView(f), undefined);
  }
});
test('nueva consulta no muestra datos de otros filtros y las respuestas de una consulta anterior se ignoran', () => {
  const loading = reduce(loaded('a'), { type: 'load', key: 'b', append: false });
  assert.equal(loading.items.length, 0); assert.equal(loading.status, 'loading');
  assert.equal(reduce(loading, { type: 'result', key: 'a', append: false, result: page([s('9')]) }), loading);
  assert.equal(reduce(loading, { type: 'result', key: 'b', append: false, result: { kind: 'obsolete' } }), loading);
});
test('cargar más: añade sin repetir; si falla conserva lo cargado y marca el fallo', () => {
  const first = loaded('a', [s('1'), s('2')]);
  const more = reduce(reduce(first, { type: 'load', key: 'a', append: true }), { type: 'result', key: 'a', append: true, result: page([s('2'), s('3')]) });
  assert.deepEqual(more.items.map(i => i.sessionId), ['1', '2', '3']);
  const failed = reduce(more, { type: 'result', key: 'a', append: true, result: err(503) });
  assert.equal(failed.items.length, 3); assert.equal(failed.moreFailed, true); assert.equal(failed.status, 'ready');
});
