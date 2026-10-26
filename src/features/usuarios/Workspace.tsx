import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Home, LogOut, Menu, X, Users, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Identity } from '../../auth/state.ts';
import { dashboardFeatures } from './dashboard.ts';
import { ActionLink, roleLabel } from './shared';

export function Workspace({ user, section, signOut, children }: {
  user: Identity; section: 'home' | 'accounts' | 'invite'; signOut(): void; children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <>
    <a className="workspace-skip" href="#workspace-content">Saltar al contenido</a>
    <div className="workspace-grid">
      <aside className="workspace-sidebar" aria-label="Espacio de trabajo" onKeyDown={(event) => {
        if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); document.getElementById('workspace-menu-toggle')?.focus(); }
      }}>
        <div className="workspace-brand-row">
          <div><a href="/" className="auth-brand workspace-brand">Kudlab</a><p className="text-sm">Espacio de profesores</p></div>
          <Button id="workspace-menu-toggle" className="workspace-menu-toggle" variant="outline" aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}Menú
          </Button>
        </div>
        <div id="workspace-navigation" className="workspace-navigation" data-open={menuOpen}>
          <nav aria-label="Navegación principal" className="workspace-nav">
            <a href="/" aria-current={section === 'home' ? 'page' : undefined}><Home aria-hidden="true" />Inicio</a>
            {user.role === 'ADMIN' && <>
              <a href="/usuarios" aria-current={section === 'accounts' ? 'page' : undefined}><Users aria-hidden="true" />Usuarios</a>
              <a href="/usuarios/nueva" aria-current={section === 'invite' ? 'page' : undefined}><UserPlus aria-hidden="true" />Invitar profesor</a>
            </>}
          </nav>
          <div className="workspace-sidebar-footer">
            <div className="workspace-person"><p className="font-semibold [overflow-wrap:anywhere]">{user.name}</p><p className="text-sm">{roleLabel[user.role]}</p></div>
            <Button variant="outline" onClick={signOut}><LogOut aria-hidden="true" />Cerrar sesión</Button>
          </div>
        </div>
      </aside>
      <div id="workspace-content" className="workspace-content" tabIndex={-1}>{children}</div>
    </div>
  </>;
}

export function Dashboard({ user }: { user: Identity }) {
  const features = dashboardFeatures(user.role);
  return <div className="dashboard">
    <header className="workspace-page-heading">
      <h1 id="auth-title" className="auth-heading" tabIndex={-1}>Hola, {user.name}</h1>
      <p>{user.role === 'ADMIN' ? 'Tu equipo docente, en un mismo lugar.' : 'Tu espacio de trabajo en Kudlab.'}</p>
    </header>
    <div className={features.length ? 'dashboard-columns' : 'dashboard-personal'}>
      {features.length > 0 && <section aria-labelledby="dashboard-actions" className="dashboard-tasks">
        <h2 id="dashboard-actions" className="staff-section-title">Gestionar el equipo</h2>
        <div className="dashboard-features">{features.map((feature) => <div className="dashboard-task" key={feature.href}>
          <div><h3 className="font-semibold">{feature.title}</h3><p>{feature.description}</p></div>
          <ActionLink href={feature.href} primary={feature.href === '/usuarios'}>{feature.action}<ArrowRight className="size-5" aria-hidden="true" /></ActionLink>
        </div>)}</div>
        <p className="dashboard-note">Las cuentas nuevas se crean como docentes. Su activación por invitación aún no está disponible.</p>
      </section>}
      <Card className="dashboard-account"><CardHeader><h2 className="staff-section-title">Tu cuenta</h2></CardHeader>
        <CardContent><dl className="account-facts"><div><dt>Nombre</dt><dd>{user.name}</dd></div><div><dt>Correo</dt><dd>{user.email}</dd></div><div><dt>Rol</dt><dd>{roleLabel[user.role]}</dd></div></dl>
          <p className="text-sm">Acceso verificado. Las opciones disponibles corresponden a los permisos actuales de tu cuenta.</p>
        </CardContent></Card>
    </div>
  </div>;
}
