import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
// Optional browser check: install the project design-taste-frontend skill first.
import { Browser } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';

const browser = await Browser.launch();
const results = [];
const dir = '.taste-skill/screens';
mkdirSync(dir, { recursive: true });
const base = 'http://localhost:5187/tests/browser/usuarios-harness.html?role=ADMIN';
const key = async (page, key, code) => {
  const windowsVirtualKeyCode = { Enter: 13, Tab: 9, Escape: 27 }[key];
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}) });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
const click = async (page, selector) => {
  const p = await page.eval(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, selector);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
};
try {
  const page = await browser.newPage();
  for (const [name, path] of [['home', '/'], ['list', '/usuarios'], ['invite', '/usuarios/nueva'], ['detail', '/usuarios/cuenta-admin'], ['edit', '/usuarios/cuenta-lucia/editar'], ['recovery', '/recuperar-acceso']]) {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewport({ width, height: 1000 });
      await page.goto(`${base}&path=${encodeURIComponent(path)}`, { settleMs: 300 });
      const state = await page.eval(() => ({ heading: document.querySelector('h1')?.textContent, overflow: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll('button,input,select')].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().height < 44).length, links: [...document.querySelectorAll('a')].map(e => e.getAttribute('href')) }));
      assert.ok(state.heading, `${name} heading`);
      assert.equal(state.overflow, false, `${name} ${width} overflow`);
      assert.equal(state.small, 0, `${name} ${width} touch targets`);
      assert.equal(state.links.includes('/sesion'), false);
      if ([390, 768, 1440].includes(width)) await page.screenshot({ path: `${dir}/${name}-${width}.jpg`, fullPage: true });
      results.push({ name, width, ...state, links: undefined });
    }
  }
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(base, { settleMs: 300 });
  await page.send('Page.bringToFront');
  console.log('Keyboard document focus:', await page.eval(() => document.hasFocus()));
  await page.eval(() => document.getElementById('workspace-menu-toggle').focus());
  await key(page, 'Enter', 'Enter');
  assert.equal(await page.eval(() => document.getElementById('workspace-menu-toggle').getAttribute('aria-expanded')), 'true');
  await key(page, 'Tab', 'Tab');
  assert.equal(await page.eval(() => document.activeElement.getAttribute('href')), '/');
  await key(page, 'Escape', 'Escape');
  assert.equal(await page.eval(() => document.activeElement.id), 'workspace-menu-toggle');
  assert.equal(await page.eval(() => document.getElementById('workspace-menu-toggle').getAttribute('aria-expanded')), 'false');
  results.push({ keyboardMenu: 'Enter opens, Tab enters links, Escape closes and restores focus' });

  await page.goto(`${base}&path=/usuarios/nueva`, { settleMs: 300 });
  await page.eval(() => document.querySelector('form button[type=submit]').focus());
  await key(page, 'Enter', 'Enter');
  assert.equal(await page.eval(() => document.activeElement.id), 'account-name');
  assert.equal(await page.eval(() => document.querySelectorAll('input[aria-invalid=true]').length), 2);
  results.push({ keyboardForm: 'Enter validates and focuses first invalid field' });

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${base}&path=/usuarios/cuenta-admin`, { settleMs: 300 });
  await click(page, '#workspace-content button');
  const focus = await page.eval(() => ({ dialog: !!document.querySelector('[role=alertdialog]'), focused: document.activeElement.textContent }));
  assert.equal(focus.dialog, true);
  assert.equal(focus.focused, 'Cancelar');
  await key(page, 'Tab', 'Tab');
  assert.equal(await page.eval(() => !!document.activeElement.closest('[role=alertdialog]')), true);
  await key(page, 'Tab', 'Tab');
  assert.equal(await page.eval(() => document.activeElement.textContent), 'Cancelar');
  await page.screenshot({ path: `${dir}/confirmation-1440.jpg` });
  await key(page, 'Escape', 'Escape');
  assert.equal(await page.eval(() => !!document.querySelector('[role=alertdialog]')), false);
  assert.equal(await page.eval(() => document.activeElement.textContent), 'Inactivar cuenta');
  results.push({ keyboardDialog: 'Safe initial focus, Tab containment, Escape closes and restores trigger' });

  await page.goto('http://localhost:5187/tests/browser/usuarios-harness.html?role=TEACHER', { settleMs: 300 });
  const teacher = await page.eval(() => ({ links: [...document.querySelectorAll('a')].map(e => e.getAttribute('href')), role: document.querySelector('.dashboard-account').textContent }));
  assert.equal(teacher.links.some(href => href.startsWith('/usuarios')), false);
  assert.ok(teacher.role.includes('Docente'));
  await page.screenshot({ path: `${dir}/teacher-1440.jpg` });
  results.push({ teacher: 'No management destinations' });
  assert.deepEqual(page.consoleErrors, []);
  writeFileSync('.taste-skill/browser-check.json', JSON.stringify(results, null, 2));
  console.log('PASS: 30 screen/viewport checks, mobile keyboard menu, form validation, modal focus/Tab/Escape, TEACHER permissions; no JS exceptions.');
} finally { await browser.close(); }
