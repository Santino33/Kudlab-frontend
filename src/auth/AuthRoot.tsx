import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { ArrowRight, CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, LogOut, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StaffLayout } from '@/components/StaffLayout';
import type { AuthController } from './controller.ts';
import type { Identity } from './state.ts';

const errorMessages = {
  input: 'Corrige los datos de acceso.',
  credentials: 'El correo o la contraseña no son correctos. Revisa los datos e inténtalo de nuevo.',
  loginUnconfirmed: 'No pudimos confirmar el inicio de sesión',
};

export function AuthRoot({ controller, renderAuthenticated, publicContent, onSuspend, notice }: {
  controller: AuthController;
  renderAuthenticated?: (user: Identity, controller: AuthController, generation: number) => ReactNode;
  publicContent?: () => ReactNode;
  onSuspend?: () => void;
  notice?: ReactNode;
}) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [invalid, setInvalid] = useState<{ email?: string; password?: string }>({});
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLElement>(null);
  const publicOnly = Boolean(publicContent);
  const [publicPage, setPublicPage] = useState({ hidden: document.visibilityState === 'hidden', epoch: 0 });

  useEffect(() => {
    // Native page lifecycle events must commit the safe DOM before a bfcache snapshot.
    const hide = () => flushSync(() => {
      onSuspend?.();
      if (publicOnly) setPublicPage((page) => page.hidden ? page : { hidden: true, epoch: page.epoch + 1 });
      else controller.suspend();
    });
    const show = () => {
      if (document.visibilityState === 'hidden') return;
      if (publicOnly) setPublicPage((page) => ({ ...page, hidden: false }));
      else controller.resume();
    };
    const visibility = () => document.visibilityState === 'hidden' ? hide() : show();
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    document.addEventListener('visibilitychange', visibility);
    if (!publicOnly) controller.start();
    if (document.visibilityState === 'hidden') { onSuspend?.(); if (!publicOnly) controller.suspend(); }
    return () => {
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
      document.removeEventListener('visibilitychange', visibility);
      if (!publicOnly) controller.stop();
    };
  }, [controller, publicOnly, onSuspend]);
  useLayoutEffect(() => {
    if (state.kind !== 'signingIn') {
      if (passwordInput.current) passwordInput.current.value = '';
      setShowPassword(false);
    }
    setInvalid({});
    if (document.visibilityState === 'hidden') return;
    if (state.kind === 'signedOut' && state.error) summary.current?.focus();
    else (title.current ?? content.current?.querySelector('h1'))?.focus();
  }, [state, publicPage.hidden, publicPage.epoch]);

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
  const error = Object.values(invalid).join(' ') ||
    (state.kind === 'signedOut' && state.error ? errorMessages[state.error] : undefined);
  const signingIn = state.kind === 'signingIn';
  const description = state.kind === 'authenticated' ? 'Esta es tu sesión actual en Kudlab.' :
    state.kind === 'checking' ? 'Estamos verificando tu sesión antes de continuar.' :
    state.kind === 'checkUnavailable' ? 'No se puede confirmar si tienes una sesión activa. Reintenta para comprobar tu acceso.' :
    state.kind === 'signingOut' ? 'Estamos cerrando únicamente tu sesión actual.' :
    state.kind === 'signOutUnconfirmed' ? 'Tu sesión podría seguir activa. Reintenta para comprobar el resultado del cierre.' :
    'Usa el correo y la contraseña asociados a tu cuenta.';

  const authenticatedContent = !publicOnly && state.kind === 'authenticated' ?
    renderAuthenticated?.(state.user, controller, state.generation) : undefined;

  return <StaffLayout wide={authenticatedContent !== undefined}>
      <section ref={content} className={authenticatedContent !== undefined ? 'staff-content' : 'auth-content'} aria-labelledby="auth-title">
        {notice && <div className="mb-6">{notice}</div>}
        {publicOnly ? <div key={publicPage.epoch}>{publicPage.hidden ? <Card><CardHeader><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Acceso en pausa</h1><p>Los datos de recuperación fueron retirados.</p></CardHeader></Card> : publicContent?.()}</div> : authenticatedContent ?? <Card>
          <CardHeader>
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
                <Label htmlFor="email">Correo</Label>
                <Input id="email" ref={emailInput} name="email" type="email" autoComplete="username" required
                  value={email} disabled={signingIn} onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(invalid.email)} aria-describedby={invalid.email ? 'email-error' : undefined} />
                {invalid.email && <p id="email-error" className="auth-field-error" role="alert"><CircleAlert size={20} aria-hidden="true" />{invalid.email}</p>}
              </div>
              <div className="auth-field">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" ref={passwordInput} name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required disabled={signingIn}
                  aria-invalid={Boolean(invalid.password)} aria-describedby={invalid.password ? 'password-error' : undefined} />
                {invalid.password && <p id="password-error" className="auth-field-error" role="alert"><CircleAlert size={20} aria-hidden="true" />{invalid.password}</p>}
                <Button type="button" variant="outline" className="w-fit" aria-pressed={showPassword} aria-controls="password" disabled={signingIn} onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                </Button>
              </div>
              <div className="grid gap-2">
                <Button className="w-full" type="submit" disabled={signingIn}>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{signingIn ? 'Iniciando sesión' : 'Iniciar sesión'}</span>
                  {signingIn ? <LoaderCircle aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
                </Button>
                {signingIn && <p className="auth-caption">Espera a que termine este intento antes de volver a enviar.</p>}
              </div>
            <a href="/recuperar-acceso" className="staff-link w-fit">¿Olvidaste tu contraseña?</a>
            </form>}
            {state.kind === 'authenticated' && <>
              <div className="flex items-center gap-2"><CircleCheck size={20} aria-hidden="true" /><p>Sesión iniciada</p></div>
              <dl className="auth-identity">
                <div><dt>Nombre</dt><dd>{state.user.name}</dd></div>
                <div><dt>Correo</dt><dd>{state.user.email}</dd></div>
                <div><dt>Rol</dt><dd>{state.user.role}</dd></div>
              </dl>
              <Button variant="outline" className="w-full" onClick={controller.signOut}><LogOut aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">Cerrar sesión</span></Button>
              <a className="staff-link" href="/">Ir al inicio</a>
            </>}
            {(state.kind === 'checkUnavailable' || state.kind === 'signOutUnconfirmed') &&
              <Button variant="outline" className="w-full" onClick={controller.retry}><RotateCcw aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">Reintentar</span></Button>}
          </CardContent>
          <CardFooter>Acceso exclusivo para profesores con cuenta habilitada.</CardFooter>
        </Card>}
      </section>
  </StaffLayout>;
}
