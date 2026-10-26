import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { Browser } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

const origin = process.env.RECOVERY_PREVIEW_ORIGIN ?? 'http://localhost:5188';
const fixture = '/tests/browser/usuarios-harness.html?path=';
const dir = '.taste-skill/recovery';
mkdirSync(dir, { recursive: true });
const browser = await Browser.launch();
try {
  const page = await browser.newPage();
  const flush = () => page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const fill = (values) => page.eval(values => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [id, value] of Object.entries(values)) { const input = document.getElementById(id); setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }
  }, values);
  const submit = async (twice = false) => { await page.eval(twice => { document.querySelector('form').requestSubmit(); if (twice) document.querySelector('form')?.requestSubmit(); }, twice); await flush(); };
  const count = () => page.eval(() => Number(document.body.dataset.recoverySubmissions ?? 0));
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewport({ width, height: 1000 });
    for (const [name, path, query] of [['request', '/recuperar-acceso', ''], ['confirm', '/recuperar-acceso/confirmar', '&ticket=valid'], ['missing', '/recuperar-acceso/confirmar', '']]) {
      await page.goto(`${origin}${fixture}${encodeURIComponent(path)}${query}`, { settleMs: 250 });
      assert.equal(await count(), 0, 'No automatic recovery request');
      assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false, `${name} ${width} overflow`);
      if ([390, 1440].includes(width)) await page.screenshot({ path: `${dir}/${name}-${width}.jpg`, fullPage: true });
    }
  }
  await page.setViewport({ width: 390, height: 1000 });
  await page.goto(`${origin}${fixture}/recuperar-acceso`, { settleMs: 250 });
  await submit();
  assert.equal(await page.eval(() => document.activeElement.id), 'recovery-email');
  assert.equal(await count(), 0);
  await fill({ 'recovery-email': 'profesora@pilot.edu.co' });
  await submit(true);
  assert.equal(await count(), 1);
  assert.equal(await page.eval(() => document.querySelector('h1').textContent), 'Revisa tu correo');
  await page.screenshot({ path: `${dir}/requested-390.jpg`, fullPage: true });

  await page.goto(`${origin}${fixture}/recuperar-acceso/confirmar&ticket=valid`, { settleMs: 250 });
  await fill({ 'new-password': 'Aa1', 'confirm-password': 'Aa1' });
  await submit();
  assert.equal(await page.eval(() => document.activeElement.id), 'new-password');
  assert.equal(await count(), 0);
  await fill({ 'new-password': 'SyntheticPassword123', 'confirm-password': 'DifferentPassword123' });
  await submit();
  assert.equal(await page.eval(() => document.activeElement.id), 'confirm-password');
  await fill({ 'confirm-password': 'SyntheticPassword123' });
  await page.eval(() => document.querySelector('button[aria-controls="new-password confirm-password"]').click());
  await flush();
  assert.equal(await page.eval(() => document.getElementById('new-password').type), 'text');
  await submit(true);
  assert.equal(await count(), 1);
  assert.equal(await page.eval(() => document.querySelector('h1').textContent), 'Contraseña actualizada');
  assert.equal(await page.eval(() => document.querySelectorAll('input').length), 0);
  await page.screenshot({ path: `${dir}/complete-390.jpg`, fullPage: true });

  for (const error of ['400', '410', '503', 'unavailable', 'pending']) {
    await page.goto(`${origin}${fixture}/recuperar-acceso/confirmar&ticket=valid&recovery=${error}`, { settleMs: 250 });
    await fill({ 'new-password': 'SyntheticPassword123', 'confirm-password': 'SyntheticPassword123' });
    await submit(true);
    assert.equal(await count(), 1);
    assert.equal(await page.eval(() => [...document.querySelectorAll('input')].some(input => input.value !== '')), false);
    if (error === '410') assert.equal(await page.eval(() => document.querySelectorAll('input').length), 0);
    if (error === '400') assert.equal(await page.eval(() => document.querySelector('button[type=submit]').disabled), false);
    if (['503', 'unavailable', 'pending'].includes(error)) assert.equal(await page.eval(() => document.querySelector('button[type=submit]').disabled), true);
    await page.screenshot({ path: `${dir}/error-${error}-390.jpg`, fullPage: true });
  }
  await page.goto(`${origin}${fixture}/recuperar-acceso/confirmar&ticket=valid`, { settleMs: 250 });
  await fill({ 'new-password': 'SyntheticPassword123', 'confirm-password': 'SyntheticPassword123' });
  await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  assert.equal(await page.eval(() => document.querySelectorAll('input').length), 0);
  await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await flush();
  assert.equal(await page.eval(() => document.querySelector('h1').textContent), 'Necesitas un nuevo enlace');
  assert.equal(await count(), 0);
  assert.deepEqual(page.consoleErrors, []);
  console.log('PASS: 15 viewport/state checks; validation, password visibility, single submit, 202/200/400/410/503/network/pending, secret withdrawal on exit. Synthetic transport only.');
} finally { await browser.close(); }
