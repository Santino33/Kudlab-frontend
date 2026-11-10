import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { Browser } from './vendor/cdp.mjs';

const origin = process.env.INVITATION_PREVIEW_ORIGIN ?? 'http://localhost:5198';
const dir = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/activacion-profesor-ui';
mkdirSync(dir, { recursive: true });
const browser = await Browser.launch();
try {
  const page = await browser.newPage();
  const flush = () => page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const open = async (query = '&ticket=valid') => {
    await page.goto(`${origin}/tests/browser/usuarios-harness.html?path=/acceso/invitacion${query}`, { settleMs: 250 });
    assert.equal(await page.eval(() => Number(document.body.dataset.invitationSubmissions ?? 0)), 0);
    assert.equal(await page.eval(() => window.usuarioCalls.length), 0, 'Public entry does not require session or consume token');
  };
  const fill = (password = 'SyntheticPassword123', confirmation = password) => page.eval(([password, confirmation]) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [id, value] of [['invitation-password', password], ['invitation-confirmation', confirmation]]) {
      const input = document.getElementById(id); setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [password, confirmation]);
  const submit = async () => { await page.eval(() => { document.querySelector('form').requestSubmit(); document.querySelector('form')?.requestSubmit(); }); await flush(); };
  const count = () => page.eval(() => Number(document.body.dataset.invitationSubmissions ?? 0));
  const heading = () => page.eval(() => document.querySelector('h1').textContent);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewport({ width, height: 1000 });
    await open();
    assert.equal(await heading(), 'Activa tu cuenta');
    assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${dir}/form-${width}.jpg`, fullPage: true });
  }
  await fill('Aa1'); await submit();
  assert.equal(await count(), 0);
  assert.equal(await page.eval(() => document.activeElement.id), 'invitation-password');
  await fill('SyntheticPassword123', 'DifferentPassword123'); await submit();
  assert.equal(await count(), 0);
  assert.equal(await page.eval(() => document.activeElement.id), 'invitation-confirmation');
  await fill(); await submit();
  assert.equal(await count(), 1);
  assert.equal(await heading(), 'Cuenta activada');
  assert.equal(await page.eval(() => document.querySelectorAll('input').length), 0);
  assert.equal(await page.eval(() => document.querySelector('a').getAttribute('href')), '/acceso');
  for (const [status, title] of [['400', 'Activa tu cuenta'], ['409', 'No se pudo activar la cuenta'], ['410', 'Invitación no disponible'], ['503', 'Activación sin confirmar'], ['unavailable', 'Activación sin confirmar'], ['pending', 'Activa tu cuenta']]) {
    await open(`&ticket=valid&invitation=${status}`); await fill(); await submit();
    assert.equal(await count(), 1);
    assert.equal(await heading(), title);
    assert.equal(await page.eval(() => [...document.querySelectorAll('input')].some(input => input.value)), false);
    if (status === '400') { await fill(); await submit(); assert.equal(await count(), 2); }
    if (status === 'pending') {
      assert.equal(await page.eval(() => document.querySelector('button[type=submit]').disabled), true);
    }
  }
  await open(''); assert.equal(await heading(), 'Invitación no disponible');
  await open(); await fill();
  await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  assert.equal(await page.eval(() => document.querySelectorAll('input').length), 0);
  await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))); await flush();
  assert.equal(await heading(), 'Invitación no disponible');
  assert.equal(await count(), 0);
  assert.deepEqual(page.consoleErrors, []);
  console.log('PASS invitation UI: four widths, public entry, validation/focus, single submit, success, 400/409/410/503/network/pending and lifecycle withdrawal. Synthetic transport.');
} finally { await browser.close(); }
