import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://localhost:5187';
const output = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/invitation-conflict';
mkdirSync(output, { recursive: true });
const browser = await Browser.launch();
const results = [];
try {
  const page = await browser.newPage({ reducedMotion: true });
  const wait = condition => page.eval(async source => {
    for (let n = 0; n < 200; n++) {
      if (new Function(`return (${source})`)()) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(`Missing state: ${source}`);
  }, condition);
  const open = async (path = '/usuarios/nueva', write = 'conflict') => {
    await page.goto(`${origin}/tests/browser/usuarios-harness.html?role=ADMIN&write=${write}&path=${encodeURIComponent(path)}`, { settleMs: 200 });
    await wait('!!document.getElementById("account-email")');
  };
  const fill = values => page.eval(values => {
    for (const [id, value] of Object.entries(values)) {
      const input = document.getElementById(id);
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, values);
  const submit = async () => {
    await page.eval(() => document.querySelector('form').requestSubmit());
    await wait('!!document.querySelector("[role=alert]") && !document.querySelector("form").getAttribute("aria-busy").includes("true")');
  };
  const writes = () => page.eval(() => window.usuarioCalls.filter(call => call.path.startsWith('/api/v1/accounts') && call.method !== 'GET').length);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewport({ width, height: 1000 });
    await open();
    await fill({ 'account-name': 'Borrador docente ficticio', 'account-email': 'lucia@ejemplo.edu.co' });
    await submit();
    const draft = await page.eval(() => ({
      name: document.getElementById('account-name').value,
      email: document.getElementById('account-email').value,
      disabled: [...document.querySelectorAll('form input, form button[type=submit]')].some(el => el.disabled),
      focusIsAlert: document.activeElement.getAttribute('role') === 'alert',
    }));
    assert.deepEqual(draft, { name: 'Borrador docente ficticio', email: 'lucia@ejemplo.edu.co', disabled: false, focusIsAlert: true });
    assert.equal(await writes(), 1);
    await page.eval(() => [...document.querySelectorAll('button')].find(el => el.textContent.includes('Revisar profesores sin salir')).click());
    await wait('!!document.getElementById("invitation-accounts-review") && document.getElementById("invitation-accounts-review").textContent.includes("Lucía Martínez")');
    assert.equal(await page.eval(() => location.pathname), '/usuarios/nueva');
    assert.equal(await writes(), 1, 'review must never repeat POST');
    assert.equal(await page.eval(() => document.getElementById('account-name').value), draft.name);
    assert.equal(await page.eval(() => document.querySelectorAll('h1').length), 1);
    assert.equal(await page.eval(() => document.querySelectorAll('#invitation-accounts-review a').length), 0);
    await page.eval(() => {
      const select = document.querySelector('#invitation-accounts-review select');
      select.value = 'PENDIENTE'; select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await wait('document.getElementById("invitation-accounts-review").textContent.includes("Andrés Rojas") && !document.getElementById("invitation-accounts-review").textContent.includes("Lucía Martínez")');
    assert.equal(await page.eval(() => document.getElementById('account-email').value), draft.email);
    assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/conflict-review-${width}.png`, fullPage: true });
    await page.eval(() => [...document.querySelectorAll('#invitation-accounts-review button')].find(el => el.textContent === 'Volver al borrador').click());
    assert.equal(await page.eval(() => document.activeElement.id), 'account-email');
    assert.equal(await page.eval(() => document.getElementById('account-name').value), draft.name);
    assert.equal(await page.eval(() => !!document.getElementById('invitation-accounts-review')), false);
    await fill({ 'account-email': 'corregido@ejemplo.edu.co' });
    assert.equal(await writes(), 1, 'editing is not submission');
    await page.eval(() => document.querySelector('form button[type=submit]').focus());
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await wait('document.body.textContent.includes("Cuenta creada")');
    assert.equal(await writes(), 2);
    assert.ok(await page.eval(() => document.body.textContent.includes('Borrador docente ficticio') && document.body.textContent.includes('corregido@ejemplo.edu.co')));
    results.push({ width, conflictPreservesDraft: true, inlineReview: true, manualCorrection: true, keyboard: true });
  }
  await open('/usuarios/cuenta-lucia/editar');
  await fill({ 'account-name': 'Edición conservada', 'account-email': 'andres@ejemplo.edu.co' });
  await submit();
  assert.equal(await page.eval(() => document.getElementById('account-email').disabled), true);
  await page.eval(() => [...document.querySelectorAll('button')].find(el => el.textContent === 'Consultar estado actual').click());
  await wait('!document.getElementById("account-email").disabled');
  assert.equal(await page.eval(() => document.getElementById('account-name').value), 'Edición conservada');
  assert.equal(await page.eval(() => document.getElementById('account-email').value), 'andres@ejemplo.edu.co');
  assert.equal(await writes(), 1);
  results.push({ editStillRequiresReview: true });
  await open('/usuarios/nueva', 'pending');
  await fill({ 'account-name': 'Pendiente ficticio', 'account-email': 'pending@ejemplo.edu.co' });
  await page.eval(() => { document.querySelector('form').requestSubmit(); document.querySelector('form').requestSubmit(); });
  await wait('document.querySelector("form").getAttribute("aria-busy") === "true"');
  assert.equal(await writes(), 1);
  assert.equal(await page.eval(() => document.getElementById('account-email').disabled), true);
  results.push({ pendingAndDoubleSubmitProtected: true });
  await open('/usuarios/nueva', 'uncertain');
  await fill({ 'account-name': 'Incierto ficticio', 'account-email': 'uncertain@ejemplo.edu.co' });
  await page.eval(() => document.querySelector('form').requestSubmit());
  await wait('document.body.textContent.includes("Hay una operación sin confirmar") && document.body.textContent.includes("No pudimos comprobar tu acceso")');
  assert.equal(await page.eval(() => !!document.getElementById('account-email')), false);
  await page.eval(() => [...document.querySelectorAll('button')].find(el => el.textContent.includes('Reintentar')).click());
  await wait('!!document.getElementById("account-email")');
  assert.equal(await page.eval(() => document.querySelector('form button[type=submit]').disabled), true);
  assert.equal(await writes(), 1);
  results.push({ uncertainStillLocked: true });
  assert.deepEqual(page.consoleErrors, []);
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(`PASS: ${results.length} UI scenarios; conflict draft/review/correction, edit reconciliation, pending and uncertain guards.`);
} finally { await browser.close(); }
