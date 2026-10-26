import type { Identity } from '../../auth/state.ts';

// Add only implemented capabilities here; the server remains the permission authority.
const features: { title: string; description: string; href: string; roles: Identity['role'][] }[] = [
  { title: 'Usuarios del personal', description: 'Consulta las cuentas de profesores y administra sus datos y acceso.', href: '/usuarios', roles: ['ADMIN'] },
  { title: 'Invitar profesor', description: 'Crea una cuenta docente pendiente y consulta el estado de su invitación.', href: '/usuarios/nueva', roles: ['ADMIN'] },
];
export const dashboardFeatures = (role: Identity['role']) => features.filter((feature) => feature.roles.includes(role));
