# Dashboard y prioridad de entrega — aprobación del responsable

**Decisión posterior 2026-10-26:** el responsable retiró `/sesion`. El inicio
identifica el rol mediante la sesión confirmada y muestra directamente la interfaz
ADMIN/TEACHER. Se eliminan la ruta y los enlaces «Mi sesión»; identidad y cierre
permanecen en el espacio de trabajo. La mención siguiente registra el diseño anterior.

**2026-10-26.** El responsable pidió expresamente añadir el dashboard principal,
extensible por funcionalidades y diferenciado para ADMIN/TEACHER, manteniendo la
identidad existente y componentes shadcn. Indicó que el valor principal de esta
feature son las pantallas implementadas, funcionales y conectadas.

- `/` pasa a inicio autenticado con dashboard por rol; `/acceso` presenta login
  sin sesión y el mismo inicio tras identificar/comprobar sesión. `/sesion`
  conserva la consulta de acceso existente y enlaza al inicio.
- ADMIN: accesos reales a listado/gestión e invitación docente. TEACHER: identidad,
  estado de acceso y cierre, sin invitaciones/gestión ni módulos académicos de relleno.
  No se deducen nuevas facultades TEACHER de la palabra dashboard.
- Extensión mínima: descriptores de funcionalidades implementadas con roles,
  título, descripción y destino en `src/features/usuarios/dashboard.ts`; marco
  de navegación reutilizable en `Workspace.tsx`, sin otro router/store/framework.
- Esta aprobación amplía el dashboard excluido inicialmente, no habilita ascensos,
  canjes de invitación/correo, reactivación, auditoría visible o módulos académicos.
- Se continúa la implementación de las historias de pantallas sobre la base
  autenticada ya probada mientras se completa T018; no se marca esa validación
  ni T056 por tener pantallas compiladas. Las evidencias manuales siguen separadas.
- Fuentes técnicas: contratos frontend de esta feature y backend corregido
  `ff46f8a` + cambios locales en worktree `session-cookie-guarantees`, revisión
  identificada en `evidence/backend-restored.md`. Sin cambio de reglas/backend
  para satisfacer el dashboard.

Criterios observables: inicio por rol después de sesión comprobada; TEACHER no ve
opciones ADMIN ni provoca peticiones de cuentas por entrada directa; ADMIN recorre
inicio→listado→alta/detalle→edición/acciones; todas las opciones enlazan vistas reales.
La configuración de tarjetas no autoriza operaciones: el servidor conserva la decisión.
