import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? './vendor/cdp.mjs');
const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://127.0.0.1:5387';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname)) throw new Error('Loopback harness only');
const output = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/front-tareas-digitales';
mkdirSync(output, { recursive: true });
const browser = await Browser.launch();
const results = [];
let dimensions;
try {
  const page = await browser.newPage({ reducedMotion: true });
  const until = (expression) => page.eval(async expression => {
    for (let n = 0; n < 150; n++) {
      if (Function(`return (${expression})`)()) return;
      await new Promise(done => setTimeout(done, 20));
    }
    throw new Error(`Timeout: ${expression}`);
  }, expression);
  const mount = async (options = {}) => {
    await page.goto(`${origin}/tests/browser/tasks-harness.html`, { settleMs: 100 });
    await page.eval(options => { window.availabilityFixture = window.mountTaskFixture(options); }, options);
    await until('document.querySelectorAll(".task-state").length > 0');
  };
  const toggle = () => page.eval(() => {
    const el = [...document.querySelectorAll('[data-slot="switch"]')].find(el => el.getClientRects().length);
    if (!el) throw new Error('No visible Switch');
    el.click();
  });
  const click = label => page.eval(label => {
    const el = [...document.querySelectorAll('button,a')].find(el => el.getClientRects().length && el.textContent.trim() === label);
    if (!el) throw new Error(`Missing visible action: ${label}`);
    el.click();
  }, label);
  const writes = () => page.eval(() => window.availabilityFixture.writes);
  const run = async (name, check) => { await check(); results.push({ name, status: 'pass' }); };
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${origin}/tests/browser/tasks-harness.html`, { settleMs: 150 });
  await run('existing catalog/access DOM suite', async () => {
    assert.equal((await page.eval(() => window.runTaskChecks())).length, 11);
  });
  await run('held write: no optimistic state and no duplicate request', async () => {
    await mount({ role: 'ADMIN', mutation: 'hold' });
    await toggle();
    await until('window.availabilityFixture.writes.length === 1 && document.querySelector("[data-slot=switch]").hasAttribute("data-disabled")');
    assert.equal(await page.eval(() => [...document.querySelectorAll('[data-slot="switch"]')].every(el => el.getAttribute('aria-disabled') === 'true' && el.getAttribute('aria-checked') === 'false')), true);
    await toggle();
    assert.equal((await writes()).length, 1);
    await page.eval(() => window.availabilityFixture.release());
    await until('document.querySelector("[data-slot=switch]").getAttribute("aria-checked") === "true" && !document.querySelector("[data-slot=switch]").hasAttribute("data-disabled")');
    assert.deepEqual(await writes(), [{ isEnabled: true, expectedRevision: 1 }]);
    assert.equal(await page.eval(() => document.body.textContent.includes('No lista para asignar')), true);
    const before = await page.eval(() => window.availabilityFixture.calls.length);
    await page.eval(() => window.dispatchEvent(new Event('focus')));
    await until(`window.availabilityFixture.calls.length > ${before} && !document.querySelector('[data-slot=switch]').hasAttribute('data-disabled')`);
    assert.equal((await writes()).length, 1, 'focus refresh never replays PATCH');
  });
  await run('409: failed review remains locked, successful GET requires new intention', async () => {
    await mount({ role: 'ADMIN', mutation: 'conflict' });
    await toggle();
    await until('document.body.textContent.includes("La tarea cambió en otra sesión")');
    await toggle(); assert.equal((await writes()).length, 1);
    await page.eval(() => window.availabilityFixture.failReads(true));
    await click('Consultar estado actual');
    await until('document.body.textContent.includes("No pudimos consultar el estado")');
    assert.equal(await page.eval(() => document.querySelector('[data-slot="switch"]').getAttribute('aria-disabled')), 'true');
    await page.eval(() => window.availabilityFixture.failReads(false));
    await click('Consultar estado actual');
    await until('document.querySelector("[data-slot=switch]").getAttribute("aria-checked") === "true" && !document.querySelector("[data-slot=switch]").hasAttribute("data-disabled")');
    assert.equal((await writes()).length, 1, 'GET does not claim or replay failed mutation');
    await toggle();
    await until('window.availabilityFixture.writes.length === 2 && !document.querySelector("[data-slot=switch]").hasAttribute("data-disabled")');
    assert.deepEqual(await writes(), [{ isEnabled: true, expectedRevision: 1 }, { isEnabled: false, expectedRevision: 2 }]);
  });
  for (const mutation of ['lost', 'invalid', 'failure']) await run(`${mutation}: withdraw private DOM, explicit reconciliation without replay`, async () => {
    await mount({ role: 'ADMIN', mutation });
    await toggle();
    await until('document.body.textContent.includes("No pudimos comprobar tu acceso")');
    assert.equal(await page.eval(() => document.querySelector('[data-slot="switch"]') === null), true);
    assert.equal((await writes()).length, 1);
    await click('Reintentar');
    await until('document.querySelector("[data-slot=switch]") && !document.querySelector("[data-slot=switch]").hasAttribute("data-disabled")');
    assert.equal((await writes()).length, 1);
    assert.equal(await page.eval(() => document.querySelector('[data-slot="switch"]').getAttribute('aria-checked')), mutation === 'failure' ? 'false' : 'true');
    assert.equal(await page.eval(() => document.body.textContent.includes('Disponibilidad guardada.')), false, 'GET cannot attribute authorship');
  });
  await run('late write after pagehide cannot restore a revoked session', async () => {
    await mount({ role: 'ADMIN', mutation: 'hold' }); await toggle();
    await until('window.availabilityFixture.writes.length === 1');
    await page.eval(() => { window.dispatchEvent(new Event('pagehide')); window.availabilityFixture.expire(); window.availabilityFixture.release(); });
    assert.equal(await page.eval(() => document.querySelector('[data-slot="switch"]') === null), true);
    await page.eval(() => window.dispatchEvent(new Event('pageshow')));
    await until('document.body.textContent.includes("Tu sesión ya no es válida")');
    assert.equal((await writes()).length, 1);
    assert.equal(await page.eval(() => document.body.textContent.includes('Disponibilidad guardada.')), false);
  });
  // Separate gates: local presentation must pass; approved global dimensions may
  // remain blocked on the producer, never silently treated as delivered.
  if (!process.argv.includes('--behavior-only')) {
    for (const width of [320, 390, 768, 1024, 1280, 1440]) {
      await page.setViewport({ width, height: 800, mobile: width < 640 });
      for (const path of ['/tareas', '/tareas/TG-01']) for (const role of ['ADMIN', 'TEACHER']) {
        await mount({ role, path, enabled: true, longText: true });
        const view = await page.eval(() => {
          const visible = el => el.getClientRects().length > 0;
          const states = [...document.querySelectorAll('.task-state')].filter(visible).map(el => el.textContent);
          const switches = [...document.querySelectorAll('[data-slot="switch"]')].filter(visible);
          const el = switches[0];
          const track = el?.querySelector('[data-slot="switch-track"]');
          const pseudo = el && getComputedStyle(el, '::before');
          const panel = document.querySelector('.staff-panel');
          const body = panel?.firstElementChild;
          const reading = panel?.querySelector('.staff-detail-content');
          return { states, switchCount: switches.length, overflow: document.documentElement.scrollWidth > innerWidth,
            switch: el && { width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height,
              thumb: el.querySelector('[data-slot="switch-thumb"]').getBoundingClientRect().width, bg: getComputedStyle(el).backgroundColor,
              track: track ? [track.getBoundingClientRect().width, track.getBoundingClientRect().height] : pseudo?.content !== 'none' && pseudo?.content !== 'normal' ? [parseFloat(pseudo.width), parseFloat(pseudo.height)] : [el.getBoundingClientRect().width, el.getBoundingClientRect().height],
              label: document.getElementById(el.getAttribute('aria-labelledby'))?.textContent,
              help: document.getElementById(el.getAttribute('aria-describedby'))?.textContent },
            panel: panel && { bg: getComputedStyle(panel).backgroundColor, radius: getComputedStyle(panel).borderRadius,
              shadow: getComputedStyle(panel).boxShadow, padding: getComputedStyle(body).paddingLeft,
              width: panel.getBoundingClientRect().width, readingWidth: reading?.getBoundingClientRect().width,
              headingCount: panel.querySelectorAll('h1').length, backOutside: !panel.contains(document.querySelector('a[href="/tareas"]')) } };
        });
        assert.ok(view.states.includes('Estado: Habilitada'), `${width}/${path}/${role}: textual state`);
        assert.ok(view.states.includes('No lista para asignar'), 'enabled is not assignable');
        assert.equal(view.overflow, false, `page overflow ${width}/${path}/${role}`);
        assert.equal(view.switchCount, role === 'ADMIN' ? 1 : 0);
        if (view.switch) {
          assert.ok(view.switch.width >= 44 && view.switch.height >= 44, 'real operable root target');
          assert.equal(view.switch.bg, 'rgb(31, 59, 115)');
          assert.match(view.switch.label, /^Habilitar .* para nuevas asignaciones$/);
          assert.equal(view.switch.help, 'Las asignaciones existentes podrán completarse.');
          dimensions = { status: view.switch.track[0] === 40 && view.switch.track[1] === 24 && view.switch.thumb === 20 ? 'pass' : 'blocked', observedRoot: [view.switch.width, view.switch.height], observedTrack: view.switch.track, observedThumb: view.switch.thumb, expectedTrack: [40, 24], expectedThumb: 20, expectedTargetMinimum: [44, 44], owner: 'front-base-visual' };
        }
        if (path !== '/tareas') {
          assert.ok(view.panel); assert.equal(view.panel.bg, 'rgb(255, 255, 255)');
          assert.equal(view.panel.radius, '12px'); assert.equal(view.panel.shadow, 'none');
          assert.equal(view.panel.padding, width < 640 ? '16px' : '24px');
          assert.equal(view.panel.headingCount, 1); assert.equal(view.panel.backOutside, true);
          assert.ok(view.panel.readingWidth > 0 && view.panel.readingWidth <= view.panel.width);
          if (width === 1440) assert.ok(view.panel.width > view.panel.readingWidth, 'reading measure does not narrow outer panel');
          const back = await page.eval(() => getComputedStyle(document.querySelector('a[href="/tareas"]')).textDecorationLine);
          assert.match(back, /underline/);
        }
        if (role === 'ADMIN' && [390, 768, 1440].includes(width)) await page.screenshot({ path: `${output}/${path === '/tareas' ? 'catalog' : 'detail'}-${width}.png`, format: 'png', fullPage: true });
        results.push({ name: `${width}/${path}/${role}`, status: 'pass' });
      }
    }
    await run('keyboard and AX name, no state inferred from color', async () => {
      await page.setViewport({ width: 1440, height: 900 });
      await mount({ role: 'ADMIN', path: '/tareas/TG-01' });
      await page.eval(() => document.querySelector('[data-slot="switch"]').focus());
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: 8 });
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
      assert.equal(await page.eval(() => document.activeElement?.getAttribute('data-slot')), 'switch');
      assert.equal(await page.eval(() => getComputedStyle(document.activeElement).outlineWidth), '2px');
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
      await until('document.body.textContent.includes("Estado: Habilitada") && !document.querySelector("[data-slot=switch]").hasAttribute("data-disabled")');
      const ax = await page.send('Accessibility.getFullAXTree');
      const sw = ax.nodes.find(node => !node.ignored && node.role?.value === 'switch');
      assert.match(sw?.name?.value ?? '', /Habilitar Lluvia de estrellas para nuevas asignaciones/);
      assert.equal((await writes()).length, 1);
    });
  }
  const report = { results, dimensions: dimensions ?? { status: 'not-evaluated' }, limitations: ['Synthetic fetch only; no API/DB/Play continuity evidence', 'Global track dimension delivery remains with producer 2', 'Real 400% zoom, screen reader and other browsers not covered'] };
  writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--require-dimensions')) assert.equal(dimensions?.status, 'pass', 'T-02: approved global dimensions must be delivered; see results.json');
} finally { await browser.close(); }
