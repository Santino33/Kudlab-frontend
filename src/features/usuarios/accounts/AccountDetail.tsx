import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle, Mail, UserMinus, ShieldMinus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { UsuariosApi } from '../api.ts';
import type { Account } from '../types.ts';
import { useMutation, useQuery } from '../hooks';
import { ActionLink, Delivery, formatDate, InlineHelp, Loading, Notice, ResultError, roleLabel, statusLabel } from '../shared';
import { navigate } from '../../../lib/navigation.ts';

type Action = 'reissue' | 'deactivate' | 'demote';
const actions = {
  reissue: { label: 'Reemitir invitación', title: '¿Reemitir la invitación?', description: 'El enlace anterior dejará de ser válido. La aceptación de invitaciones sigue bloqueada en esta versión.', icon: Mail },
  deactivate: { label: 'Inactivar cuenta', title: '¿Inactivar esta cuenta?', description: 'El profesor perderá el acceso y sus sesiones serán revocadas. Si es tu cuenta, también perderás tu acceso. No se borra el historial y esta interfaz no ofrece reactivación.', icon: UserMinus },
  demote: { label: 'Cambiar a docente', title: '¿Retirar el acceso administrativo?', description: 'La cuenta pasará a rol docente y no podrá gestionar ni invitar profesores. Si es tu cuenta, dejarás de ver la administración.', icon: ShieldMinus },
};

export function AccountDetail({ api, accountId, revalidate, locked = false }: { api: UsuariosApi; accountId: string; revalidate(): void; locked?: boolean }) {
  const query = useQuery((signal) => api.getAccount(accountId, signal), accountId);
  const [notice, setNotice] = useState(false);
  const [updated, setUpdated] = useState<Account>();
  const account = updated ?? (query.result?.kind === 'success' ? query.result.data : undefined);
  useEffect(() => { if (account && document.visibilityState !== 'hidden') document.getElementById('auth-title')?.focus(); }, [account?.id]);
  const review = () => { setUpdated(undefined); query.reload(); };
  return <div className="staff-stack">
    <a className="staff-link w-fit" href="/usuarios" onClick={navigate}><ArrowLeft className="mr-2 size-4" aria-hidden="true" />Volver a profesores</a>
    {!account && !query.result && <><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Detalle de cuenta</h1><Loading text="Consultando cuenta" /></>}
    {!account && query.result && query.result.kind !== 'success' && <><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Detalle de cuenta</h1><ResultError result={query.result} retry={review} /></>}
    {account && <>
      <header className="staff-heading"><div className="workspace-page-heading">
        <h1 id="auth-title" className="auth-heading" tabIndex={-1}>{account.name}</h1><p className="[overflow-wrap:anywhere]">{account.email}</p></div>
        <ActionLink href={`/usuarios/${encodeURIComponent(account.id)}/editar`} primary>Editar cuenta</ActionLink>
      </header>
      {notice && <Notice title="Operación confirmada" focus>Se muestran los datos devueltos por el servidor. Un envío aceptado no demuestra recepción del correo.</Notice>}
      <Card><CardHeader><h2 className="staff-section-title">Datos de la cuenta</h2></CardHeader><CardContent>
        <dl className="account-facts"><div><dt>Nombre</dt><dd>{account.name}</dd></div><div><dt>Correo vigente</dt><dd>{account.email}</dd></div>
          <div><dt>Rol</dt><dd>{roleLabel[account.role]}</dd></div><div><dt>Estado</dt><dd><span className="account-status">{statusLabel[account.status]}</span></dd></div>
          <div><dt>Creada</dt><dd>{formatDate(account.createdAt)}</dd></div>{account.pendingEmail && <div><dt>Correo pendiente de confirmación</dt><dd>{account.pendingEmail}</dd></div>}</dl>
        {account.pendingEmail && <InlineHelp>El correo pendiente todavía no reemplaza al vigente. Su confirmación está bloqueada en esta versión; no se dispone de un estado de entrega de esa verificación.</InlineHelp>}
      </CardContent></Card>
      {(account.status === 'PENDIENTE' || account.deliveryStatus || account.invitationExpiresAt) && <Card><CardHeader><h2 className="staff-section-title">Invitación y entrega</h2></CardHeader><CardContent>
        <Delivery account={account} /><InlineHelp>La aceptación pública de invitaciones no está habilitada. Una cuenta pendiente no puede iniciar sesión.</InlineHelp>
        {account.status === 'PENDIENTE' && <div className="staff-actions"><Confirmation locked={locked} action="reissue" account={account} api={api} review={review} onSuccess={(data) => { setUpdated(data); setNotice(true); }} /></div>}
      </CardContent></Card>}
      {account.status === 'ACTIVA' && <Card><CardHeader><h2 className="staff-section-title">Administrar acceso</h2><p>Estas acciones requieren confirmación y se validan en el servidor.</p></CardHeader><CardContent>
        <div className="staff-actions"><Confirmation locked={locked} action="deactivate" account={account} api={api} review={review} onSuccess={() => revalidate()} />
          {account.role === 'ADMIN' && <Confirmation locked={locked} action="demote" account={account} api={api} review={review} onSuccess={() => revalidate()} />}</div>
      </CardContent></Card>}
      {account.status === 'INACTIVA' && <InlineHelp>La cuenta está inactiva. La reactivación no forma parte de esta versión.</InlineHelp>}
    </>}
  </div>;
}

function Confirmation({ action, account, api, review, onSuccess, locked }: {
  action: Action; account: Account; api: UsuariosApi; review(): void; onSuccess(account: Account): void; locked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const mutation = useMutation<Account>();
  const copy = actions[action];
  const Icon = copy.icon;
  const blocked = Boolean(mutation.result);
  async function confirm() {
    if (locked || blocked || mutation.pending) return;
    const result = await mutation.run((signal) => action === 'reissue' ? api.reissueInvitation(account, signal) :
      action === 'deactivate' ? api.deactivateAccount(account.id, signal) : api.demoteAccount(account.id, signal));
    if (result?.kind === 'success') { setOpen(false); mutation.clear(); onSuccess(result.data); }
  }
  return <AlertDialog open={open} onOpenChange={(value) => { if (!mutation.pending) { setOpen(value); if (!value) mutation.clear(); } }}>
    <AlertDialogTrigger disabled={locked} render={<Button variant="outline" />}><Icon aria-hidden="true" />{copy.label}</AlertDialogTrigger>
    <AlertDialogContent initialFocus={cancel}><AlertDialogHeader><AlertDialogTitle>{copy.title}</AlertDialogTitle><AlertDialogDescription>{copy.description}</AlertDialogDescription></AlertDialogHeader>
      <p className="[overflow-wrap:anywhere]"><strong>{account.name}</strong><br />{account.email}</p>
      {mutation.result && <ResultError result={mutation.result} />}
      {mutation.pending && <p role="status">Procesando la operación. Espera a que termine; cerrar la página no la revierte.</p>}
      <AlertDialogFooter><AlertDialogCancel ref={cancel} disabled={mutation.pending}>Cancelar</AlertDialogCancel>
        {blocked ? <Button variant="outline" disabled={mutation.pending} onClick={() => { setOpen(false); mutation.clear(); review(); }}>Cerrar y consultar estado actual</Button> :
          <Button disabled={mutation.pending} onClick={confirm}>{mutation.pending ? <LoaderCircle aria-hidden="true" /> : <Icon aria-hidden="true" />}{mutation.pending ? 'Procesando…' : copy.label}</Button>}
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
