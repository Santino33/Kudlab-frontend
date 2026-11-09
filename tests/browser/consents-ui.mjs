// Real browser, synthetic HTTP only: every API request is fulfilled here, never sent to Backend/R2.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { Browser } from './vendor/cdp.mjs';
const origin = process.env.CONSENT_FRONTEND_ORIGIN ?? 'http://localhost:5212';
const api = process.env.CONSENT_API_ORIGIN ?? 'http://localhost:3212';
assert.equal(new URL(origin).hostname, 'localhost'); assert.equal(new URL(api).hostname, 'localhost');
const output = process.env.TASTE_SKILL_TMP ?? '/tmp/opencode/consent-ui-mock'; await mkdir(output, { recursive: true }); process.env.TASTE_SKILL_TMP = output;
const id = '00000000-0000-4000-8000-000000000001', group = '00000000-0000-4000-8000-000000000002';
let student = { id, groupId: group, studentCode: 'SYNTHETIC', firstName: 'Persona', lastName: 'Ficticia', isActive: false };
let historyCalls = 0, writes = 0, recovered = false, lookups = 0;
const record = { id, signedOn: '2026-01-01', receivedOn: '2026-01-01', mediaType: 'image/png', byteSize: 1, sha256: 'a'.repeat(64) };
const browser = await Browser.launch(), page = await browser.newPage();
async function wait(predicate) { await page.eval(async source => { const fn = (0, eval)(`(${source})`); for (let i = 0; i < 200; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 20)); } throw new Error('UI condition absent'); }, predicate.toString()); }
try {
  await page.send('Fetch.enable', { patterns: [{ urlPattern: api + '/*', requestStage: 'Request' }] });
  browser.on(page.sessionId, 'Fetch.requestPaused', async event => {
    const path = new URL(event.request.url).pathname;
    let status = 200, data;
    if (event.request.method === 'OPTIONS') data = {};
    else if (path.endsWith('/get-session')) data = { user: { id, email: 'ficticio@example.edu.co', name: 'Docente ficticio', role: 'TEACHER' }, session: { id: 'mock', expiresAt: '2099-01-01T00:00:00.000Z' } };
    else if (path.endsWith('/consents/history')) { historyCalls++; status = 404; data = { code: 'NOT_FOUND' }; }
    else if (path.includes('/operations/')) {
      lookups++;
      if (recovered) data = { requestId: id, status: 'COMMITTED', acknowledgement: { requestId: id, eventId: id, recordId: id, version: 1, confirmedAt: '2026-01-01T00:00:00.000Z', repeated: true },
        attempt: { expectedVersion: 0, signedOn: record.signedOn, receivedOn: record.receivedOn, mediaType: record.mediaType, byteSize: record.byteSize, sha256: record.sha256 }, rejectionCode: null };
      else { status = 404; data = { code: 'NOT_FOUND' }; }
    }
    else if (path.endsWith('/consents') && event.request.method === 'POST') { writes++; status = 503; data = { code: 'UNAVAILABLE' }; }
    else if (path.endsWith('/consents')) data = { student, consent: recovered ? { state: 'CURRENT', version: 1, currentRecord: record } : { state: 'NONE', version: 0, currentRecord: null }, evaluatedAt: '2026-01-01T00:00:00.000Z' };
    else if (path.endsWith('/task-assignments')) data = { items: [], nextCursor: null };
    else { status = 404; data = { code: 'NOT_FOUND' }; }
    await page.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [
      { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Credentials', value: 'true' },
      { name: 'Access-Control-Allow-Headers', value: 'content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
    ], body: Buffer.from(JSON.stringify(data)).toString('base64') });
  });
  await page.goto(`${origin}/academico/estudiantes/${id}`, { settleMs: 100 });
  await wait(() => document.body.textContent.includes('El historial no está actualizado') && ![...document.querySelectorAll('button')].find(e => e.textContent === 'Actualizar estado')?.disabled);
  await page.eval(() => new Promise(r => setTimeout(r, 150)));
  assert.equal(historyCalls, 2, 'one academic recheck, no automatic 404 loop');
  await writeFile(`${output}/synthetic.png`, 'synthetic bytes, never uploaded');
  const doc = await page.send('DOM.getDocument'), input = await page.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#consent-file' });
  await page.send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [`${output}/synthetic.png`] });
  await page.eval(() => {
    for (const id of ['consent-signedOn', 'consent-receivedOn']) { const input = document.getElementById(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '2026-01-01'); input.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await page.eval(() => { const form = document.getElementById('consent-file').form; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await wait(() => document.body.textContent.includes('No pudimos confirmar el guardado'));
  assert.equal(writes, 1, 'same-turn duplicate submit is blocked');
  student = { ...student, groupId: '00000000-0000-4000-8000-000000000003' };
  await wait(() => ![...document.querySelectorAll('button')].find(e => e.textContent === 'Actualizar estado')?.disabled);
  await page.eval(() => [...document.querySelectorAll('button')].find(e => e.textContent === 'Actualizar estado').click());
  await wait(() => !document.body.textContent.includes('Archivo retenido: synthetic.png') && Boolean(document.getElementById('consent-file')));
  assert.equal(await page.eval(() => document.getElementById('consent-signedOn').value), '');
  assert.equal(await page.eval(() => sessionStorage.getItem('kudlab.consent-operation')), null);
  recovered = true;
  await page.eval(id => sessionStorage.setItem('kudlab.consent-operation', JSON.stringify({ actorId: id, studentId: id, requestId: id })), id);
  await page.goto(`${origin}/academico/estudiantes/${id}`, { settleMs: 100 });
  await wait(() => document.body.textContent.includes('Consentimiento registrado.'));
  assert.equal(await page.eval(() => sessionStorage.getItem('kudlab.consent-operation')), null);
  assert.equal(await page.eval(() => document.getElementById('consent-file').files.length), 0);
  assert.equal(lookups, 1); assert.equal(writes, 1);
  console.log(JSON.stringify({ ok: true, backendRequests: 0, checks: ['history 404 bounded', 'duplicate submit blocked', 'changed group purges File/dates/handle', 'full reload reconciles minimal handle after fresh scope without POST replay'] }));
} finally { await browser.close(); }
