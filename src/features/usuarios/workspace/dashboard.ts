import type { Identity } from '../../../auth/state.ts';

// Add only implemented capabilities here; the server remains the permission authority.
const features: { title: string; description: string; action: string; href: string; roles: Identity['role'][] }[] = [
  { title: 'Usuarios del personal', description: 'Consulta las cuentas del equipo, actualiza sus datos y administra su acceso.', action: 'Ver usuarios', href: '/usuarios', roles: ['ADMIN'] },
  { title: 'Invitar profesor', description: 'Envía una invitación con rol docente y consulta su estado de entrega.', action: 'Invitar profesor', href: '/usuarios/nueva', roles: ['ADMIN'] },
  { title: 'Estudiantes', description: 'Consulta los registros de tus grupos, actualiza sus datos y revisa su estado.', action: 'Ver estudiantes', href: '/academico/estudiantes', roles: ['TEACHER'] },
  { title: 'Tareas digitales', description: 'Revisa la finalidad pedagógica de los juegos y su disponibilidad. La asignación aún no está disponible.', action: 'Explorar tareas', href: '/tareas', roles: ['ADMIN', 'TEACHER'] },
];
export const dashboardFeatures = (role: Identity['role']) => features.filter((feature) => feature.roles.includes(role));
