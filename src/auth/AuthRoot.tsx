import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { ArrowRight, CircleAlert, CircleCheck, LoaderCircle, LogOut, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const summary = useRef<HTMLDivElement>(null);

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
  const signingIn = state.kind === 'signingIn';
  const description = state.kind === 'authenticated' ? 'Esta es tu sesión actual en Kudlab.' :
    state.kind === 'checking' ? 'Estamos verificando tu sesión antes de continuar.' :
    state.kind === 'checkUnavailable' ? 'No se puede confirmar si tienes una sesión activa. Reintenta para comprobar tu acceso.' :
    state.kind === 'signingOut' ? 'Estamos cerrando únicamente tu sesión actual.' :
    state.kind === 'signOutUnconfirmed' ? 'Tu sesión podría seguir activa. Reintenta para comprobar el resultado del cierre.' :
    'Usa el correo y la contraseña asociados a tu cuenta.';

  return <div className="auth-page">
    <header className="auth-header">
      <div className="auth-header-inner">
        <p className="auth-brand">Kudlab</p>
        <p className="auth-eyebrow">Acceso del personal</p>
      </div>
    </header>
    <main className="auth-main">
      <section className="auth-content" aria-labelledby="auth-title">
        <Card>
          <CardHeader>
            <p className="auth-eyebrow">{state.kind === 'authenticated' ? 'Tu cuenta' : 'Solo para profesores'}</p>
            <h1 id="auth-title" className="auth-heading" ref={title} tabIndex={-1}>{heading}</h1>
            <p>{description}</p>
          </CardHeader>
          <CardContent>
            <p className="sr-only" role="status" aria-live="polite">{state.kind === 'checking' ? 'Comprobando acceso' :
              signingIn ? 'Iniciando sesión' : state.kind === 'signingOut' ? 'Cerrando sesión' : ''}</p>
            {(state.kind === 'checking' || state.kind === 'signingOut') &&
              <LoaderCircle className="size-6" aria-hidden="true" />}
            {state.kind === 'checking' && state.notice === 'loginUnconfirmed' &&
              <Alert><CircleAlert aria-hidden="true" /><AlertDescription>{errorMessages.loginUnconfirmed}</AlertDescription></Alert>}
            {((state.kind === 'checking' && state.context === 'denied') || (state.kind === 'authenticated' && state.denied)) &&
              <Alert><CircleAlert aria-hidden="true" /><AlertDescription>No tienes acceso a esta operación</AlertDescription></Alert>}
            {state.kind === 'signedOut' && state.reason === 'lost' &&
              <Alert><CircleAlert aria-hidden="true" /><AlertDescription>Tu sesión ya no es válida. Inicia sesión de nuevo</AlertDescription></Alert>}
            {error && <Alert ref={summary} tabIndex={-1}><CircleAlert aria-hidden="true" /><AlertDescription>{error}</AlertDescription></Alert>}
            {(state.kind === 'signedOut' || signingIn) && <form className="auth-form" onSubmit={submit} noValidate aria-busy={signingIn}>
              <div className="auth-field">
                <Label htmlFor="email">Correo <span className="auth-required">(obligatorio)</span></Label>
                <Input id="email" ref={emailInput} name="email" type="email" autoComplete="username" required
                  value={email} onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(invalid.email)} aria-describedby={invalid.email ? 'email-error' : undefined} />
                {invalid.email && <p id="email-error" className="auth-field-error" role="alert"><CircleAlert size={20} aria-hidden="true" />{invalid.email}</p>}
              </div>
              <div className="auth-field">
                <Label htmlFor="password">Contraseña <span className="auth-required">(obligatorio)</span></Label>
                <Input id="password" ref={passwordInput} name="password" type="password" autoComplete="current-password" required
                  aria-invalid={Boolean(invalid.password)} aria-describedby={invalid.password ? 'password-error' : undefined} />
                {invalid.password && <p id="password-error" className="auth-field-error" role="alert"><CircleAlert size={20} aria-hidden="true" />{invalid.password}</p>}
              </div>
              <div className="grid gap-2">
                <Button className="w-full" type="submit" disabled={signingIn}>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{signingIn ? 'Iniciando sesión' : 'Iniciar sesión'}</span>
                  {signingIn ? <LoaderCircle aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                </Button>
                {signingIn && <p className="auth-eyebrow">Espera a que termine este intento antes de volver a enviar.</p>}
              </div>
            </form>}
            {state.kind === 'authenticated' && <>
              <div className="flex items-center gap-2"><CircleCheck size={20} aria-hidden="true" /><p>Sesión iniciada</p></div>
              <dl className="auth-identity">
                <div><dt>Nombre</dt><dd>{state.user.name}</dd></div>
                <div><dt>Correo</dt><dd>{state.user.email}</dd></div>
                <div><dt>Rol</dt><dd>{state.user.role}</dd></div>
              </dl>
              <Button variant="outline" className="w-full" onClick={controller.signOut}><LogOut aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">Cerrar sesión</span></Button>
            </>}
            {(state.kind === 'checkUnavailable' || state.kind === 'signOutUnconfirmed') &&
              <Button variant="outline" className="w-full" onClick={controller.retry}><RotateCcw aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">Reintentar</span></Button>}
          </CardContent>
          <CardFooter>Acceso exclusivo para profesores con cuenta habilitada.</CardFooter>
        </Card>
      </section>
    </main>
    <footer className="auth-footer">Kudlab · Apoyo al seguimiento pedagógico</footer>
  </div>;
}
