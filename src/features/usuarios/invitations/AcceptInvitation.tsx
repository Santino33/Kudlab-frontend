import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, CircleCheck, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UsuariosApi } from '../api.ts';
import type { RecoveryTicket } from '../navigation.ts';
import { recoveryPasswordIssues } from '../recovery/recovery-input.ts';
import { useMutation } from '../hooks';
import { ActionLink, Notice } from '../shared';

export function AcceptInvitation({ api, ticket }: { api: UsuariosApi; ticket: RecoveryTicket }) {
  const password = useRef<HTMLInputElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);
  const sending = useRef(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [issues, setIssues] = useState<{ password?: string; confirmation?: string }>({});
  const mutation = useMutation<boolean>();
  const success = mutation.result?.kind === 'success';
  const uncertain = Boolean(mutation.result && 'uncertain' in mutation.result && mutation.result.uncertain);
  const conflict = mutation.result?.kind === 'error' && mutation.result.status === 409;
  const unusable = !ticket.read() || mutation.result?.kind === 'error' && mutation.result.status === 410;
  const title = success ? 'Cuenta activada' : uncertain ? 'Activación sin confirmar' : conflict ? 'No se pudo activar la cuenta' : unusable ? 'Invitación no disponible' : 'Activa tu cuenta';
  useEffect(() => { document.getElementById('auth-title')?.focus(); }, [title]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current || mutation.pending || success || unusable || uncertain || conflict) return;
    const value = password.current?.value ?? '';
    const invalid = recoveryPasswordIssues(value, confirmation.current?.value ?? '');
    setIssues(invalid);
    if (invalid.password) { password.current?.focus(); return; }
    if (invalid.confirmation) { confirmation.current?.focus(); return; }
    const token = ticket.read();
    if (!token) return;
    if (password.current) password.current.value = '';
    if (confirmation.current) confirmation.current.value = '';
    setShowPasswords(false);
    sending.current = true;
    try {
      const result = await mutation.run((signal) => api.acceptInvitation(token, value, signal));
      if (result?.kind === 'success' || result?.kind === 'error' && [409, 410].includes(result.status) || result && 'uncertain' in result && result.uncertain) ticket.clear();
    } finally { sending.current = false; }
  }

  return <Card className="recovery-card"><CardHeader>
    <h1 id="auth-title" className="auth-heading" tabIndex={-1}>{title}</h1>
    <p>{success ? 'Ya puedes entrar a Kudlab con tu correo y la contraseña que elegiste.' :
      uncertain ? 'La cuenta podría haberse activado. Comprueba tu acceso antes de intentar otra vez.' :
      conflict ? 'La cuenta asociada a esta invitación no puede activarse. Consulta al administrador.' :
      unusable ? 'Abre de nuevo el enlace de tu correo. Si venció o ya se utilizó, consulta al administrador.' :
      'Crea tu contraseña para aceptar la invitación y comenzar como profesor.'}</p>
  </CardHeader><CardContent>
    {success ? <><p role="status" className="flex items-center gap-2"><CircleCheck className="size-5" aria-hidden="true" />Tu cuenta está activa.</p>
      <ActionLink href="/acceso" primary>Iniciar sesión<ArrowRight className="size-5" aria-hidden="true" /></ActionLink></> :
      uncertain || conflict || unusable ? <>
        <p>{uncertain ? 'No repetiremos el envío automáticamente. Si no puedes ingresar con la contraseña elegida, pide al administrador que revise el estado de tu cuenta.' :
          conflict ? 'No se cambiarán tus credenciales con este enlace.' :
          'La invitación falta, es inválida, venció, ya se usó o fue retirada al salir de esta pantalla. Un enlace no disponible no permite establecer otra contraseña.'}</p>
        <ActionLink href="/acceso">{uncertain ? 'Comprobar mi acceso' : 'Ir al inicio de sesión'}</ActionLink>
      </> : <>
        {mutation.result && <Notice title="No se confirmó la activación" focus focusKey={mutation.result}>
          Vuelve a escribir una contraseña que cumpla los requisitos y su confirmación. Si el problema continúa, consulta al administrador.
        </Notice>}
        <form className="auth-form" onSubmit={submit} noValidate aria-busy={mutation.pending}>
          <div className="auth-field"><Label htmlFor="invitation-password">Contraseña</Label>
            <Input ref={password} id="invitation-password" type={showPasswords ? 'text' : 'password'} name="password" autoComplete="new-password" required maxLength={128} disabled={mutation.pending}
              aria-invalid={Boolean(issues.password)} aria-describedby="invitation-password-help" />
            <p id="invitation-password-help" className="text-sm" role={issues.password ? 'alert' : undefined}>{issues.password ?? 'Entre 8 y 128 caracteres, con una mayúscula (A–Z), una minúscula (a–z) y un número.'}</p>
          </div>
          <div className="auth-field"><Label htmlFor="invitation-confirmation">Confirmar contraseña</Label>
            <Input ref={confirmation} id="invitation-confirmation" type={showPasswords ? 'text' : 'password'} name="confirmation" autoComplete="new-password" required maxLength={128} disabled={mutation.pending}
              aria-invalid={Boolean(issues.confirmation)} aria-describedby={issues.confirmation ? 'invitation-confirmation-error' : undefined} />
            {issues.confirmation && <p id="invitation-confirmation-error" className="text-sm" role="alert">{issues.confirmation}</p>}
          </div>
          <Button type="button" variant="outline" className="w-fit" disabled={mutation.pending} aria-pressed={showPasswords} aria-controls="invitation-password invitation-confirmation" onClick={() => setShowPasswords(value => !value)}>
            {showPasswords ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          </Button>
          <Button type="submit" disabled={mutation.pending}>{mutation.pending && <LoaderCircle aria-hidden="true" />}{mutation.pending ? 'Activando cuenta…' : 'Activar cuenta'}</Button>
          {mutation.pending && <p role="status">Estamos procesando este intento. No necesitas enviarlo de nuevo.</p>}
        </form>
        <a className="staff-link w-fit" href="/acceso">Volver al inicio de sesión</a>
      </>}
  </CardContent><CardFooter>{success ? 'La activación no inicia sesión automáticamente.' :
    'La invitación vence a los 7 días y es de un solo uso. Al ocultar o salir de esta pantalla se retiran el enlace y las contraseñas; puedes reabrir el correo para continuar.'}</CardFooter></Card>;
}
