// Standalone production components + actual draft host, synthetic fetch only. Not final App/API/DB evidence.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { Browser } from './vendor/cdp.mjs';
const origin = process.env.OBSERVATIONS_UI_ORIGIN ?? 'http://127.0.0.1:5841';
assert.equal(new URL(origin).hostname, '127.0.0.1');
const output = process.env.TASTE_SKILL_TMP ?? '/tmp/opencode/observations-phase34-ui';
await mkdir(output, { recursive: true }); process.env.TASTE_SKILL_TMP = output;
const browser = await Browser.launch(), page = await browser.newPage();
const path = `${origin}/tests/browser/observations-harness.html`;
const checks = [];
async function wait(predicate) {
  await page.eval(source => new Promise((resolve, reject) => {
    const predicate = (0, eval)(`(${source})`);
    if (predicate()) return resolve();
    const observer = new MutationObserver(() => { if (predicate()) { clearTimeout(timer); observer.disconnect(); resolve(); } });
    observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
    const timer = setTimeout(() => { observer.disconnect(); reject(new Error(`Condition absent: ${source}`)); }, 15000);
  }), predicate.toString());
}
async function set(id, value) {
  await page.eval(({ id, value }) => {
    const el = document.getElementById(id); if (!el) throw Error(`Missing ${id}`);
    Object.getOwnPropertyDescriptor(el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }, { id, value });
}
async function button(text) { await page.eval(text => { const el = [...document.querySelectorAll('button')].find(b => b.textContent === text && !b.disabled); if (!el) throw Error(`Missing enabled button ${text}`); el.click(); }, text); }
async function fill(prefix) { for (const [key, value] of Object.entries({ behavior: 'ATTENTION', observedOn: '2026-01-01', schoolYear: '2025', term: '1' })) await set(`${prefix}-${key}`, value); }
async function submitTwice() { await page.eval(() => { const form = document.getElementById('observation-behavior').form; for (let i = 0; i < 2; i++) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }); }
const state = () => page.eval(() => ({ calls: observationModel.calls, history: observationModel.history, receipts: observationModel.receipts }));
try {
  await page.goto(path); await wait(() => document.body.textContent.includes('No hay observaciones para esta consulta.'));
  await page.eval(() => document.getElementById('observation-behavior').focus());
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await page.eval(() => document.activeElement.id), 'observation-frequency');
  assert.ok(await page.eval(() => parseFloat(getComputedStyle(document.activeElement).outlineWidth) >= 2));
  assert.ok(await page.eval(() => [...document.querySelectorAll('input,select')].every(el => el.labels.length > 0)));
  const ax = await page.send('Accessibility.getFullAXTree');
  assert.ok(ax.nodes.filter(n => ['combobox', 'textbox', 'spinbutton'].includes(n.role?.value) && !n.ignored).every(n => n.name?.value)); checks.push('native keyboard Tab, visible focus and accessible field names');
  await fill('observation'); await set('observation-frequency', 'UNOBSERVED'); await button('Guardar observación');
  await wait(() => document.body.textContent.includes('Captura omitida'));
  assert.equal((await state()).calls.filter(c => c.method === 'POST').length, 0); checks.push('omission does not write');
  await set('observation-frequency', 'SOMETIMES'); await set('observation-observedOn', '2999-01-01'); await button('Guardar observación');
  await wait(() => document.querySelector('[role="alert"]')?.textContent.includes('futura'));
  assert.equal((await state()).calls.filter(c => c.method === 'POST').length, 0); checks.push('future date inline error');
  await set('observation-observedOn', '2026-01-01'); await submitTwice();
  await wait(() => document.body.textContent.includes('Guardado confirmado. Consulta el historial vigente'));
  assert.equal((await state()).history.length, 1); assert.equal((await state()).calls.filter(c => c.method === 'POST').length, 1); checks.push('duplicate submit one intention');
  await button('Preparar corrección'); await set('observation-frequency', 'ALWAYS'); await submitTwice();
  await wait(() => document.body.textContent.includes('Versión vigente consultada: 2'));
  assert.equal((await state()).history[0].revision.frequency, 'ALWAYS');
  await button('Ver original y cambios'); await wait(() => document.body.textContent.includes('Corrección · Versión 2'));
  assert.ok(await page.eval(() => document.body.textContent.includes('A veces') && document.body.textContent.includes('Siempre'))); checks.push('append-only original and correction');
  await button('Preparar corrección'); await page.eval(() => { observationModel.mode = 'stale'; }); await set('observation-frequency', 'NEVER'); await button('Guardar corrección');
  await wait(() => document.body.textContent.includes('Otra corrección cambió la versión'));
  assert.equal((await state()).history[0].revision.frequency, 'ALWAYS'); checks.push('stale does not overwrite or auto-rebase');
  await page.eval(() => { observationModel.mode = 'ready'; }); await button('Nueva observación'); await fill('observation'); await set('observation-frequency', 'SOMETIMES');
  await page.eval(() => document.getElementById('suspend').click()); await wait(() => document.body.textContent.includes('Contenido privado retirado'));
  assert.equal(await page.eval(() => Boolean(document.getElementById('observation-frequency'))), false);
  await page.eval(() => document.getElementById('resume').click()); await wait(() => document.getElementById('observation-frequency')?.value === 'SOMETIMES'); checks.push('host removes DOM and restores same authorized draft');
  await page.eval(() => { observationModel.mode = 'lost'; }); await button('Guardar observación');
  await wait(() => document.body.textContent.includes('Resultado sin confirmar'));
  const before = await state(); assert.equal(before.history.length, 2);
  const stored = await page.eval(() => [...Array(sessionStorage.length)].map((_, n) => sessionStorage.getItem(sessionStorage.key(n))).join(''));
  assert.ok(!stored.includes('SOMETIMES') && !stored.includes('ATTENTION') && !stored.includes('Ficticio')); checks.push('only minimum references in sessionStorage');
  const model = await page.eval(() => observationModel);
  const injection = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.observationModel=${JSON.stringify({ ...model, mode: 'ready' })};` });
  await page.goto(path); await wait(() => document.body.textContent.includes('Resultado sin confirmar'));
  assert.equal((await state()).calls.filter(c => c.method === 'POST').length, before.calls.filter(c => c.method === 'POST').length);
  await button('Comprobar intento'); await wait(() => document.body.textContent.includes('Guardado confirmado'));
  assert.equal((await state()).history.length, 2); assert.equal((await state()).calls.filter(c => c.method === 'POST').length, before.calls.filter(c => c.method === 'POST').length); checks.push('full reload reconciles receipt without POST replay');
  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: injection.identifier });
  await page.eval(() => { observationModel.mode = 'readFailed'; }); await button('Actualizar historial');
  await wait(() => document.body.textContent.includes('No se pudo actualizar.'));
  assert.ok(await page.eval(() => document.body.textContent.includes('Última') || document.body.textContent.includes('última consulta'))); checks.push('history failure is not empty or fresh success');
  await page.eval(() => document.getElementById('revoke').click()); await wait(() => document.body.textContent.includes('Sin consentimiento vigente'));
  assert.equal(await page.eval(() => document.getElementById('observation-behavior').form.querySelector('button[type="submit"]').disabled), true); checks.push('revocation blocks writes independently of history');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewport({ width, height: 900 }); assert.ok(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), `individual overflow ${width}`);
    await page.screenshot({ path: `${output}/individual-${width}.png`, format: 'png', fullPage: true });
  }
  await page.eval(() => { document.documentElement.style.fontSize = '200%'; });
  await page.screenshot({ path: `${output}/individual-320-text-200.png`, format: 'png', fullPage: true });
  const individualOverflow = await page.eval(() => ({ width: innerWidth, page: document.documentElement.scrollWidth, culprits: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth).map(el => ({ tag: el.tagName, id: el.id, text: el.textContent.slice(0, 70), right: el.getBoundingClientRect().right, css: el.className })).slice(0, 20) }));
  assert.ok(individualOverflow.page <= individualOverflow.width, JSON.stringify(individualOverflow));
  await page.eval(() => { document.documentElement.style.removeProperty('font-size'); observationModel.mode = 'denied'; });
  await button('Actualizar historial'); await wait(() => !document.getElementById('observation-behavior'));
  checks.push('academic denial immediately removes capture/history, no stale data remains');
  await page.goto(path + '?matrix=1'); await wait(() => document.getElementById('matrix-behavior'));
  await fill('matrix'); await set('matrix-frequency-00000000-0000-4000-8000-000000000001', 'SOMETIMES'); await set('matrix-frequency-00000000-0000-4000-8000-000000000002', 'ALWAYS'); await set('matrix-frequency-00000000-0000-4000-8000-000000000004', 'UNOBSERVED');
  await button('Guardar filas valoradas'); await wait(() => document.body.textContent.includes('Revisa el resultado de cada estudiante.'));
  assert.equal((await state()).history.length, 2); assert.equal((await state()).calls.filter(c => c.method === 'POST').length, 2); checks.push('two valued rows confirm two independent records, omissions create none');
  await button('Nueva captura'); await fill('matrix');
  await set('matrix-frequency-00000000-0000-4000-8000-000000000001', 'SOMETIMES'); await set('matrix-frequency-00000000-0000-4000-8000-000000000002', 'ALWAYS'); await set('matrix-frequency-00000000-0000-4000-8000-000000000004', 'UNOBSERVED');
  await page.eval(() => { observationModel.revoked = ['00000000-0000-4000-8000-000000000002']; });
  await button('Guardar filas valoradas'); await wait(() => document.body.textContent.includes('Revisa el resultado de cada estudiante.'));
  let matrix = await state(); assert.equal(matrix.history.length, 3); assert.equal(matrix.calls.filter(c => c.method === 'POST').length, 3); checks.push('matrix partial commit, revoked rejected, empty and no-opportunity omitted');
  await button('Reintentar el mismo envío'); await wait(() => document.body.textContent.includes('Revisa el resultado de cada estudiante.'));
  matrix = await state(); assert.equal(matrix.history.length, 3); assert.equal(matrix.calls.filter(c => c.method === 'POST').length, 3); checks.push('matrix retry does not duplicate confirmed row');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewport({ width, height: 900 }); assert.ok(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`);
    await page.screenshot({ path: `${output}/matrix-${width}.png`, format: 'png', fullPage: true });
  }
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.eval(() => { document.documentElement.style.fontSize = '200%'; });
  assert.ok(await page.eval(() => document.documentElement.scrollWidth <= innerWidth)); await page.screenshot({ path: `${output}/matrix-320-text-200.png`, format: 'png', fullPage: true }); checks.push('matrix widths and text 200% reachable');
  console.log(JSON.stringify({ ok: true, checks, output, scope: 'synthetic standalone components, no real Backend/App/navigation acceptance' }, null, 2));
} finally { await browser.close(); }
