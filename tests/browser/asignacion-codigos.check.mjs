import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? './vendor/cdp.mjs');
const origin = process.env.KUDLAB_TEST_ORIGIN;
assert.match(origin ?? '', /^http:\/\/(127\.0\.0\.1|localhost):\d+$/, 'Explicit loopback origin required');
const output = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/front-asignacion-codigos';
mkdirSync(output, { recursive: true });
const browser = await Browser.launch();
const results = [];
const failures = [];
try {
  const page = await browser.newPage({ width: 1440, height: 900, reducedMotion: true });
  const until = async (fn, message) => {
    for (let n = 0; n < 100; n++) { if (await page.eval(fn)) return; await new Promise(done => setTimeout(done, 30)); }
    throw new Error(message);
  };
  const click = label => page.eval(label => {
    const button = [...document.querySelectorAll('button')].find(e => e.textContent.trim() === label || e.getAttribute('aria-label') === label);
    if (!button) throw new Error(`Missing control: ${label}`);
    button.focus(); button.click();
  }, label);
  const key = async (name, code, vk) => {
    await page.send('Page.bringToFront');
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode: vk, ...(name === 'Enter' ? { text: '\r' } : name === ' ' ? { text: ' ' } : {}) });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: vk });
  };
  const mount = async scenario => {
    await page.eval(scenario => window.assignmentTest.mount(scenario), scenario);
    await until(() => !!document.querySelector('#access-title'), 'Detail not ready');
  };
  const ready = () => until(() => !!document.querySelector('.classroom-code[data-state="ready"]'), 'Synthetic reveal not ready');
  const hide = async () => { await page.eval(() => window.dispatchEvent(new Event('blur'))); await until(() => document.querySelector('.classroom-code')?.textContent === 'Oculto', 'Codes not hidden'); };
  // Never persist a screenshot containing a code, including mock codes.
  const screenshot = async name => {
    await hide();
    await page.screenshot({ path: `${output}/${name}.png`, format: 'png', fullPage: true });
  };
  await page.goto(`${origin}/tests/browser/asignacion-codigos-harness.html`, { settleMs: 300 });
  await until(() => !!document.querySelector('#access-title'), 'Harness not ready');
  const back = await page.eval(() => {
    const e = document.querySelector('.assignment-detail > a'), s = getComputedStyle(e);
    return { text: e.textContent, href: e.getAttribute('href'), underline: s.textDecorationLine, border: s.borderTopWidth, height: e.getBoundingClientRect().height, className: e.className };
  });
  assert.equal(back.text, 'Volver a asignaciones');
  assert.equal(back.href, '/academico/cursos/80000000-0000-4000-8000-000000000001/asignaciones');
  assert.ok(back.className.includes('staff-back-link'), 'Return uses shared text-link pattern');
  assert.equal(back.underline, 'underline'); assert.equal(back.border, '0px'); assert.ok(back.height >= 44);
  results.push('CA-01: return text link, destination and target');
  await page.eval(() => document.querySelector('.assignment-detail > a').focus());
  await key('Enter', 'Enter', 13);
  await until(() => location.pathname.endsWith('/80000000-0000-4000-8000-000000000001/asignaciones'), 'Return did not navigate to the course assignments');
  await page.goto(`${origin}/tests/browser/asignacion-codigos-harness.html`, { settleMs: 300 });
  await until(() => !!document.querySelector('#access-title'), 'Harness not ready after return');
  if (process.env.KUDLAB_BACK_ONLY !== '1') {
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewport({ width, height: 900 }); await mount('long');
      const styles = await page.eval(() => [...document.querySelectorAll('#access-title, .assignment-options > summary, .assignment-management > summary')].map(e => {
        const s = getComputedStyle(e); return { tag: e.tagName, size: s.fontSize, weight: s.fontWeight, family: s.fontFamily, leading: s.lineHeight, display: s.display, marker: s.listStyleType, height: e.getBoundingClientRect().height };
      }));
      assert.equal(styles.length, 3);
      for (const s of styles) { assert.equal(s.size, '20px'); assert.equal(s.weight, '600'); assert.equal(s.family, styles[0].family); assert.equal(s.leading, '26px'); }
      assert.equal(styles[0].tag, 'H2');
      for (const s of styles.slice(1)) { assert.equal(s.tag, 'SUMMARY'); assert.equal(s.display, 'list-item'); assert.notEqual(s.marker, 'none'); assert.ok(s.height >= 44); }
      assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false, `No general overflow ${width}`);
      if ([390, 768, 1440].includes(width)) await screenshot(`detail-${width}`);
      results.push(`CA-01: typography, native marker, reflow ${width}`);
    }
    await page.eval(() => document.querySelector('.assignment-options > summary').focus());
    await key('Enter', 'Enter', 13);
    await until(() => document.querySelector('.assignment-options').open, 'Keyboard did not expand options');
    assert.equal(await page.eval(() => document.querySelector('.assignment-options').open), true);
    await key(' ', 'Space', 32);
    await until(() => !document.querySelector('.assignment-options').open, 'Keyboard did not collapse options');
    assert.equal(await page.eval(() => document.querySelector('.assignment-options').open), false);
    await page.eval(() => document.querySelector('.assignment-management > summary').focus());
    await key(' ', 'Space', 32);
    await until(() => document.querySelector('.assignment-management').open, 'Keyboard did not expand management');
    assert.equal(await page.eval(() => document.querySelector('.assignment-management').open), true);
    results.push('CA-01: native keyboard disclosure');
    await page.setViewport({ width: 1440, height: 900 }); await mount('normal'); await ready();
    await click('Proyectar códigos');
    await until(() => !!document.querySelector('dialog[open]'), 'Projection not open');
    assert.equal(await page.eval(() => document.querySelector('dialog').contains(document.activeElement)), true);
    await key('Escape', 'Escape', 27);
    await until(() => !document.querySelector('dialog[open]'), 'Projection not closed');
    assert.equal(await page.eval(() => document.activeElement === document.querySelector('.assignment-tools button')), true, 'Projection restores trigger focus');
    await hide(); await click('Mostrar códigos'); await ready();
    await page.eval(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } }));
    await click('Copiar código de Participante sintético');
    await until(() => [...document.querySelectorAll('[role="status"]')].some(e => e.textContent.includes('Copiado.')), 'Copy success not confirmed');
    await page.eval(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Synthetic clipboard denial'); } } }));
    await click('Copiar código de Participante sintético');
    await until(() => !!document.querySelector('.access-copy-text'), 'Manual copy missing');
    await hide(); assert.equal(await page.eval(() => !!document.querySelector('.access-copy-text')), false);
    await page.eval(() => window.assignmentTest.reveal('late')); await click('Mostrar códigos');
    await until(() => document.querySelector('.classroom-code')?.textContent === 'Mostrando…', 'Reveal not pending');
    await hide(); await page.eval(() => window.assignmentTest.release());
    await new Promise(done => setTimeout(done, 100));
    assert.equal(await page.eval(() => document.querySelector('.classroom-code').textContent), 'Oculto');
    results.push('CA-02: projection/Escape/focus, copy success/fallback/cleanup, late reveal hidden');
    await mount('normal');
    await page.eval(() => { document.querySelector('.assignment-options').open = true; });
    await click('Actualizar asignación y códigos');
    await until(() => window.assignmentTest.calls().filter(c => c.method === 'GET' && c.path.endsWith('/access-codes')).length >= 2, 'Refresh missing');
    assert.equal(await page.eval(() => window.assignmentTest.calls().some(c => c.method === 'POST' && c.path.endsWith('/access-codes'))), false);
    await page.eval(() => { document.querySelector('.assignment-management').open = true; });
    await click('Cancelar nuevos inicios');
    await until(() => !!document.querySelector('[role="alertdialog"]'), 'Confirmation missing');
    await click('Volver');
    await until(() => !document.querySelector('[role="alertdialog"]'), 'Cancel did not close');
    assert.equal(await page.eval(() => window.assignmentTest.calls().some(c => c.path.endsWith('/cancel'))), false);
    await click('Cancelar nuevos inicios');
    await until(() => !!document.querySelector('[role="alertdialog"]'), 'Confirmation missing');
    await page.eval(() => window.assignmentTest.cancel('lost'));
    await page.eval(() => [...document.querySelector('[role="alertdialog"]').querySelectorAll('button')].find(e => e.textContent === 'Cancelar nuevos inicios').click());
    await until(() => document.querySelector('[role="alertdialog"]')?.textContent.includes('No pudimos confirmar la operación'), 'Lost response missing');
    await page.eval(() => window.assignmentTest.cancel('success'));
    await page.eval(() => [...document.querySelector('[role="alertdialog"]').querySelectorAll('button')].find(e => e.textContent === 'Cancelar nuevos inicios').click());
    await until(() => document.querySelector('.assignment-heading')?.textContent.includes('Cancelada'), 'Cancellation not confirmed');
    const cancelIds = await page.eval(() => window.assignmentTest.calls().filter(c => c.path.endsWith('/cancel')).map(c => c.requestId));
    assert.equal(cancelIds.length, 2); assert.ok(cancelIds[0]); assert.equal(cancelIds[0], cancelIds[1]);
    results.push('CA-02/03: refresh never generates; dialog Volver never mutates; cancellation retry preserves requestId');
    for (const scenario of ['empty', 'expired']) { await mount(scenario); assert.equal(await page.eval(() => document.querySelector('.assignment-tools button').disabled), true); }
    for (const scenario of ['forbidden', 'error', 'loading']) {
      await page.eval(scenario => window.assignmentTest.mount(scenario), scenario);
      await until(() => !document.querySelector('#access-title'), 'Old detail retained');
      assert.equal(await page.eval(() => !!document.querySelector('.classroom-code')), false);
    }
    results.push('CA-02: empty/expired projector disabled; loading/error/denied no stale codes (mock only)');
    await mount('long');
    await page.setViewport({ width: 320, height: 900 });
    await page.eval(() => { document.documentElement.style.fontSize = '200%'; });
    const reflow = await page.eval(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth }));
    try { assert.ok(reflow.width <= reflow.viewport, 'No general overflow at 320px/text200'); }
    catch { failures.push({ case: 'CA-01 text200/reflow320', ...reflow }); }
    await screenshot('text-200');
    await page.eval(() => { document.documentElement.style.fontSize = ''; });
    await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await page.eval(() => getComputedStyle(document.querySelector('summary')).listStyleType !== 'none'), true);
    await screenshot('forced-colors');
    results.push('CA-01: forced-colors/reduced-motion; text200/reflow320 reported separately, not real zoom400 or screen reader');
  }
  writeFileSync(`${output}/results.json`, JSON.stringify({ results, failures, limitations: ['Mock API only', 'Chromium only', 'No screen reader or real 400% browser zoom'] }, null, 2));
  console.log(`${results.length} groups passed, ${failures.length} failed; mock transport, Chromium only`);
  if (failures.length) { console.error(JSON.stringify(failures)); process.exitCode = 1; }
} finally { await browser.close(); }
