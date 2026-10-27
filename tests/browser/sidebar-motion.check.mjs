import assert from 'node:assert/strict';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://localhost:5210';
const browser = await Browser.launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${origin}/tests/browser/usuarios-harness.html?role=ADMIN`, { settleMs: 300 });
  const settle = () => page.eval(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
  });
  const toggle = () => page.eval(() => {
    document.getElementById('workspace-menu-toggle').click();
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const desktop = (midpoint = false) => page.eval(midpoint => {
    const panel = document.querySelector('[data-slot=sidebar-container]');
    if (midpoint) for (const animation of panel.getAnimations()) animation.currentTime = 90;
    return {
      right: panel.getBoundingClientRect().right,
      inert: panel.inert,
      gap: document.querySelector('[data-slot=sidebar-gap]').getBoundingClientRect().width,
      expanded: document.getElementById('workspace-menu-toggle').getAttribute('aria-expanded'),
      moving: panel.getAnimations().some(animation => animation.playState === 'running'),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  }, midpoint);
  assert.equal(await page.eval(() => Boolean(document.querySelector('a[href="/tareas"] svg.lucide-database'))), true);
  await toggle();
  let state = await desktop(true);
  assert.equal(state.inert, true); assert.equal(state.expanded, 'false'); assert.equal(state.moving, true);
  assert.ok(state.right > 0 && state.right < 256, 'desktop has intermediate frames');
  await toggle(); // Reverse before the closing transition finishes.
  await settle();
  state = await desktop();
  assert.equal(state.right, 256); assert.equal(state.inert, false); assert.equal(state.gap, 256);
  await toggle(); await settle(); state = await desktop();
  assert.equal(state.right, 0); assert.equal(state.gap, 0); assert.equal(state.overflow, false);
  await toggle(); await settle();

  await page.setViewport({ width: 390, height: 844 });
  await settle(); await toggle();
  assert.equal(await page.eval(() => document.querySelector('[data-slot=sheet-content]').getAnimations().length > 0), true);
  await settle();
  assert.equal(await page.eval(() => document.querySelector('[data-slot=sheet-content]').getBoundingClientRect().left), 0);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await settle();
  assert.equal(await page.eval(() => Boolean(document.querySelector('[role=dialog]'))), false);
  assert.equal(await page.eval(() => document.activeElement.id), 'workspace-menu-toggle');

  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await toggle(); await settle();
  assert.equal(await page.eval(() => getComputedStyle(document.querySelector('[data-slot=sheet-content]')).transitionDuration), '0s');
  await page.eval(() => document.querySelector('[aria-label="Cerrar navegación"]').click()); await settle();
  await page.setViewport({ width: 1440, height: 900 }); await settle();
  await toggle(); await settle(); state = await desktop();
  assert.equal(state.right, 0); assert.equal(state.moving, false);
  assert.equal(await page.eval(() => getComputedStyle(document.querySelector('[data-slot=sidebar-container]')).transitionDuration), '0s');
  assert.deepEqual(page.consoleErrors, []);
  console.log('PASS: data icon, desktop intermediate motion/reversal/inert/layout, mobile motion/Escape/focus, reduced motion on both.');
} finally { await browser.close(); }
