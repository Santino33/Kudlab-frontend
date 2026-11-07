// Production-build UI check with synthetic HTTP fixtures; not a persistence/acceptance test.
// corregir-tg01-y-detalle-de-sesion CA-07: no supervised start or code history in the teacher frontend; recovery is submit-only.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const { chromium, expect } = await import(process.env.KUDLAB_PLAYWRIGHT ?? '@playwright/test');
const origin = process.env.KUDLAB_TEACHER_ORIGIN ?? 'http://localhost:5198';
const apiOrigin = process.env.KUDLAB_API_ORIGIN ?? 'http://localhost:4399';
const playOrigin = process.env.KUDLAB_PLAY_ORIGIN ?? 'http://127.0.0.1:4178';
for (const value of [origin, apiOrigin, playOrigin]) assert.match(value, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const out = process.env.KUDLAB_INSPECT_OUTPUT ?? '/tmp/opencode/tg01-access-review'; await mkdir(out, { recursive: true });
assert(process.env.KUDLAB_CONTRACT_DIR, 'Supply the canonical Play contract/v1.1 directory');
const context = JSON.parse(await readFile(resolve(process.env.KUDLAB_CONTRACT_DIR, 'context.synthetic.json')));
const groupId = '50000000-0000-4000-8000-000000000001', studentId = '60000000-0000-4000-8000-000000000001', assignmentId = '70000000-0000-4000-8000-000000000001';
const recipientId = '80000000-0000-4000-8000-000000000001', codeId = '90000000-0000-4000-8000-000000000001', sessionId = 'a0000000-0000-4000-8000-000000000001';
const at = '2026-11-06T12:00:00.000Z', until = '2030-01-01T00:00:00.000Z';
const assignment = { id: assignmentId, taskId: 'TG-01', title: 'Lluvia de estrellas', publishedVersionId: groupId, configVersion: 2, groupId, startsAt: at, endsAt: until, maxAttempts: 2, status: 'OPEN', availability: 'CURRENT', recipientCount: 1, createdAt: at,
  recipients: [{ id: recipientId, studentId, studentDisplayName: 'Participante Sintético', studentCode: 'SYNTHETIC-01', attemptsStarted: 1, activeSessionId: null, canLaunch: true, unavailableReasons: [] }] };
const codes = [{ id: codeId, recipientId, scope: 'PLAY_AND_SUBMIT', sessionId: null, status: 'ACTIVE', createdAt: at, expiresAt: until, lastClaimedAt: null, canReveal: false, unavailableReasons: [] },
  { id: 'b0000000-0000-4000-8000-000000000001', recipientId, scope: 'PLAY_AND_SUBMIT', sessionId: null, status: 'REPLACED', createdAt: at, expiresAt: until, lastClaimedAt: null, canReveal: false, unavailableReasons: [] }];
const session = { id: sessionId, studentId, taskId: 'TG-01', assignmentId, attemptNumber: 1, launchMode: 'CODE', configVersion: context.configVersion, gameBuildId: context.gameBuildId, executionStatus: 'INTERRUPTED', processingStatus: 'NOT_RECEIVED',
  preparedAt: at, startedAtServer: at, receivedAt: null, incidentCount: 0, recordedTrialCount: 0, publishedVersionId: context.publishedVersionId, configurationHash: context.configurationHash, configuration: context.config, declaredState: null, terminationReason: null, measuredDurationMs: null, device: null, receipt: null, calculation: null };
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], posts = [], frames = []; page.on('pageerror', e => errors.push(e.name));
page.on('request', r => { if (r.method() === 'POST') posts.push(new URL(r.url()).pathname); });
page.on('frameattached', f => frames.push(f));
await page.route(`${playOrigin}/**`, route => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
await page.route(`${apiOrigin}/**`, async route => {
  const url = new URL(route.request().url());
  const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' };
  let body, status = 200;
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (url.pathname === '/api/auth/get-session') body = { user: { id: groupId, email: 'teacher@synthetic.edu.co', name: 'Docente sintético', role: 'TEACHER' }, session: { id: groupId, expiresAt: until } };
  else if (url.pathname === `/api/v1/groups/${groupId}`) body = { id: groupId, name: 'DEMO-A', grade: '3', schoolYear: 2026, teacherId: groupId, teacherName: 'Docente sintético' };
  else if (url.pathname === `/api/v1/students/${studentId}`) body = { id: studentId, groupId, studentCode: 'SYNTHETIC-01', firstName: 'Participante', lastName: 'Sintético', isActive: true };
  else if (url.pathname === `/api/v1/task-assignments/${assignmentId}`) body = assignment;
  else if (url.pathname === `/api/v1/task-assignments/${assignmentId}/access-codes`) body = { items: codes, nextCursor: null };
  else if (url.pathname === `/api/v1/task-sessions/${sessionId}`) body = session;
  else { status = 404; body = { code: 'NOT_FOUND' }; }
  await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
});
const base = `${origin}/academico/cursos/${groupId}`;
try {
  // Access panel: current-code management and sessions stay; supervised start and code history are gone.
  await page.goto(`${base}/asignaciones/${assignmentId}`);
  await expect(page.getByRole('heading', { name: 'Lluvia de estrellas', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gestionar acceso de Participante Sintético', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acceso de Participante Sintético', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver sesiones', exact: true })).toBeVisible();
  for (const text of ['Iniciar actividad supervisada', 'Historial de códigos', 'Reemplazado']) await expect(page.getByText(text, { exact: false })).toHaveCount(0);
  assert.equal(await page.locator('iframe').count(), 0);
  await page.screenshot({ path: `${out}/access-panel.png`, fullPage: true });
  await page.reload(); await expect(page.getByRole('heading', { name: 'Lluvia de estrellas', exact: true })).toBeVisible();
  await expect(page.getByText('Iniciar actividad supervisada', { exact: false })).toHaveCount(0);

  // Old direct start URL: notice and way back; no iframe, no launch grant, no attempt.
  await page.goto(`${base}/asignaciones/${assignmentId}/destinatarios/${recipientId}/ejecucion?operationId=${codeId}&bridgeId=${codeId}`);
  await expect(page.getByRole('heading', { name: 'La actividad se realiza en Kudlab Play', exact: true })).toBeVisible();
  assert.equal(await page.locator('iframe').count(), 0);
  await page.getByRole('link', { name: 'Volver a la asignación', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lluvia de estrellas', exact: true })).toBeVisible();

  // Historical submission recovery stays submit-only: iframe in recovery mode, no grant until Play asks for a specific submission.
  await page.goto(`${base}/estudiantes/${studentId}/tareas/${sessionId}/recuperacion?operationId=${codeId}&bridgeId=${codeId}`);
  await expect(page.getByRole('heading', { name: 'Recuperar envío', exact: true })).toBeVisible();
  await expect(page.getByText('no permite jugar ni consume otro intento', { exact: false })).toBeVisible();
  const src = await page.locator('iframe').getAttribute('src');
  assert.equal(new URL(src).searchParams.get('recoverySessionId'), sessionId);
  await page.waitForTimeout(500);
  assert.deepEqual(posts.filter(p => p.includes('launch-grants') || p.includes('recovery-grants')), [], 'No grant is requested without a recovery request from Play');
  assert.deepEqual(errors, []);
  console.log('PASS CA-07 UI fixtures: access panel without supervised start/code history, old start URL closed without iframe/grant, recovery submit-only. No API/DB/Play integration claimed.');
} finally { await browser.close(); }
