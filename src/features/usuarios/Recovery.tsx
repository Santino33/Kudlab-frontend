import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, KeyRound, LoaderCircle, Mail } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UsuariosApi } from './api.ts';
import type { RecoveryTicket } from './navigation.ts';
import { validInstitutionalEmail, validNewPassword } from './types.ts';
import { useMutation } from './hooks';
import { ActionLink, Notice, ResultError } from './shared';

export function Recovery({ api, confirm, ticket }: { api: UsuariosApi; confirm: boolean; ticket: RecoveryTicket }) {
  const [email, setEmail] = useState('');
  const [issues, setIssues] = useState<{ email?: string; password?: string; confirmation?: string }>({});
  const emailInput = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);
  const mutation = useMutation<boolean>();
  const unusable = confirm && (!ticket.read() || (mutation.result?.kind === 'error' && mutation.result.status === 410));
  const uncertain = Boolean(mutation.result && 'uncertain' in mutation.result && mutation.result.uncertain);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.pending || unusable || uncertain) return;
    if (!confirm) {
      if (!validInstitutionalEmail(email)) { setIssues({ email: 'Ingresa un correo institucional terminado en .edu.co.' }); emailInput.current?.focus(); return; }
      setIssues({});
      await mutation.run((signal) => api.requestRecovery(email, signal));
      return;
    }
    const value = password.current?.value ?? '';
    const invalid = { ...(!validNewPassword(value) ? { password: 'Usa de 8 a 128 caracteres con mayúscula (A–Z), minúscula (a–z) y número.' } : {}),
      ...(value !== confirmation.current?.value ? { confirmation: 'Las contraseñas deben coincidir.' } : {}) };
    setIssues(invalid);
    if (invalid.password) { password.current?.focus(); return; }
    if (invalid.confirmation) { confirmation.current?.focus(); return; }
    const token = ticket.read();
    if (!token) return;
    if (password.current) password.current.value = '';
    if (confirmation.current) confirmation.current.value = '';
    const result = await mutation.run((signal) => api.confirmRecovery(token, value, signal));
    if (result?.kind === 'success' || (result?.kind === 'error' && result.status === 410)) ticket.clear();
  }
  const success = mutation.result?.kind === 'success';
  return <Card><CardHeader><p className="auth-eyebrow">Acceso del personal</p>
    <h1 id="auth-title" className="auth-heading" tabIndex={-1}>{success ? confirm ? 'Contraseña actualizada' : 'Solicitud recibida' :
      unusable ? 'Enlace no utilizable' : confirm ? 'Establecer nueva contraseña' : 'Recuperar acceso'}</h1>
    <p>{confirm ? 'La recuperación requiere un enlace válido y un envío explícito.' : 'Solicita instrucciones para recuperar el acceso a tu cuenta.'}</p>
  </CardHeader><CardContent>
    {success ? <><Notice title={confirm ? 'Ya puedes volver a identificarte' : 'Si corresponde, recibirás instrucciones en tu correo'} focus>
      {confirm ? 'La recuperación no inicia sesión automáticamente. Usa tu nueva contraseña para entrar.' : 'Esta respuesta no confirma si existe una cuenta ni garantiza la entrega del mensaje.'}
    </Notice><ActionLink href="/acceso" primary>Volver al acceso</ActionLink></> : unusable ? <>
      <Notice title="Solicita un nuevo enlace">El enlace no está disponible, ya no puede utilizarse o fue retirado al salir de la página. Si ya enviaste una nueva contraseña, el cambio podría haberse aplicado: comprueba tu acceso antes de repetirlo. No se ha iniciado sesión automáticamente.</Notice>
      <ActionLink href="/recuperar-acceso" primary>Solicitar otro enlace</ActionLink>
    </> : <>
      {mutation.result && <ResultError result={mutation.result} />}
      {Object.keys(issues).length > 0 && <Notice title="Revisa los datos">{Object.values(issues).join(' ')}</Notice>}
      <form className="auth-form" onSubmit={submit} noValidate aria-busy={mutation.pending}>
        {!confirm ? <div className="auth-field"><Label htmlFor="recovery-email">Correo institucional (obligatorio)</Label>
          <Input ref={emailInput} id="recovery-email" type="email" name="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(issues.email)} aria-describedby="recovery-email-help" />
          <p id="recovery-email-help" className="text-sm">{issues.email ?? 'Utiliza el correo vigente de tu cuenta, terminado en .edu.co.'}</p></div> : <>
          <div className="auth-field"><Label htmlFor="new-password">Nueva contraseña (obligatoria)</Label>
            <Input ref={password} id="new-password" type="password" name="newPassword" autoComplete="new-password" required maxLength={128} aria-invalid={Boolean(issues.password)} aria-describedby="new-password-help" />
            <p id="new-password-help" className="text-sm">{issues.password ?? 'Entre 8 y 128 caracteres, con una mayúscula (A–Z), una minúscula (a–z) y un número.'}</p></div>
          <div className="auth-field"><Label htmlFor="confirm-password">Confirmar contraseña (obligatorio)</Label>
            <Input ref={confirmation} id="confirm-password" type="password" name="confirmation" autoComplete="new-password" required maxLength={128} aria-invalid={Boolean(issues.confirmation)} aria-describedby={issues.confirmation ? 'password-confirmation-error' : undefined} />
            {issues.confirmation && <p id="password-confirmation-error">{issues.confirmation}</p>}</div>
        </>}
        <Button type="submit" disabled={mutation.pending || uncertain}>{mutation.pending ? <LoaderCircle aria-hidden="true" /> : confirm ? <KeyRound aria-hidden="true" /> : <Mail aria-hidden="true" />}
          {mutation.pending ? 'Procesando…' : confirm ? 'Guardar nueva contraseña' : 'Solicitar instrucciones'}</Button>
        {mutation.pending && <p role="status">No vuelvas a enviar mientras se procesa este intento.</p>}
      </form>
      {uncertain && <ActionLink href={confirm ? '/acceso' : '/recuperar-acceso'}>{confirm ? 'Comprobar mi acceso sin repetir el cambio' : 'Iniciar una nueva solicitud explícita'}</ActionLink>}
    </>}
    {!success && <a className="staff-link" href="/acceso"><ArrowLeft className="mr-2 size-4" aria-hidden="true" />Volver al acceso</a>}
  </CardContent><CardFooter>El enlace se conserva solo durante esta visita y se retira al ocultar o abandonar la página.</CardFooter></Card>;
}
