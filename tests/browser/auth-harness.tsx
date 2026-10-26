import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthRoot } from '../../src/auth/AuthRoot.tsx';
import { createAuthClient } from '../../src/auth/client.ts';
import { createAuthController } from '../../src/auth/controller.ts';
import '../../src/styles.css';

// Test-only transport. Never retain a request body, cookie or password; no network fallback.
type Pending = { id: number; operation: string; settled: boolean;
  resolve(body: unknown, status?: number): void; reject(): void };
const pending: Pending[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const controller = createAuthController(createAuthClient((url, init) => new Promise((resolve, reject) => {
  const entry: Pending = { id: pending.length + 1, operation: url.split('/').at(-1)!, settled: false,
    resolve(body, status = 200) { if (entry.settled) return; entry.settled = true; resolve(Response.json(body, { status })); notify(); },
    reject() { if (entry.settled) return; entry.settled = true; reject(new TypeError('Synthetic network failure')); notify(); },
  };
  pending.push(entry);
  if (init.signal?.aborted) entry.reject();
  else init.signal?.addEventListener('abort', entry.reject, { once: true });
  notify();
})));
const user = { id: 'synthetic-browser', name: 'Profesor de ejemplo', email: 'synthetic@example.edu.co', role: 'TEACHER' };
const validSession = { user, session: { id: 'synthetic-session', expiresAt: '2027-01-01T00:00:00.000Z' } };

function Harness() {
  const [, render] = useState(0);
  const [restored, setRestored] = useState<string>('Sin restauración observada');
  useEffect(() => {
    const update = () => render((n) => n + 1);
    const shown = (event: PageTransitionEvent) => setRestored(`pageshow persisted=${event.persisted}`);
    listeners.add(update);
    const unsubscribe = controller.subscribe(update);
    window.addEventListener('pageshow', shown);
    update();
    return () => { listeners.delete(update); unsubscribe(); window.removeEventListener('pageshow', shown); };
  }, []);
  return <>
    <AuthRoot controller={controller} />
    <aside style={{ borderTop: '1px solid CanvasText', padding: '1rem' }} aria-label="Panel sintético de pruebas">
      <h2>Solo pruebas · sin red API</h2>
      <p>Generación {controller.getGeneration()} · llamadas {pending.length} · {restored}</p>
      <button onClick={() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))}>Ocultar (pagehide)</button>
      <button onClick={() => {
        window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
        document.dispatchEvent(new Event('visibilitychange'));
      }}>Restaurar + visibilidad</button>
      <a href="./history-target.html">Navegar a destino de historial</a>
      <div>{(['unauthenticated', 'forbidden', 'unavailable'] as const).map((category) =>
        <span key={category}>
          <button onClick={() => controller.notify({ generation: controller.getGeneration(), category })}>{category} actual</button>
          <button onClick={() => controller.notify({ generation: controller.getGeneration() - 1, category })}>{category} anterior</button>
        </span>)}</div>
      <ol>{pending.map((call) => <li key={call.id}>
        #{call.id} {call.operation} · {call.settled ? 'terminada' : 'pendiente'}
        {!call.settled && <div>
          <button onClick={() => call.resolve(call.operation === 'email' ? { user } : validSession)}>Válida</button>
          <button onClick={() => call.resolve({ code: call.operation === 'email' ? 'INVALID_CREDENTIALS' : 'UNAUTHENTICATED' }, 401)}>401</button>
          <button onClick={() => call.resolve({ code: 'UNAVAILABLE' }, 503)}>503</button>
          <button onClick={() => call.resolve({ success: true })}>Cierre confirmado</button>
          <button onClick={() => call.resolve({ unexpected: true })}>JSON inesperado</button>
          <button onClick={call.reject}>Perder respuesta</button>
        </div>}
      </li>)}</ol>
    </aside>
  </>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Harness /></StrictMode>);
