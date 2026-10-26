import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { createAuthClient } from './client.ts';
import { createAuthController } from './controller.ts';
import type { AuthController } from './controller.ts';

const errorMessages = {
  input: 'Corrige los datos de acceso.',
  credentials: 'Credenciales inválidas',
  loginUnconfirmed: 'No pudimos confirmar el inicio de sesión',
};

export function AuthRoot({ controller: injected }: { controller?: AuthController }) {
  const [controller] = useState(() => injected ?? createAuthController(createAuthClient()));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState<{ email?: string; password?: string }>({});
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Native page lifecycle events must commit the safe DOM before a bfcache snapshot.
    const hide = () => flushSync(() => controller.suspend());
    const show = () => { if (document.visibilityState !== 'hidden') controller.resume(); };
    const visibility = () => document.visibilityState === 'hidden' ? hide() : show();
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    document.addEventListener('visibilitychange', visibility);
    controller.start();
    if (document.visibilityState === 'hidden') controller.suspend();
    return () => {
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      document.removeEventListener('visibilitychange', visibility);
      controller.stop();
    };
  }, [controller]);
  useLayoutEffect(() => {
    if (state.kind !== 'signingIn' && passwordInput.current) passwordInput.current.value = '';
    setInvalid({});
    if (document.visibilityState === 'hidden') return;
    if (state.kind === 'signedOut' && state.error) summary.current?.focus();
    else title.current?.focus();
  }, [state]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (controller.getSnapshot().kind !== 'signedOut') return;
    const issues = {
      ...(!emailInput.current?.validity.valid ? { email: 'Ingresa un correo válido.' } : {}),
      ...(!passwordInput.current?.value ? { password: 'Ingresa tu contraseña.' } : {}),
    };
    setInvalid(issues);
    if (issues.email) { emailInput.current?.focus(); return; }
    if (issues.password) { passwordInput.current?.focus(); return; }
    controller.signIn(email, passwordInput.current!.value);
  }

  const heading = state.kind === 'authenticated' ? 'Acceso confirmado' :
    state.kind === 'checking' ? 'Comprobando acceso' :
    state.kind === 'checkUnavailable' ? 'No pudimos comprobar tu acceso' :
    state.kind === 'signingOut' ? 'Cerrando sesión' :
    state.kind === 'signOutUnconfirmed' ? 'No pudimos confirmar el cierre' : 'Iniciar sesión';
  const error = state.kind === 'signedOut' && state.error ? errorMessages[state.error] : undefined;

  return <main className="auth-shell">
    <section className="auth-card" aria-labelledby="auth-title">
      <p>Kudlab · Acceso del personal</p>
      <h1 id="auth-title" ref={title} tabIndex={-1}>{heading}</h1>
      <p role="status" aria-live="polite">{state.kind === 'checking' ? 'Comprobando acceso' :
        state.kind === 'signingIn' ? 'Iniciando sesión' : state.kind === 'signingOut' ? 'Cerrando sesión' : ''}</p>
      {state.kind === 'checking' && state.notice === 'loginUnconfirmed' && <p role="alert">{errorMessages.loginUnconfirmed}</p>}
      {state.kind === 'checking' && state.context === 'denied' && <p role="alert">No tienes acceso a esta operación</p>}
      {state.kind === 'signedOut' && state.reason === 'lost' && <p role="alert">Tu sesión ya no es válida. Inicia sesión de nuevo</p>}
      {error && <p ref={summary} tabIndex={-1} role="alert">{error}</p>}
      {(state.kind === 'signedOut' || state.kind === 'signingIn') && <form onSubmit={submit} noValidate aria-busy={state.kind === 'signingIn'}>
        <label htmlFor="email">Correo</label>
        <input id="email" ref={emailInput} name="email" type="email" autoComplete="username" required
          value={email} onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(invalid.email)} aria-describedby={invalid.email ? 'email-error' : undefined} />
        {invalid.email && <p id="email-error" role="alert">{invalid.email}</p>}
        <label htmlFor="password">Contraseña</label>
        <input id="password" ref={passwordInput} name="password" type="password" autoComplete="current-password" required
          aria-invalid={Boolean(invalid.password)} aria-describedby={invalid.password ? 'password-error' : undefined} />
        {invalid.password && <p id="password-error" role="alert">{invalid.password}</p>}
        <button type="submit" disabled={state.kind === 'signingIn'}>Iniciar sesión</button>
      </form>}
      {state.kind === 'authenticated' && <div>
        {state.denied && <p role="alert">No tienes acceso a esta operación</p>}
        <dl><dt>Nombre</dt><dd>{state.user.name}</dd><dt>Correo</dt><dd>{state.user.email}</dd><dt>Rol</dt><dd>{state.user.role}</dd></dl>
        <button onClick={controller.signOut}>Cerrar sesión</button>
      </div>}
      {(state.kind === 'checkUnavailable' || state.kind === 'signOutUnconfirmed') &&
        <button onClick={controller.retry}>Reintentar</button>}
    </section>
  </main>;
}
