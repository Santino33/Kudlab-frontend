import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Browser } from './vendor/cdp.mjs';

const origin = process.env.KUDLAB_TEST_ORIGIN ?? 'http://127.0.0.1:5298';
const dir = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/kudlab-access-layout';
mkdirSync(dir, { recursive: true });
assert.equal(createHash('sha256').update(readFileSync(new URL('../../src/assets/kudlab-isotipo.png', import.meta.url))).digest('hex'), '05f08bb6f2ace9f80fa2f828402616c351ff5eee0ca38e591d3d21cbb96a1d41');
const browser = await Browser.launch();
try {
  const page = await browser.newPage();
  const flush = () => page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const press = async (key, code, windowsVirtualKeyCode) => {
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode, ...(key === 'Enter' ? { text: '\r' } : {}) });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode });
    await flush();
  };
  const fill = () => page.eval(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [id, value] of [['email', 'synthetic@example.edu.co'], ['password', 'SyntheticPassword123']]) {
      const input = document.getElementById(id); setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  const open = (path, query = '') => page.goto(`${origin}/tests/browser/usuarios-harness.html?path=${encodeURIComponent(path)}${query}`, { settleMs: 250 });
  for (const width of [320, 390, 768, 1023, 1024, 1280, 1440]) {
    await page.setViewport({ width, height: 900 });
    for (const [path, query, variant, header] of [
      ['/acceso', '&access=absent', 'access', false],
      ['/recuperar-acceso', '', 'recovery', true],
      ['/recuperar-acceso/confirmar', '&ticket=valid', 'recovery', true],
      ['/acceso/invitacion', '&ticket=valid', undefined, true],
      ['/ruta-inexistente', '', undefined, true],
      ['/acceso', '&access=unavailable', undefined, true],
    ]) {
      await open(path, query);
      const state = await page.eval(() => ({
        access: !!document.querySelector('.auth-page--access'),
        recovery: !!document.querySelector('.auth-page--recovery'),
        header: !!document.querySelector('.auth-header'),
        mains: document.querySelectorAll('main').length,
        footers: document.querySelectorAll('.auth-footer').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        footerAlign: getComputedStyle(document.querySelector('.auth-footer')).textAlign,
      }));
      assert.equal(state.access, variant === 'access', `${path}: access`);
      assert.equal(state.recovery, variant === 'recovery', `${path}: recovery`);
      assert.equal(state.header, header, `${path}: header`);
      assert.equal(state.mains, 1);
      assert.equal(state.footers, 1);
      assert.equal(state.overflow, false, `${path} ${width}: overflow`);
      if (variant) assert.equal(state.footerAlign, 'center');
      if (variant === 'access') {
        const geometry = await page.eval(() => {
          const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right }; };
          return { section: rect('.auth-content'), image: rect('.access-brand-image'), card: rect('.access-card'), footer: rect('.auth-footer'),
            titleAlign: getComputedStyle(document.querySelector('h1')).textAlign,
            imageSize: [document.querySelector('img').naturalWidth, document.querySelector('img').naturalHeight],
            toggle: rect('.access-password-toggle'), border: getComputedStyle(document.querySelector('.access-password-toggle')).borderWidth,
            order: !!(document.querySelector('a[href="/recuperar-acceso"]').compareDocumentPosition(document.querySelector('button[type="submit"]')) & Node.DOCUMENT_POSITION_FOLLOWING),
            autocomplete: [document.getElementById('email').autocomplete, document.getElementById('password').autocomplete],
          };
        });
        assert(geometry.section.width <= 960.1);
        assert.deepEqual(geometry.imageSize, [1200, 1200]);
        assert(Math.abs(geometry.image.width - geometry.image.height) < .1);
        if (width >= 1024) {
          assert(Math.abs(geometry.image.width - geometry.card.width) < .1);
          assert(geometry.image.right < geometry.card.x);
          assert(Math.abs(geometry.section.width - 960) < .1);
        } else {
          assert(geometry.image.width <= 160.1);
          assert(geometry.image.bottom < geometry.card.y);
          assert(geometry.card.width <= 512.1);
        }
        assert(geometry.footer.y >= Math.max(geometry.card.bottom, geometry.image.bottom));
        assert.equal(geometry.titleAlign, 'center');
        assert.equal(geometry.order, true);
        assert.equal(geometry.border, '0px');
        assert(geometry.toggle.width >= 44 && geometry.toggle.height >= 44);
        assert.deepEqual(geometry.autocomplete, ['username', 'current-password']);
        if ([390, 768, 1440].includes(width)) await page.screenshot({ path: `${dir}/access-${width}.png`, format: 'png', fullPage: true });
      }
      if (variant === 'recovery') assert(await page.eval(() => document.querySelector('.auth-content').getBoundingClientRect().width <= 512.1 && !document.querySelector('.access-brand-image')));
    }
  }
  await open('/recuperar-acceso/confirmar', '&ticket=valid');
  await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  assert.equal(await page.eval(() => document.querySelector('h1').textContent), 'Acceso en pausa');
  assert.equal(await page.eval(() => document.querySelectorAll('input').length), 0);
  assert.equal(await page.eval(() => !!document.querySelector('.auth-header')), true);

  for (const width of [320, 1440]) {
    await page.setViewport({ width, height: 480 });
    await open('/acceso', '&access=absent');
    await page.eval(() => { document.documentElement.style.fontSize = '200%'; });
    await flush();
    assert(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), `text200 ${width}: reflow`);
    assert(await page.eval(() => document.querySelector('.auth-footer').getBoundingClientRect().y >= document.querySelector('.access-card').getBoundingClientRect().bottom));
    await page.screenshot({ path: `${dir}/text200-${width}.png`, format: 'png', fullPage: true });
  }
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await open('/acceso', '&access=absent');
  await page.eval(() => document.querySelector('.access-password-toggle').focus());
  assert(await page.eval(() => {
    const style = getComputedStyle(document.activeElement);
    return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2 && document.documentElement.scrollWidth <= innerWidth;
  }));
  await page.screenshot({ path: `${dir}/forced-colors-1440.png`, format: 'png', fullPage: true });
  await page.send('Emulation.setEmulatedMedia', { features: [] });

  // Explicit transport controls keep signingIn/checking/uncertain states observable without API calls.
  await page.goto(`${origin}/tests/browser/auth-harness.html`, { settleMs: 250 });
  const answer = async text => { await page.eval(text => [...document.querySelectorAll('aside li:last-child button')].find(button => button.textContent === text).click(), text); await flush(); };
  assert.equal(await page.eval(() => !!document.querySelector('.auth-header')), true);
  await answer('401');
  await fill(); await flush();
  await page.eval(() => { window.accessPasswordElement = document.getElementById('password'); document.getElementById('password').focus(); });
  await press('Tab', 'Tab', 9);
  assert.equal(await page.eval(() => document.activeElement.getAttribute('aria-controls')), 'password');
  await press(' ', 'Space', 32);
  assert.equal(await page.eval(() => document.getElementById('password').type), 'text');
  const ax = await page.send('Accessibility.getFullAXTree');
  assert(ax.nodes.some(node => node.role?.value === 'button' && node.name?.value === 'Ocultar contraseña'));
  const callsBeforeResize = await page.eval(() => document.querySelectorAll('aside li').length);
  await page.setViewport({ width: 390, height: 900 }); await flush();
  assert(await page.eval(() => document.getElementById('password') === window.accessPasswordElement && document.getElementById('password').value.length > 0));
  assert.equal(await page.eval(() => document.querySelectorAll('aside li').length), callsBeforeResize);
  await press('Tab', 'Tab', 9);
  assert.equal(await page.eval(() => document.activeElement.getAttribute('href')), '/recuperar-acceso');
  await press('Tab', 'Tab', 9);
  assert.equal(await page.eval(() => document.activeElement.type), 'submit');
  await press('Enter', 'Enter', 13);
  assert.equal(await page.eval(() => !!document.querySelector('.auth-page--access')), true);
  assert.equal(await page.eval(() => document.querySelector('button[type="submit"]').disabled), true);
  assert(await page.eval(() => document.getElementById('password') === window.accessPasswordElement));
  await answer('401');
  assert.equal(await page.eval(() => document.getElementById('password').value.length), 0);
  assert.equal(await page.eval(() => document.activeElement.getAttribute('role')), 'alert');
  await fill(); await flush();
  await page.eval(() => document.querySelector('form').requestSubmit()); await flush();
  await answer('Válida');
  assert.equal(await page.eval(() => !!document.querySelector('.access-brand-image')), false);
  assert.equal(await page.eval(() => !!document.querySelector('.auth-header')), true);
  await answer('Válida');
  await page.eval(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Cerrar sesión').click()); await flush();
  await answer('503');
  assert.equal(await page.eval(() => document.querySelector('h1').textContent), 'No pudimos confirmar el cierre');
  assert.equal(await page.eval(() => document.querySelectorAll('input').length), 0);
  assert.equal(await page.eval(() => !!document.querySelector('.access-brand-image')), false);
  await page.eval(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  assert.equal(await page.eval(() => document.querySelectorAll('.auth-identity').length), 0);
  assert.deepEqual(page.consoleErrors, []);
  console.log('PASS access: 42 viewport/route cases, PNG/hash, 960/512/160 layout, breakpoint, text200/short viewport/forced colours/reduced motion, eye/AX/keyboard/Enter, stable native inputs, password withdrawal, checking/uncertain closure and paused recovery. Synthetic transport only; not real browser zoom400 or password-manager verification.');
} finally { await browser.close(); }
