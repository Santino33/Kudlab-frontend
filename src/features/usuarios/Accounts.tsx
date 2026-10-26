import { useState } from 'react';
import { ArrowLeft, ArrowRight, UserPlus, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { UsuariosApi } from './api.ts';
import { accountStatuses } from './types.ts';
import type { AccountStatus } from './types.ts';
import type { Account } from './types.ts';
import { useQuery } from './hooks';
import { ActionLink, Loading, ResultError, roleLabel, statusLabel } from './shared';

const invitationLabel = (account: Account) => account.deliveryStatus === 'ENVIADA' ? 'Envío aceptado' : account.deliveryStatus === 'ERROR' ? 'Error de envío' : account.deliveryStatus === 'PENDIENTE' ? 'Envío pendiente' : 'Sin información de entrega';

export function Accounts({ api }: { api: UsuariosApi }) {
  const [status, setStatus] = useState<AccountStatus>();
  const [offset, setOffset] = useState(0);
  const query = useQuery((signal) => api.listAccounts(offset, status, signal), `${status ?? 'all'}:${offset}`);
  const page = query.result?.kind === 'success' ? query.result.data : undefined;
  return <div className="staff-stack">
    <header className="staff-heading"><div className="workspace-page-heading">
      <h1 id="auth-title" className="auth-heading" tabIndex={-1}>Usuarios del personal</h1><p>Consulta las cuentas de profesores y administra su acceso.</p></div>
      <ActionLink href="/usuarios/nueva" primary><UserPlus className="size-5" aria-hidden="true" />Invitar profesor</ActionLink>
    </header>
    <div className="accounts-toolbar"><div className="auth-field"><Label htmlFor="status-filter">Estado de la cuenta</Label>
      <select id="status-filter" className="staff-select" value={status ?? ''} onChange={(event) => { setStatus(event.target.value as AccountStatus || undefined); setOffset(0); }}>
        <option value="">Todos los estados</option>{accountStatuses.map((value) => <option key={value} value={value}>{statusLabel[value]}</option>)}
      </select></div>{page && <p className="accounts-total" role="status">{page.total} {page.total === 1 ? 'cuenta' : 'cuentas'}{status ? ` · ${statusLabel[status]}` : ' del personal'}</p>}</div>
    {!query.result && <Card><CardContent><Loading text="Consultando usuarios" /></CardContent></Card>}
    {query.result && query.result.kind !== 'success' && <ResultError result={query.result} retry={query.reload} />}
    {page && <>
      {page.items.length === 0 ? <Card><CardContent><Users className="size-8" aria-hidden="true" /><h2 className="staff-section-title">{status ? 'No hay cuentas con este estado' : 'Todavía no hay cuentas para mostrar'}</h2>
        <p>{status ? 'Prueba con otro estado o vuelve a mostrar todas las cuentas.' : 'Las cuentas confirmadas aparecerán en este listado.'}</p>
        {status && <Button variant="outline" onClick={() => { setStatus(undefined); setOffset(0); }}>Mostrar todos los estados</Button>}
      </CardContent></Card> : <><div className="staff-table-region accounts-table-view" role="region" aria-label="Listado de usuarios; desplazamiento horizontal disponible" tabIndex={0}>
        <Table><TableCaption className="px-4 pt-4">Cuentas del personal — {page.total} en este resultado</TableCaption><TableHeader><TableRow>
          <TableHead>Profesor</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead>Invitación</TableHead><TableHead>Cuenta</TableHead>
        </TableRow></TableHeader><TableBody>{page.items.map((account) => <TableRow key={account.id}>
          <TableCell><p className="font-semibold">{account.name}</p><p className="mt-1 text-sm">{account.email}</p></TableCell>
          <TableCell>{roleLabel[account.role]}</TableCell><TableCell><span className="account-status">{statusLabel[account.status]}</span></TableCell>
          <TableCell>{invitationLabel(account)}</TableCell>
          <TableCell><a className="staff-link" href={`/usuarios/${encodeURIComponent(account.id)}`} aria-label={`Ver cuenta de ${account.name}`}>Ver cuenta<ArrowRight className="ml-2 size-4" aria-hidden="true" /></a></TableCell>
        </TableRow>)}</TableBody></Table>
      </div><ul className="accounts-list-view" aria-label="Usuarios del personal">{page.items.map(account => <li key={account.id}>
        <h2 className="font-semibold">{account.name}</h2><p className="[overflow-wrap:anywhere]">{account.email}</p>
        <dl className="account-facts"><div><dt>Rol</dt><dd>{roleLabel[account.role]}</dd></div><div><dt>Estado</dt><dd>{statusLabel[account.status]}</dd></div>
          <div className="col-span-full"><dt>Invitación</dt><dd>{invitationLabel(account)}</dd></div></dl>
        <a className="staff-link w-fit" href={`/usuarios/${encodeURIComponent(account.id)}`} aria-label={`Ver cuenta de ${account.name}`}>Ver cuenta<ArrowRight className="ml-2 size-4" aria-hidden="true" /></a>
      </li>)}</ul></>}
      <nav aria-label="Paginación de usuarios" className="accounts-pagination"><p role="status">{page.total === 0 || page.items.length === 0 ? '0 cuentas en esta página' : `${offset + 1}–${offset + page.items.length} de ${page.total} cuentas`}</p>
        <div className="staff-actions"><Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}><ArrowLeft aria-hidden="true" />Anterior</Button>
          <Button variant="outline" disabled={offset + page.items.length >= page.total} onClick={() => setOffset(offset + 20)}>Siguiente<ArrowRight aria-hidden="true" /></Button></div>
      </nav>
    </>}
  </div>;
}
