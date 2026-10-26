import type { ReactNode } from 'react';

export function StaffLayout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={wide ? 'auth-page workspace-page' : 'auth-page'}>
    {!wide && <header className="auth-header">
      <div className="auth-header-inner">
        <p className="auth-brand">Kudlab</p>
        <p className="auth-eyebrow">Acceso del personal</p>
      </div>
    </header>}
    <main id="contenido" className={wide ? 'staff-main' : 'auth-main'}>{children}</main>
    <footer className="auth-footer">Kudlab · Apoyo al seguimiento pedagógico</footer>
  </div>;
}
