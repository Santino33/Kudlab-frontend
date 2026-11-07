// Production-build UI check with synthetic HTTP fixtures; not a persistence/acceptance test.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const { chromium, expect } = await import(process.env.KUDLAB_PLAYWRIGHT ?? '@playwright/test');
const origin = process.env.KUDLAB_TEACHER_ORIGIN ?? 'http://localhost:5197';
const apiOrigin = process.env.KUDLAB_API_ORIGIN ?? 'http://localhost:4300';
assert.match(origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
assert.match(apiOrigin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
assert(process.env.KUDLAB_CONTRACT_DIR, 'Supply the canonical Play contract/v1.1 directory');
const context = JSON.parse(await readFile(resolve(process.env.KUDLAB_CONTRACT_DIR, 'context.synthetic.json')));
const envelope = JSON.parse(await readFile(resolve(process.env.KUDLAB_CONTRACT_DIR, 'envelope.synthetic.json')));
const id = context.sessionId, groupId = '50000000-0000-4000-8000-000000000001', studentId = '60000000-0000-4000-8000-000000000001';
const out = process.env.KUDLAB_INSPECT_OUTPUT ?? '/tmp/opencode/tg01-evidence-review'; await mkdir(out, { recursive: true });
const session = { id, studentId, taskId: 'TG-01', assignmentId: groupId, attemptNumber: 1, launchMode: 'SUPERVISED', configVersion: context.configVersion,
  gameBuildId: context.gameBuildId, executionStatus: 'INTERRUPTED', processingStatus: 'COMPLETED', preparedAt: context.serverTime, startedAtServer: context.serverTime,
  receivedAt: context.serverTime, incidentCount: 2, recordedTrialCount: 2, publishedVersionId: context.publishedVersionId, configurationHash: context.configurationHash,
  configuration: context.config, declaredState: envelope.state, terminationReason: envelope.terminationReason, measuredDurationMs: 7000, device: envelope.device,
  receipt: { submissionId: envelope.submissionId, receivedAt: context.serverTime, evidenceHash: 'a'.repeat(64) }, calculation: null };
const trial = { ...envelope.events[0], calculationDecision: { trial: 1, included: true, rtIncluded: true, reason: null } };
const never = { ...trial, trial: 2, presentedAtMs: null, respondedAtMs: null, result: 'not_evaluated', segment: null, closureReason: 'never_presented', responseDevice: null, calculationDecision: { trial: 2, included: false, rtIncluded: false, reason: 'NOT_EVALUATED' } };
const recovered = { sequence: 2, type: 'recovered_after_reload', category: 'EXECUTION_INTERRUPTED', clockId: null, atMs: null, endedAtMs: null, recordedAtClient: context.serverTime };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.name));
let mode = 'normal', evidenceFailure = false;
await page.route(`${apiOrigin}/**`, async route => {
  const url = new URL(route.request().url());
  const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' };
  let body, status = 200;
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (url.pathname === '/api/auth/get-session') body = { user: { id: groupId, email: 'teacher@synthetic.edu.co', name: 'Docente sintético', role: 'TEACHER' }, session: { id: groupId, expiresAt: '2030-01-01T00:00:00Z' } };
   else if (url.pathname === `/api/v1/groups/${groupId}`) body = { id: groupId, name: 'DEMO-A', grade: '3', schoolYear: 2026, teacherId: groupId, teacherName: 'Docente sintético' };
   else if (url.pathname === `/api/v1/students/${studentId}`) body = { id: studentId, groupId, studentCode: 'SYNTHETIC-01', firstName: 'Participante', lastName: 'Sintético', isActive: true };
  else if (url.pathname === `/api/v1/task-sessions/${id}`) body = mode === 'not-received' ? { ...session, receipt: null, incidentCount: 0, recordedTrialCount: 0, processingStatus: 'NOT_RECEIVED' } : mode === 'empty' ? { ...session, incidentCount: 0 } : session;
  else if (url.pathname.endsWith('/evidence')) {
    if (evidenceFailure) { status = 503; body = { code: 'UNAVAILABLE' }; }
    else if (mode === 'denied') { status = 403; body = { code: 'FORBIDDEN' }; }
    else if (url.searchParams.get('kind') === 'incidents') body = { items: mode === 'empty' ? [] : [envelope.incidents[0], recovered], nextCursor: null };
    else body = { items: url.searchParams.has('cursor') ? [never] : [trial], nextCursor: url.searchParams.has('cursor') ? null : 'synthetic-page-2' };
  } else { status = 404; body = { code: 'NOT_FOUND' }; }
  await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
});
const url = `${origin}/academico/cursos/${groupId}/estudiantes/${studentId}/tareas/${id}`;
async function openDetail() { await page.goto(url); await expect(page.getByRole('heading', { name: 'Detalle de sesión', exact: true })).toBeVisible(); await expect(page.getByText('Procesamiento completado', { exact: true })).toBeVisible(); }
try {
  await openDetail();
  const summary = page.locator('summary').filter({ hasText: 'Ver ensayos y decisiones de cálculo' });
  await summary.focus(); await page.keyboard.press('Enter');
  const trials = page.getByRole('region', { name: 'Evidencia de ensayos', exact: true });
  await expect(trials.getByText('Duración observada', { exact: true })).toBeVisible();
  await expect(trials.getByText('Segmento 1', { exact: true })).toBeVisible();
  await trials.focus(); assert(await trials.evaluate(e => e === document.activeElement));
  assert.notEqual(await trials.evaluate(e => getComputedStyle(e).outlineStyle), 'none');
  await page.getByRole('button', { name: 'Página siguiente', exact: true }).click();
  await expect(trials.getByText('Sin segmento', { exact: true })).toBeVisible();
  await expect(trials.getByText('No disponible', { exact: true })).toHaveCount(4);
  await page.getByRole('button', { name: 'Primera página', exact: true }).click();
  await page.locator('summary').filter({ hasText: 'Ver incidencias' }).click();
  await expect(page.getByText('Sin marca monotónica', { exact: true })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Configuración y dispositivo de esta sesión' }).click();
  await expect(page.getByText('Velocidad de caída (unidades/s)', { exact: true })).toBeVisible();
   for (const width of [320, 390, 768, 1024, 1440]) {
     await page.setViewportSize({ width, height: 1000 });
     assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `General overflow at ${width}`);
     await page.screenshot({ path: `${out}/evidence-${width}.png`, fullPage: true });
     if (width === 320) {
       await trials.focus(); await page.keyboard.press('ArrowRight');
       await expect.poll(() => trials.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
       await trials.evaluate(e => { e.scrollLeft = e.scrollWidth; });
       await page.screenshot({ path: `${out}/evidence-320-scrolled.png`, fullPage: true });
       await trials.evaluate(e => { e.scrollLeft = 0; });
     }
  }
  for (const width of [320, 360, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
     assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Text 200% overflow at ${width}`);
     await page.screenshot({ path: `${out}/evidence-${width}-text-200.png`, fullPage: true });
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  }
  mode = 'empty'; await openDetail();
  await expect(page.getByText('Sesión sin incidencias registradas.', { exact: false })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Ver incidencias' }).click();
  await expect(page.getByText('Sin incidencias registradas.', { exact: true })).toBeVisible();
  mode = 'not-received'; await page.goto(url);
  await expect(page.getByText('Sin evidencia recibida. No equivale a una sesión sin incidencias.', { exact: true })).toBeVisible();
  assert.equal(await page.locator('summary').filter({ hasText: 'Ver incidencias' }).count(), 0);
  mode = 'normal'; evidenceFailure = true; await openDetail(); await summary.click();
  await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
   evidenceFailure = false; await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
   await expect(page.getByRole('heading', { name: 'Detalle de sesión', exact: true })).toBeVisible();
   await summary.click();
   await expect(trials).toBeVisible();
   mode = 'denied'; await openDetail(); await summary.click();
   await expect(page.getByRole('heading', { name: 'No tienes acceso a este destino', exact: true })).toBeVisible();
  await expect(trials).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log('PASS CA-04/06/08 UI fixtures: keyboard/focus, pagination, recovery dates, historical configuration, empty/not-received/error/retry/denial, five widths and text 200%. No API/DB integration claimed.');
} finally { await browser.close(); }
