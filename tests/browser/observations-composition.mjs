// Real App/AuthRoot/host and components, synthetic transports only. No live API/DB acceptance.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { Browser } from './vendor/cdp.mjs';
const origin = process.env.OBSERVATIONS_COMPOSITION_ORIGIN ?? 'http://127.0.0.1:5843';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const output = process.env.TASTE_SKILL_TMP ?? '/tmp/opencode/observaciones-composition-ui';
await mkdir(output, { recursive: true }); process.env.TASTE_SKILL_TMP = output;
const browser = await Browser.launch(), page = await browser.newPage(), checks = [];
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, group = uuid(20), student = uuid(1);
const harness = `${origin}/tests/browser/observations-composition.html`;
async function wait(predicate) {
  await page.eval(source => new Promise((resolve, reject) => {
    const predicate = (0, eval)(`(${source})`), deadline = performance.now() + 15000;
    function check() { if (predicate()) resolve(); else if (performance.now() >= deadline) reject(Error('Condition absent: ' + source)); else requestAnimationFrame(check); }
    check();
  }), predicate.toString());
}
async function button(text, scope = '') { await page.eval(({ text, scope }) => {
  const el = [...(scope ? document.querySelector(scope) : document).querySelectorAll('button')].find(el => el.textContent === text && !el.disabled);
  if (!el) throw Error('Missing enabled button ' + text); el.click();
}, { text, scope }); }
async function set(id, value) { await page.eval(({ id, value }) => {
  const el = document.getElementById(id); if (!el) throw Error('Missing ' + id);
  Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}, { id, value }); }
async function fill(prefix = 'observation') { for (const [key, value] of Object.entries({ behavior: 'ATTENTION', observedOn: '2026-01-01', schoolYear: '2025', term: '1' })) await set(`${prefix}-${key}`, value); }
async function fresh(path, extra = '') { await page.goto(`${harness}?path=${encodeURIComponent(path)}${extra}`, { settleMs: 100 }); }
async function ready() { await wait(() => document.getElementById('observation-frequency') && !document.getElementById('observation-frequency').disabled); }
async function show() { await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); }
async function hide() { await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))); await wait(() => !document.getElementById('observation-frequency') && !document.getElementById('matrix-behavior')); }
async function data() { return page.eval(() => ({ calls: observationComposition.model.calls, rows: observationComposition.model.rows, state: observationComposition.controller.getSnapshot().kind })); }
try {
  await fresh(`/academico/estudiantes/${student}`); await ready();
  assert.ok(await page.eval(() => Boolean(document.getElementById('consent-file')) && document.body.textContent.includes('Ver indicadores del estudiante') && document.body.textContent.includes('Asignaciones')));
  await fill(); await set('observation-frequency', 'SOMETIMES');
  await page.eval(() => { window.compositionField = document.getElementById('observation-frequency'); compositionField.focus(); });
  await button('Actualizar estado'); await ready();
  assert.ok(await page.eval(() => document.getElementById('observation-frequency') === compositionField && compositionField.value === 'SOMETIMES'));
  checks.push('general StudentDetail mounts observations alongside consent/tasks/indicators; local refresh retains instance and values');

  const beforeFallback = (await data()).calls.filter(c => c.path === `/api/v1/students/${student}`).length;
  await page.eval(() => { observationComposition.model.mode = 'consentFailed'; }); await button('Actualizar estado');
  await wait(() => document.body.textContent.includes('No se pudo comprobar el consentimiento.'));
  assert.equal(await page.eval(() => document.getElementById('observation-frequency').disabled), true);
  assert.ok((await data()).calls.filter(c => c.path === `/api/v1/students/${student}`).length > beforeFallback);
  assert.ok(await page.eval(() => document.body.textContent.includes('Historial de observaciones') && document.getElementById('observation-frequency') === compositionField));
  checks.push('isolated consent failure uses fresh academic fallback and preserves history/draft, never CURRENT');

  await page.eval(() => { observationComposition.model.mode = 'ready'; }); await button('Actualizar estado'); await ready();
  await button('Descargar'); await wait(() => document.body.textContent.includes('Su estado no ha cambiado.')); await ready();
  assert.equal(await page.eval(() => document.getElementById('observation-frequency').value), 'SOMETIMES');
  checks.push('isolated document 404 does not purge observations');

  await page.eval(() => { observationComposition.model.mode = 'pendingWrite'; }); await button('Guardar observación');
  await wait(() => observationComposition.hasPendingWrite());
  assert.equal((await data()).rows.length, 1); await hide();
  await page.eval(() => { observationComposition.model.mode = 'ready'; observationComposition.releaseWrite(); }); await show();
  await wait(() => document.body.textContent.includes('Resultado sin confirmar'));
  assert.equal((await data()).calls.filter(c => c.method === 'POST').length, 1);
  assert.equal(await page.eval(() => document.getElementById('observation-frequency').value), 'SOMETIMES');
  checks.push('AuthRoot pagehide withdraws DOM; fresh same-scope restore keeps uncertain attempt, no stale success or replay');
  await page.eval(() => { observationComposition.model.active = false; observationComposition.model.consent = 'REVOKED'; }); await button('Actualizar estado');
  await wait(() => document.body.textContent.includes('Estudiante inactivo: solo consulta histórica.'));
  await button('Comprobar intento', '[aria-labelledby="observations-title"]'); await wait(() => document.body.textContent.includes('Guardado confirmado'));
  assert.equal((await data()).calls.filter(c => c.method === 'POST').length, 1);
  checks.push('inactivation/revocation after uncertain write blocks new writes but receipt can confirm original commit');

  await wait(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Actualizar historial' && !b.disabled));
  await page.eval(() => { observationComposition.model.mode = 'observationDenied'; }); await button('Actualizar historial');
  await wait(() => !document.getElementById('observation-frequency') && document.body.textContent.includes('No encontramos el recurso'));
  const deniedCalls = (await data()).calls.filter(c => c.path.endsWith('/observations')).length;
  await page.eval(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  assert.equal((await data()).calls.filter(c => c.path.endsWith('/observations')).length, deniedCalls, 'denial stays stopped before explicit retry');
  await page.eval(() => { observationComposition.model.mode = 'ready'; }); await button('Reintentar consulta');
  await wait(() => document.getElementById('observation-frequency'));
  assert.equal(await page.eval(() => document.getElementById('observation-frequency').value), '');
  const retriedCalls = (await data()).calls.filter(c => c.path.endsWith('/observations')).length - deniedCalls;
  assert.ok(retriedCalls >= 1 && retriedCalls <= 3, 'only bounded initial reads (including StrictMode) after explicit retry');
  checks.push('academic observation 404 purges selection and stops; explicit retry opens empty draft, no denial loop');

  await fresh(`/academico/cursos/${group}/estudiantes/${student}`); await ready();
  await fill(); await set('observation-frequency', 'ALWAYS');
  assert.ok(await page.eval(() => document.body.textContent.includes('Curso de prueba')));
  const oldFallback = (await data()).calls.filter(c => c.path === `/api/v1/students/${student}`).length;
  await page.eval(() => { observationComposition.model.mode = 'consentDenied'; }); await button('Actualizar estado');
  await wait(() => !document.getElementById('observation-frequency') && document.body.textContent.includes('No encontramos el recurso'));
  assert.equal((await data()).calls.filter(c => c.path === `/api/v1/students/${student}`).length, oldFallback);
  checks.push('course StudentDetail mounts same section; consent academic 404 never falls back');
  await page.eval(() => { observationComposition.model.mode = 'ready'; }); await button('Reintentar consulta'); await ready();
  assert.equal(await page.eval(() => document.getElementById('observation-frequency').value), '');
  await fill(); await set('observation-frequency', 'ALWAYS');
  await page.eval(() => { observationComposition.model.mode = 'assignmentsFailed'; }); await button('Actualizar estado');
  await wait(() => observationComposition.controller.getSnapshot().kind === 'checkUnavailable' && !document.getElementById('observation-frequency'));
  await page.eval(() => { observationComposition.model.mode = 'ready'; observationComposition.controller.retry(); }); await ready();
  assert.equal(await page.eval(() => document.getElementById('observation-frequency').value), 'ALWAYS');
  checks.push('503 from existing global tasks client seals draft; fresh authorized retry restores it');

  await hide(); await page.eval(() => { observationComposition.model.actorId = '00000000-0000-4000-8000-000000000041'; }); await show(); await ready();
  assert.equal(await page.eval(() => document.getElementById('observation-frequency').value), '');
  checks.push('changed authenticated actor cannot inherit previous actor payload');

  await fresh(`/academico/cursos/${group}`); await wait(() => [...document.querySelectorAll('a')].some(a => a.textContent === 'Registrar observaciones'));
  await page.eval(() => [...document.querySelectorAll('a')].find(a => a.textContent === 'Registrar observaciones').click());
  await wait(() => document.getElementById('matrix-behavior'));
  assert.ok((await data()).calls.some(c => c.path === `/api/v1/groups/${group}/students`));
  assert.equal((await data()).calls.some(c => c.path === '/api/v1/students'), false);
  await fill('matrix'); await set(`matrix-frequency-${uuid(1)}`, 'SOMETIMES'); await set(`matrix-frequency-${uuid(2)}`, 'ALWAYS');
  await hide(); await show(); await wait(() => document.getElementById('matrix-behavior')?.value === 'ATTENTION');
  assert.equal(await page.eval(() => document.getElementById('matrix-schoolYear').value), '2025');
  await button('Guardar filas valoradas'); await wait(() => document.body.textContent.includes('Revisa el resultado de cada estudiante.'));
  assert.equal((await data()).rows.length, 2); assert.equal((await data()).calls.filter(c => c.method === 'POST').length, 2);
  checks.push('teacher course action reaches App matrix; scoped full roster, same-host restoration and two independent writes');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewport({ width, height: 900 }); assert.ok(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), `matrix overflow ${width}`);
    await page.screenshot({ path: `${output}/matrix-${width}.png`, format: 'png', fullPage: true });
  }

  await fresh(`/academico/cursos/${group}/observaciones`); await wait(() => document.getElementById('matrix-behavior'));
  await fill('matrix'); await page.eval(() => { observationComposition.model.mode = 'rosterFailed'; }); await hide(); await show();
  await wait(() => document.body.textContent.includes('No se pudo comprobar el curso y la pertenencia'));
  assert.equal(await page.eval(() => Boolean(document.getElementById('matrix-behavior'))), false);
  await page.eval(() => { observationComposition.model.mode = 'ready'; }); await button('Reintentar comprobación');
  await wait(() => document.getElementById('matrix-behavior')?.value === 'ATTENTION');
  checks.push('matrix slot stays sealed until fresh course and complete scoped roster; failed roster cannot open it');

  await fresh(`/academico/cursos/${group}/observaciones`, '&role=ADMIN');
  await wait(() => document.body.textContent.includes('No tienes acceso a este destino'));
  assert.equal((await data()).calls.some(c => !c.path.includes('/auth/')), false);
  await fresh(`/academico/cursos/${group}`, '&role=ADMIN'); await wait(() => document.body.textContent.includes('Editar curso'));
  assert.equal(await page.eval(() => [...document.querySelectorAll('a')].some(a => a.textContent === 'Registrar observaciones')), false);
  checks.push('ADMIN matrix blocked before data requests; GroupAdministration gains no student action');
  await fresh(`/academico/cursos/${uuid(99)}/observaciones`); await wait(() => document.body.textContent.includes('Curso no disponible'));
  assert.equal((await data()).calls.some(c => c.path.endsWith('/students') || c.path.endsWith('/consents')), false);
  checks.push('unavailable/foreign course does not fetch roster or observation content');

  for (const stage of ['group', 'roster']) {
    await page.goto(`${harness}?probe=${stage}`, { settleMs: 100 }); await wait(() => observationProbe.state().waiting);
    await page.eval(() => { observationProbe.changeSelection(); observationProbe.finish(); });
    await page.eval(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.deepEqual(await page.eval(() => observationProbe.state().fresh), { sentinel: 'new-selection' });
    assert.equal(await page.eval(() => Boolean(document.getElementById('matrix-behavior'))), false);
  }
  checks.push('same-generation late group/roster 404 ignoring abort cannot discard or open a newer selection');

  await fresh(`/academico/estudiantes/${student}`); await ready();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewport({ width, height: 900 }); assert.ok(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), `individual overflow ${width}`);
    await page.screenshot({ path: `${output}/individual-${width}.png`, format: 'png', fullPage: true });
  }
  await page.eval(() => { document.documentElement.style.fontSize = '200%'; });
  assert.ok(await page.eval(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${output}/individual-320-text-200.png`, format: 'png', fullPage: true });
  checks.push('composed App screens reflow 320/390/768/1440 and individual text 200%');
  const report = { ok: true, checks, scope: 'App/AuthRoot/host connection with synthetic transports; T-15 guard, real API/DB and manual acceptance not tested' };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, format: 'png', fullPage: true });
  await writeFile(`${output}/failure.txt`, await page.eval(() => document.body.innerText)); throw error;
} finally { await browser.close(); }
