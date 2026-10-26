# Inventario de capacidades reales y pendientes

**Vertical Tareas 01, 2026-10-26:** esta rama añade consulta de catálogo/ficha
para ADMIN/TEACHER activos, sin ampliar gestión de Usuarios ni permisos académicos.
Conserva AuthRoot, suspensión y notificaciones transversales; 403 no repone Tareas
tras reconciliar acceso. P-01/P-02 incorporados al PR backend de esta feature en
`518e88b`, aún sin afirmar merge/despliegue. Ver
[fuentes, pruebas y límites](../../../../docs/specs/tareas/01-catalogo-y-ficha.md).

**Recuperación, revisión posterior 2026-10-26:** pantallas refinadas y prueba real
SMTP autorizada sobre cuenta TEACHER en base desechable separada. Un único correo
aceptado por el proveedor; recepción/cambio elegido por el titular aún pendientes.
66 pruebas auth + 70 Usuarios, tipos/build y 15 combinaciones de estado/ancho en
Chrome correctas. [Fuentes, evidencia y límites](../../../../specs/001-gestionar-usuarios/evidence/recovery-review.md).

**Actualización posterior 2026-10-26:** [backend P-01/P-02 reconstruido y validado](../../../../specs/001-gestionar-usuarios/evidence/backend-restored.md)
con autorización, en worktree separado sin merge a main. Suite backend 154/154,
documentación 22/22 y conexión real de auth SPA/API parcial; el bloqueo por revisión
ausente del registro anterior se resolvió. T018 sigue pendiente por matriz incompleta,
sin certificación de TLS, BFCache real, usabilidad o piloto.

**Estado frontend vigente 2026-10-26:** dashboard por rol, listado/filtro/paginación,
invitación, detalle/entrega, edición, recuperación y confirmaciones de reemisión,
inactivación y reducción implementados y conectados al backend corregido aislado.
ADMIN accede a gestión; TEACHER solo identidad/sesión/cierre. La ampliación aprobada
del dashboard no añade permisos. 44/57 tareas completadas; 66 pruebas auth + 67
Usuarios, tipos/build correctos. Ver [evidencia y fuentes](../../../../specs/001-gestionar-usuarios/evidence/screens-implementation.md).
Canjes bloqueados; ascensos, auditoría visible y reactivación diferidos.
T018 y aceptación gráfica integral siguen pendientes, ya no por revisión ausente.
Los registros siguientes conservan historia de preparación y no describen el estado vigente.

**Diseño posterior:** `/sesion` eliminada por petición expresa; `/` presenta
directamente el espacio ADMIN/TEACHER tras verificar la sesión. Navegación móvil
plegable y listado adaptado sin ocultar campos. [Evidencia visual y de teclado](../../../../specs/001-gestionar-usuarios/evidence/design-review.md).

## Evidencia y significado de estado

**Base de trabajo integrada:** la rama `feat/gestionar-usuarios` incorpora `main@664cc5c` con autenticación, catálogo visual, pruebas y constitución ratificada. La planificación de Usuarios conserva sus decisiones futuras; no se aplicaron aún sus cambios de transporte, rutas o gestión a la autenticación existente.

**Especificación frontend aclarada (2026-10-25):** [Gestionar usuarios](../../../../specs/001-gestionar-usuarios/spec.md) y [fuentes/revalidación estática](../../../../specs/001-gestionar-usuarios/fuentes-backend.md). El responsable confirmó Q1-A/Q2-A/Q3-A: ascensos, auditoría visible y reactivación diferidos; entrada/canjes de invitación y cambio de correo bloqueados hasta acordar enlaces distinguibles; TEACHER solo ve estado de acceso y cierre, con recuperación desde entrada sin sesión. Checklist documental 16/16, sin agregar implementación ni certificar piloto: activación y cambio de correo extremo a extremo siguen bloqueados. La revisión histórica que sigue conserva su alcance original; la nueva evidencia registra además resultados inciertos por pérdida de sesión al finalizar una mutación.

**Planificación de la extensión Usuarios:** [plan](../../../../specs/001-gestionar-usuarios/plan.md) y [revalidación](../../../../specs/001-gestionar-usuarios/revalidacion-plan.md), backend `ff46f8a` limpio al consultar el 2026-10-25. Usuarios conserva sus servicios; el catálogo vigente es `docs/api/openapi.yaml` backend y ya documenta persistencia/límites de campos. `src/app.ts` ahora monta estudiantes y documentación: las filas históricas de ausencia siguientes no describen esa disponibilidad actual, que sigue fuera del frontend de Usuarios. Para esta extensión se confirmaron cookies HttpOnly, `rememberMe: false` sin selector, perfil local y recuperación sin hash, y fallback neutral del manual. Esas adaptaciones y pantallas de gestión/recuperación siguen pendientes; la autenticación heredada no se reescribe por integrar main.

## Base de autenticación heredada

**Estado frontend posterior (2026-10-25):** `src/auth/` implementa ingreso,
comprobación, cierre actual y notificación transversal tipada; tests Node y harness
separado disponibles. Integración local autorizada backend 3001/SPA 5173, cookie
HttpOnly, sin rememberMe, polling, JWT ni recuperación. Ver [validación actual](../../../../specs/001-autenticacion-personal/validation.md)
para resultados y pendientes; no implica piloto listo, merge backend ni HTTPS validado.
Los párrafos siguientes conservan historia y no describen todos el estado frontend vigente.

### Registros históricos de validación de autenticación

**Cierre posterior de P-01/P-02:** el responsable autorizó corregir y revalidar en
backend separado. [Informe de correcciones](../../../../specs/001-autenticacion-personal/backend-fixes.md):
rama `fix/session-cookie-guarantees` sobre ff46f8a con cambios locales identificados;
153 pruebas backend y siete focalizadas correctas. El plan frontend queda listo para
desglose, condicionado a usar/integrar esa revisión backend. No se hizo merge ni se
implementó frontend; los párrafos de bloqueo siguientes conservan la evidencia anterior.

**Última validación de autenticación:** backend limpio en
`ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`; ver
[informe ejecutado](../../../../specs/001-autenticacion-personal/backend-validation.md).
Se ejecutaron 22 pruebas documentales, 27 de regresión y cuatro diagnósticas en base
desechable. Las diagnósticas reprodujeron P-01/P-02, no certifican sus garantías.
OpenAPI canónico actual: `docs/api/openapi.yaml`, con `rememberMe` opcional;
Swagger/contrato sí están montados solo para development/test. Los estudiantes siguen
sin acceso, aunque el backend ahora monta cinco operaciones docentes sobre sus registros.
Estas observaciones sustituyen las afirmaciones históricas de ausencia de documentación,
consumidores académicos y pruebas ejecutadas para lo específicamente contrastado aquí;
no revalidan ni amplían el resto del inventario. Plan frontend aún bloqueado por corrección
backend. La topología mismo origen HTTPS ya está aprobada.

Actualización de autenticación del 2026-10-25: [spec frontend aclarada, pendiente de revisión final](../../../../specs/001-autenticacion-personal/spec.md)
y [revisión actual por capacidad](../../../../specs/001-autenticacion-personal/sources.md).
Revalidado estáticamente el mismo commit backend indicado abajo y sus cambios locales;
no hay implementación frontend ni pruebas API ejecutadas. El responsable confirmó Q1: A,
Q2: A y Q3: A: estado autenticado mínimo sin destino previo ni recuperación, reintento manual
y reconciliación del cierre incierto; transporte para el plan, sin control ni parámetro `rememberMe`.
El resto de este inventario conserva la revisión anterior; no se declara revalidado por esta actualización.

Durante planificación se amplió la inspección a Better Auth 1.7.7 instalado:
[P-01/P-02](../../../../specs/001-autenticacion-personal/research.md) bloquean finalizar
el plan por garantías de cierre y continuidad de cookie. No se modificaron requisitos
ni backend; las pruebas leídas no demuestran disponibilidad ni cubren automáticamente estos fallos.

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
