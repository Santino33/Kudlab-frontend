import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { App } from '../../src/App.tsx';
import { createAuthClient } from '../../src/auth/client.ts';
import { createAuthController } from '../../src/auth/controller.ts';
import type { Student } from '../../src/features/academico/students/types.ts';
import '../../src/styles.css';

// Synthetic transport only: no network fallback, credentials, real students or persistent drafts.
if (!import.meta.env.DEV) throw new Error('Test harness requires development mode');
const root = createRoot(document.getElementById('root')!);
const host = () => document.getElementById('root')!;
const text = () => host().textContent ?? '';
const path = '/academico/estudiantes';
const student: Student = { id: '00000000-0000-4000-8000-000000000001', groupId: '00000000-0000-4000-8000-000000000002', studentCode: '0001-Á', firstName: 'Nombre ficticio', lastName: 'Apellido de prueba', isActive: true };
let key = 0;
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
async function until(check: () => boolean) {
  for (let n = 0; n < 150; n++) { if (check()) return; await new Promise(done => setTimeout(done, 20)); }
  throw new Error(`DOM timeout: ${text().slice(0, 250)}`);
}
type Options = { role?: 'ADMIN' | 'TEACHER'; path?: string; empty?: boolean; status?: number; mutationStatus?: number; loseResponse?: boolean; pending?: boolean; inactive?: boolean; noSession?: boolean; long?: boolean };
function fixture(options: Options = {}) {
  document.getElementById('test-results')!.textContent = '';
  let row = { ...student, isActive: !options.inactive, ...(options.long ? { firstName: 'Nombre ficticio '.repeat(6).trim(), lastName: 'Apellido compuesto '.repeat(5).trim() } : {}) };
  let session = !options.noSession;
  let status = options.status ?? 200;
  const calls: { path: string; method: string; body?: BodyInit | null }[] = [];
  let finish: ((response: Response) => void) | undefined;
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    calls.push({ path: url.pathname, method, body: init?.body });
    if (url.pathname === '/api/auth/get-session') return session ? Response.json({ user: { id: 'synthetic', name: 'Profesor de prueba', email: 'test@example.edu.co', role: options.role ?? 'TEACHER' }, session: { id: 'synthetic-session', expiresAt: '2027-01-01T00:00:00Z' } }) : Response.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
    if (url.pathname === '/api/auth/sign-out') { session = false; return Response.json({ success: true }); }
    if (method !== 'GET') {
      if (options.mutationStatus) return Response.json({ code: options.mutationStatus === 409 ? 'CONFLICT' : options.mutationStatus === 404 ? 'NOT_FOUND' : 'INVALID_INPUT', fields: { firstName: 'required', lastName: '<unsafe>' } }, { status: options.mutationStatus });
      if (method === 'PATCH') row = { ...row, ...JSON.parse(String(init?.body)) };
      else { assert(init?.body === undefined, 'Zero-byte deactivate'); row = { ...row, isActive: false }; }
      if (options.loseResponse) throw new TypeError('Synthetic response lost after commit');
      return Response.json(row);
    }
    if (status !== 200) return Response.json({ code: status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'UNAVAILABLE' }, { status });
    if (url.pathname === '/api/v1/students') {
      if (options.pending) return new Promise(done => { finish = done; });
      return Response.json({ items: options.empty ? [] : [row, { ...row, id: '00000000-0000-4000-8000-000000000003', studentCode: '0002', isActive: false }] });
    }
    return url.pathname === `/api/v1/students/${student.id}` ? Response.json(row) : Response.json({ code: 'NOT_FOUND' }, { status: 404 });
  };
  history.replaceState(null, '', options.path ?? path);
  const controller = createAuthController(createAuthClient('http://localhost:3000', fetcher));
  flushSync(() => root.render(<StrictMode><App key={++key} controller={controller} apiOrigin="http://localhost:3000" fetcher={fetcher} pathname={options.path ?? path} search="" /></StrictMode>));
  return { calls, controller, recover: () => { status = 200; }, expire: () => { session = false; }, late: () => finish?.(Response.json({ items: [row] })) };
}
const clickText = (label: string, selector = 'button,a') => {
  const control = [...document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(selector)].find(item => item.textContent?.trim() === label);
  assert(control, `Missing control: ${label}`); control!.click();
};
function input(field: string, value: string) {
  const element = document.getElementById(`student-${field}`)!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
const mutations = (calls: { path: string; method: string; body?: BodyInit | null }[]) => calls.filter(call => call.path.startsWith('/api/v1/students') && call.method !== 'GET');
export async function runStudentChecks() {
  const passed: string[] = [];
  const run = async (name: string, fn: () => Promise<void>) => { await fn(); passed.push(name); };
  await run('TEACHER: lista real, activos/inactivos, navegación, GET de ficha y atrás/adelante', async () => {
    const f = fixture(); await until(() => Boolean(host().querySelector('table')));
    assert(text().includes('Activo') && text().includes('Inactivo'), 'Both states');
    assert(host().querySelector('a[aria-current="page"][href="/academico/estudiantes"]'), 'Active sidebar');
    clickText('Ver ficha'); await until(() => text().includes('Editar estudiante'));
    assert(f.calls.some(call => call.path === `/api/v1/students/${student.id}`), 'GET detail');
    assert(!text().includes(student.groupId), 'No UUID displayed');
    history.back(); await until(() => Boolean(host().querySelector('table')));
    history.forward(); await until(() => text().includes('Editar estudiante'));
  });
  await run('registro bloqueado sin pedir datos personales ni enviar alta', async () => {
    const f = fixture({ path: `${path}/nuevo` }); await until(() => text().includes('El registro requiere'));
    assert(!host().querySelector('input,select'), 'No fake inputs'); assert(mutations(f.calls).length === 0, 'No POST');
  });
  await run('vacío y 404 neutral no muestran filas ni datos anteriores', async () => {
    fixture({ empty: true }); await until(() => text().includes('No hay estudiantes en tus grupos'));
    assert(!host().querySelector('table'), 'Real empty');
    fixture({ path: `${path}/malformado` }); await until(() => text().includes('No encontramos el recurso o ya no tienes acceso'));
    assert(!text().includes(student.firstName), 'Neutral malformed ID');
  });
  for (const options of [{ noSession: true }, { role: 'ADMIN' as const }]) await run(`URL directa protegida ${options.role ?? 'sin sesión'}`, async () => {
    const f = fixture({ ...options, path: `${path}/${student.id}` });
    await until(() => text().includes(options.role ? 'No tienes acceso a este destino' : 'Iniciar sesión'));
    assert(!f.calls.some(call => call.path.startsWith('/api/v1/students')), 'No protected calls');
    assert(!host().querySelector(`a[href="${path}"]`), 'No teacher sidebar');
  });
  await run('edición inactiva: resumen enfocable, inline, trim, PATCH solo cambios y ficha actualizada', async () => {
    const f = fixture({ path: `${path}/${student.id}/editar`, inactive: true }); await until(() => Boolean(host().querySelector('input')));
    input('firstName', ' '); await new Promise(done => setTimeout(done, 0)); clickText('Guardar cambios');
    await until(() => Boolean(host().querySelector('[role="alert"]')));
    assert(document.activeElement?.getAttribute('role') === 'alert', 'Summary focus');
    assert(host().querySelector('a[href="#student-firstName"]'), 'Summary links to field');
    assert(host().querySelector('input[aria-invalid="true"]'), 'Inline association');
    assert(mutations(f.calls).length === 0, 'No invalid PATCH');
    input('firstName', ' Nuevo nombre '); await new Promise(done => setTimeout(done, 0)); clickText('Guardar cambios');
    await until(() => text().includes('Datos actualizados'));
    assert(JSON.stringify(JSON.parse(String(mutations(f.calls)[0].body))) === JSON.stringify({ firstName: 'Nuevo nombre' }), 'Only changed name');
    assert(text().includes('Este registro está inactivo'), 'Remains inactive');
    assert(location.pathname === `${path}/${student.id}`, 'Navigate to authorized detail');
  });
  await run('sin cambios no envía PATCH; cancelar no muta', async () => {
    const f = fixture({ path: `${path}/${student.id}/editar` }); await until(() => Boolean(host().querySelector('input')));
    clickText('Guardar cambios'); await until(() => text().includes('No hay cambios para guardar'));
    assert(mutations(f.calls).length === 0, 'No empty PATCH'); clickText('Cancelar'); await until(() => text().includes('Editar estudiante'));
    assert(mutations(f.calls).length === 0, 'No cancel PATCH');
  });
  for (const status of [400, 409, 404]) await run(`rechazo de edición ${status}: seguro y sin replay`, async () => {
    const f = fixture({ path: `${path}/${student.id}/editar`, mutationStatus: status }); await until(() => Boolean(host().querySelector('input')));
    input('firstName', 'Cambio'); await new Promise(done => setTimeout(done, 0)); clickText('Guardar cambios');
    await until(() => text().includes(status === 404 ? 'No encontramos el recurso' : status === 409 ? 'Código de estudiante no disponible' : 'Completa este campo'));
    assert(mutations(f.calls).length === 1, 'No replay'); assert(!text().includes('<unsafe>'), 'No arbitrary error reason');
    if (status === 404) assert(!host().querySelector('input'), 'Withdraw protected form');
    else assert((document.getElementById('student-firstName') as HTMLInputElement).value === 'Cambio', 'Preserve correctable input');
  });
  await run('confirmación segura, cancelar no muta, inactivar conserva datos/sesión y foco', async () => {
    const f = fixture({ path: `${path}/${student.id}` }); await until(() => text().includes('Editar estudiante'));
    clickText('Inactivar estudiante'); await until(() => Boolean(document.querySelector('[role="alertdialog"]')));
    assert(document.activeElement?.textContent === 'Cancelar', 'Safe focus');
    clickText('Cancelar'); await until(() => !document.querySelector('[role="alertdialog"]'));
    assert(mutations(f.calls).length === 0, 'Cancel does not mutate');
    clickText('Inactivar estudiante'); await until(() => Boolean(document.querySelector('[role="alertdialog"]')));
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')].find(button => button.textContent === 'Inactivar estudiante')!;
    confirm.click(); confirm.click();
    await until(() => text().includes('Estudiante inactivado') && text().includes('Este registro está inactivo'));
    assert(mutations(f.calls).length === 1 && mutations(f.calls)[0].body === undefined, 'Single zero-byte POST');
    assert(text().includes('Cerrar sesión') && text().includes(student.studentCode), 'Data and teacher session preserved');
    await until(() => document.activeElement?.id === 'auth-title');
  });
  await run('respuesta perdida después de commit: sin replay, retirada de borradores, consulta explícita', async () => {
    const f = fixture({ path: `${path}/${student.id}/editar`, loseResponse: true }); await until(() => Boolean(host().querySelector('input')));
    input('firstName', 'Cambio confirmado por lectura'); await new Promise(done => setTimeout(done, 0)); clickText('Guardar cambios');
    await until(() => text().includes('No pudimos comprobar tu acceso'));
    assert(!host().querySelector('input'), 'Withdraw draft'); clickText('Reintentar');
    await until(() => text().includes('Ir a comprobar el registro'));
    assert(mutations(f.calls).length === 1, 'No replay after revalidation');
    clickText('Ir a comprobar el registro'); await until(() => [...host().querySelectorAll('button')].some(button => button.textContent === 'Comprobar estado actual'));
    clickText('Comprobar estado actual'); await until(() => text().includes('Estado confirmado por lectura'));
    assert(text().includes('Cambio confirmado por lectura'), 'Observed server state');
    clickText('Ya revisé el registro'); await until(() => !text().includes('Hay un guardado sin confirmar'));
    assert(mutations(f.calls).length === 1, 'Reading never writes');
  });
  await run('inactivación sin respuesta: lectura confirma inactivo sin repetir POST', async () => {
    const f = fixture({ path: `${path}/${student.id}`, loseResponse: true }); await until(() => text().includes('Editar estudiante'));
    clickText('Inactivar estudiante'); await until(() => Boolean(document.querySelector('[role="alertdialog"]')));
    clickText('Inactivar estudiante', '[role="alertdialog"] button');
    await until(() => text().includes('No pudimos comprobar tu acceso'));
    assert(!text().includes(student.firstName), 'Withdraw record on uncertain access');
    clickText('Reintentar'); await until(() => text().includes('Este registro está inactivo'));
    clickText('Comprobar estado actual'); await until(() => text().includes('Estado confirmado por lectura: inactivo'));
    assert(mutations(f.calls).length === 1, 'No deactivate replay');
    assert(![...host().querySelectorAll('button,a')].some(element => /^(Activar|Reactivar)/.test(element.textContent ?? '')), 'No reactivation');
  });
  for (const status of [401, 403, 503]) await run(`${status}: retira datos y no repite automáticamente`, async () => {
    const f = fixture({ status });
    await until(() => text().includes(status === 401 ? 'Tu sesión ya no es válida' : status === 403 ? 'No tienes acceso a este destino' : 'No pudimos comprobar tu acceso'));
    assert(!text().includes(student.firstName), 'Withdraw data');
    const count = f.calls.length; await new Promise(done => setTimeout(done, 50)); assert(f.calls.length === count, 'No automatic retry');
    if (status === 503) { f.recover(); clickText('Reintentar'); await until(() => Boolean(host().querySelector('table'))); }
  });
  await run('respuesta tardía de destino/sesión retirada; pagehide síncrono', async () => {
    const f = fixture({ pending: true }); await until(() => text().includes('Consultando estudiantes'));
    history.pushState(null, '', `${path}/${student.id}`); window.dispatchEvent(new PopStateEvent('popstate'));
    await until(() => text().includes('Editar estudiante')); f.late(); await new Promise(done => setTimeout(done, 30));
    assert(!host().querySelector('table'), 'No late list');
    window.dispatchEvent(new Event('pagehide')); assert(!text().includes(student.firstName), 'Synchronous withdrawal');
    f.expire(); window.dispatchEvent(new Event('pageshow')); await until(() => text().includes('Tu sesión ya no es válida'));
  });
  document.getElementById('test-results')!.textContent = `${passed.length} pruebas DOM correctas\n${passed.join('\n')}`;
  return passed;
}
Object.assign(window, { runStudentChecks, studentFixture: fixture });
fixture();
