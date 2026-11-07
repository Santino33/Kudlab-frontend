// Production-build UI check with synthetic HTTP fixtures; not a persistence/acceptance test.
// corregir-tg01-y-detalle-de-sesion CA-03/04/05/06: simplified session detail and accessible column help.
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
const out = process.env.KUDLAB_INSPECT_OUTPUT ?? '/tmp/opencode/tg01-detail-review'; await mkdir(out, { recursive: true });
const indicator = (metricCode, scope, value, unit, extra = {}) => ({ metricCode, scope, status: value === null ? 'NOT_AVAILABLE' : 'CALCULATED', value, unit, numerator: null, denominator: null, sampleSize: 0, unavailabilityReason: null, ...extra });
const calculation = { runId: groupId, ruleCode: 'TG01-DESCRIPTIVE-1', ruleVersion: 1, status: 'SUCCEEDED', calculatedAt: context.serverTime, summary: { observed: 2, included: 1, excluded: 1 }, indicators: [
  indicator('accuracy_pct', 'SESSION', 0, '%', { numerator: 0, denominator: 1, sampleSize: 1 }),
  indicator('median_reaction_time_ms', 'SESSION', 412.5, 'ms', { sampleSize: 1 }),
  indicator('rt_sd_ms', 'SEGMENT_2', null, 'ms', { unavailabilityReason: 'INSUFFICIENT_RT_FOR_VARIABILITY' }),
] };
const session = { id, studentId, taskId: 'TG-01', assignmentId: groupId, attemptNumber: 1, launchMode: 'CODE', configVersion: context.configVersion,
  gameBuildId: context.gameBuildId, executionStatus: 'INTERRUPTED', processingStatus: 'COMPLETED', preparedAt: context.serverTime, startedAtServer: context.serverTime,
  receivedAt: context.serverTime, incidentCount: 2, recordedTrialCount: 2, publishedVersionId: context.publishedVersionId, configurationHash: context.configurationHash,
  configuration: context.config, declaredState: envelope.state, terminationReason: envelope.terminationReason, measuredDurationMs: 7000, device: envelope.device,
  receipt: { receiptId: groupId, sessionId: id, submissionId: envelope.submissionId, receivedAt: context.serverTime, evidenceHash: 'a'.repeat(64), processingStatusAtReceipt: 'PENDING' }, calculation };
const removed = ['Incidencias y evidencia', 'Sesión sin incidencias registradas', 'Los fallos técnicos no son errores del estudiante', 'Ver incidencias', 'Ver ensayos y decisiones de cálculo',
  'Configuración y dispositivo de esta sesión', 'Condiciones históricas de ejecución, sin niveles de dificultad', 'Las unidades lógicas no son píxeles físicos',
  // Development data not relevant to the teacher.
  'TG01-DESCRIPTIVE-1', 'Ficha TG01', context.gameBuildId];
const columns = ['Indicador', 'Parte de la actividad', 'Resultado', 'Datos usados / total', 'Estado del resultado'];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
const errors = [], evidenceRequests = []; page.on('pageerror', e => errors.push(e.name));
let mode = 'normal';
await page.route(`${apiOrigin}/**`, async route => {
  const url = new URL(route.request().url());
  const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' };
  let body, status = 200;
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (url.pathname === '/api/auth/get-session') body = { user: { id: groupId, email: 'teacher@synthetic.edu.co', name: 'Docente sintético', role: 'TEACHER' }, session: { id: groupId, expiresAt: '2030-01-01T00:00:00Z' } };
  else if (url.pathname === `/api/v1/groups/${groupId}`) body = { id: groupId, name: 'DEMO-A', grade: '3', schoolYear: 2026, teacherId: groupId, teacherName: 'Docente sintético' };
  else if (url.pathname === `/api/v1/students/${studentId}`) body = { id: studentId, groupId, studentCode: 'SYNTHETIC-01', firstName: 'Participante', lastName: 'Sintético', isActive: true };
  else if (url.pathname === `/api/v1/task-sessions/${id}`) {
    if (mode === 'failure') { status = 503; body = { code: 'UNAVAILABLE' }; }
    else body = mode === 'not-calculated' ? { ...session, processingStatus: 'PENDING', calculation: null } : session;
  } else if (url.pathname.endsWith('/evidence')) { evidenceRequests.push(url.pathname); body = { items: [], nextCursor: null }; }
  else { status = 404; body = { code: 'NOT_FOUND' }; }
  await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
});
const url = `${origin}/academico/cursos/${groupId}/estudiantes/${studentId}/tareas/${id}`;
const table = page.getByRole('region', { name: 'Indicadores por sesión y segmento', exact: true });
const popup = page.locator('[data-slot="popover-content"]');
const help = label => page.getByRole('button', { name: `Qué significa «${label}»`, exact: true });
async function openDetail() { await page.goto(url); await expect(page.getByRole('heading', { name: 'Detalle de sesión', exact: true })).toBeVisible(); }
async function noGeneralOverflow(label) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `General overflow at ${label}`); }
try {
  await openDetail();
  await expect(page.getByRole('heading', { name: 'Resumen de la sesión', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resultados por sesión y partes', exact: true })).toBeVisible();
  for (const text of removed) await expect(page.getByText(text, { exact: false })).toHaveCount(0);
  assert.equal(await page.locator('summary').count(), 0, 'No collapsible evidence/configuration panels remain');
  // Zero is a value; absence keeps «—» and its reason.
  await expect(page.getByText('Ensayos observados: 2; incluidos: 1; excluidos: 1.', { exact: false })).toBeVisible();
  await expect(table.getByText('0.00 %', { exact: true })).toBeVisible();
  await expect(table.getByText('412.5 ms', { exact: true })).toBeVisible();
  await expect(table.getByText('Parte 2', { exact: true })).toBeVisible();
  await expect(table.getByRole('cell', { name: '—', exact: true })).toHaveCount(1);
  for (const label of columns) await expect(help(label)).toBeVisible();

  // Pointer hover opens; moving the pointer onto the help keeps it readable.
  for (const label of columns) {
    await help(label).hover();
    await expect(popup).toBeVisible(); assert((await popup.innerText()).length > 10);
    const box = await popup.boundingBox(); assert(box && box.x >= 0 && box.x + box.width <= 1440, `Help for ${label} is clipped`);
    await popup.hover(); await expect(popup).toBeVisible();
    await page.mouse.move(5, 5); await expect(popup).toHaveCount(0);
  }
  // Keyboard: Enter opens, Escape closes and returns focus, Tab continues (focus not trapped).
  await help('Resultado').focus(); await page.keyboard.press('Enter');
  await expect(popup).toContainText('milésimas de segundo');
  await page.keyboard.press('Escape'); await expect(popup).toHaveCount(0);
  assert(await help('Resultado').evaluate(e => e === document.activeElement), 'Escape returns focus to the trigger');
  assert.notEqual(await help('Resultado').evaluate(e => getComputedStyle(e).outlineStyle), 'none', 'Focus is visible');
  await page.keyboard.press('Tab'); assert(await help('Datos usados / total').evaluate(e => e === document.activeElement), 'Tab moves on to the next help');
  // Touch: tap opens, tap outside closes.
  await help('Estado del resultado').tap(); await expect(popup).toContainText('por qué falta');
  await page.getByRole('heading', { name: 'Detalle de sesión', exact: true }).tap(); await expect(popup).toHaveCount(0);

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await noGeneralOverflow(width);
    await page.screenshot({ path: `${out}/detail-${width}.png`, fullPage: true });
    await help('Datos usados / total').hover();
    const box = await popup.boundingBox(); assert(box && box.x >= 0 && box.x + box.width <= width, `Help clipped at ${width}`);
    await page.screenshot({ path: `${out}/detail-${width}-help.png` }); await page.mouse.move(1, 1); await expect(popup).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  await table.focus(); assert(await table.evaluate(e => e === document.activeElement), 'Table region is focusable for local scrolling');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await noGeneralOverflow(`${width} text 200%`); await page.screenshot({ path: `${out}/detail-${width}-text-200.png`, fullPage: true });
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  }
  mode = 'not-calculated'; await openDetail();
  await expect(page.getByText('No hay indicadores disponibles todavía.', { exact: false })).toBeVisible();
  mode = 'failure'; await page.goto(url);
  // 503 keeps the existing fail-closed access recheck; retry restores the detail without stale data.
  await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resumen de la sesión', exact: true })).toHaveCount(0);
  mode = 'normal'; await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resumen de la sesión', exact: true })).toBeVisible();
  assert.deepEqual(evidenceRequests, [], 'Removed panels no longer request evidence');
  assert.deepEqual(errors, []);
  console.log('PASS CA-03/04/05/06 UI fixtures: removed panels/texts, zero vs absent, five column helps by hover/keyboard/touch/Escape, 390/1440, text 200%, not-calculated and failure/retry. No API/DB integration claimed.');
} finally { await browser.close(); }
