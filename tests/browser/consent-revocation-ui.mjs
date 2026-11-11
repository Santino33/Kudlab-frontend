// Chromium + production UI. All API requests intercepted: no Backend, R2 or personal data.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { Browser } from './vendor/cdp.mjs';
const origin = process.env.CONSENT_FRONTEND_ORIGIN ?? 'http://localhost:5212';
const api = process.env.CONSENT_API_ORIGIN ?? 'http://localhost:3212';
assert.equal(new URL(origin).hostname, 'localhost'); assert.equal(new URL(api).hostname, 'localhost');
const output = process.env.TASTE_SKILL_TMP ?? '/tmp/opencode/consent-revocation-ui';
await mkdir(output, { recursive: true }); process.env.TASTE_SKILL_TMP = output;
const id = '00000000-0000-4000-8000-000000000001', group = '00000000-0000-4000-8000-000000000002';
const record = { id, signedOn: '2026-01-01', receivedOn: '2026-01-01', mediaType: 'image/png', byteSize: 1, sha256: 'a'.repeat(64) };
const student = { id, groupId: group, studentCode: 'SYNTHETIC-C', firstName: 'Persona', lastName: 'Ficticia', isActive: true };
let version = 1, state = 'CURRENT', currentRecord = record, denied = false, mode = 'normal';
let writes = [], reads = 0, assignments = 0;
const operations = new Map(), events = [{ id, type: 'REGISTER', version, record, previousRecordId: null, author: { id, name: 'Docente ficticio' }, occurredAt: '2026-11-09T12:00:00.000Z', reason: null }];
const snapshot = () => ({ student, consent: { state, version, currentRecord }, evaluatedAt: '2026-11-09T12:00:00.000Z' });
const browser = await Browser.launch(), page = await browser.newPage();
const inFlight = new Set(); let stopIntercepting, interceptionError;
async function wait(predicate) { await page.eval(async source => { const fn = (0, eval)(`(${source})`); for (let i = 0; i < 250; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 20)); } throw new Error('UI condition absent: ' + source); }, predicate.toString()); }
const click = text => page.eval(async text => { for (let i = 0; i < 250; i++) { const el = [...document.querySelectorAll('button')].find(el => el.textContent === text); if (el && !el.disabled) { el.click(); return; } await new Promise(r => setTimeout(r, 20)); } throw new Error('Button unavailable: ' + text); }, text);
const fill = (id, value) => page.eval(({ id, value }) => { const el = document.getElementById(id); Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }, { id, value });
const ready = () => wait(() => document.getElementById('consent-revoke') && !document.getElementById('consent-revoke').disabled);
const open = async () => { await ready(); await click('Revocar consentimiento'); await wait(() => document.querySelector('[role="alertdialog"]')); };
const enter = async () => { await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 }); await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); };
try {
  await page.send('Fetch.enable', { patterns: [{ urlPattern: api + '/*', requestStage: 'Request' }] });
  const intercept = async event => {
    const path = new URL(event.request.url).pathname;
    let status = 200, data;
    if (event.request.method === 'OPTIONS') data = {};
    else if (path.endsWith('/get-session')) data = { user: { id, email: 'ficticio@example.edu.co', name: 'Docente ficticio', role: 'TEACHER' }, session: { id: 'mock', expiresAt: '2099-01-01T00:00:00.000Z' } };
    else if (denied) { status = 404; data = { code: 'NOT_FOUND' }; }
    else if (path.endsWith('/revocations')) {
      const body = JSON.parse(event.request.postData); writes.push(body);
      if (mode === 'stale') { version++; status = 409; data = { code: 'CONFLICT', fields: [{ field: 'operation', reason: 'STALE_VERSION' }] }; }
      else if (mode === 'absent') { status = 503; data = { code: 'UNAVAILABLE' }; }
      else {
        assert.equal(body.expectedVersion, version); assert.equal(body.recordId, currentRecord.id);
        state = 'REVOKED'; version++;
        const acknowledgement = { requestId: body.requestId, eventId: crypto.randomUUID(), recordId: currentRecord.id, version, confirmedAt: '2026-11-09T12:10:00.000Z', repeated: false };
        operations.set(body.requestId, { requestId: body.requestId, action: 'REVOKE', status: 'COMMITTED', acknowledgement: { ...acknowledgement, repeated: true },
          attempt: { expectedVersion: body.expectedVersion, signedOn: null, receivedOn: null, mediaType: null, byteSize: null, sha256: null }, rejectionCode: null });
        events.unshift({ id: acknowledgement.eventId, type: 'REVOKE', version, record: currentRecord, previousRecordId: null, author: { id, name: 'Docente ficticio' }, occurredAt: acknowledgement.confirmedAt, reason: body.reason });
        if (mode === 'lost') { status = 503; data = { code: 'UNAVAILABLE' }; } else data = { acknowledgement, snapshot: snapshot() };
      }
    } else if (path.includes('/operations/')) { reads++; data = operations.get(path.split('/').at(-1)); if (!data) { status = 404; data = { code: 'NOT_FOUND' }; } }
    else if (path.endsWith('/consents/history')) data = { items: events, nextCursor: null };
    else if (path.endsWith('/document')) { status = 503; data = { code: 'UNAVAILABLE' }; }
    else if (path.endsWith('/consents') && event.request.method === 'POST') throw new Error('Unexpected register: old draft must not send');
    else if (path.endsWith('/consents')) data = snapshot();
    else if (path.endsWith(`/students/${id}`)) data = student;
    else if (path.endsWith('/task-assignments')) { assignments++; data = { items: [], nextCursor: null }; }
    else if (path.endsWith('/observations')) data = { items: [], nextCursor: null };
    else { status = 404; data = { code: 'NOT_FOUND' }; }
    await page.send('Fetch.fulfillRequest', { requestId: event.requestId, responseCode: status, responseHeaders: [
      { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Credentials', value: 'true' },
      { name: 'Access-Control-Allow-Headers', value: 'content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
    ], body: Buffer.from(JSON.stringify(data)).toString('base64') }).catch(error => {
      // Superseded reads can be aborted by App before CDP fulfils the interception.
      if (!error.message.includes('Invalid InterceptionId')) throw error;
    });
  };
  stopIntercepting = browser.on(page.sessionId, 'Fetch.requestPaused', event => {
    const task = intercept(event); inFlight.add(task);
    task.then(() => inFlight.delete(task), error => { inFlight.delete(task); interceptionError ??= error; });
  });
  await page.goto(`${origin}/academico/estudiantes/${id}`, { settleMs: 100 }); await ready();
  await writeFile(`${output}/ficticio.png`, 'never uploaded');
  const doc = await page.send('DOM.getDocument'), input = await page.send('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#consent-file' });
  await page.send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [`${output}/ficticio.png`] });
  await fill('consent-signedOn', '2026-01-01'); await fill('consent-receivedOn', '2026-01-01');
  await open(); await wait(() => document.activeElement.textContent === 'Cancelar');
  await enter(); await wait(() => !document.querySelector('[role="alertdialog"]'));
  assert.equal(writes.length, 0); assert.equal(await page.eval(() => document.activeElement.id), 'consent-revoke');
  await open(); await click('Confirmar revocación');
  await wait(() => document.getElementById('consent-reason-error').textContent.includes('Escribe el motivo'));
  assert.equal(writes.length, 0); assert.equal(await page.eval(() => document.activeElement.id), 'consent-reason');
  await fill('consent-reason', 'El acudiente ficticio comunicó el retiro del consentimiento.');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewport({ width, height: 900 });
    assert.equal(await page.eval(() => { const el = document.querySelector('[role="alertdialog"]'); return el.scrollWidth <= el.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth; }), true);
    await page.screenshot({ path: `${output}/dialog-${width}.png`, format: 'png' });
  }
  await page.setViewport({ width: 768, height: 900 }); await page.eval(() => { document.documentElement.style.fontSize = '200%'; });
  assert.equal(await page.eval(() => { const el = document.querySelector('[role="alertdialog"]'); return el.scrollWidth <= el.clientWidth + 1; }), true);
  await page.screenshot({ path: `${output}/dialog-text-200.png`, format: 'png' });
  await page.eval(() => [...document.querySelectorAll('[role="alertdialog"] button')].find(el => el.textContent === 'Confirmar revocación').focus());
  assert.equal(await page.eval(() => { const r = document.activeElement.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), true);
  await page.screenshot({ path: `${output}/dialog-text-200-controls.png`, format: 'png' });
  await page.eval(() => { document.documentElement.style.fontSize = ''; }); await page.setViewport({ width: 1440, height: 900 });
  const ax = await page.send('Accessibility.getFullAXTree');
  assert.ok(ax.nodes.some(n => n.role?.value === 'textbox' && n.name?.value === 'Motivo o referencia de la comunicación'));
  assert.equal(await page.eval(() => [...document.querySelectorAll('[role="alertdialog"] button')].every(el => el.getBoundingClientRect().height >= 44)), true);
  // Keyboard traversal stays in the modal, including Shift+Tab from Cancel to the reason.
  await page.eval(() => [...document.querySelectorAll('[role="alertdialog"] button')].find(el => el.textContent === 'Cancelar').focus());
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
  assert.equal(await page.eval(() => document.activeElement.id), 'consent-reason');
  const previousAssignments = assignments;
  await page.eval(() => { const form = document.getElementById('consent-reason').form; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  await wait(() => document.body.textContent.includes('La revocación se guardó.') && document.body.textContent.includes('Motivo: El acudiente'));
  assert.equal(writes.length, 1); assert.ok(assignments > previousAssignments);
  assert.ok(await page.eval(() => document.body.textContent.includes('Documento seleccionado: ficticio.png') && document.body.textContent.includes('El consentimiento cambió mientras')));
  assert.equal(await page.eval(() => [...document.querySelectorAll('button')].find(el => el.textContent === 'Registrar nuevo documento').disabled), true);
  await click('Descargar'); await wait(() => document.body.textContent.includes('Este problema de descarga no modifica el consentimiento registrado.'));
  assert.ok(await page.eval(() => [...document.querySelectorAll('.account-status')].some(el => el.textContent === 'Revocado')));
  // Another tab renews; a stale modal is rejected and must be deliberately reopened.
  state = 'CURRENT'; version++; await click('Actualizar estado'); await ready();
  await open(); await fill('consent-reason', 'Motivo ficticio de conflicto'); mode = 'stale'; await click('Confirmar revocación');
  await wait(() => document.body.textContent.includes('La información cambió mientras completabas el formulario.'));
  await ready(); assert.equal(writes.length, 2);
  // Lost response after commit: same handle reconciles across a full reload, with no replay.
  mode = 'lost'; await open(); await fill('consent-reason', 'Motivo ficticio de respuesta perdida'); await click('Confirmar revocación');
  await wait(() => document.body.textContent.includes('No pudimos comprobar si la revocación se guardó'));
  const stored = await page.eval(() => JSON.parse(sessionStorage.getItem('kudlab.consent-operation')));
  assert.deepEqual(Object.keys(stored).sort(), ['actorId', 'requestId', 'studentId']); assert.equal(writes.length, 3);
  await page.goto(`${origin}/academico/estudiantes/${id}`, { settleMs: 100 });
  await wait(() => document.body.textContent.includes('La revocación se guardó.'));
  assert.equal(writes.length, 3); assert.equal(reads, 1); assert.equal(await page.eval(() => sessionStorage.getItem('kudlab.consent-operation')), null);
  // Absent operation is uncertain, explicit retry retains the very same key and payload.
  state = 'CURRENT'; version++; await click('Actualizar estado'); await ready();
  mode = 'absent'; await open(); await fill('consent-reason', 'Motivo ficticio de reenvío'); await click('Confirmar revocación');
  await wait(() => document.body.textContent.includes('No pudimos comprobar si la revocación se guardó'));
  await click('Comprobar si se guardó'); await wait(() => document.body.textContent.includes('Revisar reenvío de revocación'));
  assert.equal(writes.length, 4); mode = 'normal'; await click('Revisar reenvío de revocación'); await click('Reenviar la misma revocación');
  await wait(() => document.body.textContent.includes('La revocación se guardó.'));
  assert.equal(writes.length, 5); assert.deepEqual(writes[3], writes[4]);
  // Suspension removes the dialog; same fresh scope restores reason but never auto-opens/auto-sends.
  state = 'CURRENT'; version++; await click('Actualizar estado'); await ready();
  await open(); await fill('consent-reason', 'Borrador privado ficticio');
  await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await wait(() => !document.getElementById('consent-reason') && !document.getElementById('consent-file'));
  await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await ready(); assert.equal(await page.eval(() => Boolean(document.querySelector('[role="alertdialog"]'))), false);
  await open(); assert.equal(await page.eval(() => document.getElementById('consent-reason').value), 'Borrador privado ficticio');
  denied = true; await click('Confirmar revocación');
  await wait(() => !document.getElementById('consent-reason') && !document.getElementById('consent-file'));
  assert.equal(await page.eval(() => sessionStorage.getItem('kudlab.consent-operation')), null);
  await writeFile(`${output}/report.json`, JSON.stringify({ ok: true, backendRequests: 0, writes: writes.length, lookups: reads,
    checks: ['safe cancel focus', 'required reason', 'duplicate submit', 'responsive 1440/768/390/320', 'text 200%', 'AX label and 44px buttons', 'keyboard traversal',
      'active preserved/assignments refreshed', 'document draft preserved/stale review required', 'download failure preserves state', 'stale dialog conflict',
      'full reload reconciles committed revocation without POST', 'absent operation explicit same-key retry', 'suspend withdraws dialog/no auto-open', 'scope loss purges'] }, null, 2));
  console.log(JSON.stringify({ ok: true, report: `${output}/report.json` }));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, format: 'png' });
  console.error(await page.eval(() => ({ focus: document.activeElement?.outerHTML, dialog: document.querySelector('[role="alertdialog"]')?.outerHTML })));
  throw error;
} finally {
  stopIntercepting?.(); await Promise.allSettled([...inFlight]); await browser.close();
  if (interceptionError) throw interceptionError;
}
