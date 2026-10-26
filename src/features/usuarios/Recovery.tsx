import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CircleCheck, Eye, EyeOff, KeyRound, Link2Off, LoaderCircle, Mail } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UsuariosApi } from './api.ts';
import type { RecoveryTicket } from './navigation.ts';
import { validInstitutionalEmail } from './types.ts';
import { recoveryPasswordIssues } from './recovery-input.ts';
import { useMutation } from './hooks';
import { ActionLink, Notice } from './shared';

export function Recovery({ api, confirm, ticket }: { api: UsuariosApi; confirm: boolean; ticket: RecoveryTicket }) {
  const [email, setEmail] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [issues, setIssues] = useState<{ email?: string; password?: string; confirmation?: string }>({});
  const emailInput = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);
  const sending = useRef(false);
  const mutation = useMutation<boolean>();
  const unusable = confirm && (!ticket.read() || (mutation.result?.kind === 'error' && mutation.result.status === 410));
  const uncertain = Boolean(mutation.result && 'uncertain' in mutation.result && mutation.result.uncertain);
  const success = mutation.result?.kind === 'success';
  const title = success ? confirm ? 'Contraseña actualizada' : 'Revisa tu correo' : unusable ? 'Necesitas un nuevo enlace' : confirm ? 'Crea tu nueva contraseña' : 'Recuperar contraseña';
  useEffect(() => { document.getElementById('auth-title')?.focus(); }, [title]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current || mutation.pending || unusable || uncertain) return;
    if (!confirm) {
      if (!validInstitutionalEmail(email)) { setIssues({ email: 'Ingresa un correo institucional terminado en .edu.co.' }); emailInput.current?.focus(); return; }
      setIssues({});
      sending.current = true;
      try { await mutation.run((signal) => api.requestRecovery(email, signal)); }
      finally { sending.current = false; }
      return;
    }
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
      const result = await mutation.run((signal) => api.confirmRecovery(token, value, signal));
      if (result?.kind === 'success' || (result?.kind === 'error' && result.status === 410)) ticket.clear();
    } finally { sending.current = false; }
  }
  const StateIcon = success ? confirm ? CircleCheck : Mail : unusable ? Link2Off : confirm ? KeyRound : Mail;
  return <Card className="recovery-card"><CardHeader>
    <StateIcon className="size-6" aria-hidden="true" />
    <h1 id="auth-title" className="auth-heading" tabIndex={-1}>{title}</h1>
    <p>{success ? confirm ? 'Vuelve a entrar con tu nueva contraseña.' : 'Si tu cuenta está activa, recibirás un enlace para elegir una nueva contraseña.' :
      unusable ? 'Por seguridad, solo puedes cambiar tu contraseña con un enlace válido.' :
      confirm ? 'Elige una contraseña que no uses en otros servicios.' : 'Te ayudaremos a volver a tu cuenta de Kudlab.'}</p>
  </CardHeader><CardContent>
    {success ? <><div className="staff-stack" role="status">
      {confirm ? <p>Los accesos anteriores se cerraron. Este cambio no inicia sesión automáticamente.</p> : <>
        <p>La respuesta es la misma para todos los correos válidos: no confirma que exista una cuenta ni garantiza la entrega.</p>
        <div className="recovery-guidance"><h2 className="font-semibold">¿No encuentras el mensaje?</h2>
          <p>Revisa spam o correo no deseado y comprueba que usaste el correo vigente de tu cuenta. Si el mensaje llega, abre el enlace más reciente.</p></div>
      </>}
    </div><ActionLink href="/acceso" primary>Volver al acceso<ArrowRight className="size-5" aria-hidden="true" /></ActionLink>
      {!confirm && <a className="staff-link w-fit" href="/recuperar-acceso">Usar otro correo o solicitar otro enlace</a>}
    </> : unusable ? <>
      <p>El enlace falta, venció, ya se utilizó o se retiró al salir de esta página. Solicita otro para continuar.</p>
      <Notice title="¿Ya habías enviado una nueva contraseña?">El cambio podría haberse aplicado. Comprueba tu acceso antes de repetirlo.</Notice>
      <ActionLink href="/recuperar-acceso" primary>Solicitar nuevo enlace</ActionLink>
    </> : <>
      {mutation.result && <Notice title={uncertain ? 'No pudimos confirmar el resultado' : 'Revisa los datos e inténtalo de nuevo'} focus focusKey={mutation.result}>
        {uncertain ? confirm ? 'El cambio podría haberse aplicado. No lo repetiremos automáticamente: comprueba tu acceso con la nueva contraseña.' :
          'La solicitud podría haberse procesado y el correo aún podría llegar. Revisa tu bandeja antes de solicitar otro enlace.' :
          confirm ? 'No se confirmó el cambio. Vuelve a escribir una contraseña que cumpla los requisitos y su confirmación.' :
            'Utiliza el correo institucional vigente de tu cuenta, terminado en .edu.co.'}
      </Notice>}
      {Object.keys(issues).length > 0 && <Notice title="Revisa los datos">{Object.values(issues).join(' ')}</Notice>}
      <form className="auth-form" onSubmit={submit} noValidate aria-busy={mutation.pending}>
        {!confirm ? <div className="auth-field"><Label htmlFor="recovery-email">Correo institucional (obligatorio)</Label>
          <Input ref={emailInput} id="recovery-email" type="email" name="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(issues.email)} aria-describedby="recovery-email-help" />
          <p id="recovery-email-help" className="text-sm">{issues.email ?? 'El correo con el que accedes a Kudlab, terminado en .edu.co.'}</p></div> : <>
          <div className="auth-field"><Label htmlFor="new-password">Nueva contraseña (obligatoria)</Label>
            <Input ref={password} id="new-password" type={showPasswords ? 'text' : 'password'} name="newPassword" autoComplete="new-password" required maxLength={128} aria-invalid={Boolean(issues.password)} aria-describedby="new-password-help" />
            <p id="new-password-help" className="text-sm">{issues.password ?? 'Entre 8 y 128 caracteres, con una mayúscula (A–Z), una minúscula (a–z) y un número.'}</p></div>
          <div className="auth-field"><Label htmlFor="confirm-password">Confirmar contraseña (obligatorio)</Label>
            <Input ref={confirmation} id="confirm-password" type={showPasswords ? 'text' : 'password'} name="confirmation" autoComplete="new-password" required maxLength={128} aria-invalid={Boolean(issues.confirmation)} aria-describedby={issues.confirmation ? 'password-confirmation-error' : undefined} />
            {issues.confirmation && <p id="password-confirmation-error">{issues.confirmation}</p>}</div>
          <Button type="button" variant="outline" className="w-fit" aria-pressed={showPasswords} aria-controls="new-password confirm-password" onClick={() => setShowPasswords(value => !value)}>
            {showPasswords ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}{showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          </Button>
        </>}
        <Button type="submit" disabled={mutation.pending || uncertain}>{mutation.pending ? <LoaderCircle aria-hidden="true" /> : confirm ? <KeyRound aria-hidden="true" /> : <Mail aria-hidden="true" />}
          {mutation.pending ? confirm ? 'Guardando contraseña…' : 'Solicitando enlace…' : confirm ? 'Guardar nueva contraseña' : 'Enviar enlace de recuperación'}</Button>
        {mutation.pending && <p role="status">Estamos procesando este intento. No necesitas enviarlo de nuevo.</p>}
      </form>
      {uncertain && <ActionLink href={confirm ? '/acceso' : '/recuperar-acceso'}>{confirm ? 'Comprobar mi acceso sin repetir el cambio' : 'Iniciar una nueva solicitud explícita'}</ActionLink>}
    </>}
    {!success && <a className="staff-link" href="/acceso"><ArrowLeft className="mr-2 size-4" aria-hidden="true" />Volver al acceso</a>}
  </CardContent><CardFooter>{success && confirm ? 'Puedes cerrar esta pantalla. La próxima vez, utiliza tu nueva contraseña.' : unusable ?
    'Los enlaces son de un solo uso y vencen a los 30 minutos. Utiliza siempre el más reciente.' : confirm ?
    'Mantén esta pantalla abierta mientras completas el cambio. Al ocultarla o salir, el enlace y las contraseñas se retiran por seguridad.' :
    'El enlace vence a los 30 minutos. Una nueva solicitud reemplaza los enlaces anteriores.'}</CardFooter></Card>;
}
