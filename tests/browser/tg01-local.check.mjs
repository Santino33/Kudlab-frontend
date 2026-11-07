// Authorized local integration only. Creates synthetic records; never resets the database.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomUUID } from 'node:crypto';
const { chromium, expect } = await import(process.env.KUDLAB_PLAYWRIGHT ?? '@playwright/test');
assert.equal(process.env.KUDLAB_LOCAL_CHECK_AUTHORIZED, 'true', 'Explicit local integration authorization required');
const teacherOrigin = 'http://localhost:5173', apiOrigin = 'http://localhost:4300', playOrigin = 'http://127.0.0.1:4178';
const { actors, suffix } = JSON.parse(await readFile(process.env.KUDLAB_ACTORS_FILE, 'utf8'));
const configuration = parseEnv(await readFile('.env.docker', 'utf8'));
const output = process.env.KUDLAB_INSPECT_OUTPUT ?? '/tmp/opencode/tg01-local-review';
await mkdir(output, { recursive: true });
const statePath = `${output}/state.json`;
const state = await readFile(statePath, 'utf8').then(JSON.parse).catch(() => ({ suffix, results: [] }));
assert.equal(state.suffix, suffix);
const save = () => writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
const record = async (name, data = {}) => { state.results.push({ name, at: new Date().toISOString(), ...data }); await save(); console.log(`PASS ${name}`); };
const browser = await chromium.launch({ headless: true });
const contexts = [];
let stage = 'initialization';
async function login(actor) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context);
  const page = await context.newPage(); await page.goto(teacherOrigin);
  await page.getByLabel('Correo', { exact: true }).fill(actor.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(actor.password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Mis cursos', exact: true }).first()).toBeVisible();
  return page;
}
async function json(page, path, options) {
  const response = options ? await page.request.post(`${apiOrigin}/api/v1${path}`, { data: options, headers: { origin: teacherOrigin } }) : await page.request.get(`${apiOrigin}/api/v1${path}`);
  assert(response.ok(), `API request failed (${response.status()})`); return response.json();
}
const groupUrl = id => `${teacherOrigin}/academico/cursos/${id}`;
const studentUrl = id => `${groupUrl(state.groupA)}/estudiantes/${id}`;
const sessionUrl = (student, session) => `${studentUrl(student)}/tareas/${session}`;
async function group(admin, actor) {
  const name = `TG01-${actor.letter}-${suffix}`;
  const existing = (await json(admin, '/groups')).items.find(g => g.name === name);
  if (existing) return existing.id;
  await admin.goto(`${teacherOrigin}/academico/cursos/nuevo`);
  await admin.locator('#group-name').fill(name); await admin.locator('#group-grade').fill('3'); await admin.locator('#group-schoolYear').fill('2026');
  await admin.getByLabel('Profesor responsable').selectOption(actor.accountId);
  const response = admin.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/groups');
  await admin.getByRole('button', { name: 'Crear curso', exact: true }).click();
  const r = await response; assert.equal(r.status(), 201); return (await r.json()).id;
}
async function student(page, label) {
  const studentCode = `TG01-${suffix}-${label}`;
  const existing = (await json(page, `/groups/${state.groupA}/students`)).items.find(s => s.studentCode === studentCode);
  if (existing) return existing;
  await page.goto(`${groupUrl(state.groupA)}/estudiantes/nuevo`);
  await page.getByLabel('Código', { exact: true }).fill(studentCode);
  await page.getByLabel('Nombres', { exact: true }).fill(label);
  await page.getByLabel('Apellidos', { exact: true }).fill('Sintético');
  const response = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/students');
  await page.getByRole('button', { name: 'Registrar estudiante', exact: true }).click();
  const r = await response; assert.equal(r.status(), 201); const created = await r.json(); assert.equal(created.isActive, true); return created;
}
const localDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
async function assignmentForm(page, target) {
  await page.goto(`${groupUrl(state.groupA)}/asignaciones`);
  await page.getByRole('button', { name: 'Asignar actividad', exact: true }).click();
  await page.getByLabel(`${target.firstName} ${target.lastName} · ${target.studentCode}`, { exact: true }).check();
  await page.getByLabel('Disponible desde').fill(localDate(new Date(Date.now() - 60000)));
  await page.getByLabel('Disponible hasta').fill(localDate(new Date(Date.now() + 86400000)));
  await page.getByLabel('Máximo de intentos').fill('3');
}
async function assignment(page, target) {
  await assignmentForm(page, target);
  const response = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/task-assignments');
  await page.getByRole('button', { name: 'Guardar asignación y códigos', exact: true }).click();
  const r = await response; assert.equal(r.status(), 201);
  const value = await r.json(); await expect(page.getByRole('heading', { name: 'Estudiantes y códigos', exact: true })).toBeVisible(); return value;
}
async function touchShape(surface, type) {
  let point;
  await expect.poll(async () => {
    point = await surface.locator('canvas').evaluate((canvas, type) => {
      const ctx = canvas.getContext('2d'), bounds = canvas.getBoundingClientRect(), data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const color = type === 'star' ? [248, 210, 120] : [232, 240, 239];
      for (let y = Math.round(180 * canvas.height / bounds.height); y < canvas.height - 80; y += 3) for (let x = 10; x < canvas.width - 10; x += 3) {
        const at = (y * canvas.width + x) * 4;
        if (color.every((v, n) => data[at + n] === v)) return { x: x * bounds.width / canvas.width, y: y * bounds.height / canvas.height };
      }
      return null;
    }, type); return Boolean(point);
  }, { timeout: 40000, intervals: [100, 150, 200] }).toBe(true);
  await surface.locator('canvas').click({ position: point });
}
async function evidence(page, id, kind) {
  const rows = []; let cursor;
  do { const next = await json(page, `/task-sessions/${id}/evidence?kind=${kind}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`); rows.push(...next.items); cursor = next.nextCursor; } while (cursor);
  return rows;
}
async function outbox(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('kudlab-play-runtime'); open.onerror = () => reject(new Error('Storage unavailable'));
    open.onsuccess = () => { const db = open.result, request = db.transaction('outbox').objectStore('outbox').getAll(); request.onsuccess = () => { resolve(request.result); db.close(); }; request.onerror = () => { db.close(); reject(new Error('Storage read failed')); }; };
  }));
}
async function inspectSession(page, id, participant, complete) {
  await expect.poll(async () => (await json(page, `/task-sessions/${id}`)).processingStatus, { timeout: 30000 }).toBe('COMPLETED');
  const detail = await json(page, `/task-sessions/${id}`), trials = await evidence(page, id, 'trials'), incidents = await evidence(page, id, 'incidents');
  assert.equal(detail.studentId, participant.id); assert(detail.receipt); assert.equal(detail.calculation.indicators.length, 24);
  assert.equal(detail.recordedTrialCount, trials.length); assert.equal(detail.incidentCount, incidents.length);
  for (const indicator of detail.calculation.indicators) assert(indicator.status === 'CALCULATED' ? Number.isFinite(indicator.value) : indicator.value === null && indicator.unavailabilityReason);
  if (complete) { assert.equal(detail.executionStatus, 'COMPLETED'); assert.equal(detail.measuredDurationMs, 120000); assert.deepEqual([...new Set(trials.filter(t => t.segment !== null).map(t => t.segment))].sort(), [1, 2, 3]); }
  await page.goto(sessionUrl(participant.id, id)); await expect(page.getByText('Procesamiento completado', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Indicadores por sesión y segmento', exact: true }).locator('tbody tr')).toHaveCount(24);
  await page.getByText('Ver ensayos y decisiones de cálculo', { exact: true }).click();
  const region = page.getByRole('region', { name: 'Evidencia de ensayos', exact: true });
  let visible = 0;
  do {
    await expect(region).toBeVisible(); visible += await region.locator('tbody tr').count();
    const next = page.getByRole('button', { name: 'Página siguiente', exact: true });
    if (!await next.count()) break;
    const previous = await region.locator('tbody tr').first().innerText(); await next.click();
    await expect.poll(() => region.locator('tbody tr').first().innerText()).not.toBe(previous);
  } while (true);
  assert.equal(visible, trials.length);
  await page.getByText('Ver incidencias', { exact: true }).click();
  if (!incidents.length) await expect(page.getByText('Sin incidencias registradas.', { exact: true })).toBeVisible();
  else await expect(page.getByRole('region', { name: 'Evidencia de incidencias', exact: true })).toBeVisible();
  await page.getByText('Configuración y dispositivo de esta sesión', { exact: true }).click();
  await expect(page.getByText('Velocidad de caída (unidades/s)', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${output}/session-${id}.png`, fullPage: true });
  await writeFile(`${output}/session-${id}.json`, JSON.stringify({ detail, trials, incidents }, null, 2), { mode: 0o600 });
  return { id, executionStatus: detail.executionStatus, trials: trials.length, incidents: incidents.length, indicators: detail.calculation.indicators.length, receipt: detail.receipt, configurationHash: detail.configurationHash };
}
try {
  const phase = process.argv[2] ?? 'setup';
  if (phase === 'setup') {
    stage = 'admin login';
    const admin = await login({ email: 'admin@kudlab.example.edu.co', password: configuration.BOOTSTRAP_ADMIN_PASSWORD });
    stage = 'create courses'; state.groupA ??= await group(admin, actors[0]); state.groupB ??= await group(admin, actors[1]); await save();
    stage = 'teacher login'; const teacher = await login(actors[0]);
    stage = 'catalog'; const tasks = await json(teacher, '/tasks'); assert.equal(tasks.items.find(t => t.id === 'TG-01').assignable, true);
    await teacher.goto(`${teacherOrigin}/tareas/TG-01`); await expect(teacher.getByRole('heading', { name: 'Lluvia de estrellas · TG-01', exact: true })).toBeVisible();
    state.students ??= {}; state.assignments ??= {};
    for (const name of ['NUEVO', 'CODIGO', 'INCIDENCIA', 'NUEVO-BAJA']) {
      stage = `create student ${name}`; state.students[name] ??= await student(teacher, name); await save();
      stage = `assign ${name}`; state.assignments[name] ??= await assignment(teacher, state.students[name]); await save();
    }
    await record('CA-01/02 setup: real catalog, UI-created courses/new active students/assignments');
  } else if (phase === 'supervised' || phase === 'code' || phase === 'incident') {
    stage = `${phase}: teacher login`; const teacher = await login(actors[0]);
    const name = phase === 'supervised' ? 'NUEVO' : phase === 'code' ? 'CODIGO' : 'INCIDENCIA', a = state.assignments[name], participant = state.students[name];
    await teacher.goto(`${groupUrl(state.groupA)}/asignaciones/${a.id}`);
    let surface, runtimePage, publicContext, sessionId, receiptSeen = false, lostResponse = false, publicNoCookie;
    const submissionBodies = [];
    if (phase === 'code') {
      stage = 'read synthetic activity code privately';
      const row = teacher.locator('.access-code-row').filter({ hasText: participant.studentCode });
      await expect(row.locator('.classroom-code')).toHaveAttribute('data-state', 'ready', { timeout: 15000 });
      const code = (await row.locator('.classroom-code').textContent()).trim(); assert(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/.test(code));
      publicContext = await browser.newContext({ viewport: { width: 1100, height: 850 } }); contexts.push(publicContext);
      assert.equal((await publicContext.cookies(apiOrigin)).length, 0);
      let cookieSent = false;
      publicContext.on('request', r => { if (r.url().startsWith(`${apiOrigin}/api/v1/game-runtime/`) && r.headers().cookie) cookieSent = true; });
      runtimePage = await publicContext.newPage(); await runtimePage.goto(playOrigin);
      await runtimePage.getByLabel('Código de actividad', { exact: true }).fill(code); await runtimePage.getByRole('button', { name: 'Continuar', exact: true }).click(); surface = runtimePage;
      publicNoCookie = () => !cookieSent;
      await publicContext.route('**/game-runtime/sessions/*/results', async route => {
        submissionBodies.push(route.request().postData()); const response = await route.fetch();
        if (!lostResponse && response.ok()) { lostResponse = true; await route.abort('failed'); }
        else await route.fulfill({ response });
      });
    } else {
      stage = 'open supervised runtime';
      await teacher.getByRole('button', { name: `Gestionar acceso de ${participant.firstName} ${participant.lastName}`, exact: true }).click();
      await teacher.getByRole('link', { name: 'Iniciar actividad supervisada', exact: true }).click();
      surface = teacher.frameLocator('iframe[title="Kudlab Play · Lluvia de estrellas"]'); runtimePage = teacher;
    }
    const listen = r => {
      if (r.url().includes('/game-runtime/sessions/') && r.url().endsWith('/start')) sessionId = /\/sessions\/([^/]+)\/start$/.exec(r.url())[1];
      if (r.url().includes('/game-runtime/sessions/') && (r.url().endsWith('/results') || r.url().includes('/receipt?')) && r.ok()) receiptSeen = true;
    };
    runtimePage.on('response', listen);
    stage = `${phase}: begin`; await expect(surface.getByRole('button', { name: 'Comenzar', exact: true })).toBeEnabled({ timeout: 20000 });
    const start = Date.now(); await surface.getByRole('button', { name: 'Comenzar', exact: true }).click(); await expect(surface.locator('canvas')).toBeVisible();
    if (phase === 'incident') {
      stage = 'controlled visibility interruption';
      await touchShape(surface, 'star');
      // Let another stimulus become visible in real time before interrupting it.
      await teacher.waitForTimeout(2500);
      const frame = teacher.frames().find(f => f.url().startsWith(playOrigin));
      await frame.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    } else {
      stage = `${phase}: real 120-second game`;
      await touchShape(surface, 'star'); await touchShape(surface, 'star'); await touchShape(surface, 'moon');
      if (phase === 'code') { await runtimePage.evaluate(() => navigator.serviceWorker.ready.then(() => true)); await publicContext.setOffline(true); }
      await expect(surface.getByRole('heading', { name: 'Terminaste la actividad', exact: true })).toBeVisible({ timeout: 135000 });
      assert(Date.now() - start >= 119000, 'No accelerated game clock');
      if (phase === 'code') {
        stage = 'code: offline outbox/reload/lost response recovery';
        await expect.poll(async () => (await outbox(runtimePage)).length).toBe(1);
        const pending = (await outbox(runtimePage))[0];
        await runtimePage.reload(); assert.equal((await outbox(runtimePage))[0].body, pending.body);
        await publicContext.setOffline(false);
        await expect.poll(async () => (await outbox(runtimePage)).length, { timeout: 45000 }).toBe(0);
        assert(lostResponse); assert(submissionBodies.length >= 1); assert(submissionBodies.every(body => body === pending.body));
      }
    }
    await expect.poll(() => Boolean(sessionId && receiptSeen), { timeout: 30000 }).toBe(true);
    if (phase === 'code') assert(publicNoCookie());
    state.sessions ??= {}; state.sessions[phase] = sessionId; await save();
    stage = `${phase}: persisted evidence and UI`; const result = await inspectSession(teacher, sessionId, participant, phase !== 'incident');
    if (phase === 'supervised') assert.equal(result.incidents, 0);
    if (phase === 'incident') assert(result.incidents > 0);
    await record(`CA-04/08 ${phase}`, result);
  } else if (phase === 'permissions') {
    stage = 'permissions logins'; const teacher = await login(actors[0]), other = await login(actors[1]);
    const admin = await login({ email: 'admin@kudlab.example.edu.co', password: configuration.BOOTSTRAP_ADMIN_PASSWORD });
    const anonymous = await browser.newContext(); contexts.push(anonymous); const page = await anonymous.newPage();
    const id = state.sessions.supervised, input = { requestId: randomUUID(), taskId: 'TG-01', publishedVersionId: state.assignments.NUEVO.publishedVersionId, groupId: state.groupA, studentIds: [state.students.NUEVO.id], startsAt: new Date(Date.now() - 60000).toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString(), maxAttempts: 1 };
    for (const [actor, expected] of [[other, 404], [admin, 403], [page, 401]]) {
      for (const path of [`/task-sessions/${id}`, `/task-sessions/${id}/evidence?kind=trials`, `/students/${state.students.NUEVO.id}`]) assert.equal((await actor.request.get(`${apiOrigin}/api/v1${path}`)).status(), expected);
      assert.equal((await actor.request.post(`${apiOrigin}/api/v1/task-assignments`, { headers: { origin: teacherOrigin }, data: { ...input, requestId: randomUUID() } })).status(), expected);
      await actor.goto(sessionUrl(state.students.NUEVO.id, id));
      if (expected === 404) await expect(actor.getByText('Curso no disponible', { exact: true })).toBeVisible();
      else if (expected === 403) await expect(actor.getByRole('heading', { name: 'No tienes acceso a este destino', exact: true })).toBeVisible();
      else await expect(actor.getByLabel('Correo', { exact: true })).toBeVisible();
      await expect(actor.getByRole('region', { name: 'Evidencia de ensayos', exact: true })).toHaveCount(0);
    }
    assert.equal((await json(teacher, `/task-assignments?groupId=${state.groupA}&limit=100`)).items.length, Object.keys(state.assignments).length);
    await record('CA-06 real server: other teacher/ADMIN/anonymous denied without assignment writes');
  } else if (phase === 'deactivate') {
    stage = 'deactivation'; const teacher = await login(actors[0]), target = state.students['NUEVO-BAJA'];
    await teacher.goto(studentUrl(target.id)); await teacher.getByRole('button', { name: 'Inactivar estudiante', exact: true }).click();
    await teacher.getByRole('alertdialog').getByRole('button', { name: 'Inactivar estudiante', exact: true }).click();
    await expect(teacher.getByText('Inactivo', { exact: true })).toBeVisible();
    await teacher.goto(`${groupUrl(state.groupA)}/asignaciones`); await teacher.getByRole('button', { name: 'Asignar actividad', exact: true }).click();
    await expect(teacher.getByLabel(new RegExp(target.studentCode))).toBeDisabled();
    const a = state.assignments['NUEVO-BAJA'];
    const response = await teacher.request.post(`${apiOrigin}/api/v1/task-assignments`, { headers: { origin: teacherOrigin }, data: { requestId: randomUUID(), taskId: 'TG-01', publishedVersionId: a.publishedVersionId, groupId: state.groupA, studentIds: [target.id], startsAt: a.startsAt, endsAt: a.endsAt, maxAttempts: 1 } });
    assert.equal(response.status(), 403); assert.equal((await json(teacher, `/task-assignments/${a.id}`)).status, 'OPEN');
    await record('CA-03 UI deactivation blocks assignment and preserves prior history');
  } else if (phase === 'assignment-recovery') {
    stage = 'assignment recovery login'; const teacher = await login(actors[0]);
    for (const lostAfterCommit of [false, true]) {
      stage = lostAfterCommit ? 'assignment: response lost after commit' : 'assignment: disconnected before sending';
      const before = (await json(teacher, `/task-assignments?groupId=${state.groupA}&limit=100`)).items.length;
      await assignmentForm(teacher, state.students.NUEVO);
      let intercepted = false, createdId; const bodies = [];
      const pattern = `${apiOrigin}/api/v1/task-assignments`;
      await teacher.route(pattern, async route => {
        if (route.request().method() !== 'POST') return route.continue();
        bodies.push(route.request().postData());
        if (!intercepted) {
          intercepted = true;
          if (lostAfterCommit) { const response = await route.fetch(); assert.equal(response.status(), 201); createdId = (await response.json()).id; }
          return route.abort('internetdisconnected');
        }
        return route.continue();
      });
      await teacher.getByRole('button', { name: 'Guardar asignación y códigos', exact: true }).evaluate(button => { button.click(); button.click(); });
      await expect(teacher.getByRole('button', { name: 'Reintentar', exact: true })).toBeVisible();
      assert.equal((await json(teacher, `/task-assignments?groupId=${state.groupA}&limit=100`)).items.length, before + (lostAfterCommit ? 1 : 0));
      await expect(teacher.getByText('Asignación creada', { exact: true })).toHaveCount(0);
      await teacher.reload();
      await teacher.getByRole('button', { name: 'Asignar actividad', exact: true }).click();
      const response = teacher.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/task-assignments');
      await teacher.getByRole('button', { name: 'Comprobar creación', exact: true }).click();
      const r = await response; assert.equal(r.status(), lostAfterCommit ? 200 : 201); const a = await r.json();
      if (createdId) assert.equal(a.id, createdId);
      assert.equal(bodies.length, 2); assert.equal(new Set(bodies).size, 1);
      await expect(teacher.getByRole('heading', { name: 'Estudiantes y códigos', exact: true })).toBeVisible();
      await teacher.unroute(pattern);
      assert.equal((await json(teacher, `/task-assignments?groupId=${state.groupA}&limit=100`)).items.length, before + 1);
      state.assignments[lostAfterCommit ? 'LOST-ACK' : 'OFFLINE'] = a; await save();
      await record(`CA-07 ${lostAfterCommit ? 'lost response after commit' : 'request not sent'}: reload/retry/double click, same requestId, one assignment`);
    }
  } else if (phase === 'after-restart') {
    stage = 'post-restart login'; const teacher = await login(actors[0]);
    for (const a of Object.values(state.assignments)) { const current = await json(teacher, `/task-assignments/${a.id}`); assert.equal(current.status, 'OPEN'); assert.equal(current.publishedVersionId, a.publishedVersionId); }
    assert.equal((await json(teacher, `/students/${state.students['NUEVO-BAJA'].id}`)).isActive, false);
    for (const [phase, id] of Object.entries(state.sessions)) {
      const before = JSON.parse(await readFile(`${output}/session-${id}.json`, 'utf8'));
      const current = await json(teacher, `/task-sessions/${id}`);
      assert.deepEqual(current.receipt, before.detail.receipt); assert.deepEqual(current.configuration, before.detail.configuration); assert.deepEqual(current.calculation, before.detail.calculation);
      assert.deepEqual(await evidence(teacher, id, 'trials'), before.trials); assert.deepEqual(await evidence(teacher, id, 'incidents'), before.incidents);
      assert.equal(current.executionStatus, before.detail.executionStatus);
    }
    await teacher.goto(`${groupUrl(state.groupA)}/asignaciones`); await teacher.getByRole('button', { name: 'Asignar actividad', exact: true }).click();
    await expect(teacher.getByLabel(new RegExp(state.students['NUEVO-BAJA'].studentCode))).toBeDisabled();
    state.students.REINICIO = await student(teacher, 'REINICIO'); state.assignments.REINICIO = await assignment(teacher, state.students.REINICIO); await save();
    await record('CA-03/05 post-restart: history/evidence/calculation unchanged, inactive student blocked, new UI student assignable');
  } else throw new Error('Unknown phase');
} catch (error) {
  // Avoid Playwright call logs containing credentials or activity codes.
  const location = /tg01-local\.check\.mjs:(\d+):(\d+)/.exec(error.stack ?? '')?.[0] ?? 'unknown location';
  console.error(`FAIL ${stage}: ${error.name} at ${location}. No sensitive call log retained.`);
  state.results.push({ name: stage, failed: true, errorType: error.name, at: new Date().toISOString() }); await save(); process.exitCode = 1;
} finally { await browser.close(); }
