import assert from 'node:assert/strict';
import test from 'node:test';
import { navigate } from '../../src/lib/navigation.ts';
import { resolveRoute, routeTitles } from '../../src/features/usuarios/navigation.ts';

test('internal navigation preserves one root, respects native links and avoids duplicate history', (t) => {
  const previous = globalThis.window;
  t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
  const writes = [], events = [];
  globalThis.window = {
    location: { href: 'https://kudlab.test/usuarios', origin: 'https://kudlab.test' },
    history: { pushState: (...args) => writes.push(args) },
    dispatchEvent: event => events.push(event.type),
  };
  const previousPopState = globalThis.PopStateEvent;
  globalThis.PopStateEvent = class extends Event {};
  t.after(() => { if (previousPopState === undefined) delete globalThis.PopStateEvent; else globalThis.PopStateEvent = previousPopState; });
  const click = (href, overrides = {}) => {
    let prevented = false;
    navigate({ button: 0, currentTarget: { href, target: '', hasAttribute: () => false }, preventDefault() { prevented = true; }, ...overrides });
    return prevented;
  };
  assert.equal(click('https://kudlab.test/usuarios/a'), true);
  assert.deepEqual(writes, [[null, '', 'https://kudlab.test/usuarios/a']]);
  assert.equal(click('https://kudlab.test/usuarios'), true);
  assert.equal(writes.length, 1, 'same page closes Sheet without a duplicate history entry');
  assert.deepEqual(events, ['popstate', 'popstate']);
  for (const override of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { defaultPrevented: true }]) {
    assert.equal(click('https://kudlab.test/usuarios/a', override), false);
  }
  assert.equal(click('https://other.test/usuarios'), false);
  assert.equal(click('https://kudlab.test/usuarios#field'), false);
  assert.equal(click('', { currentTarget: { target: '_blank' } }), false);
  assert.equal(click('', { currentTarget: { target: '', hasAttribute: () => true } }), false);
  assert.equal(writes.length, 1);
});

test('all existing destinations have specific tab titles without personal data', () => {
  for (const path of ['/', '/acceso', '/usuarios', '/usuarios/nueva', '/usuarios/persona', '/usuarios/persona/editar', '/tareas', '/tareas/TG-01', '/academico/estudiantes', '/academico/estudiantes/nuevo', '/academico/estudiantes/id', '/academico/estudiantes/id/editar', '/recuperar-acceso', '/recuperar-acceso/confirmar', '/unknown']) {
    const title = routeTitles[resolveRoute(path, '').kind];
    assert.ok(title);
    assert.equal(title.includes('persona'), false);
  }
});
