import type { ReactNode } from 'react';
import { ArrowRight, Home, LogOut, ShieldCheck, Users, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Identity } from '../../auth/state.ts';
import { dashboardFeatures } from './dashboard.ts';
import { ActionLink, roleLabel } from './shared';

export function Workspace({ user, section, signOut, children }: {
  user: Identity; section: 'home' | 'accounts' | 'session'; signOut(): void; children: ReactNode;
}) {
  return <>
    <a className="workspace-skip" href="#workspace-content">Saltar al contenido</a>
    <div className="workspace-grid">
      <aside className="workspace-sidebar" aria-label="Espacio de trabajo">
        <div className="workspace-person"><span className="workspace-initial" aria-hidden="true">{user.name.charAt(0)}</span>
          <div className="min-w-0"><p className="font-semibold [overflow-wrap:anywhere]">{user.name}</p><p className="text-sm">{roleLabel[user.role]}</p></div>
        </div>
        <nav aria-label="Navegación principal" className="workspace-nav">
          <a href="/" aria-current={section === 'home' ? 'page' : undefined}><Home aria-hidden="true" />Inicio</a>
          {user.role === 'ADMIN' && <a href="/usuarios" aria-current={section === 'accounts' ? 'page' : undefined}><Users aria-hidden="true" />Usuarios</a>}
          <a href="/sesion" aria-current={section === 'session' ? 'page' : undefined}><ShieldCheck aria-hidden="true" />Mi sesión</a>
        </nav>
        <div className="workspace-sidebar-footer"><p className="text-sm">Acceso exclusivo para profesores.</p>
          <Button variant="outline" onClick={signOut}><LogOut aria-hidden="true" />Cerrar sesión</Button>
        </div>
      </aside>
      <div id="workspace-content" className="workspace-content" tabIndex={-1}>{children}</div>
    </div>
  </>;
}

export function Dashboard({ user }: { user: Identity }) {
  const features = dashboardFeatures(user.role);
  return <div className="staff-stack">
    <header className="workspace-page-heading">
      <p className="auth-eyebrow">{user.role === 'ADMIN' ? 'Administración del personal' : 'Espacio docente'}</p>
      <h1 id="auth-title" className="auth-heading" tabIndex={-1}>Hola, {user.name}</h1>
      <p>{user.role === 'ADMIN' ? 'Gestiona las cuentas del equipo desde un mismo lugar.' : 'Este es tu espacio de acceso a Kudlab.'}</p>
    </header>
    {features.length > 0 && <section aria-labelledby="dashboard-actions">
      <h2 id="dashboard-actions" className="staff-section-title mb-4">¿Qué necesitas hacer?</h2>
      <div className="dashboard-features">{features.map((feature) => <Card key={feature.href}>
        <CardHeader><span className="dashboard-feature-icon" aria-hidden="true">{feature.href === '/usuarios' ? <Users /> : <UserPlus />}</span>
          <h3 className="staff-section-title">{feature.title}</h3><p>{feature.description}</p></CardHeader>
        <CardContent><ActionLink href={feature.href} primary={feature.href === '/usuarios'}>Abrir <ArrowRight className="size-5" aria-hidden="true" /></ActionLink></CardContent>
      </Card>)}</div>
    </section>}
    <Card><CardHeader><h2 className="staff-section-title">Tu acceso</h2><p>Sesión confirmada con los permisos actuales de tu cuenta.</p></CardHeader>
      <CardContent><dl className="account-facts"><div><dt>Correo</dt><dd>{user.email}</dd></div><div><dt>Rol</dt><dd>{roleLabel[user.role]}</dd></div></dl>
        <p>{user.role === 'TEACHER' ? 'La invitación y administración de profesores corresponden a un administrador. Tu espacio no muestra esas operaciones.' :
          'Las cuentas nuevas se crean con rol docente. La invitación no habilita automáticamente su acceso.'}</p>
      </CardContent></Card>
  </div>;
}
