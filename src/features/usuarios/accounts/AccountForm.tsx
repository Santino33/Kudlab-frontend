import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, Save, UserPlus } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { UsuariosApi } from '../api.ts';
import { accountIssues, editFields } from '../types.ts';
import type { Account } from '../types.ts';
import { useMutation, useQuery } from '../hooks';
import { ActionLink, Delivery, InlineHelp, Loading, Notice, ResultError } from '../shared';
import { navigate } from '../../../lib/navigation.ts';

export function AccountForm({ api, accountId, locked = false }: { api: UsuariosApi; accountId?: string; locked?: boolean }) {
  const query = useQuery<Account | undefined>((signal) => accountId ? api.getAccount(accountId, signal) : Promise.resolve({ kind: 'success' as const, data: undefined }), accountId ?? 'new', true);
  if (accountId && !query.result) return <div className="staff-stack"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Editar cuenta</h1><Loading text="Consultando cuenta" /></div>;
  if (accountId && query.result?.kind !== 'success') return <div className="staff-stack"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>Editar cuenta</h1><ResultError result={query.result!} retry={query.reload} /></div>;
  return <Editor api={api} account={query.result?.kind === 'success' ? query.result.data : undefined} review={query.reload} refreshing={Boolean(accountId) && query.fetching} locked={locked} />;
}

function Editor({ api, account, review, refreshing, locked }: { api: UsuariosApi; account?: Account; review(): void; refreshing: boolean; locked: boolean }) {
  const [name, setName] = useState(account?.name ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [issues, setIssues] = useState<{ name?: string; email?: string; form?: string }>({});
  const mutation = useMutation<Account>();
  const nameInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const editing = Boolean(account);
  useEffect(() => { if (document.visibilityState !== 'hidden') document.getElementById('auth-title')?.focus(); }, [account?.id]);
  useEffect(() => { if (mutation.result?.kind === 'success') document.getElementById('auth-title')?.focus(); }, [mutation.result]);
  const nameIssue = issues.name ?? (mutation.result?.kind === 'error' ? mutation.result.fields?.find((field) => field.field === 'name')?.reason : undefined);
  const emailIssue = issues.email ?? (mutation.result?.kind === 'error' ? mutation.result.fields?.find((field) => field.field === 'email')?.reason : undefined);
  const back = account ? `/usuarios/${encodeURIComponent(account.id)}` : '/usuarios';
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked || refreshing || mutation.pending || (mutation.result && 'uncertain' in mutation.result && mutation.result.uncertain) ||
      (mutation.result?.kind === 'error' && mutation.result.status === 409)) return;
    const invalid = accountIssues(name, email);
    const changes = account ? editFields(account, name, email) : undefined;
    setIssues({ ...invalid, ...(changes && Object.keys(changes).length === 0 ? { form: 'Modifica al menos un dato antes de guardar.' } : {}) });
    if (invalid.name) { nameInput.current?.focus(); return; }
    if (invalid.email) { emailInput.current?.focus(); return; }
    if (changes && Object.keys(changes).length === 0) return;
    await mutation.run((signal) => account ? api.updateAccount(account.id, changes!, signal) : api.createAccount({ name, email }, signal));
  }
  if (mutation.result?.kind === 'success') {
    const saved = mutation.result.data;
    return <div className="staff-stack"><header className="workspace-page-heading"><h1 id="auth-title" className="auth-heading" tabIndex={-1}>{editing ? 'Cambios guardados' : 'Cuenta creada'}</h1><p>{editing ? 'Los datos de la cuenta se han actualizado.' : 'La cuenta docente se ha creado y queda pendiente de activación.'}</p></header>
      <Card className="staff-form"><CardHeader><h2 className="staff-section-title">{saved.name}</h2><p className="[overflow-wrap:anywhere]">{saved.email}</p></CardHeader><CardContent>
        {(saved.status === 'PENDIENTE' || saved.pendingEmail) && <Notice title={saved.status === 'PENDIENTE' ? 'La cuenta está pendiente de activación' : 'El nuevo correo sigue pendiente'}><p>{saved.status === 'PENDIENTE' ? 'La activación por invitación aún no está disponible. Este profesor todavía no puede iniciar sesión.' : 'La confirmación de cambio de correo aún no está disponible. El profesor debe seguir usando su correo vigente.'}</p></Notice>}
        {saved.pendingEmail && <p>Correo pendiente de confirmación: <strong>{saved.pendingEmail}</strong>. El correo vigente no ha cambiado.</p>}
        {saved.status === 'PENDIENTE' && <Delivery account={saved} />}
        <div className="staff-actions"><ActionLink href={`/usuarios/${encodeURIComponent(saved.id)}`} primary>Ver cuenta</ActionLink><ActionLink href="/usuarios">Volver a profesores</ActionLink></div>
      </CardContent></Card></div>;
  }
  const blocked = mutation.result?.kind === 'error' && mutation.result.status === 409 || Boolean(mutation.result && 'uncertain' in mutation.result && mutation.result.uncertain);
  return <div className="staff-stack">
    <a className="staff-link w-fit" href={back} onClick={navigate}><ArrowLeft className="mr-2 size-4" aria-hidden="true" />{editing ? 'Volver a la cuenta' : 'Volver a profesores'}</a>
    <Card className="staff-form"><CardHeader>
      <h1 id="auth-title" className="auth-heading" tabIndex={-1}>{editing ? 'Editar cuenta' : 'Invitar profesor'}</h1>
      <p>{editing ? 'Actualiza el nombre o solicita un cambio de correo.' : 'Crea una cuenta docente pendiente. No se asigna una contraseña desde aquí.'}</p>
    </CardHeader><CardContent>
      <InlineHelp>{!editing ? 'La activación por invitación aún no está disponible. La cuenta se creará pendiente.' : account?.status === 'PENDIENTE' ?
        'El cambio de correo reemite la invitación. Su aceptación aún no está disponible.' :
        'La confirmación del nuevo correo aún no está disponible. El cambio no se completa desde aquí.'}</InlineHelp>
      {account && <div><p className="font-semibold">Correo vigente</p><p className="[overflow-wrap:anywhere]">{account.email}</p>{account.pendingEmail && <p className="mt-2 [overflow-wrap:anywhere]">Pendiente de confirmación: {account.pendingEmail}</p>}</div>}
      {mutation.result && <ResultError result={mutation.result} retry={editing ? () => { review(); mutation.clear(); } : undefined} />}
      {refreshing && <Loading text="Revisando el estado actual; tu borrador no se sobrescribirá" />}
      {blocked && !editing && <ActionLink href="/usuarios">Revisar el listado antes de volver a invitar</ActionLink>}
      {Object.keys(issues).length > 0 && <Notice title="Revisa los datos">{Object.values(issues).join(' ')}</Notice>}
      <form className="auth-form" noValidate onSubmit={submit} aria-busy={mutation.pending}>
        <div className="auth-field"><Label htmlFor="account-name">Nombre completo</Label>
          <Input ref={nameInput} id="account-name" name="name" autoComplete="name" required maxLength={200} disabled={mutation.pending || blocked || refreshing || locked} value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(nameIssue)} aria-describedby="account-name-help" />
          <p id="account-name-help" className="text-sm">{nameIssue ?? 'Máximo 200 caracteres.'}</p></div>
        <div className="auth-field"><Label htmlFor="account-email">{editing ? 'Correo' : 'Correo institucional'}</Label>
          <Input ref={emailInput} id="account-email" name="email" type="email" autoComplete="email" required disabled={mutation.pending || blocked || refreshing || locked} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(emailIssue)} aria-describedby="account-email-help" />
          <p id="account-email-help" className="text-sm">{emailIssue ?? 'Debe terminar en .edu.co. El cambio de correo puede requerir confirmación.'}</p></div>
        {!editing && <p>Rol inicial: <strong>Docente (TEACHER)</strong></p>}
        <div className="staff-actions"><Button type="submit" disabled={mutation.pending || blocked || refreshing || locked}>{mutation.pending ? <LoaderCircle aria-hidden="true" /> : editing ? <Save aria-hidden="true" /> : <UserPlus aria-hidden="true" />}
          {mutation.pending ? 'Procesando…' : editing ? 'Guardar cambios' : 'Invitar profesor'}</Button><ActionLink href={back}>Cancelar</ActionLink></div>
        {mutation.pending && <p role="status">Espera a que termine este intento. Salir no revierte una operación que ya haya llegado al servidor.</p>}
      </form>
    </CardContent><CardFooter>Los permisos, la disponibilidad del correo y las reglas de la cuenta se verifican en el servidor.</CardFooter></Card>
  </div>;
}
