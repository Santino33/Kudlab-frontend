// Real API + synthetic DB. Reuse an explicitly supplied Playwright installation; no app dependency.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const { chromium, expect } = await import(process.env.KUDLAB_PLAYWRIGHT ?? '@playwright/test');
const origin = process.env.KUDLAB_TEACHER_ORIGIN ?? 'http://localhost:5185';
const api = process.env.KUDLAB_API_ORIGIN ?? 'http://localhost:4315';
assert.ok(/^http:\/\/localhost:\d+$/.test(origin) && /^http:\/\/localhost:\d+$/.test(api), 'Explicit local synthetic services required');
const out = process.env.KUDLAB_INSPECT_OUTPUT ?? '/tmp/opencode/assignment-codes-review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.name));
const creates = [], batches = [];
page.on('request', request => {
  if (request.method() !== 'POST') return;
  if (new URL(request.url()).pathname === '/api/v1/task-assignments') creates.push(request.postDataJSON());
  if (/\/task-assignments\/[^/]+\/access-codes$/.test(new URL(request.url()).pathname)) batches.push(request.postDataJSON());
});
let assignmentsUrl;
async function form(count = 2) {
  await page.goto(assignmentsUrl);
  await page.getByRole('button', { name: 'Asignar actividad', exact: true }).click();
  await page.getByLabel(/Participante Sintético A/).check();
  if (count === 2) await page.getByLabel(/Participante Sintético B/).check();
  const local = ms => page.evaluate(ms => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }, ms);
  await page.getByLabel('Disponible desde').fill(await local(Date.now() - 60000));
  await page.getByLabel('Disponible hasta').fill(await local(Date.now() + 3600000));
  await page.getByLabel('Máximo de intentos').fill('2');
}
async function ready(count) {
  await expect.poll(() => page.locator('.access-code-row .classroom-code[data-state="ready"]').count(), { timeout: 15000 }).toBe(count);
}
const codeState = text => expect.poll(async () => (await page.locator('.access-code-row .classroom-code').first().textContent()) === text).toBe(true);
async function screenshot(path) {
  // Redact the DOM text itself: full-page capture can move mask rectangles when text reflows.
  await page.evaluate(() => {
    window.__codeCapture = [...document.querySelectorAll('.classroom-code, .access-copy-text, strong.text-xl')].map(element => {
      const text = element instanceof HTMLTextAreaElement ? element.value : element.textContent;
      if (element instanceof HTMLTextAreaElement) element.value = '•••••'; else element.textContent = '•••••';
      return { element, text };
    });
  });
  try { await page.screenshot({ path, fullPage: true }); }
  finally {
    await page.evaluate(() => {
      for (const { element, text } of window.__codeCapture ?? []) {
        if (!element.isConnected) continue;
        if (element instanceof HTMLTextAreaElement) { if (element.value === '•••••') element.value = text; }
        else if (element.textContent === '•••••') element.textContent = text;
      }
      delete window.__codeCapture;
    });
  }
}
try {
  await page.goto(origin);
  await page.getByLabel('Correo', { exact: true }).fill('teacher-a@pilot.edu.co');
  await page.getByLabel('Contraseña', { exact: true }).fill('TeacherPass1');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.getByRole('link', { name: 'Mis cursos', exact: true }).first().click();
  await page.locator('.course-card').filter({ has: page.getByRole('heading', { name: 'A1', exact: true }) }).getByRole('link', { name: 'Abrir curso', exact: true }).click();
  await page.getByRole('link', { name: 'Asignaciones de tareas digitales' }).click();
  assignmentsUrl = page.url();
  await form();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const gated = async route => {
    if (route.request().method() === 'POST') await gate;
    await route.continue();
  };
  await page.route('**/task-assignments/*/access-codes', gated);
  // Two activations in one turn must not replace the persisted creation request.
  await page.getByRole('button', { name: 'Guardar asignación y códigos', exact: true }).evaluate(button => { button.click(); button.click(); });
  await expect(page.getByRole('heading', { name: 'Estudiantes y códigos', exact: true })).toBeVisible();
  await expect(page.getByText(/Asignación creada. Preparando códigos:/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Información de la asignación' }).locator('dd')).toHaveCount(4);
  assert.equal(creates.length, 1);
  release(); await ready(2); await page.unroute('**/task-assignments/*/access-codes', gated);
  assert.equal(batches.length, 1); assert.equal(batches[0].recipientIds.length, 2);
  const target = page.url();
  const values = await page.locator('.access-code-row .classroom-code').allTextContents();
  assert.ok(values.every(value => /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/.test(value)), 'Every recipient has a real five-character code');
  const storage = await page.evaluate(() => JSON.stringify({ ...sessionStorage, ...localStorage }));
  assert.ok(values.every(value => !storage.includes(value)), 'Codes must never persist');
  console.log('PASS: one selection/save, immediate detail while generation waits, real codes, double activation, no persisted secrets');

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}`);
    await screenshot(`${out}/assignment-${width}.png`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Proyectar códigos', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  assert.equal(await page.getByRole('dialog').getByRole('button', { name: 'Copiar', exact: true }).count(), 0);
  await screenshot(`${out}/projection.png`);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Proyectar códigos', exact: true })).toBeFocused();
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '200% text reflows');
  await screenshot(`${out}/text-200.png`);
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; window.dispatchEvent(new Event('blur')); });
  await codeState('Oculto');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await codeState('Oculto');
  await page.getByRole('button', { name: 'Mostrar códigos', exact: true }).click(); await ready(2);
  console.log('PASS: responsive 320–1440, 200% text, projection/Escape/focus, synchronous hiding without automatic re-exposure');

  await page.getByRole('button', { name: 'Ocultar códigos', exact: true }).click();
  let releaseReveal, finishReveal, received = 0;
  const revealGate = new Promise(resolve => { releaseReveal = resolve; });
  const revealFinished = new Promise(resolve => { finishReveal = resolve; });
  const lateReveal = async route => {
    const response = await route.fetch(); await revealGate;
    await route.fulfill({ response }).catch(() => {});
    if (++received === 2) finishReveal();
  };
  await page.route('**/task-access-codes/*/reveal', lateReveal);
  await page.getByRole('button', { name: 'Mostrar códigos', exact: true }).click();
  await codeState('Mostrando…');
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); releaseReveal();
  await revealFinished;
  await codeState('Oculto');
  await page.unroute('**/task-access-codes/*/reveal', lateReveal);
  let revealFailed = false;
  const failReveal = async route => {
    if (!revealFailed) { revealFailed = true; await route.fulfill({ status: 409, json: { code: 'CODE_UNAVAILABLE' } }); }
    else await route.continue();
  };
  await page.route('**/task-access-codes/*/reveal', failReveal);
  await page.getByRole('button', { name: 'Mostrar códigos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reintentar visualización', exact: true })).toBeVisible();
  const generationBeforeRevealRetry = batches.length;
  await page.getByRole('button', { name: 'Reintentar visualización', exact: true }).click(); await ready(2);
  assert.equal(batches.length, generationBeforeRevealRetry);
  await page.unroute('**/task-access-codes/*/reveal', failReveal);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('synthetic clipboard denied'); } } }));
  await page.getByRole('button', { name: 'Copiar código de Participante Sintético A', exact: true }).click();
  await expect(page.getByLabel('Texto para copia manual de Participante Sintético A', { exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('.access-copy-text')).toHaveCount(0);
  await page.reload(); await ready(2);
  assert.equal(batches.length, generationBeforeRevealRetry, 'Opening an existing assignment must not generate');
  console.log('PASS: independent reveal failure/retry, clipboard fallback, reload without regeneration');

  // The batch commits, but its response arrives after the per-request deadline.
  let delayed = false;
  const lost = async route => {
    if (route.request().method() !== 'POST' || delayed) return route.continue();
    delayed = true;
    const response = await route.fetch();
    await new Promise(resolve => setTimeout(resolve, 16500));
    await route.fulfill({ response }).catch(() => {});
  };
  await page.route('**/task-assignments/*/access-codes', lost);
  await form(1);
  await page.getByRole('button', { name: 'Guardar asignación y códigos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Estudiantes y códigos', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar preparación pendiente', exact: true })).toBeVisible({ timeout: 22000 });
  const retryBatch = batches.at(-1), beforeReload = batches.length;
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reintentar preparación pendiente', exact: true })).toBeVisible();
  assert.equal(batches.length, beforeReload, 'Uncertain mutation is not silently replayed after reload');
  await page.getByRole('button', { name: 'Reintentar preparación pendiente', exact: true }).click();
  await ready(1);
  await expect(page.getByRole('button', { name: 'Reintentar preparación pendiente', exact: true })).toHaveCount(0);
  assert.deepEqual(batches.at(-1), retryBatch);
  assert.equal(creates.length, 2, 'Retry codes without another creation');
  const assignmentId = new URL(page.url()).pathname.split('/').at(-1);
  const metadata = await (await page.request.get(`${api}/api/v1/task-assignments/${assignmentId}/access-codes?limit=100`)).json();
  assert.equal(metadata.items.filter(c => c.status === 'ACTIVE' && c.scope === 'PLAY_AND_SUBMIT').length, 1);
  await page.unroute('**/task-assignments/*/access-codes', lost);
  console.log('PASS: real commit + response timeout, reload checkpoint, exact idempotent retry, one active code, no duplicate assignment');

  // A revoked code stays revoked on navigation. Only an explicit secondary action replaces it.
  await page.getByRole('button', { name: 'Gestionar acceso de Participante Sintético A', exact: true }).click();
  await page.getByRole('button', { name: 'Revocar', exact: true }).click();
  await page.getByRole('button', { name: 'Revocar acceso', exact: true }).click();
  await codeState('No disponible');
  const afterRevoke = batches.length;
  await page.reload();
  await codeState('No disponible');
  assert.equal(batches.length, afterRevoke);
  await page.getByText('Más opciones de acceso', { exact: true }).click();
  await page.getByRole('button', { name: 'Preparar códigos disponibles', exact: true }).click(); await ready(1);
  assert.equal(batches.length, afterRevoke + 1);
  assert.notEqual(batches.at(-1).requestId, retryBatch.requestId);
  assert.deepEqual(errors, [], 'No runtime errors');
  console.log('PASS: revocation preserved on reopen; explicit new preparation uses a new request');

  let createDelayed = false, committedId;
  const lostCreate = async route => {
    if (route.request().method() !== 'POST' || createDelayed) return route.continue();
    createDelayed = true;
    const response = await route.fetch(); committedId = (await response.json()).id;
    await new Promise(resolve => setTimeout(resolve, 16500));
    await route.fulfill({ response }).catch(() => {});
  };
  await page.route('**/api/v1/task-assignments', lostCreate);
  await form(1);
  await page.getByRole('button', { name: 'Guardar asignación y códigos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Comprobar creación', exact: true })).toBeVisible({ timeout: 22000 });
  const firstCreate = creates.at(-1);
  await page.getByRole('button', { name: 'Comprobar creación', exact: true }).click(); await ready(1);
  assert.deepEqual(creates.at(-1), firstCreate);
  assert.equal(new URL(page.url()).pathname.split('/').at(-1), committedId);
  await page.unroute('**/api/v1/task-assignments', lostCreate);
  console.log('PASS: lost creation response uses the same request and opens the already-created assignment');

  // Contract doubles only for volume: no synthetic 205-person roster is written to the real DB.
  const template = await (await page.request.get(`${api}/api/v1/task-assignments/${assignmentId}`)).json();
  const groupId = template.groupId, fakeId = randomUUID(), volumeCalls = [], volumeCodes = [];
  let fakeAssignment, volumeFailed = false;
  const studentsRoute = async route => {
    const original = await (await route.fetch()).json(), sample = original.items.find(s => s.studentCode === 'J02-FICTICIO-A');
    await route.fulfill({ json: { items: Array.from({ length: 205 }, (_, i) => ({ ...sample, id: randomUUID(), lastName: i ? `Sintético ${i}` : sample.lastName, studentCode: `VOLUME-${i}` })) } });
  };
  const volumeRoute = async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === '/api/v1/task-assignments' && request.method() === 'POST') {
      const input = request.postDataJSON();
      fakeAssignment = { ...template, ...input, id: fakeId, createdAt: new Date().toISOString(), recipientCount: input.studentIds.length,
        recipients: input.studentIds.map((studentId, i) => ({ id: randomUUID(), studentId, studentDisplayName: `Participante de volumen ${i}`, studentCode: `VOLUME-${i}`, attemptsStarted: 0, activeSessionId: null, canLaunch: true, unavailableReasons: [] })) };
      return route.fulfill({ status: 201, json: fakeAssignment });
    }
    if (path === `/api/v1/task-assignments/${fakeId}`) return route.fulfill({ json: fakeAssignment });
    if (path !== `/api/v1/task-assignments/${fakeId}/access-codes`) return route.continue();
    if (request.method() === 'GET') {
      const offset = Number(new URL(request.url()).searchParams.get('cursor') ?? 0);
      return route.fulfill({ json: { items: volumeCodes.slice(offset, offset + 100), nextCursor: volumeCodes.length > offset + 100 ? String(offset + 100) : null } });
    }
    const input = request.postDataJSON(); volumeCalls.push(input);
    if (volumeCalls.length <= 2) await new Promise(resolve => setTimeout(resolve, 8000));
    if (volumeCalls.length === 2 && !volumeFailed) { volumeFailed = true; return route.fulfill({ status: 409, json: { code: 'CONFLICT' } }); }
    const items = input.recipientIds.map(recipientId => ({ id: randomUUID(), recipientId, scope: 'PLAY_AND_SUBMIT', sessionId: null, status: 'ACTIVE', createdAt: new Date().toISOString(), expiresAt: fakeAssignment.endsAt, lastClaimedAt: null, canReveal: true, unavailableReasons: [] }));
    volumeCodes.push(...items);
    return route.fulfill({ status: 201, json: { items, createdCount: items.length, reusedCount: 0 } });
  };
  const volumeReveal = route => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2);
    return volumeCodes.some(c => c.id === id) ? route.fulfill({ json: { codeId: id, code: '23456', scope: 'PLAY_AND_SUBMIT', expiresAt: fakeAssignment.endsAt } }) : route.continue();
  };
  await page.route(`**/groups/${groupId}/students`, studentsRoute);
  await page.route('**/api/v1/task-assignments**', volumeRoute);
  await page.route('**/task-access-codes/*/reveal', volumeReveal);
  await form(1);
  await page.getByRole('button', { name: 'Seleccionar todos los actuales', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar asignación y códigos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Estudiantes y códigos', exact: true })).toBeVisible();
  await expect(page.getByText('Preparación incompleta: 100 de 205 confirmados.', { exact: true })).toBeVisible({ timeout: 25000 });
  await ready(30);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reintentar preparación pendiente', exact: true })).toBeVisible();
  assert.equal(volumeCalls.length, 2);
  await page.getByRole('button', { name: 'Reintentar preparación pendiente', exact: true }).click();
  await expect(page.getByText('205 de 205 códigos disponibles.', { exact: true })).toBeVisible();
  assert.deepEqual(volumeCalls.map(c => c.recipientIds.length), [100, 100, 100, 5]);
  assert.deepEqual(volumeCalls[2], volumeCalls[1], 'The failed second batch is replayed unchanged');
  assert.notEqual(volumeCalls[3].requestId, volumeCalls[2].requestId);
  assert.equal(creates.length, 5, 'Volume retry does not replay creation');
  await page.getByRole('button', { name: 'Página siguiente', exact: true }).click(); await ready(30);
  assert.equal(volumeCalls.length, 4, 'Paging only reveals; it never generates');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.deepEqual(errors, [], 'No runtime errors in the volume flow');
  console.log('PASS (contract doubles): 205 recipients, >15s total, partial 100/205, reload, only failed batch replayed, 100/100/5, pagination');
  console.log(`Evidence (masked): ${out}. Earlier complete assignment: ${target}`);
} finally { await browser.close(); }
