import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? './vendor/cdp.mjs');
const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://127.0.0.1:5291';
const dir = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/workspace-navigation';
mkdirSync(dir, { recursive: true });
const browser = await Browser.launch();
const results = [];
try {
  const page = await browser.newPage();
  const settle = () => page.eval(async () => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
  });
  const visit = async (role, path = '/', scenario = 'ready') => {
    await page.goto(`${origin}/tests/browser/usuarios-harness.html?role=${role}&navigation=${scenario}&path=${encodeURIComponent(path)}`, { settleMs: 350 });
    await settle();
  };
  for (const role of ['ADMIN', 'TEACHER']) for (const width of [320, 390, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewport({ width, height: width === 1280 ? 800 : 1000 });
    await visit(role);
    if (width < 1024) { await page.eval(() => document.getElementById('workspace-menu-toggle').click()); await settle(); }
    const state = await page.eval(() => {
      const nav = document.querySelector('nav[aria-label="Navegación principal"]');
      const image = document.querySelector('.workspace-brand-image');
      const r = image.getBoundingClientRect();
      const content = document.querySelector('.workspace-content'), footer = document.querySelector('.workspace-footer-inner');
      const close = document.querySelector('[aria-label="Cerrar navegación"]')?.getBoundingClientRect();
      return { links: [...nav.querySelectorAll('a')].map(a => a.getAttribute('href')), ratio: r.width / r.height,
        naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
        overlapsClose: !!close && r.top < close.bottom && r.right > close.left,
        footerX: footer.getBoundingClientRect().x + parseFloat(getComputedStyle(footer).paddingLeft),
        contentX: content.getBoundingClientRect().x + parseFloat(getComputedStyle(content).paddingLeft),
        overflow: document.documentElement.scrollWidth > innerWidth,
        menuIcon: !!document.querySelector('#workspace-menu-toggle svg.lucide-menu'),
        alt: image.alt, brandName: image.closest('a').getAttribute('aria-label'),
      };
    });
    assert.deepEqual(state.links, role === 'ADMIN' ? ['/', '/usuarios', '/usuarios/nueva', '/academico/cursos', '/tareas'] : ['/', '/academico/cursos', '/tareas', '/indicadores']);
    assert.equal(state.ratio, 2); assert.equal(state.naturalWidth, 2400); assert.equal(state.naturalHeight, 1200);
    assert.equal(state.overlapsClose, false); assert.equal(state.overflow, false); assert.equal(state.menuIcon, true);
    assert.equal(state.alt, ''); assert.equal(state.brandName, 'Kudlab · Inicio');
    assert.ok(Math.abs(state.footerX - state.contentX) < 1, `${role} ${width} footer alignment`);
    if ([390, 1440, 1920].includes(width)) await page.screenshot({ path: `${dir}/${role}-${width}.jpg`, fullPage: true });
    results.push({ role, width, ...state });
  }
  await page.setViewport({ width: 1440, height: 1000 });
  await visit('TEACHER');
  await page.eval(() => document.querySelector('nav[aria-label="Navegación principal"] a[href="/indicadores"]').click()); await settle();
  assert.equal(await page.eval(() => location.pathname), '/indicadores');
  assert.equal(await page.eval(() => document.querySelector('nav[aria-label="Navegación principal"] [aria-current=page]').getAttribute('href')), '/indicadores');
  assert.ok((await page.eval(() => document.querySelector('h1').textContent)).includes('Indicadores'));
  assert.equal(await page.eval(() => document.querySelectorAll('nav[aria-label="Navegación principal"] [aria-current=page]').length), 1);
  for (const path of ['/indicadores/accuracy_pct', '/academico/cursos/11111111-1111-4111-8111-111111111111/estudiantes/22222222-2222-4222-8222-222222222222/indicadores']) {
    await visit('TEACHER', path);
    assert.equal(await page.eval(() => document.querySelector('nav[aria-label="Navegación principal"] [aria-current=page]').getAttribute('href')), '/indicadores');
    assert.equal(await page.eval(() => /11111111|22222222/.test(document.querySelector('[aria-label="Ubicación"]').textContent)), false);
  }
  await visit('ADMIN', '/indicadores');
  assert.equal(await page.eval(() => !!document.querySelector('nav[aria-label="Navegación principal"] a[href="/indicadores"]')), false);
  assert.equal(await page.eval(() => document.querySelector('[aria-label="Ubicación"]').textContent), 'Sección no disponible');
  assert.equal(await page.eval(() => document.querySelectorAll('nav[aria-label="Navegación principal"] [aria-current=page]').length), 0);
  await visit('TEACHER', '/usuarios');
  assert.equal(await page.eval(() => document.querySelector('[aria-label="Ubicación"]').textContent), 'Sección no disponible');
  assert.equal(await page.eval(() => document.querySelector('h1').textContent), 'No tienes acceso a este destino');
  await visit('ADMIN', '/usuarios/nueva');
  await page.eval(() => document.querySelector('[aria-label="Ubicación"] a').click()); await settle();
  assert.equal(await page.eval(() => location.pathname), '/usuarios');
  assert.equal(await page.eval(() => document.querySelector('[aria-label="Ubicación"]').textContent), 'Profesores');

  await page.setViewport({ width: 390, height: 844 });
  await visit('TEACHER');
  await page.eval(() => document.getElementById('workspace-menu-toggle').click()); await settle();
  await page.eval(() => document.querySelector('nav[aria-label="Navegación principal"] a[href="/indicadores"]').click()); await settle();
  assert.equal(await page.eval(() => !!document.querySelector('[role=dialog]')), false);
  assert.equal(await page.eval(() => document.activeElement.isConnected && !document.activeElement.closest('[inert]')), true);
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.eval(() => { document.documentElement.style.fontSize = '200%'; }); await settle();
  assert.equal(await page.eval(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: `${dir}/teacher-390-text200-forced-colors.jpg`, fullPage: true });
  await page.eval(() => { document.documentElement.style.fontSize = ''; });
  await page.send('Emulation.setEmulatedMedia', { features: [] });
  await visit('TEACHER', '/indicadores', 'unavailable');
  assert.equal(await page.eval(() => document.querySelector('[aria-label="Ubicación"]').textContent), 'Indicadores');
  assert.equal(await page.eval(() => document.querySelectorAll('nav[aria-label="Navegación principal"] a[href="/indicadores"]').length), 0); // closed Sheet is unmounted
  assert.deepEqual(page.consoleErrors, []);
  writeFileSync(`${dir}/results.json`, JSON.stringify({ results, limits: 'Synthetic transport; contextual student fixture returns unavailable. No server RBAC, real zoom 400%, screen-reader or other-browser audit.' }, null, 2));
  console.log('PASS: 14 role/viewport cases; original logo, Menu icon, links/order, footer alignment; Indicators routes/denied/error, breadcrumb navigation, mobile focus, text 200%/forced colours.');
} finally { await browser.close(); }
