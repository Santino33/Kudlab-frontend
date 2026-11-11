import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotesApi, localNotesAccess, noteConflict } from '../../src/features/academico/notes/api.ts';
import { decodeNoteFields, noteIssues, parseNote, parseNotesList, scoreIssue } from '../../src/features/academico/notes/types.ts';
import { createHttpClient } from '../../src/lib/http.ts';

const student = '00000000-0000-4000-8000-000000000001';
const noteId = '00000000-0000-4000-8000-0000000000a1';
const note = { id: noteId, subject: 'LENGUAJE', term: 1, score: '4.5', version: 1, authorName: 'Docente ficticio', updatedAt: '2026-11-10T12:00:00.000Z',
  revisions: [{ version: 1, score: '4.5', authorName: 'Docente ficticio', recordedAt: '2026-11-10T12:00:00.000Z' }] };
const signal = () => new AbortController().signal;

function fixture(respond) {
  const calls = [], events = [];
  const controller = { getGeneration: () => 1, notify: (value) => events.push(value) };
  const http = createHttpClient('http://localhost:3000', localNotesAccess(controller), async (url, init) => {
    calls.push({ url, init }); return respond(url, init);
  });
  return { api: createNotesApi(http), calls, events };
}
const json = (status, data) => () => Response.json(data, { status });

test('score validation mirrors the server scale (CA-03)', () => {
  for (const ok of ['1', '1.0', '4.5', '5', '5.0', ' 4.5 ']) assert.equal(scoreIssue(ok), undefined, ok);
  for (const bad of ['0', '0.0', '0.9', '5.1', '6', '4.25', '4,5', 'abc', '', '  ', '-1', '4.'])
    assert.ok(scoreIssue(bad), bad);
  assert.deepEqual(Object.keys(noteIssues({ scoreText: '' })), ['subject', 'term', 'score']);
  assert.deepEqual(noteIssues({ subject: 'LENGUAJE', term: 2, scoreText: '3.0' }), {});
});

test('strict parsers reject extra keys, bad scores and inconsistent revisions', () => {
  assert.ok(parseNote(note));
  assert.equal(parseNote({ ...note, extra: 1 }), undefined);
  assert.equal(parseNote({ ...note, score: '5.1', revisions: [{ ...note.revisions[0], score: '5.1' }] }), undefined);
  assert.equal(parseNote({ ...note, score: '4.0' }), undefined, 'last revision must match the current score');
  assert.equal(parseNote({ ...note, subject: 'ARTES' }), undefined);
  assert.equal(parseNote({ ...note, term: 5 }), undefined);
  assert.ok(parseNotesList({ schoolYear: 2026, items: [note] }));
  assert.equal(parseNotesList({ schoolYear: 2026.5, items: [] }), undefined);
  assert.equal(parseNotesList({ schoolYear: 2026, items: [note, { ...note, id: '00000000-0000-4000-8000-0000000000a2' }] }), undefined, 'duplicate area/term');
});

test('routes, bodies and strict success decoding', async () => {
  const list = fixture(json(200, { schoolYear: 2026, items: [note] }));
  const listed = await list.api.list(student, signal());
  assert.equal(listed.kind, 'success');
  assert.equal(list.calls[0].url, `http://localhost:3000/api/v1/students/${student}/academic-notes`);
  assert.equal(list.calls[0].init.method, 'GET');

  const create = fixture(json(201, { ...note, score: '5.0', revisions: [{ ...note.revisions[0], score: '5.0' }] }));
  assert.equal((await create.api.create(student, { subject: 'LENGUAJE', term: 1, scoreText: ' 5 ' }, signal())).kind, 'success');
  assert.deepEqual(JSON.parse(create.calls[0].init.body), { subject: 'LENGUAJE', term: 1, score: '5' });
  const mismatch = fixture(json(201, { ...note, term: 2 }));
  assert.equal((await mismatch.api.create(student, { subject: 'LENGUAJE', term: 1, scoreText: '4.5' }, signal())).kind, 'unavailable');

  const next = { ...note, score: '3.0', version: 2, revisions: [...note.revisions, { version: 2, score: '3.0', authorName: 'Docente ficticio', recordedAt: '2026-11-10T13:00:00.000Z' }] };
  const update = fixture(json(200, next));
  assert.equal((await update.api.update(student, note, '3', signal())).kind, 'success');
  assert.equal(update.calls[0].url, `http://localhost:3000/api/v1/students/${student}/academic-notes/${noteId}`);
  assert.equal(update.calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(update.calls[0].init.body), { score: '3', expectedVersion: 1 });
});

test('invalid identifiers never reach the network', async () => {
  const f = fixture(json(200, {}));
  for (const result of [await f.api.list('x', signal()), await f.api.create('x', { subject: 'LENGUAJE', term: 1, scoreText: '4' }, signal())])
    assert.deepEqual([result.kind, result.status, result.code], ['error', 404, 'NOT_FOUND']);
  assert.equal(f.calls.length, 0);
});

test('closed field decoder: only documented code+field+reason combinations, fixed messages', async () => {
  assert.deepEqual(decodeNoteFields({ code: 'INVALID_INPUT', fields: [{ field: 'score', reason: 'out_of_range' }] }),
    [{ field: 'score', reason: 'La nota debe estar entre 1.0 y 5.0.' }]);
  assert.deepEqual(decodeNoteFields({ code: 'INVALID_INPUT', fields: [{ field: 'score', reason: 'inactive' }, { field: 'x', reason: 'required' }, { field: 'score', reason: 'required', extra: 1 }] }), []);
  assert.deepEqual(decodeNoteFields({ code: 'CONFLICT', fields: [{ field: 'score', reason: 'out_of_range' }] }), []);
  assert.deepEqual(decodeNoteFields({ fields: { score: 'required' } }), []);
  const sneaky = decodeNoteFields({ code: 'INVALID_INPUT', message: 'texto del servidor', fields: [{ field: 'score', reason: 'required' }] });
  assert.ok(!sneaky[0].reason.includes('servidor'));
});

test('409 conflicts are classified only by their closed combination', async () => {
  for (const [field, reason, expected] of [['note', 'already_exists', 'exists'], ['student', 'inactive', 'inactive'], ['version', 'stale', 'stale']]) {
    const f = fixture(json(409, { code: 'CONFLICT', message: 'x', fields: [{ field, reason }] }));
    const result = await f.api.create(student, { subject: 'LENGUAJE', term: 1, scoreText: '4' }, signal());
    assert.equal(noteConflict(result), expected);
    assert.equal(result.uncertain, false);
  }
  const unknown = fixture(json(409, { code: 'CONFLICT', message: 'x', fields: [{ field: 'note', reason: 'other' }] }));
  assert.equal(noteConflict(await unknown.api.list(student, signal())), undefined);
});

test('local access forwards 401/403 but never unavailable (CA-10, CA-14)', async () => {
  const denied = fixture(json(403, { code: 'FORBIDDEN', message: 'x' }));
  assert.equal((await denied.api.list(student, signal())).kind, 'error');
  assert.deepEqual(denied.events, [{ generation: 1, category: 'forbidden' }]);
  const unauth = fixture(json(401, { code: 'UNAUTHENTICATED', message: 'x' }));
  await unauth.api.list(student, signal());
  assert.deepEqual(unauth.events, [{ generation: 1, category: 'unauthenticated' }]);

  const down = fixture(json(503, { code: 'UNAVAILABLE', message: 'x' }));
  const read = await down.api.list(student, signal());
  assert.deepEqual([read.kind, read.status ?? read.uncertain], ['error', 503]);
  assert.deepEqual(down.events, [], '5xx must not unmount the page');

  const offline = fixture(() => { throw new TypeError('network'); });
  assert.deepEqual(await offline.api.list(student, signal()), { kind: 'unavailable', uncertain: false });
  const lost = await offline.api.create(student, { subject: 'LENGUAJE', term: 1, scoreText: '4' }, signal());
  assert.deepEqual(lost, { kind: 'unavailable', uncertain: true });
  assert.deepEqual(offline.events, []);

  const badBody = fixture(() => new Response('no json', { status: 200, headers: { 'content-type': 'application/json' } }));
  assert.equal((await badBody.api.list(student, signal())).kind, 'unavailable');
  assert.deepEqual(badBody.events, []);
});

test('a stale generation yields obsolete results', async () => {
  let generation = 1;
  const calls = [];
  const http = createHttpClient('http://localhost:3000', localNotesAccess({ getGeneration: () => generation, notify: () => {} }),
    async () => { generation = 2; return Response.json({ schoolYear: 2026, items: [] }); });
  assert.deepEqual(await createNotesApi(http).list(student, signal()), { kind: 'obsolete' });
  assert.equal(calls.length, 0);
});
