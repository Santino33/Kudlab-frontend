import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? './vendor/cdp.mjs');
const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://127.0.0.1:5282';
const output = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/front-base-visual';
mkdirSync(output, { recursive: true });
const browser = await Browser.launch();
const results = [];
try {
  const page = await browser.newPage({ reducedMotion: true });
  const read = selector => page.eval(selector => {
    const e = document.querySelector(selector), s = getComputedStyle(e), r = e.getBoundingClientRect();
    return { bg: s.backgroundColor, color: s.color, left: s.borderLeftWidth, right: s.borderRightColor, border: s.borderRightWidth, width: r.width, height: r.height, padding: s.paddingLeft, outline: s.outlineWidth, offset: s.outlineOffset };
  }, selector);
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewport({ width, height: 800 });
    await page.goto(`${origin}/tests/browser/base-visual-harness.html`, { settleMs: 200 });
    assert.equal((await read('#primary')).bg, 'rgb(20, 38, 77)', 'approved action background');
    assert.equal((await read('#primary')).color, 'rgb(255, 255, 255)');
    assert.equal((await read('[data-slot="switch"]')).bg, 'rgb(83, 192, 243)', 'Switch not recoloured by action tokens');
    const field = await read('#sample-field');
    assert.equal(field.left, '2px');
    assert.equal(field.right, 'rgba(0, 0, 0, 0)');
    assert.ok(field.height >= 44);
    assert.equal((await read('#sample-select')).left, '2px');
    const padding = width < 640 ? 16 : width < 1024 ? 24 : 32;
    assert.equal((await read('#panel-body')).padding, `${padding}px`);
    assert.ok((await read('#form')).width <= 512);
    assert.ok((await read('#panel')).width <= 1200);
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
    if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}/base-${width}.png`, fullPage: true });
    results.push({ width, padding, controls: 'pass' });
  }
  assert.deepEqual(page.consoleErrors, []);
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(`PASS base visual: ${results.length} viewports, action/control/panel/keyboard/error regression.`);
} finally { await browser.close(); }
