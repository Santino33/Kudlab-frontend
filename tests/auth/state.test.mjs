import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, transition } from '../../src/auth/state.ts';

const user = { id: 'synthetic', email: 'teacher@example.edu.co', name: 'Ejemplo', role: 'TEACHER' };
test('initial access is checking without renderable identity', () => {
  assert.deepEqual(initialState(), { kind: 'checking', generation: 0, context: 'initial' });
});
test('suspension removes identity synchronously, without retaining the old snapshot', () => {
  const authenticated = { kind: 'authenticated', generation: 1, user, denied: false };
  const next = transition(authenticated, { kind: 'checking', generation: 2, context: 'session' });
  assert.equal(next.kind, 'checking');
  assert.equal('user' in next, false);
});
test('a prior generation cannot replace current access', () => {
  const state = { kind: 'checking', generation: 2, context: 'session' };
  assert.equal(transition(state, { kind: 'authenticated', generation: 1, user, denied: false }), state);
});
for (const [category, kind] of [['unauthenticated', 'signedOut'], ['forbidden', 'checking'], ['unavailable', 'checkUnavailable']]) {
  test(`US4 reducer: ${category} removes identity without inferring an account cause`, () => {
    const authenticated = { kind: 'authenticated', generation: 2, user, denied: false };
    const event = { kind: 'denial', generation: 2, category };
    const next = transition(authenticated, event);
    assert.equal(next.kind, kind); assert.equal('user' in next, false);
    assert.equal(transition(authenticated, { ...event, generation: 1 }), authenticated);
  });
}
test('US4 reducer: a denied operation notice survives successful session recheck', () => {
  const next = transition(initialState(), { kind: 'authenticated', generation: 1, user, denied: true });
  assert.equal(next.denied, true);
});
test('state reconstructs fields, discarding raw credentials in runtime events', () => {
  for (const event of [{ kind: 'checking', context: 'session' }, { kind: 'signedOut', reason: 'absent' },
    { kind: 'signingIn' }, { kind: 'signingOut' }, { kind: 'signOutUnconfirmed' },
    { kind: 'checkUnavailable', context: 'session' }, { kind: 'authenticated', user: { ...user, token: 'secret-marker' }, denied: false }]) {
    const next = transition(initialState(), { ...event, generation: 1, password: 'secret-marker', token: 'secret-marker' });
    assert.equal(JSON.stringify(next).includes('secret-marker'), false);
    if (event.kind !== 'authenticated') assert.equal('user' in next, false);
  }
});
