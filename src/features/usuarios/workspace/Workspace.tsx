import type { ReactNode } from 'react';
import { ArrowRight, ChartNoAxesCombined, Database, Home, LogOut, Users, UserPlus, BookOpen, UserRound } from 'lucide-react';
import { navigate } from '../../../lib/navigation.ts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarProvider, SidebarTrigger, SidebarInset, SidebarHeader, SidebarFooter, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import type { Identity } from '../../../auth/state.ts';
import { dashboardFeatures } from './dashboard.ts';
import { ActionLink, roleLabel } from '../shared';
import type { WorkspaceNavigation } from '../navigation.ts';
import logo from '@/assets/kudlab-logo-oscuro.png';
import { AccountMenu } from './AccountMenu';
import './account.css';

export function Workspace({ user, navigation, signOut, children }: {
  user: Identity; navigation: WorkspaceNavigation; signOut(): void; children: ReactNode;
}) {
  const { section, breadcrumbs } = navigation;
  return <SidebarProvider>
    <a className="workspace-skip" href="#workspace-content">Saltar al contenido</a>
      <Sidebar aria-label="Espacio de trabajo">
        <SidebarHeader>
          <div><a href="/" onClick={navigate} className="auth-brand workspace-brand" aria-label="Kudlab · Inicio"><img src={logo} alt="" width={2400} height={1200} className="workspace-brand-image" /></a><p className="text-sm text-muted">Espacio de profesores</p></div>
        </SidebarHeader>
        <SidebarContent><SidebarGroup>
          <nav aria-label="Navegación principal"><SidebarMenu>
            <SidebarMenuItem><SidebarMenuButton isActive={section === 'home'} render={<a href="/" onClick={navigate} aria-current={section === 'home' ? 'page' : undefined} />}><Home aria-hidden="true" />Inicio</SidebarMenuButton></SidebarMenuItem>
            {user.role === 'ADMIN' && <>
              <SidebarMenuItem><SidebarMenuButton isActive={section === 'accounts'} render={<a href="/usuarios" onClick={navigate} aria-current={section === 'accounts' ? 'page' : undefined} />}><Users aria-hidden="true" />Profesores</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton isActive={section === 'invite'} render={<a href="/usuarios/nueva" onClick={navigate} aria-current={section === 'invite' ? 'page' : undefined} />}><UserPlus aria-hidden="true" />Invitar profesor</SidebarMenuButton></SidebarMenuItem>
            </>}
            <SidebarMenuItem><SidebarMenuButton isActive={section === 'groups'} render={<a href="/academico/cursos" onClick={navigate} aria-current={section === 'groups' ? 'page' : undefined} />}><BookOpen aria-hidden="true" />Mis cursos</SidebarMenuButton></SidebarMenuItem>
            <SidebarMenuItem><SidebarMenuButton isActive={section === 'tasks'} render={<a href="/tareas" onClick={navigate} aria-current={section === 'tasks' ? 'page' : undefined} />}><Database aria-hidden="true" />Tareas digitales</SidebarMenuButton></SidebarMenuItem>
            {user.role === 'TEACHER' && <SidebarMenuItem><SidebarMenuButton isActive={section === 'indicators'} render={<a href="/indicadores" onClick={navigate} aria-current={section === 'indicators' ? 'page' : undefined} />}><ChartNoAxesCombined aria-hidden="true" />Indicadores</SidebarMenuButton></SidebarMenuItem>}
          </SidebarMenu></nav>
        </SidebarGroup></SidebarContent>
          <SidebarFooter>
            <div className="workspace-person"><p className="font-semibold [overflow-wrap:anywhere]">{user.name}</p><p className="text-sm">{roleLabel[user.role]}</p></div>
            <Button variant="outline" onClick={signOut}><LogOut aria-hidden="true" />Cerrar sesión</Button>
          </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="workspace-toolbar workspace-toolbar-account"><SidebarTrigger id="workspace-menu-toggle" />
          <nav aria-label="Ubicación" className="workspace-location"><ol>{breadcrumbs.map((crumb, index) => <li key={`${index}:${crumb.label}`}>
            {index > 0 && <span aria-hidden="true" className="workspace-location-separator">/</span>}
            {crumb.href ? <a href={crumb.href} onClick={navigate}>{crumb.label}</a> : <span aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>}
          </li>)}</ol></nav>
          <span className="workspace-scope">Espacio docente</span><AccountMenu signOut={signOut} /></header>
      <div id="workspace-content" className="workspace-content" tabIndex={-1}>{children}</div>
        <footer className="workspace-footer"><div className="workspace-footer-inner">Kudlab · Apoyo al seguimiento pedagógico</div></footer>
      </SidebarInset>
  </SidebarProvider>;
}

export function Dashboard({ user }: { user: Identity }) {
  const features = dashboardFeatures(user.role);
  return <div className="dashboard">
    <header className="workspace-page-heading">
      <h1 id="auth-title" className="auth-heading" tabIndex={-1}>Hola, {user.name}</h1>
      <p>{user.role === 'ADMIN' ? 'Organiza tus cursos, gestiona el acceso del equipo y consulta las tareas digitales.' : 'Abre uno de tus cursos para gestionar a sus estudiantes o explora las tareas digitales.'}</p>
    </header>
    <div className={features.length ? 'dashboard-columns' : 'dashboard-personal'}>
      {features.length > 0 && <section aria-labelledby="dashboard-actions" className="dashboard-tasks">
        <h2 id="dashboard-actions" className="staff-section-title">{user.role === 'ADMIN' ? 'Tu equipo y tus recursos' : '¿Con qué quieres trabajar?'}</h2>
        <div className="dashboard-features">{features.map((feature) => <div className="dashboard-task" key={feature.href}>
          <div><h3 className="font-semibold">{feature.title}</h3><p>{feature.description}</p></div>
          <ActionLink href={feature.href} primary={feature === features[0]}>{feature.action}<ArrowRight className="size-5" aria-hidden="true" /></ActionLink>
        </div>)}</div>
        {user.role === 'ADMIN' && <p className="dashboard-note">Las cuentas nuevas quedan pendientes: la activación por invitación aún no está disponible.</p>}
      </section>}
      <Card className="dashboard-account" aria-labelledby="dashboard-account-title"><CardHeader><h2 id="dashboard-account-title" className="staff-section-title">Tu cuenta</h2><UserRound className="dashboard-account-icon" aria-hidden="true" /></CardHeader>
        <CardContent><dl className="account-facts"><div><dt>Nombre</dt><dd>{user.name}</dd></div><div><dt>Correo</dt><dd>{user.email}</dd></div><div><dt>Rol</dt><dd>{roleLabel[user.role]}</dd></div></dl>
        </CardContent></Card>
    </div>
  </div>;
}
