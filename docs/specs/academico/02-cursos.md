# Spec frontend: Mis cursos y estudiantes del curso

**Actualización posterior:** [alta habilitada para Play en la vista de pruebas](03-estudiantes-play-pruebas.md). Las referencias inferiores a alta inactiva describen el contrato normal y la entrega original, no esa composición sintética autorizada.

**Fecha:** 2026-10-26 (ejecuciones UTC 2026-10-27). **Estado:** implementado y verificado localmente con API/PostgreSQL aislados; no despliegue ni aceptación de piloto.

## Feature frontend

Ampliación explícita del responsable posterior al PR de revisión UI. «Mis cursos» sustituye «Estudiantes» en sidebar e inicio. ADMIN organiza cursos y asigna profesores; TEACHER abre un curso propio y gestiona sus registros estudiantiles. Los estudiantes nunca son usuarios de esta interfaz. No se añaden dependencias, migraciones, activación/reactivación, consentimiento ni historial docente.

Tarjetas grandes con portada teal, inspiradas en cursos universitarios Moodle, manteniendo los colores principales. Datos y acciones accesibles sin hacer clicable toda la tarjeta. Reutiliza shadcn/Base UI y Lucide locales.

## Feature backend relacionada

Proveedor de esta entrega: worktree `/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes`, rama `feat/cursos-y-estudiantes`, base **c989fae** más cambios locales de esta feature. Frontend base **2a79f94**, misma rama. No atribuir estas rutas a `main` antes de integrar ambos cambios. La raíz canónica de referencia sigue resuelta en [INDEX](../../agent-context/INDEX.md).

Reglas canónicas: [contrato de Cursos](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/feature-specs/academico/02-cursos.md), [contrato 005 de estudiantes](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/specs/005-gestionar-estudiantes/contracts/students-api.md) y [OpenAPI](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/api/openapi.yaml). Las decisiones actuales provienen del responsable, no de RF de análisis/diseño/V3 intercambiados.

Capacidad **observada y ejecutada**, no solamente planificada: siete operaciones montadas bajo `/api/v1/groups`: listado, alta, detalle, edición, eliminación, profesores elegibles y estudiantes del curso. Autorización/validación/transferencia/borrado se delegan al contrato canónico. Las cinco rutas previas `/api/v1/students` conservan compatibilidad. ADMIN no obtiene acceso a registros estudiantiles.

## Archivos backend consultados

Todos en el worktree proveedor indicado; revisión estática y pruebas ejecutadas, no cambios en el checkout original:

- [Índice](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/agent-context/INDEX.md), [resumen académico](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/agent-context/modules/academico/module-summary.md), [registro](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/agent-context/modules/academico/features/registrar-estudiante.md), [consulta](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/agent-context/modules/academico/features/consultar-estudiantes.md), [edición/inactivación](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/agent-context/modules/academico/features/actualizar-inactivar-estudiante.md).
- [Constitución](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/.specify/memory/constitution.md), [decisiones](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/agent-context/decisions.md), [pendientes AC-01/02](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/agent-context/unresolved-issues.md), [arquitectura](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/docs/agent-context/architecture-summary.md).
- [Montaje src/app.ts](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/app.ts), [router de grupos](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/modules/academico/groups/groups.routes.ts), [servicio](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/modules/academico/groups/groups.service.ts), [validación](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/modules/academico/groups/groups.validation.ts).
- [Router estudiantil](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/modules/academico/students/students.routes.ts), [servicio](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/modules/academico/students/students.service.ts), [validación](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/modules/academico/students/students.validation.ts), [guardia académica](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/modules/academico/shared/academic-auth.ts), [ámbito](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/modules/academico/shared/scope-provider.ts), [errores](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/modules/academico/shared/academic.errors.ts).
- [Guardia de sesión](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/auth/session-guard.ts), [actividad de sesión](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/auth/session-activity.ts), [esquema académico](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/db/schema/academic.ts), [cuentas](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/src/db/schema/accounts.ts).
- [Pruebas de contrato Cursos](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/tests/contract/groups-api.test.ts), [cobertura OpenAPI](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/tests/contract/api-openapi.test.ts), [fixture sintética aislada](/home/santino/.local/share/opencode/worktree/backend-cursos-y-estudiantes/tests/courses-preview.seed.ts).

## Recorrido de UI

1. Entrada autenticada → sidebar/inicio «Mis cursos» → `/academico/cursos`. Carga, vacío y error son estados distintos. No se inventan cantidades de estudiantes en tarjetas.
2. ADMIN → Crear curso → formulario de una columna → guardado confirmado → ficha administrativa. Edición precarga detalle y profesores elegibles. Cancelar no escribe. Una transferencia abre confirmación con foco inicial en Cancelar y consecuencias explícitas; al confirmar se conserva el curso y se consulta su estado.
3. ADMIN → Eliminar curso → confirmación segura. El rechazo del servidor conserva el curso y ofrece revisar el listado. La ficha administrativa no muestra nombres/códigos/cantidad de estudiantes.
4. TEACHER → Abrir curso → listado obtenido por GET anidado, no por filtro local de todos sus estudiantes → ficha/edición/inactivación existentes. El nombre del curso sustituye los UUID y la navegación conserva su contexto.
5. Registrar estudiante desde el curso → tres campos mínimos existentes → POST con groupId del curso → ficha consultada de nuevo y anuncio de registro confirmado. No hay selector de otro grupo, cuenta, credenciales o activación. Validación y doble envío protegidos.
6. URLs de estudiantes anidadas bajo `/academico/cursos/:groupId/estudiantes/…`. Las rutas antiguas siguen operativas; su `/nuevo` dirige a seleccionar un curso. DTOs de detalle/listado y escrituras fuera del curso seleccionado se rechazan en el cliente, además de la autorización real del servidor.

## Estados y errores

- Carga/vacío/envío/éxito confirmado, validación inline y resumen enfocable; sin éxito optimista ni replay automático.
- 400 conserva entradas; 404 neutral para curso/registro no disponible; 409 explica conflicto sin revelar datos. En formulario de cursos se permite una nueva decisión explícita; no hay recarga automática de borradores ni control de versiones. Se advierte consultar el estado antes de reenviar.
- 401/403/indisponibilidad usan el controlador generacional existente y retiran contenido protegido; cancelar navegación no garantiza rollback.
- Avisos globales de escritura pendiente/incierta bloquean nuevas escrituras. Para resolver incertidumbre se consulta primero listado/ficha y se exige revisión explícita. No se conservan datos personales en ese aviso ni se promete persistencia tras recarga completa.
- El backend no ofrece revisión/ETag ni idempotencia; una edición concurrente puede sobrescribir campos modificados. Advertencia visible, no garantía de prevención de actualización perdida.

## Criterios de aceptación y evidencia

- [x] ADMIN CRUD, confirmación/cancelación de transferencia, prohibición de consultar estudiantes y rechazo de borrado con inactivos: API real y navegador.
- [x] TEACHER registra, consulta, edita e inactiva; recarga conserva estado. Dos docentes: el anterior pierde acceso por ID/listado y el nuevo consulta el mismo estudiante tras transferencia.
- [x] Rutas antiguas, autorización generacional, errores y dobles: regresiones Node y harness.
- [x] Responsive: 20 combinaciones reales de lista de cursos/listado/ficha/registro a 320/390/768/1024/1440px, sin desbordamiento general ni controles menores de 44px; revisión visual de capturas. Teclado/foco de confirmaciones comprobado.
- [ ] Lector de pantalla, zoom real 400%, BFCache real, aceptación docente, HTTPS/operación productiva y certificación WCAG: no acreditados.

| Comprobación | Resultado |
| --- | --- |
| `npm ci` frontend | Correcto; 0 vulnerabilidades informadas |
| `npm test` | Tipos correctos, no prueba funcional |
| `npm run test:auth`, `test:usuarios`, `test:tareas`, `test:estudiantes` | 66 + 72 + 11 + 26 = 175 pruebas correctas |
| `npm run build` | Correcto; sin nueva dependencia |
| Backend `npm run typecheck` + `npm test` con BD exclusiva | 247 pruebas / 40 archivos correctos; incluye cobertura de 35 operaciones OpenAPI |
| `students.check.mjs`, `usuarios-design.check.mjs` | Regresiones correctas: 20 y 30 combinaciones de viewport, teclado/diálogos, texto ampliado y sidebar |
| `recovery.check.mjs`, `ui-flow.check.mjs` | Correctos: 15 combinaciones de recuperación y 5 grupos de regresión; transporte ficticio |
| `courses.check.mjs` | 5 grupos SPA/API/PostgreSQL correctos en desarrollo; evidencias `/tmp/opencode/cursos-real` |
| Build servido con `npm run preview` | Mismos 5 grupos y 20 combinaciones reales correctos, SPA 5211/API 3027/PostgreSQL independiente; `/tmp/opencode/cursos-build` |
| Lint visual de fuentes | 0 FAIL / 0 WARN |

Prueba real requiere orígenes locales explícitos `KUDLAB_COURSES_ORIGIN`, `KUDLAB_COURSES_API` y driver CDP `KUDLAB_CDP_DRIVER`, ejecutando `node tests/browser/courses.check.mjs`. Prepara la fixture exclusiva `tests/courses-preview.seed.ts` del backend **solo** en BD desechable; modifica datos sintéticos durante el recorrido. No ejecutar contra escuela/BD compartida. Evidencia regenerable fuera de Git, no secretos del producto.

## Pendientes y confirmaciones

El responsable aprobó expresamente transferir acceso al cambiar profesor con estudiantes. La portada teal `#0F766E` con blanco aplica solo a cursos, no a colores semánticos ni acciones de marca. Se utilizó Ponytail full, UI/UX Pro Max (teclado/accesibilidad), MCP shadcn conectado (card/alert-dialog y ejemplos); se conservaron componentes locales Base UI y no se importó el ejemplo Radix. El lint de Taste no equivale a auditoría ni a adopción de su sistema visual.

La integración de ambas ramas es requisito de disponibilidad; los cambios locales y sus pruebas no demuestran merge/despliegue. `npm ci` backend informó 8 vulnerabilidades (7 moderadas, 1 alta); remediación de dependencias fuera de alcance. Consentimiento, retención e historia docente siguen pendientes según backend. Esta ampliación supera el bloqueo de registro de la [spec anterior](01-estudiantes.md), cuyos resultados históricos se conservan.
