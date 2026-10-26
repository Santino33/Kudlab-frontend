import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { App } from '../../src/App.tsx';
import { createAuthClient } from '../../src/auth/client.ts';
import { createAuthController } from '../../src/auth/controller.ts';
import '../../src/styles.css';

// Development-only DOM tests. Synthetic fetch has no network fallback or credentials.
if (!import.meta.env.DEV) throw new Error('Test harness requires development mode');
const root = createRoot(document.getElementById('root')!);
const host = () => document.getElementById('root')!;
const text = () => host().textContent ?? '';
const task = { id: 'TG-01', title: 'Lluvia de estrellas', description: 'Ficha metodológica sintética',
  isEnabled: false, integrationReady: false, publishedVersion: null, assignable: false,
  unavailableReasons: ['INTEGRATION_PENDING', 'CONFIGURATION_UNPUBLISHED', 'TASK_DISABLED'], revision: 1 };
let key = 0;
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
async function until(check: () => boolean) {
  for (let n = 0; n < 150; n++) { if (check()) return; await new Promise(done => setTimeout(done, 20)); }
  throw new Error(`DOM timeout: ${text().slice(0, 200)}`);
}
function fixture(options: { role?: 'ADMIN' | 'TEACHER'; path?: string; empty?: boolean; status?: number; pending?: boolean; noSession?: boolean } = {}) {
  let status = options.status ?? 200, session = !options.noSession;
  const calls: string[] = [];
  let resolveLate: ((response: Response) => void) | undefined;
  const fetcher: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    calls.push(path);
    if (path === '/api/auth/get-session') return session ? Response.json({ user: { id: 'synthetic', name: 'Profesor de prueba', email: 'test@example.edu.co', role: options.role ?? 'TEACHER' }, session: { id: 'synthetic-session', expiresAt: '2027-01-01T00:00:00Z' } }) : Response.json({ code: 'UNAUTHENTICATED' }, { status: 401 });
    if (path === '/api/auth/sign-out') { session = false; return Response.json({ success: true }); }
    if (options.pending && path === '/api/v1/tasks') return new Promise(done => { resolveLate = done; });
    if (status !== 200) return Response.json({ code: status === 401 ? 'UNAUTHENTICATED' : status === 403 ? 'FORBIDDEN' : 'UNAVAILABLE' }, { status });
    if (path === '/api/v1/tasks') return Response.json({ items: options.empty ? [] : [task] });
    return path === '/api/v1/tasks/TG-01' ? Response.json({ ...task, purpose: 'Observar atención', pedagogicalNotice: 'No es un diagnóstico' }) : Response.json({ code: 'NOT_FOUND' }, { status: 404 });
  };
  const controller = createAuthController(createAuthClient('http://localhost:3000', fetcher));
  flushSync(() => root.render(<StrictMode><App key={++key} controller={controller} apiOrigin="http://localhost:3000" fetcher={fetcher} pathname={options.path ?? '/tareas'} search="" /></StrictMode>));
  return { calls, controller, recover: () => { status = 200; }, expire: () => { session = false; }, late: () => resolveLate?.(Response.json({ items: [task] })) };
}
const clickText = (label: string) => {
  const control = [...host().querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button,a')].find(item => item.textContent?.trim() === label);
  assert(control, `Missing control: ${label}`); control!.click();
};

export async function runTaskChecks() {
  const passed: string[] = [];
  const run = async (name: string, fn: () => Promise<void>) => { await fn(); passed.push(name); };
  await run('TEACHER: tabla, nombre de enlace, estados honestos y sin jugar/asignar', async () => {
    fixture(); await until(() => text().includes('Ver ficha'));
    assert(host().querySelector('caption')?.textContent === 'Juegos registrados en el alcance actual', 'Table caption');
    assert(host().querySelector('a[aria-label="Ver ficha de Lluvia de estrellas (TG-01)"]'), 'Named link');
    assert(text().includes('No lista para asignar') && text().includes('Sin configuración publicada'), 'Reasons');
    assert(![...host().querySelectorAll('a,button')].some(el => /^(Jugar|Asignar)$/.test(el.textContent ?? '')), 'No future actions');
  });
  await run('ADMIN: ficha/volver sin reconstruir AuthRoot ni volver a consultar sesión', async () => {
    const f = fixture({ role: 'ADMIN' }); await until(() => text().includes('Ver ficha'));
    const before = f.calls.filter(path => path.endsWith('get-session')).length;
    clickText('Ver ficha'); await until(() => text().includes('Finalidad pedagógica'));
    assert(location.pathname === '/tareas/TG-01', 'Detail URL');
    assert(text().includes('Sin versión publicada') && text().includes('No es un diagnóstico'), 'Detail data');
    assert(document.activeElement?.id === 'auth-title', 'Heading focus');
    clickText('Volver a tareas'); await until(() => text().includes('Ver ficha'));
    assert(f.calls.filter(path => path.endsWith('get-session')).length === before, 'Preserve auth');
  });
  await run('lista vacía diferenciada de fallo', async () => {
    fixture({ empty: true }); await until(() => text().includes('Todavía no hay juegos registrados'));
    assert(!host().querySelector('table'), 'Empty is not a fake row');
  });
  await run('detalle inexistente y enlace al catálogo', async () => {
    fixture({ path: '/tareas/TG-99' }); await until(() => text().includes('No encontramos esta tarea'));
    assert(host().querySelector('a[href="/tareas"]'), 'Back link');
  });
  await run('sin sesión: URL directa no consulta catálogo', async () => {
    const f = fixture({ noSession: true, path: '/tareas/TG-01' }); await until(() => text().includes('Iniciar sesión'));
    assert(!f.calls.some(path => path.startsWith('/api/v1/tasks')), 'Access gate');
  });
  await run('503: retira contenido, error persistente y reintento explícito reconcilia acceso', async () => {
    const f = fixture({ status: 503 }); await until(() => text().includes('No pudimos comprobar tu acceso'));
    assert(!text().includes('Lluvia de estrellas'), 'Withdraw catalog');
    const count = f.calls.length; await new Promise(done => setTimeout(done, 100)); assert(f.calls.length === count, 'No auto retry');
    f.recover(); clickText('Reintentar'); await until(() => text().includes('Ver ficha'));
  });
  await run('403: no repone catálogo de un rol anterior tras reconciliar sesión', async () => {
    const f = fixture({ status: 403 }); await until(() => text().includes('No tienes acceso a este destino'));
    assert(!text().includes('Lluvia de estrellas'), 'Forbidden data withdrawn');
    const requests = f.calls.length;
    await new Promise(done => setTimeout(done, 100));
    assert(f.calls.length === requests, 'No replay after denied session');
  });
  await run('401: retira contenido protegido y presenta acceso perdido', async () => {
    fixture({ status: 401 }); await until(() => text().includes('Tu sesión ya no es válida'));
    assert(!host().querySelector('table'), 'No stale table');
  });
  await run('pagehide: retirada síncrona y revalidación antes de restaurar', async () => {
    const f = fixture(); await until(() => text().includes('Ver ficha'));
    window.dispatchEvent(new Event('pagehide')); assert(!text().includes('Lluvia de estrellas'), 'Synchronous withdrawal');
    f.expire(); window.dispatchEvent(new Event('pageshow')); await until(() => text().includes('Tu sesión ya no es válida'));
  });
  await run('respuesta tardía del catálogo no reemplaza otra ficha', async () => {
    const f = fixture({ pending: true }); await until(() => text().includes('Consultando tareas'));
    history.pushState(null, '', '/tareas/TG-01'); window.dispatchEvent(new PopStateEvent('popstate'));
    await until(() => text().includes('Finalidad pedagógica'));
    f.late(); await new Promise(done => setTimeout(done, 50));
    assert(text().includes('Finalidad pedagógica') && !text().includes('Ver ficha'), 'Discard previous destination');
  });
  await run('respuesta tardía de otra generación no reaparece tras suspender', async () => {
    const f = fixture({ pending: true }); await until(() => text().includes('Consultando tareas'));
    window.dispatchEvent(new Event('pagehide')); f.late();
    await new Promise(done => setTimeout(done, 50)); assert(!text().includes('Lluvia de estrellas'), 'Discard previous session');
    f.expire(); window.dispatchEvent(new Event('pageshow')); await until(() => text().includes('Tu sesión ya no es válida'));
  });
  document.getElementById('test-results')!.textContent = `${passed.length} pruebas DOM correctas\n${passed.join('\n')}`;
  return passed;
}
Object.assign(window, { runTaskChecks });
fixture();
