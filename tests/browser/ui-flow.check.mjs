import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://localhost:5206';
const output = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/kudlab-ui-flow';
mkdirSync(output, { recursive: true });
const browser = await Browser.launch();
const passed = [];
try {
  const page = await browser.newPage({ reducedMotion: true });
  await page.setViewport({ width: 1440, height: 900 });
  const flush = () => page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const open = async (path, query = '') => {
    await page.goto(`${origin}/tests/browser/usuarios-harness.html?role=ADMIN&path=${encodeURIComponent(path)}${query}`, { settleMs: 250 });
  };
  const click = async selector => {
    await page.eval(async selector => {
      for (let n = 0; n < 150; n++) {
        const control = [...document.querySelectorAll(selector)].find(el => el.getBoundingClientRect().width && el.getBoundingClientRect().height);
        if (control) { control.click(); return; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      throw new Error(`No visible control: ${selector}; ${document.body.textContent}`);
    }, selector);
    await flush();
  };
  const fill = async values => {
    await page.eval(values => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      for (const [id, value] of Object.entries(values)) {
        const field = document.getElementById(id); setter.call(field, value); field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, values);
    await flush();
  };
  const heading = () => page.eval(() => document.querySelector('h1')?.textContent);
  const sessions = () => page.eval(() => window.usuarioCalls.filter(call => call.path.endsWith('/get-session')).length);

  await open('/usuarios', '&write=success');
  const initialSessions = await sessions();
  await click('#workspace-content a[href="/usuarios/cuenta-lucia"]');
  assert.equal(await heading(), 'Lucía Martínez');
  await click('a[href="/usuarios/cuenta-lucia/editar"]');
  await fill({ 'account-name': 'Profesora de prueba actualizada' });
  await click('form button[type=submit]');
  assert.equal(await heading(), 'Cambios guardados');
  assert.equal(await page.eval(() => document.body.textContent.includes('Revisa el estado de la cuenta')), false, 'name-only save does not imply a pending email');
  await click('a[href="/usuarios/cuenta-lucia"]');
  assert.equal(await heading(), 'Profesora de prueba actualizada');
  await click('#workspace-content a[href="/usuarios"]');
  await click('#workspace-content a[href="/usuarios/cuenta-ana"]');
  assert.equal(await heading(), 'Ana Beltrán');
  assert.equal(await sessions(), initialSessions, 'no document reload or repeated auth between account routes');
  passed.push('List → account → edit → confirmed save → account → list → different account; single AuthRoot');

  await open('/usuarios/cuenta-andres', '&write=success');
  await click('#workspace-content button');
  await click('[role=alertdialog] button:not(:first-child)');
  assert.equal(await heading(), 'Andrés Rojas');
  await page.eval(() => { history.pushState(null, '', '/usuarios/cuenta-ana'); dispatchEvent(new PopStateEvent('popstate')); });
  await flush();
  assert.equal(await heading(), 'Ana Beltrán', 'mutation result cannot leak across account IDs');
  passed.push('Account ID change retires the previous mutation result');

  await open('/usuarios/cuenta-lucia/editar');
  await fill({ 'account-name': 'Cambio sintético sin confirmar' });
  await click('form button[type=submit]');
  assert.equal(await heading(), 'No pudimos comprobar tu acceso');
  await page.eval(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Reintentar').click());
  await flush();
  assert.equal(await page.eval(() => document.body.textContent.includes('Hay una operación sin confirmar')), true);
  await click('nav[aria-label="Navegación principal"] a[href="/usuarios"]');
  assert.equal(await heading(), 'Profesores');
  assert.equal(await page.eval(() => document.body.textContent.includes('Hay una operación sin confirmar')), true, 'protected navigation retains uncertainty');
  assert.equal(await page.eval(() => window.usuarioCalls.filter(call => call.method === 'PATCH').length), 1, 'no automatic replay');
  passed.push('Uncertain write survives session recheck and internal navigation without replay');

  await page.goto(`${origin}/tests/browser/usuarios-harness.html?access=absent`, { settleMs: 250 });
  await fill({ email: 'profesor@example.edu.co', password: 'SyntheticPassword123' });
  await click('button[aria-controls=password]');
  assert.equal(await page.eval(() => document.getElementById('password').type), 'text');
  assert.equal(await page.eval(() => document.getElementById('password').value), 'SyntheticPassword123');
  await click('button[aria-controls=password]');
  assert.equal(await page.eval(() => document.getElementById('password').type), 'password');
  await page.screenshot({ path: `${output}/login-1440.png`, fullPage: true });
  passed.push('Login password visibility is keyboard-addressable and preserves the input');

  await page.goto(`${origin}/tests/browser/usuarios-harness.html?role=TEACHER`, { settleMs: 250 });
  assert.equal(await page.eval(() => Boolean(document.querySelector('#workspace-content a[href="/academico/estudiantes"]'))), true);
  assert.equal(await page.eval(() => Boolean(document.querySelector('#workspace-content a[href="/tareas"]'))), true);
  assert.equal(await page.eval(() => Boolean(document.querySelector('a[href="/usuarios"]'))), false);
  passed.push('Teacher home offers only student records and tasks, not administrative destinations');
  assert.deepEqual(page.consoleErrors, []);
  writeFileSync(`${output}/results.json`, JSON.stringify(passed, null, 2));
  console.log(`PASS: ${passed.length} UI flow regressions. Synthetic transport only. ${output}`);
} finally { await browser.close(); }
