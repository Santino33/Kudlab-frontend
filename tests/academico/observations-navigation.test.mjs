import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigationCoordinator } from '../../src/lib/navigation.ts';
globalThis.PopStateEvent ??= class extends Event {};
const tick = () => new Promise(setImmediate);
function setup(states = [null, { sentinel: 'A' }, 42]) {
  const host = new EventTarget(), entries = states.map((state, i) => ({ key: String(i), url: `http://localhost/${['O', 'A', 'B'][i]}`, sameDocument: true, state }));
  let index = entries.length - 1, pushes = 0, replace = 0, discards = 0, unavailable = 0, valid = true, dirty = true;
  const commits = [], asks = [], traversals = [];
  const failures = [], finishGates = [];
  Object.defineProperty(host, 'location', { get: () => new URL(entries[index].url) });
  host.history = {
    get state() { return entries[index].state; },
    pushState(state, _, href) { pushes++; entries.splice(index + 1); entries.push({ key: String(entries.length), url: href, sameDocument: true, state }); index++; },
    replaceState(state, _, href) { replace++; entries[index] = { ...entries[index], state, url: href }; },
  };
  host.navigation = {
    get currentEntry() { return entries[index]; }, entries: () => entries,
    traverseTo(key) {
      traversals.push(key); const error = failures.shift(), gate = finishGates.shift();
      const committed = new Promise((resolve, reject) => queueMicrotask(() => {
        if (error === 'committed') { reject(Error('committed failure')); return; }
        const next = entries.findIndex(e => e.key === key);
        if (next < 0) { reject(Error('missing key')); return; }
        index = next; host.dispatchEvent(new Event('popstate')); resolve();
      }));
      const finished = committed.then(() => gate ?? (error === 'finished' ? Promise.reject(Error('finished failure')) : undefined));
      return { committed, finished };
    },
  };
  const coordinator = createNavigationCoordinator(host, () => commits.push(host.location.href), (a, b) => a.pathname === b.pathname);
  const guard = {
    dirty: () => dirty, valid: () => valid,
    decide: () => new Promise(resolve => asks.push(resolve)), cancel() { asks.at(-1)?.(false); },
    discard() { discards++; dirty = false; }, unavailable() { unavailable++; },
  };
  const register = () => coordinator.register(guard);
  return { host, coordinator, register, guard, entries, asks, commits, traversals, failures, finishGates,
    go(delta) { index += delta; host.dispatchEvent(new Event('popstate')); },
    counts: () => ({ pushes, replace, discards, unavailable }), invalidate() { valid = false; coordinator.invalidate(); },
  };
}
test('T-15: no guard preserves opaque state and native same-document entries', async () => {
  const s = setup();
  await s.coordinator.request('/next', { studentNotice: 'created', extra: 7 });
  assert.equal(s.entries.length, 4); assert.equal(s.commits.length, 1);
  assert.deepEqual(s.host.history.state, { studentNotice: 'created', extra: 7 });
  assert.equal(s.coordinator.replace('/next?term=2'), true); assert.equal(s.host.history.state.extra, 7);
  assert.equal(s.coordinator.replace('/other'), false); assert.equal(s.coordinator.replace('https://outside.invalid/next'), false);
  s.coordinator.dispose();
});
test('T-15: imperative navigation asks before push, remain keeps route/state, stale dispose cannot erase new guard', async () => {
  const s = setup(), old = s.register(); s.register(); old();
  const moving = s.coordinator.request('/next'); assert.equal(s.counts().pushes, 0);
  s.asks.at(-1)(false); assert.equal(await moving, false); assert.equal(s.host.location.pathname, '/B');
  const accepted = s.coordinator.request('/next', { studentNotice: 'updated' }); s.asks.at(-1)(true);
  assert.equal(await accepted, true); assert.equal(s.counts().discards, 1); assert.equal(s.host.history.state.studentNotice, 'updated');
  s.coordinator.dispose();
});
test('T-15: opaque Back restores exact key before asking; remain/accept preserve Forward and foreign states', async () => {
  for (const opaque of [null, 42, ['foreign'], { studentNotice: 'updated', foreign: 7 }, { __kudlabNavigation: 'foreign' }]) {
    const s = setup([opaque, { A: true }, { B: true }]); s.register();
    s.coordinator.replace('/B?term=2', s.host.history.state); const original = structuredClone(s.entries);
    s.go(-2); assert.equal(s.commits.length, 0); await tick(); assert.equal(s.host.location.search, '?term=2');
    assert.equal(s.asks.length, 1); s.asks[0](false); await tick(); assert.deepEqual(s.entries, original);
    s.go(-2); await tick(); s.asks.at(-1)(true); await tick();
    assert.equal(s.host.location.pathname, '/O'); assert.deepEqual(s.host.history.state, opaque); assert.equal(s.counts().discards, 1);
    s.go(1); assert.equal(s.host.location.pathname, '/A'); s.go(1); assert.equal(s.host.location.search, '?term=2');
    assert.deepEqual(s.entries, original); assert.equal(s.counts().pushes, 0); s.coordinator.dispose();
  }
});
test('T-15: reentrant pop replaces decision/target; old acceptance cannot replay', async () => {
  const s = setup(); s.register(); s.go(-2); await tick(); const old = s.asks[0];
  s.go(-1); await tick(); assert.equal(s.host.location.pathname, '/B'); assert.equal(s.asks.length, 2);
  old(true); await tick(); assert.equal(s.commits.length, 0);
  s.asks[1](true); await tick(); assert.equal(s.host.location.pathname, '/A'); assert.equal(s.commits.length, 1);
  s.coordinator.dispose();
});
test('T-15: auth invalidation supersedes dialog and cannot discard or replay later', async () => {
  const s = setup(); s.register(); s.go(-2); await tick(); const old = s.asks[0];
  s.invalidate(); old(true); await tick(); assert.equal(s.host.location.pathname, '/B'); assert.equal(s.commits.length, 0); assert.equal(s.counts().discards, 0);
  s.coordinator.dispose();
});
test('T-15: superseded imperative decisions and disposed coordinators cannot publish late routes', async () => {
  const s = setup(); s.register();
  const first = s.coordinator.request('/first'), old = s.asks[0];
  const last = s.coordinator.request('/last'); old(true); s.asks.at(-1)(true);
  assert.equal(await first, false); assert.equal(await last, true); assert.deepEqual(s.commits, ['http://localhost/last']);
  s.coordinator.dispose();
  const p = setup(); p.register(); p.go(-2); await tick();
  let finish; p.finishGates.push(new Promise(resolve => { finish = resolve; })); p.asks[0](true); await tick();
  const traversals = p.traversals.length; p.coordinator.dispose(); finish(); await tick();
  assert.equal(p.commits.length, 0); assert.equal(p.counts().discards, 0); assert.equal(p.traversals.length, traversals);
});
for (const stage of ['committed', 'finished']) {
  test(`T-15: ${stage} restoration/replay failure preserves drafts/references without repair push`, async () => {
    for (const replay of [false, true]) {
      const s = setup(); s.register();
      if (!replay) s.failures.push(stage);
      s.go(-2); await tick();
      if (replay) { s.failures.push(stage); s.asks.at(-1)(true); await tick(); }
      assert.equal(s.counts().discards, 0); assert.equal(s.commits.length, 0); assert.equal(s.counts().pushes, 0); assert.equal(s.counts().unavailable, 1);
      assert.equal(s.coordinator.supported(), false); s.coordinator.dispose();
    }
  });
}
test('T-15: disappearing destination key blocks replay and does not delete private state', async () => {
  const s = setup(); s.register(); s.go(-2); await tick(); s.entries[0].key = 'changed';
  s.asks[0](true); await tick(); assert.equal(s.counts().discards, 0); assert.equal(s.commits.length, 0); assert.equal(s.counts().unavailable, 1);
  s.coordinator.dispose();
});
test('T-15: security invalidation during replay restores source without committing the old destination', async () => {
  const s = setup(); s.register(); s.go(-2); await tick();
  let release; s.finishGates.push(new Promise(resolve => { release = resolve; }));
  s.asks[0](true); await tick(); assert.equal(s.host.location.pathname, '/O'); assert.equal(s.counts().discards, 0);
  s.invalidate(); release(); await tick(); assert.equal(s.host.location.pathname, '/B'); assert.equal(s.commits.length, 0); assert.equal(s.counts().discards, 0);
  s.coordinator.dispose();
});
test('T-15: beforeunload only complements valid dirty captures, absent capabilities fail closed', () => {
  const s = setup(); s.register(); const event = new Event('beforeunload', { cancelable: true }); s.host.dispatchEvent(event); assert.ok(event.defaultPrevented);
  s.invalidate(); const after = new Event('beforeunload', { cancelable: true }); s.host.dispatchEvent(after); assert.equal(after.defaultPrevented, false);
  s.coordinator.dispose();
  delete s.host.navigation;
  const unsupported = createNavigationCoordinator(s.host, () => {}, () => false); unsupported.register(s.guard); assert.equal(unsupported.supported(), false); unsupported.dispose();
});
