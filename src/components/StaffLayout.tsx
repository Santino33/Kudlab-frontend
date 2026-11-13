import type { ReactNode } from 'react';

export function StaffLayout({ children, wide = false, publicView }: { children: ReactNode; wide?: boolean; publicView?: 'access' | 'recovery' }) {
  return <div className={wide ? 'auth-page workspace-page' : `auth-page${publicView ? ` auth-page--${publicView}` : ''}`}>
    {!wide && !publicView && <header className="auth-header">
      <div className="auth-header-inner">
        <p className="auth-brand">Kudlab</p>
        <p className="auth-caption">Acceso del profesorado</p>
      </div>
    </header>}
    <main id="contenido" className={wide ? 'staff-main' : 'auth-main'}>{children}</main>
    {!wide && <footer className="auth-footer">Kudlab · Apoyo al seguimiento pedagógico</footer>}
  </div>;
}
