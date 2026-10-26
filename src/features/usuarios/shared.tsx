import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import type { HttpResult, Account } from './types.ts';

export function ActionLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return <a href={href} className={`${buttonVariants({ variant: primary ? 'default' : 'outline' })} no-underline`}>{children}</a>;
}
export function Notice({ title, children, focus = false, focusKey }: { title: string; children?: ReactNode; focus?: boolean; focusKey?: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focus) ref.current?.focus(); }, [title, focus, focusKey]);
  return <Alert ref={ref} tabIndex={-1}><CircleAlert aria-hidden="true" /><div className="min-w-0">
    <p className="font-semibold">{title}</p>{children && <div className="mt-2 [overflow-wrap:anywhere]">{children}</div>}
  </div></Alert>;
}
export function ResultError({ result, retry }: { result: HttpResult<unknown>; retry?: () => void }) {
  const uncertain = 'uncertain' in result && result.uncertain;
  const code = result.kind === 'error' ? result.code : undefined;
  const title = uncertain ? 'No pudimos confirmar la operación' : code === 'LAST_ADMIN' ? 'Debe quedar un administrador activo' :
    result.kind === 'error' && result.status === 404 ? 'Cuenta no encontrada' :
    result.kind === 'error' && result.status === 409 ? 'Los datos entraron en conflicto' :
    result.kind === 'error' && result.status === 400 ? 'Revisa los datos del formulario' : 'No pudimos completar la consulta';
  return <Notice title={title} focus focusKey={result}>
    <p>{uncertain ? 'Es posible que se haya aplicado algún cambio. Revisa el estado actual antes de volver a enviarlo; no se repetirá automáticamente.' :
      code === 'LAST_ADMIN' ? 'Esta acción no se puede realizar sobre el último administrador activo.' :
      result.kind === 'error' && result.status === 409 ? 'Consulta el estado actual antes de intentar otra acción. No se sobrescribirán datos automáticamente.' : 'No se mostrará información que no haya podido comprobarse.'}</p>
    {retry && <Button variant="outline" className="mt-4" onClick={retry}>Consultar estado actual</Button>}
  </Notice>;
}
export function Loading({ text = 'Cargando información' }: { text?: string }) {
  return <p className="flex items-center gap-3" role="status"><LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />{text}…</p>;
}
export const statusLabel = { PENDIENTE: 'Pendiente', ACTIVA: 'Activa', INACTIVA: 'Inactiva' };
export const roleLabel = { ADMIN: 'Administrador', TEACHER: 'Docente' };
export function Delivery({ account }: { account: Account }) {
  const labels = { PENDIENTE: 'Envío pendiente', ENVIADA: 'Envío aceptado por el proveedor', ERROR: 'Error de envío' };
  return <div className="staff-stack">
    <p>{account.deliveryStatus ? labels[account.deliveryStatus] : 'Estado de entrega no disponible.'}</p>
    {account.invitationExpiresAt && <p>Vencimiento de la invitación: {formatDate(account.invitationExpiresAt)}.</p>}
    <p className="text-sm">El envío aceptado no demuestra recepción ni lectura del correo. Tampoco activa la cuenta.</p>
  </div>;
}
export const formatDate = (date: string) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));
export function InlineHelp({ children }: { children: ReactNode }) {
  return <Alert role="status"><CircleAlert aria-hidden="true" /><AlertDescription>{children}</AlertDescription></Alert>;
}
