import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { Browser } from './vendor/cdp.mjs';

const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://127.0.0.1:5298';
const dir = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/kudlab-access-layout';
mkdirSync(dir, { recursive: true });
const browser = await Browser.launch();
try {
  const page = await browser.newPage();
  const open = (path, query = '') => page.goto(`${origin}/tests/browser/usuarios-harness.html?path=${encodeURIComponent(path)}${query}`, { settleMs: 250 });
  for (const width of [320, 390, 768, 1023, 1024, 1280, 1440]) {
    await page.setViewport({ width, height: 900 });
    for (const [path, query, variant, header] of [
      ['/acceso', '&access=absent', 'access', false],
      ['/recuperar-acceso', '', 'recovery', true],
      ['/recuperar-acceso/confirmar', '&ticket=valid', 'recovery', true],
      ['/acceso/invitacion', '&ticket=valid', undefined, true],
      ['/ruta-inexistente', '', undefined, true],
      ['/acceso', '&access=unavailable', undefined, true],
    ]) {
      await open(path, query);
      const state = await page.eval(() => ({
        access: !!document.querySelector('.auth-page--access'),
        recovery: !!document.querySelector('.auth-page--recovery'),
        header: !!document.querySelector('.auth-header'),
        mains: document.querySelectorAll('main').length,
        footers: document.querySelectorAll('.auth-footer').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        footerAlign: getComputedStyle(document.querySelector('.auth-footer')).textAlign,
      }));
      assert.equal(state.access, variant === 'access', `${path}: access`);
      assert.equal(state.recovery, variant === 'recovery', `${path}: recovery`);
      assert.equal(state.header, header, `${path}: header`);
      assert.equal(state.mains, 1);
      assert.equal(state.footers, 1);
      assert.equal(state.overflow, false, `${path} ${width}: overflow`);
      if (variant) assert.equal(state.footerAlign, 'center');
    }
  }
  await open('/recuperar-acceso/confirmar', '&ticket=valid');
  await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  assert.equal(await page.eval(() => document.querySelector('h1').textContent), 'Acceso en pausa');
  assert.equal(await page.eval(() => document.querySelectorAll('input').length), 0);
  assert.equal(await page.eval(() => !!document.querySelector('.auth-header')), true);
  assert.deepEqual(page.consoleErrors, []);
  console.log('PASS public shell: 42 viewport/route cases, main/header/footer boundaries and paused recovery. Synthetic transport only.');
} finally { await browser.close(); }
