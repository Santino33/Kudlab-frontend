import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
// Optional zero-dependency driver, same CDP tool as the existing design checks.
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs');
const browser = await Browser.launch();
const output = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/estudiantes-evidence';
mkdirSync(output, { recursive: true });
const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://localhost:5193';
const results = [];
const base = '/academico/estudiantes';
const id = '00000000-0000-4000-8000-000000000001';
try {
  const page = await browser.newPage({ reducedMotion: true });
  await page.goto(`${origin}/tests/browser/students-harness.html`, { settleMs: 200 });
  results.push({ dom: await page.eval(() => window.runStudentChecks()) });
  async function fixture(options) {
    await page.eval(async options => {
      window.studentFixture(options);
      for (let n = 0; n < 150; n++) {
        const content = document.getElementById('workspace-content');
        if (content?.querySelector('h1') && !content.textContent.includes('Consultando')) {
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      throw new Error('Fixture did not load');
    }, options);
  }
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewport({ width, height: 1000 });
    for (const [name, path] of [['list', base], ['detail', `${base}/${id}`], ['edit', `${base}/${id}/editar`], ['blocked', `${base}/nuevo`]]) {
      await fixture({ path, long: true });
      const state = await page.eval(() => ({ heading: document.querySelector('h1')?.textContent, overflow: document.documentElement.scrollWidth > innerWidth,
        small: [...document.querySelectorAll('button,input')].filter(el => el.getBoundingClientRect().width && el.getBoundingClientRect().height < 44).length }));
      assert.ok(state.heading, `${name} heading`); assert.equal(state.overflow, false, `${name} ${width} page overflow`); assert.equal(state.small, 0, `${name} ${width} targets`);
      results.push({ name, width, ...state });
      if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}/${name}-${width}.png`, format: 'png', fullPage: true });
    }
  }
  // Increase text independently of the viewport. 360px also checks the reflow width of 1440/4.
  for (const width of [320, 360, 1440]) {
    await page.setViewport({ width, height: 1000 });
    for (const path of [base, `${base}/${id}/editar`, `${base}/nuevo`]) {
      await fixture({ path, long: true });
      await page.eval(() => { document.documentElement.style.fontSize = '200%'; });
      const overflow = await page.eval(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) {
        console.log(await page.eval(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth).map(el => ({ tag: el.tagName, class: el.className, width: el.getBoundingClientRect().width, text: el.textContent?.slice(0, 60) })).slice(0, 20)));
        await page.screenshot({ path: `${output}/overflow.png`, format: 'png', fullPage: true });
      }
      assert.equal(overflow, false, `200% text at ${width}, ${path}`);
      results.push({ textSize: '200%', width, path, overflow });
      await page.eval(() => { document.documentElement.style.fontSize = ''; });
    }
  }
  await page.setViewport({ width: 1440, height: 900 });
  await fixture({ path: `${base}/${id}` });
  await page.eval(() => document.getElementById('student-deactivate').focus());
  async function press(key) {
    const windowsVirtualKeyCode = { Enter: 13, Tab: 9, Escape: 27 }[key];
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode, ...(key === 'Enter' ? { text: '\r' } : {}) });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode });
    await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  await press('Enter');
  assert.equal(await page.eval(() => document.activeElement.textContent), 'Cancelar');
  for (let i = 0; i < 5; i++) { await press('Tab'); assert.equal(await page.eval(() => Boolean(document.activeElement.closest('[role=alertdialog]'))), true); }
  await page.screenshot({ path: `${output}/dialog-1440.png`, format: 'png' });
  await press('Escape');
  assert.equal(await page.eval(() => document.activeElement.id), 'student-deactivate');
  results.push({ keyboard: 'Enter opens, Cancel initial focus, Tab contained, Escape closes and returns to trigger' });
  await page.setViewport({ width: 390, height: 844 });
  await fixture({ path: base });
  await page.eval(() => document.getElementById('workspace-menu-toggle').focus()); await press('Enter');
  assert.equal(await page.eval(() => Boolean(document.querySelector('[role=dialog]'))), true);
  await page.eval(() => document.querySelector('[role=dialog] a[href="/academico/estudiantes"]').click());
  await page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.equal(await page.eval(() => Boolean(document.querySelector('[role=dialog]'))), false);
  results.push({ mobile: 'Academic sidebar navigation closes modal Sheet' });
  assert.deepEqual(page.consoleErrors, []);
  await page.goto(`${origin}/tests/browser/tasks-harness.html`, { settleMs: 200 });
  results.push({ tasksRegression: await page.eval(() => window.runTaskChecks()) });
  assert.deepEqual(page.consoleErrors, []);
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(`PASS: DOM, 20 page/viewport checks, text enlargement, dialog keyboard/focus, mobile navigation. Evidence: ${output}`);
} finally { await browser.close(); }
