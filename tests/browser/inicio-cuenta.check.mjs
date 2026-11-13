import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? './vendor/cdp.mjs');
const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://127.0.0.1:5294';
const output = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/inicio-cuenta';
const legacy = process.env.KUDLAB_EXPECT_LEGACY === '1';
mkdirSync(output, { recursive: true });
const browser = await Browser.launch();
const results = [];
let page;
try {
  page = await browser.newPage();
  const settle = () => page.eval(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
  });
  const wait = async (source) => assert.equal(await page.eval(async expression => {
    const end = performance.now() + 5000;
    while (performance.now() < end) {
      if (new Function(`return (${expression})`)()) return true;
      await new Promise(requestAnimationFrame);
    }
    return false;
  }, source), true, source);
  const key = async (key, shift = false) => {
    const code = { Enter: 13, Escape: 27, Tab: 9 }[key];
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0, ...(key === 'Enter' ? { text: '\r' } : {}) });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0 });
    await settle();
  };
  const visit = async (role, path = '/', close = '', long = true) => {
    const params = new URLSearchParams({ role, path, navigation: 'ready', ...(long ? { account: 'long' } : {}), ...(close ? { close } : {}) });
    await page.goto(`${origin}/tests/browser/usuarios-harness.html?${params}`, { settleMs: 300 });
    await wait('!!document.querySelector(".workspace-account-trigger")');
    await settle();
  };
  const open = async () => {
    await page.eval(() => document.querySelector('.workspace-account-trigger').focus());
    await key('Enter');
    await wait('!!document.querySelector(".workspace-account-popup")');
    assert.equal(await page.eval(() => document.activeElement.closest('.workspace-account-popup')?.textContent), 'Cerrar sesión');
  };
  for (const role of ['ADMIN', 'TEACHER']) for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewport({ width, height: width === 1280 ? 800 : 1000 });
    await visit(role);
    const home = await page.eval(() => {
      const actions = [...document.querySelectorAll('.dashboard-task > a')];
      const trigger = document.querySelector('.workspace-account-trigger').getBoundingClientRect();
      return { hrefs: actions.map(a => a.getAttribute('href')), widths: actions.map(a => a.getBoundingClientRect().width),
        heights: actions.map(a => a.getBoundingClientRect().height), xs: actions.map(a => a.getBoundingClientRect().x),
        primary: actions.map(a => a.classList.contains('staff-button-primary')),
        name: document.querySelector('.dashboard-account dd').textContent,
        email: document.querySelectorAll('.dashboard-account dd')[1].textContent,
        icon: !!document.querySelector('.dashboard-account svg[aria-hidden=true]'),
        title: document.querySelector('.dashboard-account').getAttribute('aria-labelledby'),
        controls: document.querySelectorAll('.dashboard-account button,.dashboard-account input,.dashboard-account a').length,
        trigger: { width: trigger.width, height: trigger.height, right: trigger.right, top: trigger.top },
        overflow: document.documentElement.scrollWidth > innerWidth,
        privateEditable: !!document.querySelector('.dashboard-account [contenteditable]'),
        legacy: !!document.querySelector('[data-slot=sidebar-footer]'),
      };
    });
    assert.deepEqual(home.hrefs, role === 'ADMIN' ? ['/academico/cursos', '/usuarios', '/usuarios/nueva', '/tareas'] : ['/academico/cursos', '/tareas']);
    assert.ok(Math.max(...home.widths) - Math.min(...home.widths) < 1);
    assert.ok(Math.max(...home.xs) - Math.min(...home.xs) < 1);
    assert.ok(home.heights.every(h => h >= 44));
    assert.deepEqual(home.primary, home.hrefs.map((_, i) => i === 0));
    assert.ok(home.name.length > 60); assert.ok(home.email.length > 70);
    assert.equal(home.icon, true); assert.equal(home.title, 'dashboard-account-title');
    assert.equal(home.controls, 0); assert.equal(home.privateEditable, false); assert.equal(home.overflow, false);
    assert.ok(home.trigger.width >= 44 && home.trigger.height >= 44 && home.trigger.right <= width && home.trigger.top < 70);
    if (width >= 1024) assert.equal(home.legacy, legacy);
    await open();
    const popup = await page.eval(() => {
      const popup = document.querySelector('.workspace-account-popup'), r = popup.getBoundingClientRect();
      return { actions: [...popup.querySelectorAll('button,a')].map(e => e.textContent),
        expanded: document.querySelector('.workspace-account-trigger').getAttribute('aria-expanded'),
        label: popup.getAttribute('aria-label'), left: r.left, right: r.right, top: r.top,
        bottom: r.bottom, viewport: innerHeight, path: location.pathname };
    });
    assert.deepEqual(popup.actions, ['Cerrar sesión']); assert.equal(popup.expanded, 'true');
    assert.equal(popup.label, 'Opciones de cuenta');
    assert.ok(popup.left >= 0 && popup.right <= width && popup.top >= 0 && popup.bottom <= popup.viewport);
    if ([390, 768, 1440].includes(width)) await page.screenshot({ path: `${output}/${role}-${width}-menu.jpg`, fullPage: true });
    await key('Escape');
    assert.equal(await page.eval(() => document.activeElement.getAttribute('aria-label')), 'Menú de cuenta');
    assert.equal(await page.eval(() => !!document.querySelector('.workspace-account-popup')), false);
    assert.equal(await page.eval(() => location.pathname), popup.path);
    if (width >= 1024) {
      await page.eval(() => document.getElementById('workspace-menu-toggle').click()); await settle();
      assert.equal(await page.eval(() => document.querySelector('[data-slot=sidebar-container]').inert), true);
      await open(); await key('Escape');
    }
    results.push({ role, width, home, popup });
  }
  for (const role of ['ADMIN', 'TEACHER']) {
    await page.setViewport({ width: 390, height: 844, mobile: true });
    await visit(role, role === 'ADMIN' ? '/usuarios/nueva' : '/indicadores');
    await page.eval(() => {
      const input = document.querySelector('#account-name'); if (input) { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, 'Borrador sintético'); input.dispatchEvent(new Event('input', { bubbles: true })); }
      window.accountHarness.installGuard();
    });
    const before = await page.eval(() => ({ path: location.pathname, draft: document.querySelector('#account-name')?.value }));
    await open(); await key('Escape');
    assert.deepEqual(await page.eval(() => ({ path: location.pathname, draft: document.querySelector('#account-name')?.value })), before);
    assert.equal(await page.eval(() => window.accountHarness.guardDecisions()), 0);
    await open();
    const point = await page.eval(() => { const r = document.querySelector('.workspace-account-popup button').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await page.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    await page.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait('document.querySelector("h1")?.textContent === "Iniciar sesión"');
    assert.equal(await page.eval(() => window.accountHarness.guardDecisions()), 0);
    assert.equal(await page.eval(() => window.usuarioCalls.filter(c => c.path.endsWith('/sign-out')).length), 1);
    assert.equal(await page.eval(() => !!document.querySelector('.workspace-account-popup,.dashboard-account,.workspace-toolbar')), false);
    results.push({ role, touchCloseFromOtherScreen: true, noLeaveGuardVeto: true });
  }
  await page.setViewport({ width: 1440, height: 900, mobile: false });
  for (const scenario of ['', 'absent', 'unconfirmed', 'network', 'recover', 'lost-response', 'timeout', 'pending']) {
    await visit('ADMIN', '/', scenario);
    await page.eval(() => document.querySelector('nav[aria-label="Navegación principal"] a[href="/tareas"]').click()); await settle();
    assert.equal(await page.eval(() => location.pathname), '/tareas');
    await open();
    await page.eval(() => { const action = document.querySelector('.workspace-account-popup button'); action.click(); action.click(); });
    const uncertain = ['unconfirmed', 'network', 'recover', 'lost-response', 'timeout'].includes(scenario);
    const heading = uncertain ? 'No pudimos confirmar el cierre' : scenario === 'pending' ? 'Cerrando sesión' : 'Iniciar sesión';
    await wait(`document.querySelector('h1')?.textContent === ${JSON.stringify(heading)}`);
    assert.equal(await page.eval(() => !!document.querySelector('.workspace-toolbar,.dashboard-account,.workspace-account-popup')), false);
    assert.equal(await page.eval(() => window.usuarioCalls.filter(c => c.path.endsWith('/sign-out')).length), 1);
    if (['recover', 'lost-response'].includes(scenario)) {
      await page.eval(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Reintentar').click());
      await wait('document.querySelector("h1")?.textContent === "Iniciar sesión"');
      assert.equal(await page.eval(() => window.usuarioCalls.filter(c => c.path.endsWith('/sign-out')).length), scenario === 'recover' ? 2 : 1);
    }
    await page.eval(() => history.back()); await settle();
    assert.equal(await page.eval(() => !!document.querySelector('.workspace-toolbar,.dashboard-account,.workspace-account-popup')), false);
    await page.eval(() => history.forward()); await settle();
    assert.equal(await page.eval(() => !!document.querySelector('.workspace-toolbar,.dashboard-account,.workspace-account-popup')), false);
    await page.screenshot({ path: `${output}/close-${scenario || 'confirmed'}.jpg` });
    results.push({ scenario: scenario || 'confirmed', heading, noPrivateDOMOnHistory: true });
  }
  await visit('TEACHER'); await open();
  await key('Tab', true); // Focus may leave a nonmodal popup; no keyboard trap.
  assert.equal(await page.eval(() => document.activeElement.isConnected && !document.activeElement.closest('[inert]')), true);
  await visit('TEACHER'); await open();
  await page.eval(() => window.accountHarness.suspend()); await settle();
  assert.equal(await page.eval(() => !!document.querySelector('.workspace-account-popup,.dashboard-account,.workspace-toolbar')), false);
  await page.eval(() => window.accountHarness.resume()); await wait('!!document.querySelector(".workspace-account-trigger")');
  assert.equal(await page.eval(() => !!document.querySelector('.workspace-account-popup')), false);
  await page.setViewport({ width: 390, height: 844 });
  await visit('TEACHER');
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.eval(() => { document.documentElement.style.fontSize = '200%'; }); await settle();
  await open();
  assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false);
  const ax = await page.send('Accessibility.getFullAXTree');
  assert.ok(ax.nodes.some(n => n.name?.value === 'Menú de cuenta' && !n.ignored));
  assert.ok(ax.nodes.some(n => n.name?.value === 'Cerrar sesión' && !n.ignored));
  assert.equal(ax.nodes.some(n => n.name?.value === 'Ver perfil' && !n.ignored), false);
  await page.screenshot({ path: `${output}/teacher-390-text200-forced-colors.jpg`, fullPage: true });
  await page.eval(() => { document.documentElement.style.fontSize = ''; });
  await page.send('Emulation.setEmulatedMedia', { features: [] });
  for (const path of ['/recuperar-acceso', '/acceso/invitacion']) {
    await page.goto(`${origin}/tests/browser/usuarios-harness.html?path=${encodeURIComponent(path)}`, { settleMs: 300 });
    assert.equal(await page.eval(() => !!document.querySelector('.workspace-account-trigger,.workspace-account-popup')), false);
  }
  assert.deepEqual(page.consoleErrors, []);
  writeFileSync(`${output}/results.json`, JSON.stringify({ legacy, results, limits: 'Synthetic transport only; pending/timeout requests intentionally do not settle. No real API/BD, BFCache, screen-reader, other-browser or real 400% zoom audit.' }, null, 2));
  console.log(`PASS: 14 role/viewport cases, aligned actions and read-only account, global one-action popup/keyboard/AX/touch, eight close outcomes/reconciliation/history, suspension, text200/forced-colors/reduced-motion; legacy=${legacy}.`);
} catch (error) {
  if (page) {
    await page.screenshot({ path: `${output}/failure.jpg`, fullPage: true });
    writeFileSync(`${output}/failure.json`, JSON.stringify({ error: String(error), results,
      body: await page.eval(() => document.body.innerText), location: await page.eval(() => location.href),
      calls: await page.eval(() => window.usuarioCalls), console: page.consoleErrors }, null, 2));
  }
  throw error;
} finally { await browser.close(); }
