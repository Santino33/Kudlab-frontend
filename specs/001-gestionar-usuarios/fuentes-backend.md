# Fuentes y evidencia: Usuarios frontend

**Revisión histórica:** este archivo conserva la evidencia `cd3c2b4` obtenida al especificar. Para el estado vigente de planificación consultar [revalidacion-plan.md](revalidacion-plan.md), backend `ff46f8a`: ahora hay catálogo OpenAPI implementado y montaje de documentación/estudiantes, sin ampliar alcance frontend. No interpretar las afirmaciones históricas de ausencia como estado actual.

**Consulta:** 2026-10-25. **Frontend base:** `f0612594ea6f4dff7824cf8a42642947aef7c054`. **Backend:** `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`, commit `cd3c2b485d5b3649310ba1807aac90f0f818d174`.

Revisión estática de archivos, no prueba de API desplegada. No se arrancó backend, no se ejecutaron sus pruebas ni se verificaron base de datos o SMTP. No se modificó ese repositorio.

## Versiones locales y autoridad

El checkout backend tenía `docs/agent-context/modules/usuarios/module-summary.md` modificado y tres descripciones sin seguimiento: `acceso-estudiante.md`, `correo-smtp.md`, `documentacion-api-swagger.md`. Se leyeron sus versiones locales; no se atribuyen íntegramente al commit. También había cambios ajenos en `.opencode/commands/speckit.specify.md` y `.opencode/opencode.json`; no se leyeron ni modificaron.

- **Confirmado por responsable según fuentes:** decisiones de cuentas en Assumptions de 001; recuperación/actividad confirmadas el 2026-10-13 en 003. La exclusividad para profesores procede de AGENTS.md frontend y prevalece sobre contexto antiguo.
- **Observado en código:** rutas montadas y comportamiento resumido más abajo. Existencia no demuestra operación piloto.
- **Propuesto:** descripciones V3 RF-001–004, spec 002 aún borrador, etiquetas de contratos 001–003, candidatos UI, SMTP operativo y Swagger. Refactor 004 conserva interfaces, no suma capacidades.
- **Decisiones frontend confirmadas el 2026-10-25:** Q1-A difiere ascensos, auditoría visible y reactivación; Q2-A bloquea entrada/canjes de invitación y cambio de correo hasta acordar enlaces distinguibles; Q3-A limita TEACHER a estado de acceso/cierre, manteniendo recuperación desde entrada sin sesión. Confirmación textual del responsable: «Q1: A, Q2: A, Q3: A».
- **Pendiente:** contrato de enlaces distinguibles para desbloquear activación/confirmación, transporte/despliegue, entrega real y validación institucional de reactivación si se retoma. No se importan permisos académicos desde un helper sin consumidores montados. La evidencia de rutas de US7/US8/reactivación se conserva, pero no autoriza UI de esas capacidades diferidas.
- **Fuentes originales indirectas:** análisis A, diseño D y hoja V3 se conocen aquí por el contexto y specs consultados; no se releyeron sus PDF/XLSX. No se afirma aprobación ni equivalencia entre sus RF homónimos.

## Capacidad observada por recorrido

| Recorrido | Montaje e interfaz observados | Autorización y límites |
| --- | --- | --- |
| US1 | POST `/api/auth/sign-in/email`, GET `/api/auth/get-session`, POST `/api/auth/sign-out` | Lista blanca; cuenta/identidad coherentes y actividad de sesión persistida. Login devuelve identidad, no ID de cuenta de negocio. Consulta sesión no registra actividad protegida. JWT aislado no pasa guardia |
| US2/US5 | GET/POST `/api/v1/accounts`, GET/PATCH `/api/v1/accounts/:id` | `requireActive` + `requireAdmin`; listado `limit` 1–100 (20 por defecto), `offset` desde 0 y `status`; sin búsqueda. Nombre/correo editables; alta TEACHER pendiente |
| US3 | POST `/api/v1/account-invitations/accept` con token/contraseña; reemisión mediante PATCH de cuenta pendiente con su correo | Canje público, sin inspección pública del token. Reemisión ADMIN por edición, no ruta dedicada. Éxito `{ status: 'ACTIVA' }`, sin sesión automática |
| US4 | POST `/api/v1/auth/password-recovery/request` y `/confirm` | Públicos; solicitud valida correo institucional y devuelve 202 neutro; confirmación recibe token/newPassword y devuelve `{ success: true }`, revoca sesiones |
| US5 | PATCH de cuenta; POST `/api/v1/account-email-changes/confirm` con token | Solicitud ADMIN; confirmación pública `{ verified: true }` y revoca sesiones. Cuenta activa mantiene correo previo; pendiente reemite invitación; inactiva rechaza cambio de correo. Nombre solo puede editarse sin ese cambio |
| US6 | POST `/api/v1/accounts/:id/deactivate`, `/reactivate`, cuerpo `{ confirm: true }`; PUT `/:id/role`, `{ role: 'TEACHER' }` | ADMIN activo; rol directo solo degradación de ADMIN activo. Protección último ADMIN y conflictos de estado. Reactivación no restaura sesiones |
| US7 | GET/POST `/api/v1/admin-role-requests`, POST `/:id/approve`, `/:id/reject` | Sesión activa; crear solo TEACHER propio, decidir solo ADMIN distinto; ADMIN lista pendientes y TEACHER las propias. Sin motivos/cancelación/paginación. Identificación de solicitante por ID de cuenta, no nombre/correo incluidos |
| US8 | GET `/api/v1/accounts/:id/audit` | ADMIN; comprueba existencia de cuenta. Orden ascendente, snapshots opcionales, actor sin nombre resuelto. Sin edición/exportación/paginación o panel global |

GET `/api/auth/token` y `/jwks` existen para interoperabilidad, sin pantalla propia. `authorizeScope` y `authorizeProtectedScope` no prueban disponibilidad de gestión de estudiantes/grupos: no hay consumidor académico montado en `app.ts`.

## Estados observados

| Operación | Errores observados relevantes |
| --- | --- |
| Login | 400 `INVALID_INPUT`, 401 `INVALID_CREDENTIALS` uniforme, 503 `UNAVAILABLE` |
| Consulta/cierre de sesión | 401 `UNAUTHENTICATED`, 503 `UNAVAILABLE`; cierre válido delegado a Better Auth |
| Gestión protegida | 400 `INVALID_INPUT`, 401 `UNAUTHENTICATED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`, 503 `UNAVAILABLE` según ruta/servicio |
| Emisión de invitación | 503 `DELIVERY_FAILED` o `DELIVERY_STATUS_UNKNOWN`; cuenta/invitación pueden estar persistidas |
| Aceptación | 400 `INVALID_INPUT`, 409 `ACCOUNT_CONFLICT`, 410 `INVITATION_EXPIRED`, 503 `UNAVAILABLE` |
| Solicitud cambio de correo | Conflictos de edición y 503 `DELIVERY_FAILED`; solicitud puede estar persistida |
| Confirmación de correo | 400 `INVALID_INPUT`, 409 `CONFLICT`, 410 `TOKEN_EXPIRED`, 503 `UNAVAILABLE` |
| Recuperación | Solicitud: 400 `INVALID_INPUT`, 503 `UNAVAILABLE`; SMTP fallido se oculta para neutralidad. Confirmación: 400 `INVALID_INPUT`, 410 `VERIFICATION_EXPIRED`, 503 `UNAVAILABLE` |
| Estado/rol | Conflictos anteriores más 409 `LAST_ADMIN` |
| Ascensos | 401/403, 404 al decidir, 409 por duplicidad/decisión/elegibilidad, 503 |

Errores de perfil incluyen `fields` cuando corresponde; recuperación no garantiza detalle por campo. Entrega muestra `PENDIENTE`, `ENVIADA`, `ERROR` si disponible. Ausencia de dato no equivale a éxito.

## Discrepancias y dependencias conservadas

1. Invitación y cambio de correo construyen la misma `INVITATION_BASE_URL?token=…`, sin discriminador ni endpoint de clasificación. Q2-A ya confirmada mantiene ambos canjes/entradas bloqueados: no probar operaciones ni ofrecer selección del trámite. Falta acordar enlaces distinguibles antes de habilitarlos; no se cambia backend.
2. Persistencia ocurre antes de entrega SMTP. No equiparar `503` con rollback. Además `requireActive` puede cambiar una respuesta exitosa por 401 si falla el registro de actividad posterior: un rechazo final tampoco prueba ausencia de efectos. Consultar estado permitido antes de repetir.
3. `get-session` expone `expiresAt`, no `lastAcceptedAt`; Better Auth tiene además expiración/actualización propia. No se implementa contador exacto ni polling para mantener actividad. Confirmar transporte/orígenes al planificar.
4. `rememberMe` es aceptado por `app.ts` y no figura en contrato 003: no se agrega control por inferencia. Validación real fija nombre máximo 200 y contraseña máxima 128; contratos de perfil no siempre los incluyen. Resolver divergencias antes de implementar restricciones visibles.
5. Recuperación neutra se aplica a correos institucionales válidos, no a cualquier cadena; no implica que el correo se haya entregado.
6. Reactivación está implementada, pero Assumptions de 001 conserva validación institucional pendiente. Por Q1-A, reactivación, ascensos y auditoría visible están expresamente diferidos del piloto actual, sin alterar capacidades backend.
7. Resumen antiguo menciona alta activa, Google y acceso estudiantil. 001 establece alta pendiente, el código no configura Google, y la decisión frontend excluye estudiantes como usuarios.
8. Consulta de eventos no acredita garantía técnica append-only. Contrato de ámbito es propuesto y no tiene consumidores académicos reales. Swagger no está montado.

## Archivos backend consultados

Los enlaces resuelven al checkout local indicado arriba. Se enumeran todos los archivos backend leídos en esta tarea; los índices enlazan otros originales que no se consideran leídos por transitividad.

### Contexto y features

- [README](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/README.md)
- [Índice](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/INDEX.md)
- [Producto](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/project-context.md)
- [Arquitectura](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/architecture-summary.md)
- [Decisiones](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/decisions.md)
- [Pendientes](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/unresolved-issues.md)
- [Módulo Usuarios](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/module-summary.md)
- [Cuentas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/cuentas.md)
- [Validación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/validacion-acceso.md)
- [Autenticación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autenticacion.md)
- [Autorización](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autorizacion.md)
- Operaciones docentes sobre estudiantes, propuesta local consultada históricamente: `docs/agent-context/modules/usuarios/features/acceso-estudiante.md` del checkout backend. Ya no existe en el checkout actual `ff46f8a`; se conserva la ruta leída, no un enlace local roto ni una fuente atribuida al commit nuevo.
- SMTP, propuesta local consultada históricamente: `docs/agent-context/modules/usuarios/features/correo-smtp.md` del checkout backend. Ya no existe en el checkout actual `ff46f8a`; se conserva la ruta leída, sin simular que esa versión local histórica sigue disponible.
- [Swagger, propuesta local](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/documentacion-api-swagger.md)

### Specs y contratos

- [001 spec](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md) y [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/contracts/accounts.openapi.yaml)
- [002 spec](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/spec.md), [validación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/contracts/validation.openapi.yaml) y [ámbito propuesto](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/contracts/scope-authorization.md)
- [003 spec](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/spec.md) y [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/contracts/auth.openapi.yaml)
- [004 refactor](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/004-refactor-servicios-usuarios/spec.md) y [interfaces conservadas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/004-refactor-servicios-usuarios/contracts/current-interfaces.md)

### Montaje, autenticación y configuración

- [src/app.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts)
- [auth.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/auth.ts)
- [active-identity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/active-identity.ts)
- [credential-identity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/credential-identity.ts)
- [session-activity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-activity.ts)
- [session-guard.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-guard.ts)
- [env.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/config/env.ts)

### Routers y servicios de Usuarios

- [accounts.routes.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/accounts.routes.ts)
- [accounts.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/accounts.service.ts)
- [lifecycle.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/lifecycle.service.ts)
- [roles.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/roles.service.ts)
- [invitations.routes.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/invitations/invitations.routes.ts)
- [invitations.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/invitations/invitations.service.ts)
- [invitations.mailer.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/invitations/invitations.mailer.ts)
- [email-changes.routes.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/email-changes/email-changes.routes.ts)
- [email-changes.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/email-changes/email-changes.service.ts)
- [recovery.routes.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/recovery/recovery.routes.ts)
- [recovery.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/recovery/recovery.service.ts)
- [promotion-requests.routes.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/promotion-requests/promotion-requests.routes.ts)
- [promotion-requests.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/promotion-requests/promotion-requests.service.ts)
- [accounts.validation.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.validation.ts)
- [accounts.errors.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.errors.ts)
- [accounts.types.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.types.ts)
- [audit.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/audit.service.ts)
- [scope-authorization.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/scope-authorization.ts)

## Fuentes y proceso frontend

Se leyeron AGENTS.md, `docs/agent-context/INDEX.md`, módulo/inventario de Usuarios y las ocho descripciones bajo `features/`, `docs/specs/TEMPLATE.md`, `.specify/init-options.json`, constitución y plantillas de spec/checklist. `specify preset resolve spec-template` resolvió la plantilla core local; se copió como punto de partida y se conservó su orden, añadiendo secciones de trazabilidad de la plantilla frontend.

No existía `.specify/extensions.yml` al comprobar pre-hooks; tampoco se presupone que crear el worktree equivalga a ejecutar un hook de rama. Numeración secuencial: no había directorios en `specs/`; se creó `001-gestionar-usuarios`. `.specify/feature.json` conserva su ruta independiente de rama.

## Verificación de esta entrega

- `pwd`, `git rev-parse --show-toplevel`, `git worktree list`: trabajo confirmado en worktree separado, sin editar el checkout frontend original.
- `specify preset resolve spec-template`: plantilla core `.specify/templates/spec-template.md`.
- `npm ci`: correcto, 42 paquetes auditados, cero vulnerabilidades reportadas.
- `npm test`: correcto; ejecuta únicamente comprobación de tipos, no pruebas funcionales.
- `npm run build`: correcto; comprobación de tipos y compilación Vite.
- Validación documental local: ocho historias, 25 FR, seis SC y exactamente tres aclaraciones; enlaces de los nuevos documentos y del inventario existentes. Se corrigieron dos enlaces relativos del inventario detectados en la primera comprobación.
- `git diff --check`: correcto. No se cambiaron dependencias ni código de aplicación.
- Revisión de post-hooks: `.specify/extensions.yml` tampoco existe al finalizar; no hay hooks que despachar.
- `git check-ignore .specify/feature.json`: estado local ignorado por configuración existente, creado para que los comandos siguientes encuentren la feature; no se alteró esa política ni se forzó su seguimiento.
- Checklist documental inicial: 12/16; tras confirmación Q1-A/Q2-A/Q3-A: 16/16 conformes. Se distinguen alcance habilitado, capacidades diferidas y canjes bloqueados con aceptación de ausencia/bloqueo. No se ejecutaron recorridos de aceptación ni pruebas de usabilidad/accesibilidad; requieren implementación y entorno posteriores.
