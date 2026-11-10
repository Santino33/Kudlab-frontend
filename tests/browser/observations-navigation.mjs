import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Browser } from './vendor/cdp.mjs';
const origin = process.env.OBSERVATIONS_COMPOSITION_ORIGIN ?? 'http://127.0.0.1:5843';
const out = process.env.TASTE_SKILL_TMP ?? '/tmp/opencode/observaciones-navigation'; mkdirSync(out, { recursive: true });
const browser = await Browser.launch(), page = await browser.newPage(), checks = [];
const student = '00000000-0000-4000-8000-000000000001', group = '00000000-0000-4000-8000-000000000020';
const studentPath = `/academico/estudiantes/${student}`, coursePath = `/academico/cursos/${group}`;
const wait = fn => page.eval(async source => { const test = new Function(`return (${source})`)(), start = performance.now(); while (!test()) { if (performance.now() - start > 15000) throw Error('Condition timed out'); await new Promise(requestAnimationFrame); } }, fn.toString());
const button = text => page.eval(text => { const el = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === text && !b.disabled); if (!el) throw Error(`Missing ${text}`); el.click(); }, text);
const ready = () => wait(() => document.getElementById('observation-frequency') && !document.getElementById('observation-frequency').disabled);
const fill = async () => {
  await page.eval(() => {
    const el = document.getElementById('observation-frequency'); el.focus();
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, 'ALWAYS'); el.dispatchEvent(new Event('change', { bubbles: true }));
  });
};
const fresh = async () => { await page.goto(`${origin}/tests/browser/observations-composition.html`, { settleMs: 0 }); await ready(); };
const data = () => page.eval(() => ({ path: location.pathname + location.search, state: history.state, entries: navigation.entries().map(e => ({ key: e.key, url: e.url, state: e.getState() })), value: document.getElementById('observation-frequency')?.value, focus: document.activeElement?.textContent?.trim() }));
try {
  await fresh(); await fill(); const start = await data();
  await page.eval(path => { void observationNavigation.requestNavigation(path, { foreign: 7 }); }, coursePath);
  await wait(() => document.querySelector('[role="alertdialog"]'));
  assert.equal((await data()).path, studentPath); assert.equal((await data()).focus, 'Permanecer');
  await button('Permanecer'); await wait(() => !document.querySelector('[role="alertdialog"]'));
  await wait(() => document.activeElement?.id === 'observation-frequency');
  assert.equal((await data()).value, 'ALWAYS'); assert.deepEqual((await data()).entries, start.entries);
  checks.push('App click/imperative guard asks before push; Stay preserves draft/state/stack and focuses Stay initially');
  await page.eval(path => { void observationNavigation.requestNavigation(path, { foreign: 7 }); }, coursePath);
  await wait(() => document.querySelector('[role="alertdialog"]')); await button('Descartar y salir');
  await wait(() => location.pathname.includes('/cursos/') && !document.getElementById('observation-frequency'));
  assert.deepEqual((await data()).state, { foreign: 7 });
  await page.eval(() => history.back()); await ready(); assert.equal((await data()).value, '');
  checks.push('accepted imperative navigation discards selected payload before destination; Back opens empty authorized draft');

  // Build same-document opaque/native entries without asking an empty capture to leave.
  await page.eval(async ({ coursePath, studentPath }) => {
    await observationNavigation.requestNavigation(coursePath);
    observationNavigation.replaceCurrentEntry(location.href, { __kudlabNavigation: 'foreign', sentinel: ['O'] });
    await observationNavigation.requestNavigation('/tareas', 42); await observationNavigation.requestNavigation(studentPath, { keep: 'B' });
  }, { coursePath, studentPath });
  await ready(); await fill();
  await page.eval(() => observationNavigation.replaceCurrentEntry(location.pathname + '?period=2'));
  const before = await data(); await page.eval(() => history.go(-2));
  await wait(() => document.querySelector('[role="alertdialog"]'));
  assert.equal((await data()).path, studentPath + '?period=2'); assert.equal((await data()).value, 'ALWAYS');
  await button('Permanecer'); await wait(() => !document.querySelector('[role="alertdialog"]'));
  assert.deepEqual((await data()).entries, before.entries);
  await page.eval(() => history.go(-2)); await wait(() => document.querySelector('[role="alertdialog"]')); await button('Descartar y salir');
  await wait(() => location.search === '' && !document.querySelector('[role="alertdialog"]'));
  assert.deepEqual((await data()).state, { __kudlabNavigation: 'foreign', sentinel: ['O'] });
  await page.eval(() => history.forward()); await wait(() => location.pathname === '/tareas');
  assert.equal((await data()).state, 42);
  await page.eval(() => history.forward()); await ready();
  assert.equal((await data()).path, studentPath + '?period=2'); assert.deepEqual((await data()).state, { keep: 'B' });
  checks.push('actual multi-entry Back restores native key before dialog; Stay/Discard preserve opaque states, replaced filters and Forward');

  await fill(); await page.eval(() => history.go(-2)); await wait(() => document.querySelector('[role="alertdialog"]'));
  await page.eval(() => new Promise(done => { addEventListener('popstate', () => done(), { once: true }); history.back(); }));
  await wait(() => location.pathname.includes('/estudiantes/') && document.querySelector('[role="alertdialog"]'));
  await button('Descartar y salir'); await wait(() => location.pathname === '/tareas' && !document.querySelector('[role="alertdialog"]'));
  await page.eval(() => history.forward()); await ready(); assert.equal((await data()).value, '');
  checks.push('actual reentrant Back replaces the pending target instead of replaying the earlier course destination');

  await fill(); await page.eval(path => { void observationNavigation.requestNavigation(path); }, coursePath); await wait(() => document.querySelector('[role="alertdialog"]'));
  await page.eval(() => { observationComposition.model.access = 'absent'; observationComposition.controller.notify({ category: 'unauthenticated', generation: observationComposition.controller.getGeneration() }); });
  await wait(() => !document.getElementById('observation-frequency') && !document.querySelector('[role="alertdialog"]'));
  assert.equal((await data()).path, studentPath + '?period=2');
  checks.push('actual AuthRoot denial supersedes open decision without replay or protected DOM');

  await fresh();
  const capabilities = await page.eval(() => ({ userAgent: navigator.userAgent, nativeKeys: Boolean(navigation.currentEntry?.key), traverseTo: typeof navigation.traverseTo }));
  await fill(); await page.setViewport({ width: 390, height: 844 });
  await page.eval(path => { void observationNavigation.requestNavigation(path); }, coursePath); await wait(() => document.querySelector('[role="alertdialog"]'));
  assert.ok(await page.eval(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${out}/dialog-mobile.jpg` }); await button('Permanecer');
  await page.setViewport({ width: 1440, height: 900 });
  await page.eval(path => { void observationNavigation.requestNavigation(path); }, coursePath); await wait(() => document.querySelector('[role="alertdialog"]'));
  await page.screenshot({ path: `${out}/dialog-desktop.jpg` }); await button('Permanecer');
  await page.setViewport({ width: 320, height: 900 }); await page.eval(() => { document.documentElement.style.fontSize = '200%'; });
  await page.eval(path => { void observationNavigation.requestNavigation(path); }, coursePath); await wait(() => document.querySelector('[role="alertdialog"]'));
  assert.ok(await page.eval(() => { const el = document.querySelector('[role="alertdialog"]'), r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth; }));
  await page.screenshot({ path: `${out}/dialog-text-200.jpg` });
  await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await page.eval(() => document.activeElement.textContent.trim()), 'Descartar y salir');
  await button('Descartar y salir'); await wait(() => !document.querySelector('[role="alertdialog"]') && !document.getElementById('observation-frequency'));
  checks.push('dialog focus/Tab, 390 px and 320 px with text 200% remain reachable without clipped actions');
  // Capability loss is detected before mounting the next capture; no fabricated API response.
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: "Object.defineProperty(window,'navigation',{value:undefined,configurable:true});" });
  await page.goto(`${origin}/tests/browser/observations-composition.html`, { settleMs: 0 });
  await wait(() => document.body.textContent.includes('La captura está deshabilitada') && document.getElementById('observation-frequency'));
  assert.equal(await page.eval(() => document.getElementById('observation-frequency').disabled), true);
  assert.ok(await page.eval(() => Boolean(document.getElementById('observation-history-title'))));
  checks.push('without Navigation API capture is explicitly disabled; history remains available');
  writeFileSync(`${out}/report.json`, JSON.stringify({ ok: true, checks, capabilities, scope: 'App/AuthRoot/native browser navigation; synthetic API transport, not final integrated Verify or human acceptance' }, null, 2));
  console.log(JSON.stringify({ ok: true, checks, capabilities }));
} catch (e) {
  writeFileSync(`${out}/failure.txt`, await page.eval(() => document.body.innerText)); await page.screenshot({ path: `${out}/failure.jpg`, fullPage: true }); throw e;
} finally { await browser.close(); }
