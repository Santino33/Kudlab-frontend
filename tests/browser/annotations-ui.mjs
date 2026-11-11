// Component/host browser regression with an explicit fake API, not final integrated acceptance.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { Browser } from './vendor/cdp.mjs';
const origin = process.env.ANNOTATIONS_UI_ORIGIN ?? 'http://127.0.0.1:5833';
const output = process.env.TASTE_SKILL_TMP;
assert.ok(output, 'Provide a private evidence directory'); assert.equal(new URL(origin).hostname, '127.0.0.1');
await mkdir(output, { recursive: true });
const browser = await Browser.launch(), page = await browser.newPage();
async function wait(predicate) {
  await page.eval(source => new Promise((resolve, reject) => {
    const predicate = (0, eval)(`(${source})`); if (predicate()) return resolve();
    const observer = new MutationObserver(() => { if (predicate()) { clearTimeout(timer); observer.disconnect(); resolve(); } });
    observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
    const timer = setTimeout(() => { observer.disconnect(); reject(Error(`Missing condition: ${source}`)); }, 10000);
  }), predicate.toString());
}
async function click(text) { await page.eval(text => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === text && !item.disabled); if (!button) throw Error(`Missing enabled ${text}`); button.click(); }, text); }
async function text(value) { await page.eval(value => { const el = document.getElementById('annotation-text'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }, value); }
try {
  await page.goto(`${origin}/tests/browser/annotations-harness.html`); await wait(() => document.body.textContent.includes('Abrir anotaciones'));
  await click('Abrir anotaciones'); await wait(() => document.body.textContent.includes('Aún no hay anotaciones'));
  await text('   '); await click('Guardar anotación'); await wait(() => document.getElementById('annotation-error'));
  assert.equal(await page.eval(() => annotationModel.writes), 0);
  await text('Texto ficticio <script>sin ejecutar</script>');
  await page.send('Network.enable');
  await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await click('Guardar anotación'); await wait(() => document.body.textContent.includes('Sin conexión: no se envió'));
  assert.equal(await page.eval(() => annotationModel.writes), 0);
  assert.equal(await page.eval(() => document.getElementById('annotation-text').value), 'Texto ficticio <script>sin ejecutar</script>');
  await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await click('Guardar anotación');
  await wait(() => document.querySelector('ol')?.textContent.includes('Texto ficticio'));
  assert.equal(await page.eval(() => Boolean(document.querySelector('p div'))), false, 'paragraphs cannot contain divs');
  assert.equal(await page.eval(() => annotationModel.items.length), 1);
  await click('Editar anotación'); await text('Contexto corregido'); await click('Guardar cambios');
  await wait(() => document.querySelector('ol')?.textContent.includes('Contexto corregido'));
  await click('Borrar anotación'); await wait(() => document.querySelector('[role="alertdialog"]'));
  assert.equal(await page.eval(() => document.activeElement.textContent), 'Cancelar');
  await click('Cancelar'); await wait(() => !document.querySelector('[role="alertdialog"]'));
  assert.equal(await page.eval(() => annotationModel.items.length), 1);
  await click('Borrar anotación'); await click('Confirmar borrado');
  await wait(() => annotationModel.items.length === 0 && !document.querySelector('[role="alertdialog"]'));
  await text('Borrador reservado'); await click('Suspender ensayo');
  await wait(() => document.body.textContent.includes('Contenido privado retirado.'));
  assert.equal(await page.eval(() => Boolean(document.getElementById('annotation-text'))), false);
  await click('Revalidar ensayo'); await wait(() => document.getElementById('annotation-text')?.value === 'Borrador reservado');
  await page.eval(() => { annotationModel.readFailed = true; }); await click('Refrescar ensayo');
  await wait(() => document.body.textContent.includes('No pudimos actualizar el historial'));
  assert.equal(await page.eval(() => document.getElementById('annotation-text').value), 'Borrador reservado');
  assert.equal(await page.eval(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Guardar anotación').disabled), true);
  await page.eval(() => { annotationModel.readFailed = false; }); await click('Reintentar consulta');
  await wait(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Guardar anotación' && !b.disabled));
  await click('Inactivar ensayo'); await wait(() => document.getElementById('annotation-text').readOnly);
  assert.equal(await page.eval(() => document.getElementById('annotation-text').value), 'Borrador reservado');
  const ax = await page.send('Accessibility.getFullAXTree');
  assert.ok(ax.nodes.some(n => !n.ignored && n.role?.value === 'textbox' && n.name?.value === 'Texto de la anotación'));
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewport({ width, height: 900 });
    assert.ok(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`);
    await page.screenshot({ path: `${output}/annotations-${width}.png`, format: 'png', fullPage: true });
  }
  await page.eval(() => { document.documentElement.style.fontSize = '200%'; });
  assert.ok(await page.eval(() => document.documentElement.scrollWidth <= innerWidth), 'text 200% overflow');
  await page.screenshot({ path: `${output}/annotations-320-text-200.png`, format: 'png', fullPage: true });
  console.log(JSON.stringify({ ok: true, checks: ['inline required validation', 'browser offline before sending keeps draft and sends zero writes', 'explicit retry creates once', 'escaped text/create', 'edit', 'cancel/delete', 'safe initial dialog focus', 'host suspension removes DOM', 'authorized restoration', 'read failure preserves draft and locks writes', 'inactive read only', 'AX named textarea', 'responsive 1440/768/390/320 and text 200%'], output, scope: 'standalone component + real host, fake API; not final App/DB acceptance' }));
} finally { await browser.close(); }
