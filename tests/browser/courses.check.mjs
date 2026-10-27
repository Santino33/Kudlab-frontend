import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const { Browser } = await import(process.env.KUDLAB_CDP_DRIVER ?? '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs');
// Explicit disposable fixture only. Never run this against a school/shared environment.
const origin = process.env.KUDLAB_COURSES_ORIGIN;
const api = process.env.KUDLAB_COURSES_API;
if (!origin || !api || !/^http:\/\/localhost:\d+$/.test(origin) || !/^http:\/\/localhost:\d+$/.test(api)) throw new Error('Set explicit local isolated preview origins');
const output = process.env.KUDLAB_BROWSER_OUTPUT ?? '/tmp/opencode/cursos-real';
mkdirSync(output, { recursive: true });
const browser = await Browser.launch();
const passed = [];
try {
  const page = await browser.newPage({ reducedMotion: true });
  await page.setViewport({ width: 1440, height: 1000 });
  const flush = () => page.eval(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const waitText = text => page.eval(async text => {
    for (let n = 0; n < 200; n++) { if (document.body.textContent.includes(text)) return; await new Promise(resolve => setTimeout(resolve, 25)); }
    throw new Error(`Missing text ${text}: ${document.body.textContent}`);
  }, text);
  const click = async (value, byText = false) => {
    await page.eval(async ({ value, byText }) => {
      for (let n = 0; n < 200; n++) {
        const el = [...document.querySelectorAll(byText ? 'button,a' : value)].find(el => el.getBoundingClientRect().width && el.getBoundingClientRect().height && (!byText || el.textContent.trim() === value));
        if (el) { el.click(); return; }
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(`Missing visible control ${value}`);
    }, { value, byText }); await flush();
  };
  const fill = async values => {
    await page.eval(values => {
      for (const [id, value] of Object.entries(values)) {
        const el = document.getElementById(id);
        Object.getOwnPropertyDescriptor(el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value);
        el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
      }
    }, values); await flush();
  };
  const login = async role => {
    if (await page.eval(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Cerrar sesión'))) await click('Cerrar sesión', true);
    await waitText('Iniciar sesión');
    await fill({ email: role === 'ADMIN' ? 'admin@pilot.edu.co' : role === 'A' ? 'teacher-a@pilot.edu.co' : 'teacher-b@pilot.edu.co', password: role === 'ADMIN' ? 'TestingA123' : 'TeacherPass1' });
    await click('form button[type=submit]'); await waitText('Cerrar sesión');
    await click('nav[aria-label="Navegación principal"] a[href="/academico/cursos"]');
    await waitText(role === 'ADMIN' ? 'Organiza los cursos' : 'Selecciona un curso');
  };
  const openCourse = async name => {
    const href = await page.eval(name => [...document.querySelectorAll('.course-card')].find(card => card.querySelector('h2')?.textContent === name)?.querySelector('a')?.getAttribute('href'), name);
    assert.ok(href, `course ${name}`); await click(`a[href="${href}"]`); return href;
  };
  const get = path => page.eval(async ({ api, path }) => {
    const response = await fetch(`${api}${path}`, { credentials: 'include', cache: 'no-store' });
    return { status: response.status, data: await response.json() };
  }, { api, path });

  await page.goto(`${origin}/academico/cursos`, { settleMs: 250 });
  await login('ADMIN'); await waitText('Crear curso');
  await click('Crear curso', true); await waitText('Profesor responsable');
  const ids = await page.eval(() => Object.fromEntries([...document.querySelectorAll('#group-teacherId option')].filter(o => o.value).map(o => [o.textContent, o.value])));
  const teacherA = ids['Profesora de demostración A'], teacherB = ids['Profesor de demostración B'];
  assert.ok(teacherA && teacherB);
  await fill({ 'group-name': 'Curso temporal de prueba', 'group-grade': '3', 'group-schoolYear': '2026', 'group-teacherId': teacherA });
  await click('form button[type=submit]'); await waitText('Eliminar curso');
  const temporary = await page.eval(() => location.pathname);
  await click('Editar curso', true); await waitText('Nombre del curso');
  await fill({ 'group-name': 'Curso temporal corregido' }); await click('form button[type=submit]'); await waitText('Curso temporal corregido');
  await click('Eliminar curso', true); await waitText('¿Eliminar el curso');
  assert.equal(await page.eval(() => document.activeElement.textContent), 'Cancelar');
  await click('Cancelar', true); assert.equal((await get(`/api/v1/groups/${temporary.split('/').at(-1)}`)).status, 200);
  await click('Eliminar curso', true); await click('[role=alertdialog] button:last-child'); await waitText('Crear curso');
  assert.equal((await get(`/api/v1/groups/${temporary.split('/').at(-1)}`)).status, 404);
  passed.push('Real ADMIN CRUD: create, edit, cancel deletion, delete empty course and confirm absence');

  await login('A'); await waitText('Tercero A · Jornada mañana');
  const coursePath = await openCourse('Tercero A · Jornada mañana'); const courseId = coursePath.split('/').at(-1);
  await waitText('DEMO-0001');
  await click('#workspace-content a[aria-label^="Ver ficha"]'); await waitText('Editar estudiante');
  await click('Editar estudiante', true); await waitText('Nombres'); await fill({ 'student-firstName': 'Estudiante ficticio corregido' });
  await click('Guardar cambios', true); await waitText('Datos actualizados');
  await click('Inactivar estudiante', true); await waitText('¿Inactivar a');
  assert.equal(await page.eval(() => document.activeElement.textContent), 'Cancelar');
  await click('[role=alertdialog] button:last-child'); await waitText('Estudiante inactivado');
  const inactivePath = await page.eval(() => location.pathname);
  await page.goto(`${origin}${inactivePath}`, { settleMs: 300 }); await waitText('Este registro está inactivo');
  await click('Volver al curso', true); await waitText('Registrar estudiante');
  await click('Registrar estudiante', true); await waitText('Todos los campos son obligatorios');
  await click('form button[type=submit]'); await waitText('Revisa los datos del estudiante');
  assert.equal(await page.eval(() => document.activeElement.getAttribute('role')), 'alert');
  const code = `CURSO-E2E-${Date.now()}`;
  await fill({ 'student-studentCode': code, 'student-firstName': 'Registro ficticio nuevo', 'student-lastName': 'De prueba' });
  await page.eval(() => { document.querySelector('form').requestSubmit(); document.querySelector('form')?.requestSubmit(); });
  await waitText('Estudiante registrado'); await waitText('Este registro está inactivo');
  const studentPath = await page.eval(() => location.pathname), studentId = studentPath.split('/').at(-1);
  const roster = await get(`/api/v1/groups/${courseId}/students`);
  assert.equal(roster.data.items.filter(s => s.studentCode === code).length, 1, 'double activation creates one record');
  assert.equal(roster.data.items.find(s => s.id === studentId).isActive, false);
  passed.push('Real TEACHER: scoped roster, edit, inactivate, reload persisted state, validate/create inactive once');

  await login('ADMIN'); await waitText('Tercero A · Jornada mañana'); await openCourse('Tercero A · Jornada mañana'); await waitText('Eliminar curso');
  assert.equal((await get(`/api/v1/groups/${courseId}/students`)).status, 403);
  assert.equal(await page.eval(() => document.body.textContent.includes('Registro ficticio nuevo')), false, 'ADMIN cannot see student names');
  await click('Editar curso', true); await waitText('Profesor responsable'); await fill({ 'group-teacherId': teacherB });
  await click('Guardar cambios', true); await waitText('¿Cambiar el profesor responsable?');
  assert.equal(await page.eval(() => document.activeElement.textContent), 'Cancelar');
  await click('[role=alertdialog] button:first-child'); assert.equal((await get(`/api/v1/groups/${courseId}`)).data.teacherId, teacherA);
  await click('Guardar cambios', true); await click('Confirmar cambio de profesor', true); await waitText('Profesor de demostración B');
  assert.equal((await get(`/api/v1/groups/${courseId}`)).data.teacherId, teacherB);
  await click('Eliminar curso', true); await click('[role=alertdialog] button:last-child'); await waitText('No se pudo completar la operación del curso');
  assert.equal((await get(`/api/v1/groups/${courseId}`)).status, 200, 'occupied course remains');
  await click('Cerrar y revisar cursos', true);
  passed.push('Real ADMIN transfer requires confirmation, does not expose students, and cannot delete occupied course');

  await login('A'); await waitText('Tercero B · Jornada tarde');
  assert.equal(await page.eval(() => [...document.querySelectorAll('.course-card h2')].some(el => el.textContent === 'Tercero A · Jornada mañana')), false);
  assert.equal((await get(`/api/v1/groups/${courseId}/students`)).status, 404);
  assert.equal((await get(`/api/v1/students/${studentId}`)).status, 404);
  await login('B'); await waitText('Tercero A · Jornada mañana'); await openCourse('Tercero A · Jornada mañana'); await waitText(code);
  await click(`a[href="${studentPath}"]`); await waitText('Registro ficticio nuevo'); await waitText('Este registro está inactivo');
  assert.equal((await get(`/api/v1/students/${studentId}`)).data.studentCode, code);
  passed.push('Real transfer: prior teacher loses list and direct-ID access; new teacher sees same record and state');

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewport({ width, height: 1000 });
    for (const [name, path, expected] of [['courses', '/academico/cursos', 'Selecciona un curso'], ['roster', coursePath, code], ['detail', studentPath, 'Editar estudiante'], ['register', `${coursePath}/estudiantes/nuevo`, 'Todos los campos son obligatorios']]) {
      await page.goto(`${origin}${path}`, { settleMs: 250 }); await waitText(expected);
      const metrics = await page.eval(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll('button,input,select')].filter(el => el.getBoundingClientRect().width && el.getBoundingClientRect().height < 44).length }));
      assert.equal(metrics.overflow, false, `${name} ${width} overflow`); assert.equal(metrics.small, 0, `${name} ${width} target size`);
      if ([390, 768, 1440].includes(width)) await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true });
    }
  }
  passed.push('20 real page/viewport combinations, 320–1440px, no horizontal page overflow and controls ≥44px');
  await page.goto(`${origin}/academico/cursos`, { settleMs: 300 }); await waitText('Tercero A · Jornada mañana');
  assert.deepEqual(page.consoleErrors, []);
  writeFileSync(`${output}/results.json`, JSON.stringify({ origin, api, passed }, null, 2));
  console.log(`PASS: ${passed.length} real SPA/API/DB course flow groups. ${output}`);
} finally { await browser.close(); }
