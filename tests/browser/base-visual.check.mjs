import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? './vendor/cdp.mjs');
const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://127.0.0.1:5282';
const output = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/front-base-visual';
mkdirSync(output, { recursive: true });
// Headless Linux may report no pointing device; explicitly test mouse hover.
const browser = await Browser.launch({ extraArgs: ['--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'] });
const results = [];
try {
  const page = await browser.newPage({ reducedMotion: true });
  const read = selector => page.eval(selector => {
    const e = document.querySelector(selector), s = getComputedStyle(e), r = e.getBoundingClientRect();
    return { bg: s.backgroundColor, color: s.color, left: s.borderLeftWidth, right: s.borderRightColor, border: s.borderRightWidth, width: r.width, height: r.height, padding: s.paddingLeft, paddingTop: s.paddingTop, outline: s.outlineWidth, offset: s.outlineOffset };
  }, selector);
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewport({ width, height: 800 });
    await page.goto(`${origin}/tests/browser/base-visual-harness.html`, { settleMs: 200 });
    assert.equal((await read('#primary')).bg, 'rgb(20, 38, 77)', 'approved action background');
    assert.equal((await read('#primary')).color, 'rgb(255, 255, 255)');
    const toggle = await read('[data-slot="switch"]');
    const track = await read('[data-slot="switch-track"]');
    assert.equal(track.bg, 'rgb(31, 59, 115)', 'explicitly approved Switch active token');
    assert.equal(track.width, 40, 'approved compact visual track');
    assert.equal(track.height, 24);
    assert.equal((await read('[data-slot="switch-thumb"]')).width, 20);
    assert.equal(toggle.width, 44, 'visual reduction keeps a real comfortable target');
    assert.equal(toggle.height, 44);
    assert.equal(await page.eval(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()), '#53c0f3', 'legacy brand token is unchanged');
    const field = await read('#sample-field');
    assert.equal(field.bg, 'rgb(246, 248, 251)', 'approved subtle control surface');
    assert.equal((await read('#sample-select')).bg, field.bg);
    assert.notEqual((await read('#panel')).bg, field.bg, 'field differs from white panel');
    assert.equal(field.left, '2px');
    assert.equal(field.right, 'rgba(0, 0, 0, 0)');
    assert.ok(field.height >= 44);
    assert.equal((await read('#sample-select')).left, '2px');
    const padding = width < 640 ? 16 : width < 1024 ? 24 : 32;
    assert.equal((await read('#panel-body')).padding, `${padding}px`);
    assert.ok((await read('#form')).width <= 512);
    assert.ok((await read('#panel')).width <= 1200);
    assert.equal((await read('#table-region td')).padding, width < 640 ? '16px' : '24px');
    assert.equal((await read('#table-region td')).paddingTop, width < 640 ? '16px' : '24px');
    assert.equal((await read('#table-region th')).padding, width < 640 ? '16px' : '24px');
    assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false, `overflow ${width}`);
    await page.eval(() => document.getElementById('sample-field').focus());
    assert.equal((await read('#sample-field')).outline, '2px');
    assert.equal((await read('#sample-field')).offset, '2px');
    await page.eval(() => document.getElementById('secondary').click());
    await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal((await read('#sample-field')).border, '2px');
    assert.equal((await read('#sample-select')).border, '2px');
    assert.equal((await read('#sample-field')).width, field.width, 'error does not move field');
    assert.equal(await page.eval(() => document.getElementById('sample-field').value), 'Texto sintético conservado');
    const loadingWidth = (await read('#loading')).width;
    await page.eval(() => document.getElementById('loading').click());
    await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal((await read('#loading')).width, loadingWidth, 'loading reserves both labels');
    assert.equal(await page.eval(() => document.getElementById('loading').getAttribute('aria-busy')), 'true');
    assert.equal(await page.eval(() => document.getElementById('loading').disabled), true);
    await page.eval(() => document.getElementById('loading').click());
    assert.equal(await page.eval(() => document.getElementById('submits').textContent), 'Envíos sintéticos: 1');
    assert.equal(await page.eval(() => [...document.querySelectorAll('#loading .staff-button-labels > span')].filter(e => e.getAttribute('aria-hidden') === 'false').length), 1);
    await page.eval(() => document.getElementById('finish').click());
    await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal((await read('#loading')).width, loadingWidth);
    assert.equal(await page.eval(() => document.getElementById('loading').disabled), false);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}/base-${width}.png`, fullPage: true });
    results.push({ width, padding, controls: 'pass' });
  }
  await page.goto(`${origin}/tests/browser/base-visual-harness.html`, { settleMs: 300 });
  const filePath = resolve(output, 'archivo-sintetico.txt');
  writeFileSync(filePath, 'Archivo local sintetico para comprobar el selector. No subir.');
  await page.send('DOM.enable');
  const { root: fileRoot } = await page.send('DOM.getDocument');
  const { nodeId: fileNode } = await page.send('DOM.querySelector', { nodeId: fileRoot.nodeId, selector: '#sample-file' });
  await page.send('DOM.setFileInputFiles', { nodeId: fileNode, files: [filePath] });
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.eval(() => document.querySelector('.staff-file-name').textContent), 'archivo-sintetico.txt');
  assert.equal(await page.eval(() => document.getElementById('form-submits').textContent), 'Envíos del formulario: 0', 'selecting a file never submits');
  await page.eval(() => document.getElementById('clear-file').click());
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.eval(() => document.getElementById('sample-file').files.length), 0);
  assert.equal(await page.eval(() => Boolean(document.querySelector('.staff-file-name'))), false, 'imperative clear plus consumer render clears display');
  const dropPoint = await page.eval(() => {
    const e = document.getElementById('sample-file'); e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const drag = { items: [], files: [filePath], dragOperationsMask: 1 };
  await page.send('Input.dispatchDragEvent', { type: 'dragEnter', ...dropPoint, data: drag });
  await page.send('Input.dispatchDragEvent', { type: 'dragOver', ...dropPoint, data: drag });
  await page.send('Input.dispatchDragEvent', { type: 'drop', ...dropPoint, data: drag });
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.eval(() => document.getElementById('sample-file').files[0]?.name), 'archivo-sintetico.txt', 'real browser drop populates native FileList');
  assert.equal(await page.eval(() => document.querySelector('.staff-file-name')?.textContent), 'archivo-sintetico.txt');
  assert.equal(await page.eval(() => document.getElementById('form-submits').textContent), 'Envíos del formulario: 0', 'dropping a file never submits');
  await page.eval(() => document.getElementById('sample-file').focus());
  assert.equal(await page.eval(() => getComputedStyle(document.querySelector('[data-slot="file-drop"]')).outlineWidth), '2px');
  await page.eval(() => document.getElementById('secondary').click());
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.eval(() => getComputedStyle(document.querySelector('[data-slot="file-drop"]')).borderStyle), 'solid');
  await page.eval(() => document.getElementById('reset-form').click());
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.eval(() => document.getElementById('sample-file').files.length), 0);
  assert.equal(await page.eval(() => Boolean(document.querySelector('.staff-file-name'))), false, 'native form reset clears filename');
  await page.send('Page.setInterceptFileChooserDialog', { enabled: true });
  await page.send('Page.bringToFront');
  let removeChooser;
  const chooser = new Promise(resolve => { removeChooser = browser.on(page.sessionId, 'Page.fileChooserOpened', resolve); });
  await page.eval(() => document.getElementById('sample-file').focus());
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  let timeout;
  try {
    const event = await Promise.race([chooser, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Native file chooser did not open from keyboard')), 5000); })]);
    assert.equal(event.mode, 'selectSingle');
  } finally {
    clearTimeout(timeout); removeChooser();
    await page.send('Page.setInterceptFileChooserDialog', { enabled: false });
  }
  await page.eval(() => document.getElementById('disable-file').click());
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal((await read('[data-slot="file-drop"]')).bg, 'rgb(242, 242, 242)');
  assert.equal(await page.eval(() => document.getElementById('sample-file').disabled), true);
  await page.send('Input.dispatchDragEvent', { type: 'dragEnter', ...dropPoint, data: drag });
  await page.send('Input.dispatchDragEvent', { type: 'dragOver', ...dropPoint, data: drag });
  await page.send('Input.dispatchDragEvent', { type: 'drop', ...dropPoint, data: drag });
  assert.equal(await page.eval(() => document.getElementById('sample-file').files.length), 0, 'disabled drop is ignored');
  results.push({ file: 'native selection/drop/name/reset/imperative clear/error/focus/keyboard picker/disabled/no-submit', table: '16px narrow / 24px wide padding, shared Table in sample' });
  await page.eval(() => document.querySelector('[data-slot="switch"]').focus());
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.eval(() => document.querySelector('[data-slot="switch"]').getAttribute('aria-checked')), 'false');
  assert.equal((await read('[data-slot="switch-track"]')).bg, 'rgb(82, 98, 122)', 'off style unchanged');
  assert.equal((await read('[data-slot="switch"]')).outline, '2px');
  const force = async (selector, pseudoClasses) => {
    const { root } = await page.send('DOM.getDocument');
    const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    await page.send('CSS.enable');
    await page.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: pseudoClasses });
  };
  await page.send('DOM.enable');
  await force('#primary', ['hover']);
  assert.equal((await read('#primary')).bg, 'rgb(31, 59, 115)');
  await force('#primary', ['active']);
  assert.equal((await read('#primary')).bg, 'rgb(20, 38, 77)');
  assert.ok(await page.eval(() => getComputedStyle(document.getElementById('primary')).boxShadow.includes('inset')));
  await force('#primary', []);
  assert.equal((await read('#disabled')).bg, 'rgb(242, 242, 242)');
  assert.equal((await read('#disabled')).color, 'rgb(28, 46, 87)');
  await page.eval(() => document.getElementById('loading').click());
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const { nodes } = await page.send('Accessibility.getFullAXTree');
  assert.equal(nodes.filter(n => n.role?.value === 'button' && n.name?.value === 'Guardando cambios de ejemplo…').length, 1, 'one accessible loading name');
  assert.equal(nodes.some(n => n.role?.value === 'button' && n.name?.value === 'Guardar'), false);
  await page.eval(() => document.getElementById('finish').click());
  // 1280px at browser zoom 400% has a 320 CSS px layout viewport.
  // Root text 400% at 320px would multiply zoom twice; real browser zoom remains manual.
  for (const [size, width] of [['200%', 768], ['100%', 320]]) {
    await page.setViewport({ width, height: 800 });
    await page.eval(size => { document.documentElement.style.fontSize = size; }, size);
    assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false, `text ${size}, layout ${width}`);
  }
  await page.eval(() => { document.documentElement.style.fontSize = ''; });
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.eval(() => document.getElementById('sample-field').focus());
  assert.equal((await read('#sample-field')).outline, '2px');
  assert.notEqual((await read('#sample-field')).right, 'rgba(0, 0, 0, 0)', 'invalid border survives forced colours');
  assert.equal(await page.eval(() => getComputedStyle(document.getElementById('primary')).transitionDuration), '0s');
  await page.send('Emulation.setEmulatedMedia', { features: [] });
  results.push({ states: 'hover/pressed/disabled/loading accessible name', preferences: 'text 200%, reflow 320 CSS px, forced-colors/reduced-motion', manualPending: 'real browser zoom 400% and screen reader' });
  for (const role of ['ADMIN', 'TEACHER']) {
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${origin}/tests/browser/usuarios-harness.html?role=${role}`, { settleMs: 500 });
    const nav = await page.eval(() => {
      const panel = document.querySelector('[data-slot="sidebar-inner"]');
      const current = panel.querySelector('[aria-current="page"]');
      return { bg: getComputedStyle(panel).backgroundColor, currentBg: getComputedStyle(current).backgroundColor,
        color: getComputedStyle(current).color, mark: getComputedStyle(current, '::before').content,
        admin: Boolean(panel.querySelector('a[href="/usuarios"]')) };
    });
    assert.equal(nav.bg, 'rgb(20, 38, 77)');
    assert.equal(nav.currentBg, 'rgb(233, 238, 245)');
    assert.equal(nav.color, 'rgb(20, 38, 77)');
    assert.notEqual(nav.mark, 'none');
    assert.equal(nav.admin, role === 'ADMIN');
    await page.eval(() => document.querySelector('[aria-current="page"]').focus());
    assert.equal(await page.eval(() => getComputedStyle(document.activeElement).outlineWidth), '2px');
    await page.setViewport({ width: 390, height: 844 });
    await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.eval(() => document.getElementById('workspace-menu-toggle').click());
    await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.eval(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
    assert.equal((await read('[data-slot="sheet-content"]')).bg, 'rgb(20, 38, 77)');
    assert.equal(await page.eval(() => document.querySelector('[data-slot="sheet-content"]').getBoundingClientRect().left), 0);
    await page.screenshot({ path: `${output}/nav-${role}-390.png`, fullPage: true });
    results.push({ role, nav: 'desktop/current/focus/mobile surface', permissions: 'unchanged' });
  }
  for (const [path, query, selector] of [
    ['/acceso', '&access=absent', '#email'],
    ['/recuperar-acceso', '', '#recovery-email'],
    ['/usuarios/nueva', '', '#account-name'],
  ]) {
    await page.goto(`${origin}/tests/browser/usuarios-harness.html?role=ADMIN&path=${encodeURIComponent(path)}${query}`, { settleMs: 500 });
    assert.equal((await read(selector)).bg, 'rgb(246, 248, 251)', `${path}: subtle control background`);
    const cardBg = await page.eval(selector => getComputedStyle(document.querySelector(selector).closest('[data-slot="card"]')).backgroundColor, selector);
    assert.equal(cardBg, 'rgb(255, 255, 255)', `${path}: white containing card`);
    await page.eval(async selector => {
      const field = document.querySelector(selector); field.disabled = true;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(field.getAnimations().map(a => a.finished.catch(() => {})));
    }, selector);
    assert.equal((await read(selector)).bg, 'rgb(242, 242, 242)', `${path}: disabled remains separate`);
    results.push({ path, background: 'subtle field / white card / disabled preserved' });
  }
  assert.deepEqual(page.consoleErrors, []);
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log('PASS base visual: 6 viewports, states/loading AX, text 200%/reflow 320 CSS px, forced-colors/reduced-motion, both-role desktop/mobile navigation. Real zoom/reader pending.');
} finally { await browser.close(); }
