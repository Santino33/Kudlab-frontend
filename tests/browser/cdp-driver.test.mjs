import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Browser, findChrome } from './vendor/cdp.mjs';

test('los siete recorridos usan el driver versionado sin depender de skills', () => {
  for (const file of ['courses', 'invitation-conflict', 'recovery', 'sidebar-motion', 'students', 'ui-flow', 'usuarios-design']) {
    const source = readFileSync(new URL(`./${file}.check.mjs`, import.meta.url), 'utf8');
    assert.ok(source.includes("process.env.KUDLAB_CDP_DRIVER ?? './vendor/cdp.mjs'"));
    assert.ok(!source.includes('.agents/skills/'));
  }
});

test('el driver controla un navegador real y evalúa DOM', { skip: !findChrome() }, async () => {
  const browser = await Browser.launch();
  try {
    const page = await browser.newPage({ width: 390, height: 844, reducedMotion: true });
    await page.goto('data:text/html,<h1>Fixture local</h1>', { settleMs: 0 });
    assert.equal(await page.eval(() => document.querySelector('h1').textContent), 'Fixture local');
    assert.equal(await page.eval(() => innerWidth), 390);
    const png = Buffer.from(await page.screenshot({ format: 'png' }), 'base64');
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    await page.close();
  } finally {
    await browser.close();
  }
});
