# Inventario de capacidades reales y pendientes

## Evidencia y significado de estado

**Especificación frontend aclarada (2026-10-25):** [Gestionar usuarios](../../../../specs/001-gestionar-usuarios/spec.md) y [fuentes/revalidación estática](../../../../specs/001-gestionar-usuarios/fuentes-backend.md). El responsable confirmó Q1-A/Q2-A/Q3-A: ascensos, auditoría visible y reactivación diferidos; entrada/canjes de invitación y cambio de correo bloqueados hasta acordar enlaces distinguibles; TEACHER solo ve estado de acceso y cierre, con recuperación desde entrada sin sesión. Checklist documental 16/16, sin agregar implementación ni certificar piloto: activación y cambio de correo extremo a extremo siguen bloqueados. La revisión histórica que sigue conserva su alcance original; la nueva evidencia registra además resultados inciertos por pérdida de sesión al finalizar una mutación.

**Planificación y evidencia vigente:** [plan](../../../../specs/001-gestionar-usuarios/plan.md) y [revalidación](../../../../specs/001-gestionar-usuarios/revalidacion-plan.md), backend `ff46f8a` limpio al consultar el 2026-10-25. Usuarios conserva sus servicios; el catálogo vigente es `docs/api/openapi.yaml` backend y ya documenta persistencia/límites de campos. `src/app.ts` ahora monta estudiantes y documentación: las filas históricas de ausencia siguientes no describen esa disponibilidad actual, que sigue fuera del frontend de Usuarios. Confirmados cookies HttpOnly, `rememberMe: false` sin selector, perfil local y recuperación sin hash, y fallback neutral del manual. Sin llamadas API, paquetes o pantallas implementadas en esta entrega.

Revisión estática del backend en commit `cd3c2b485d5b3649310ba1807aac90f0f818d174`. El checkout consultado tenía cambios locales: `module-summary.md` modificado y descripciones `acceso-estudiante.md`, `correo-smtp.md` y `documentacion-api-swagger.md` sin seguimiento. Se leyeron esas versiones; no se editaron ni se atribuyen íntegramente al commit. Había además cambios locales de configuración OpenCode ajenos al alcance.

**Implementado** significa código presente y rutas montadas en [src/app.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts), no API desplegada/probada en este trabajo. No se ejecutaron pruebas backend, base de datos ni SMTP. Antes de implementar frontend, revalidar el checkout y sus contratos. Las pruebas existentes bajo `tests/contract/` y `tests/integration/` son fuentes complementarias futuras, no resultados obtenidos aquí.

## Inventario HTTP histórico y necesidad de interfaz (cd3c2b4)

| Capacidad | Implementación observada | Decisión frontend |
| --- | --- | --- |
| Login, sesión, logout | POST `/api/auth/sign-in/email`, GET `/api/auth/get-session`, POST `/api/auth/sign-out`; lista blanca, identidad activa y control de inactividad | [Acceso y estados transversales](features/autenticacion.md) |
| Tokens de interoperabilidad | GET `/api/auth/token` y `/api/auth/jwks`; plugins JWT/Bearer configurados | Sin pantalla. JWT aislado no satisface `requireActive`; no decidir almacenamiento/transporte por su existencia |
| Cuentas | GET/POST `/api/v1/accounts`, GET/PATCH `/:id`; listado con `limit`, `offset`, `status` | [Gestión ADMIN](features/cuentas.md); no buscador o filtros inexistentes |
| Invitación | Alta emite correo; POST `/api/v1/account-invitations/accept` público; detalle/listado muestran entrega/vencimiento | [Aceptación y estado de entrega](features/invitaciones.md); no endpoint público de inspección del token |
| Reemitir invitación | PATCH de cuenta PENDIENTE con su mismo correo invalida la anterior y emite otra | Acción dentro de gestión, no endpoint dedicado ni reenvío universal |
| Estado/rol | POST `/api/v1/accounts/:id/deactivate`, `/reactivate`; PUT `/:id/role` solo TEACHER | [Acciones del detalle](features/ciclo-vida-roles.md), no gestor multirrol |
| Recuperación | POST `/api/v1/auth/password-recovery/request` y `/confirm` públicos | [Solicitud/canje](features/recuperacion.md); no cambio de contraseña autenticado genérico |
| Cambio de correo | PATCH de cuenta inicia; POST `/api/v1/account-email-changes/confirm` público confirma | [Edición y confirmación](features/cambio-correo.md); no autoservicio de perfil para docente |
| Ascenso | GET/POST `/api/v1/admin-role-requests`, POST `/:id/approve`, `/:id/reject` | [Solicitud y decisión](features/solicitudes-rol.md); prioridad piloto por confirmar |
| Auditoría | GET `/api/v1/accounts/:id/audit`, solo ADMIN; escritura interna de eventos | [Historial por cuenta](features/auditoria.md); sin pantalla global, edición o exportación |
| Validación/RBAC | Esquemas compartidos, `requireActive`, `requireAdmin`; rol/estado vigentes verificados | Transversal, no pantalla de permisos propia |
| Ámbito académico | Helper `authorizeScope` deniega sin proveedor; no hay consumidor real montado para estudiantes/grupos | Pendiente y fuera de alcance; no prometer filtrado académico integrado |
| SMTP | Nodemailer implementado; captura solo para pruebas | Configuración/entrega real por validar; no pantalla SMTP |
| Bootstrap ADMIN | Configuración segura y script backend, no alta ordinaria ADMIN | Sin interfaz |
| Estudiantes | Descripción local es propuesta de operaciones del docente sobre registros académicos, no login infantil; sin rutas montadas | Excluido |
| Swagger/OpenAPI servido | Descripción es propuesta; `src/app.ts` no monta UI Swagger ni endpoint OpenAPI | No afirmar disponibilidad; contratos en disco no equivalen a servicio publicado |
| Google/registro público | Sin proveedor Google configurado; signup deshabilitado y fuera de lista blanca | Excluidos |

## Reglas confirmadas frente a fuentes originales

No se vuelven a especificar aquí. Consultar [001, Requirements y Assumptions](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md) para las decisiones expresas de cuentas/invitación/rol y [003, Requirements y Assumptions](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/spec.md) para recuperación e inactividad confirmadas por el responsable. [002](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/spec.md) sigue rotulada borrador funcional. Los RF-001…004 de V3 siguen siendo propuestas originales, no aprobación institucional automática de estos recorridos.

La reactivación existe en código; la validación institucional del recorrido figura todavía como supuesto en 001. La matriz académica y sus asignaciones no se dan por confirmadas por estas specs.

## Discrepancias y confirmaciones

1. **Contexto antiguo frente a decisiones posteriores:** el resumen general todavía menciona alta activa, política pendiente y alternativas Google/JWT. 001 define alta ordinaria pendiente y 003 concreta recuperación/actividad; el código implementa estos flujos sin Google. Los contratos 001–003 aún se rotulan propuestos/planificados. No cambiar esas fuentes ni interpretar su etiqueta como prueba de ausencia/presencia de una ruta.
2. **Destino ambiguo del correo — confirmar antes de UI de enlaces:** `invitations.service.ts` y `email-changes.service.ts` construyen `INVITATION_BASE_URL?token=…` para fines distintos, sin discriminador. No hay endpoint para clasificar tokens. No probar ambos canjes automáticamente. Acordar con el responsable el contrato de navegación; aceptación y confirmación quedan documentadas como capacidades separadas con entrada desde correo bloqueada por esa decisión.
3. **Persistencia antes de SMTP:** alta y edición pueden persistir y luego dar `503 DELIVERY_FAILED` o `DELIVERY_STATUS_UNKNOWN` (este último en invitaciones). No asumir transacción revertida ante todo error. 001 FR-014 exige conservación ante fallos de registro, pero la entrega externa es un resultado separado: confirmar el tratamiento UX y reconciliar consultando la cuenta/listado autorizado.
4. **Sesión:** 003 confirma actividad por solicitudes protegidas aceptadas; `get-session` no renueva ese reloj. `auth.ts` configura además expiración/actualización de Better Auth y `get-session` devuelve `expiresAt`, no `lastAcceptedAt`. No calcular un contador exacto de inactividad con ese único dato ni crear polling de mantenimiento. Confirmar el transporte SPA (cookie frente a token opaco), despliegue y política visible antes de integrar; no persistir un JWT como sustituto de sesión.
5. **Recuperación:** el contrato expresa neutralidad por existencia/estado; el servicio también valida correo institucional y rechaza formato/dominio inválidos con `400`. La neutralidad no significa éxito para toda cadena de entrada, ni garantiza entrega de correo. Errores de infraestructura pueden dar `503`.
6. **Contrato incompleto en detalles:** `src/app.ts` acepta `rememberMe` opcional en login, ausente del contrato 003; las validaciones reales fijan nombre máximo 200 y contraseña máxima 128, no siempre reflejados en 001/002. No agregar control «recordarme» ni nuevas reglas UI sin confirmar. Referenciar esquemas reales para los límites y preguntar ante divergencias.
7. **Piloto y operación:** decidir si ascensos y auditoría se presentan en el piloto; validar institucionalmente reactivación, disponer de SMTP autorizado y probar recepción real. Confirmación SMTP es aceptación del servidor, no lectura ni llegada garantizada. No se presume disponibilidad de reenvío de confirmación de correo.
8. **Historial y alcance:** los eventos por cuenta existen, pero no se evaluó aquí garantía técnica de inmutabilidad. El contrato de ámbito es propuesto y no tiene consumidores académicos reales. No prometer ni auditoría global inmutable ni permisos por grupo implementados.

## Fuentes consultadas

- Las siete descripciones de [Usuarios/features](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/): `cuentas.md`, `validacion-acceso.md`, `autenticacion.md`, `autorizacion.md`, `acceso-estudiante.md`, `correo-smtp.md`, `documentacion-api-swagger.md`; resumen y documentación general enlazados en [INDEX](../../INDEX.md).
- Specs 001–004 y sus contratos, enlazados en [INDEX](../../INDEX.md); 004 solo reorganiza/conserva interfaces, no añade capacidades.
- [Código de Usuarios](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/): routers y servicios de `accounts/`, `invitations/`, `email-changes/`, `promotion-requests/`, `recovery/`, validaciones/errores/tipos/auditoría/ámbito de `shared/`.
- [Autenticación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/): `auth.ts`, `active-identity.ts`, `credential-identity.ts`, `session-activity.ts`, `session-guard.ts`; [montaje](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts) y [configuración](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/config/env.ts).
