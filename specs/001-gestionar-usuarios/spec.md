# Feature Specification: Gestionar usuarios del personal

**Feature Branch**: sin rama creada por hook; worktree `spec-usuarios` sobre `f061259` (HEAD separado).

**Created**: 2026-10-25

**Status**: Especificación aclarada: Q1-A, Q2-A y Q3-A confirmadas por el responsable el 2026-10-25. Lista para planificación del alcance habilitado; entrada desde enlaces de invitación/cambio de correo bloqueada. No implementada ni certificada para piloto.

**Input**: User description: "Haz la especificacion de la feature de usuarios que esta en este directorio: /home/santino/Universidad/TrabajoCampo/Kudlab-frontend/docs/agent-context/modules/usuarios/features"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar y finalizar acceso (Priority: P1)

Como profesor con rol ADMIN o TEACHER, quiero identificarme con correo y contraseña y cerrar mi acceso para trabajar únicamente con mis permisos actuales.

**Why this priority**: Es la entrada segura a los recorridos protegidos.

**Independent Test**: Con cuentas ficticias activadas, ingresar, comprobar el estado de acceso y cerrar sesión, sin necesitar módulos académicos.

**Acceptance Scenarios**:

1. **Given** cuenta habilitada, **When** ingresa credenciales válidas, **Then** ve acceso confirmado y solo opciones correspondientes al rol vigente; TEACHER ve únicamente su estado de acceso y cierre, sin panel académico ni solicitudes de ascenso.
2. **Given** credenciales incorrectas o cuenta no habilitada, **When** intenta ingresar, **Then** recibe el mismo mensaje de credenciales inválidas sin confirmar existencia de cuenta ni mostrar datos protegidos.
3. **Given** acceso abierto, **When** confirma el cierre y este resulta satisfactorio, **Then** deja de ver datos protegidos y no se anuncia cierre de otras sesiones.
4. **Given** sesión vencida, revocada o permisos retirados, **When** intenta continuar, **Then** se retiran los datos ya no permitidos y se ofrece nuevo acceso o se informa denegación según corresponda.
5. **Given** fallo de servicio al ingresar o cerrar, **When** no se obtiene confirmación, **Then** no se concede acceso nuevo ni se anuncia cierre remoto confirmado; se informa incertidumbre.

### User Story 2 - Consultar e invitar personal (Priority: P1)

Como profesor con rol ADMIN activo, quiero consultar cuentas e invitar a otro profesor sin asignarle una contraseña.

**Why this priority**: Permite incorporar personal sin altas públicas.

**Independent Test**: Con sesión ADMIN preparada, consultar varias páginas ficticias e invitar un correo disponible; comprobar cuenta pendiente sin aceptar la invitación.

**Acceptance Scenarios**:

1. **Given** ADMIN autorizado, **When** consulta cuentas, cambia página o filtra estado, **Then** ve nombre, correo, rol y estado del resultado con total y carga; cambiar filtro vuelve al inicio.
2. **Given** resultado sin cuentas, **When** termina la consulta, **Then** ve vacío explícito, diferente de carga, denegación o fallo.
3. **Given** nombre y correo válidos, **When** confirma alta docente, **Then** ve cuenta pendiente y entrega disponible, nunca activación ni recepción garantizada.
4. **Given** datos inválidos o correo ocupado, **When** intenta invitar, **Then** recibe indicaciones corregibles o conflicto y conserva el borrador no secreto.
5. **Given** fallo de entrega o resultado incierto, **When** finaliza el intento, **Then** no se afirma que nada se guardó; se consulta estado autorizado antes de ofrecer otra acción.
6. **Given** TEACHER o persona sin acceso, **When** intenta abrir gestión incluso por entrada directa, **Then** no obtiene datos de otras cuentas ni operaciones de gestión.

### User Story 3 - Aceptar y gestionar invitaciones (Priority: P1; entrada desde correo bloqueada)

Como titular invitado quiero establecer contraseña y activar mi cuenta; como ADMIN quiero conocer la entrega y reemitir una invitación pendiente.

**Why this priority**: Completa la incorporación del profesor.

**Independent Test**: Preparar cuenta pendiente y comprobar entrega/reemisión como ADMIN. La aceptación descrita en escenarios 1–3 es referencia para cuando se acuerden enlaces distinguibles; no se implementa ni se declara operativa con el contrato de navegación actual. En el alcance actual verificar el bloqueo del escenario 6.

**Acceptance Scenarios**:

1. **Given** invitación identificada, **When** establece contraseña válida y confirma, **Then** ve activación confirmada y opción de iniciar sesión, sin autenticación automática.
2. **Given** contraseña rechazada, **When** intenta aceptar, **Then** ve cómo corregirla sin anunciar activación ni consumo exitoso del enlace.
3. **Given** enlace ausente, vencido, usado o inválido, **When** abre o confirma el recorrido, **Then** ve salida para contactar al administrador, sin datos personales precargados.
4. **Given** cuenta pendiente, **When** ADMIN confirma reemisión, **Then** se advierte que el enlace anterior dejará de servir y se muestra el resultado disponible; cancelar no produce cambios.
5. **Given** entrega ausente o pendiente, **When** se consulta, **Then** no se presenta como enviada; enviada tampoco significa leída ni cuenta activa.
6. **Given** un enlace que no distingue invitación de cambio de correo, **When** llega a la aplicación, **Then** no se habilita ni se ejecuta ninguno de los dos canjes, ni se pide al titular elegir el trámite. Activación desde correo permanece bloqueada hasta acordar enlaces distinguibles.

### User Story 4 - Recuperar acceso (Priority: P1)

Como titular que olvidó contraseña quiero recuperar acceso mediante mi correo vigente sin revelar información de cuentas a terceros.

**Why this priority**: Evita contraseñas compartidas e intervención administrativa impropia.

**Independent Test**: Solicitar recuperación para correos ficticios de distintos estados y uno desconocido; completar enlace válido y probar uno no utilizable.

**Acceptance Scenarios**:

1. **Given** correo institucional válido, **When** se acepta la solicitud, **Then** se muestra la misma confirmación neutra sin afirmar existencia, estado ni recepción del mensaje.
2. **Given** formato o dominio inválido, **When** solicita recuperación, **Then** se informa validación, no entrega ficticia.
3. **Given** enlace válido, **When** confirma una nueva contraseña aceptada, **Then** ve cambio confirmado y necesidad de iniciar sesión; no se presentan accesos previos como válidos.
4. **Given** contraseña rechazada o enlace no utilizable, **When** confirma, **Then** no se anuncia cambio completado y se permite corregir o volver a solicitar recuperación, respectivamente.

### User Story 5 - Editar datos y confirmar correo (Priority: P2; entrada desde correo bloqueada)

Como ADMIN quiero corregir nombre o solicitar otro correo; como titular quiero confirmarlo antes de usarlo para acceder.

**Why this priority**: Evita confundir solicitud con cambio efectivo de identidad.

**Independent Test**: Preparar cuenta activa, editar nombre y solicitar correo; comprobar vigente y pendiente. Escenario 4 es referencia para cuando se acuerden enlaces distinguibles, no aceptación operativa actual. Verificar ahora el bloqueo del escenario 7, además de los pasos administrativos.

**Acceptance Scenarios**:

1. **Given** edición válida, **When** se confirma nombre, **Then** se presenta el valor confirmado sin alterar rol, estado ni identidad.
2. **Given** cuenta activa, **When** solicita otro correo, **Then** el vigente sigue distinguido del pendiente, sin anunciar sustitución completada.
3. **Given** cuenta pendiente, **When** cambia correo, **Then** se informa nueva invitación, no verificación de cuenta activa.
4. **Given** verificación válida, **When** el titular confirma explícitamente, **Then** ve correo verificado y necesidad de nuevo acceso, sin autenticación automática.
5. **Given** conflicto, correo activo sin cambios, intento de cambiar correo de cuenta inactiva o fallo de entrega, **When** termina el intento, **Then** se informa rechazo o incertidumbre, se conserva borrador no secreto y se revisa estado antes de repetir.
6. **Given** edición sin enviar, **When** cancela, **Then** no se modifica cuenta. TEACHER no recibe edición propia por estos recorridos.
7. **Given** la entrada actual con enlace indistinguible, **When** el titular intenta confirmar el correo, **Then** el canje permanece bloqueado, no se ofrece elegir trámite y no se anuncia correo verificado. No se presenta el cambio de correo extremo a extremo como operativo.

### User Story 6 - Gestionar estado y reducción de rol (Priority: P2)

Como ADMIN quiero confirmar inactivación y reducción de rol sin borrar cuentas ni seguir operando con privilegios retirados. Reactivación diferida por Q1-A.

**Why this priority**: Permite retirar accesos y responsabilidades explícitamente.

**Independent Test**: Preparar cuentas activas/inactivas y más de un ADMIN; cancelar y confirmar acciones e intentar afectar al último ADMIN activo.

**Acceptance Scenarios**:

1. **Given** inactivación o reducción a TEACHER, **When** cancela confirmación, **Then** no se envía acción ni cambia estado mostrado.
2. **Given** inactivación o reducción de rol permitida y confirmada, **When** resulta satisfactoria, **Then** actualiza detalle y revisa los permisos vigentes del actor.
3. **Given** último ADMIN activo o estado incompatible, **When** se rechaza acción, **Then** explica conflicto y revisa estado, sin ofrecer forzar.
4. **Given** acción sobre la propia cuenta que retira permisos, **When** intenta continuar, **Then** no mantiene controles basados en privilegios anteriores.
5. **Given** cuenta inactiva, **When** ADMIN consulta su detalle, **Then** no se ofrece ni se envía reactivación en esta iteración.

### User Story 7 - Solicitar y decidir ascenso (Diferida; fuera del piloto actual)

Como TEACHER quiero solicitar ascenso; como ADMIN quiero decidir pendientes sin conceder acceso anticipado.

**Why this priority**: El responsable decidió diferirla (Q1-A). Los escenarios siguientes se conservan como referencia futura, no como requisitos implementables o metas de esta iteración. Aceptación de exclusión actual: ningún rol recibe controles de solicitud/decisión ni consultas de ascensos desde la interfaz.

**Independent Test**: Con solicitudes ficticias, consultar como ambos roles, aprobar y rechazar solicitudes distintas y comprobar resultado visible.

**Acceptance Scenarios**:

1. **Given** TEACHER activo, **When** solicita ascenso, **Then** ve solicitud pendiente sin opciones ADMIN y solo consulta sus solicitudes.
2. **Given** ADMIN autorizado, **When** consulta pendientes, **Then** no ve un historial global de decisiones y solo identifica al solicitante con datos consultados de forma autorizada.
3. **Given** solicitud pendiente elegible, **When** otro ADMIN confirma aprobar/rechazar, **Then** muestra decisión confirmada y actualiza lista; cancelar no decide.
4. **Given** duplicidad, decisión previa o pérdida de elegibilidad, **When** rechaza el intento, **Then** informa conflicto sin éxito anticipado ni repetición automática.

### User Story 8 - Consultar historial por cuenta (Diferida; fuera del piloto actual)

Como ADMIN quiero revisar la gestión de una cuenta para comprender cambios registrados.

**Why this priority**: El responsable decidió diferirla (Q1-A). Los escenarios siguientes son referencia futura, no requisitos implementables o metas de esta iteración. Aceptación de exclusión actual: no hay sección ni consultas de historial por cuenta desde la interfaz; esto no altera el registro de auditoría backend.

**Independent Test**: Preparar cuenta con eventos y otra sin ellos; consultar ambas como ADMIN y repetir sin permiso.

**Acceptance Scenarios**:

1. **Given** cuenta consultable, **When** abre historial, **Then** ve acción, momento, referencia de actor y cambios disponibles en orden cronológico, sin inventar nombres ni valores ausentes.
2. **Given** ausencia de eventos, cuenta no encontrada o denegación, **When** termina consulta, **Then** cada situación es distinguible y no quedan datos de otra cuenta.
3. **Given** historial visible, **When** revisa opciones, **Then** es de solo lectura sin edición, eliminación o exportación.

### Edge Cases

- Dos altas/ediciones compiten por correo: el intento rechazado conserva borrador no secreto y explica conflicto, sin anunciar dos altas exitosas.
- Cambian permisos durante formulario/consulta: la denegación prevalece sobre opciones previas y retira datos ya no autorizados.
- Cambia cuenta/filtro mientras carga: una respuesta anterior no se presenta como resultado de la nueva selección.
- Doble pulsación: no inicia segunda operación mientras la primera sigue pendiente; resultado incierto no dispara repetición automática.
- Se registra cuenta o solicitud y luego falla entrega: se diferencia persistencia de entrega y no se promete reversión.
- Una mutación termina con pérdida de sesión: se recupera acceso y consulta estado antes de repetir; denegación final no demuestra ausencia de cambios.
- Enlace abierto simultáneamente: abrirlo no lo canjea; un intento rechazado no presenta éxito.
- Invitación y cambio de correo comparten enlace: ambos canjes permanecen bloqueados; no se clasifican probando operaciones ni haciendo elegir el trámite al profesor (Q2-A).
- Consultar sesión o interactuar no se anuncia como renovación; no se muestra contador exacto de inactividad no verificable.
- Falla cierre por red: se retiran datos protegidos de la vista y se comunica que el cierre remoto no pudo confirmarse.

## Requirements *(mandatory)*

### Functional Requirements

Estos FR son requisitos de experiencia **frontend de esta spec**, no RF del análisis, diseño o V3. Las políticas de negocio se reutilizan por referencia en «Feature backend relacionada».

- **FR-001**: La experiencia DEBE ser exclusiva para profesores ADMIN/TEACHER; no ofrecer acceso estudiantil, registro público ni Google. Aceptación: US1, US2.6 y exclusiones.
- **FR-002**: El acceso DEBE pedir correo/contraseña sin selector de rol ni «recordarme» no confirmado y mostrar progreso, éxito, credenciales inválidas uniformes o indisponibilidad. Aceptación: US1.1–2, US1.5.
- **FR-003**: DEBE respetar acceso y rol vigentes comprobados por servidor, sin conceder permisos por datos locales ni mantener datos protegidos ante denegación. Aceptación: US1.4, US2.6, US6.4.
- **FR-004**: DEBE permitir cerrar sesión actual y representar sesión ya inválida sin acceso; un fallo no anuncia cierre remoto ni de otras sesiones. Aceptación: US1.3–5 y caso de cierre incierto.
- **FR-005**: ADMIN DEBE consultar listado paginado, filtrar estado y abrir detalle; no habrá búsqueda ni filtros adicionales. Aceptación: US2.1–2.
- **FR-006**: ADMIN DEBE invitar con nombre/correo, sin pedir contraseña ni ofrecer alta ADMIN; confirmación describe cuenta pendiente y entrega conocida. Aceptación: US2.3.
- **FR-007**: Formularios DEBEN explicar datos rechazados disponibles, conservar borrador no secreto en errores corregibles y diferenciar validación/conflicto. Las reglas concretas permanecen en las fuentes canónicas. Aceptación: US2.4, US3.2, US4.2–4, US5.5.
- **FR-008**: DEBE distinguir entrega pendiente, enviada, fallida o no confirmada y vencimiento disponible, sin equiparar envío a recepción, lectura o activación. Aceptación: US2.3–5, US3.5.
- **FR-009**: ADMIN DEBE poder confirmar reemisión solo para cuenta pendiente con advertencia sobre enlace previo, sin reenvíos genéricos. Aceptación: US3.4.
- **FR-010**: La aceptación desde correo DEBE permanecer bloqueada según FR-024. El comportamiento de confirmación con contraseña, sin precarga ni inicio automático, queda documentado como referencia posterior al desbloqueo, no implementación actual. Aceptación actual: US3.6; futura: US3.1–3.
- **FR-011**: Recuperación DEBE dar respuesta neutra para correo institucional válido sin confirmar existencia, estado o entrega; entradas inválidas e indisponibilidad conservan estados de error. Aceptación: US4.1–2 y estados.
- **FR-012**: Confirmar recuperación DEBE mostrar éxito solo tras cambio confirmado y exigir nuevo acceso; enlace no utilizable permite nueva solicitud sin identificar cuentas. Aceptación: US4.3–4.
- **FR-013**: ADMIN DEBE editar nombre y/o solicitar correo, distinguiendo vigente/pendiente en cuenta activa y nueva invitación en pendiente. Sin autoservicio TEACHER. Aceptación: US5.1–3, US5.6.
- **FR-014**: La confirmación desde correo DEBE permanecer bloqueada según FR-024. Su confirmación explícita y necesidad de nuevo acceso quedan como referencia posterior al desbloqueo; mientras tanto no se anuncia sustitución efectiva. Aceptación actual: US5.7 y US5.2; futura: US5.4–5.
- **FR-015**: Acciones de estado/reducción de rol DEBEN explicar efecto y exigir confirmación; cancelar antes de enviar no cambia datos y éxito actualiza detalle. Aceptación: US6.1–2.
- **FR-016**: Conflictos de último ADMIN, estado o concurrencia DEBEN explicarse y llevar a revisar estado; no ofrecer forzar, eliminar, multirrol o ascenso directo. Aceptación: US6.3 y casos límite.
- **FR-017**: Ascensos DEBEN quedar fuera del piloto actual: no ofrecer controles de solicitud/decisión ni consultar solicitudes desde la interfaz. Aceptación: exclusión de US7; sus escenarios se conservan solo como referencia futura.
- **FR-018**: Historial por cuenta DEBE quedar fuera del piloto actual: no ofrecer sección ni consultas de eventos desde la interfaz. No cambia la auditoría interna backend. Aceptación: exclusión de US8; sus escenarios son referencia futura.
- **FR-019**: Consultas habilitadas DEBEN distinguir carga, vacío, datos, no encontrado cuando aplique, denegación e indisponibilidad; envíos distinguen pendiente, confirmación y error. Aceptación: partes habilitadas de US1–6 y tabla de estados.
- **FR-020**: DEBE evitar dobles envíos y repetición automática de operaciones inciertas y consultar estado autorizado antes de ofrecer repetir. Sin reconciliación posible DEBE conservar incertidumbre explícita. Aceptación: US2.5, US5.5 y casos límite.
- **FR-021**: Contraseñas, enlaces de un solo uso y credenciales NO DEBEN aparecer en mensajes, historial, diagnóstico o telemetría. Abrir enlaces nunca ejecuta canje. Aceptación: US3–5 y revisión SC-005.
- **FR-022**: Formularios/confirmaciones DEBEN completarse con teclado, tener etiquetas y errores asociados, y comunicar carga/resultado sin depender solo del color. Aceptación: SC-006.
- **FR-023**: Ascensos, auditoría visible por cuenta y reactivación DEBEN diferirse del piloto actual (Q1-A). Inactivación y reducción de rol permanecen en alcance. Aceptación: US6.5 y exclusiones US7/US8.
- **FR-024**: Entrada desde correo y canjes de invitación/cambio de correo DEBEN permanecer bloqueados hasta acordar enlaces distinguibles (Q2-A). No se prueban ambas operaciones ni se ofrece elección de trámite. No se declara operativo el alta/activación ni cambio de correo extremo a extremo mientras dure el bloqueo. Aceptación: US3.6 y US5.7.
- **FR-025**: Tras acceso TEACHER confirmado se DEBE mostrar únicamente estado de acceso y cierre (Q3-A), sin solicitudes de rol ni panel académico. Recuperación sigue accesible desde la entrada sin sesión, como en US4. Aceptación: US1.1 y ausencia de controles de US7.

### Key Entities *(include if feature involves data)*

- **Cuenta del personal**: nombre, correo vigente, rol y estado; puede mostrar correo pendiente y última invitación. Conserva identidad al editar.
- **Acceso del profesor**: identidad/rol actuales con sesión comprobada; no es sesión de actividad pedagógica.
- **Invitación**: incorporación pendiente, entrega y vencimiento disponibles; no constituye acceso autenticado.
- **Confirmación de correo / recuperación**: autorizaciones temporales para trámites distintos, no credenciales de sesión ni consulta pública de perfil.
- **Solicitud de ascenso (referencia futura)**: solicitante, estado, fechas y decisión disponibles; no se consulta ni presenta en el piloto actual.
- **Evento por cuenta (referencia futura)**: acción, momento, referencia de actor y cambios opcionales; no se consulta ni presenta en el piloto actual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Metas propuestas, no resultados obtenidos ni compromisos heredados del análisis. Datos ficticios; se evalúan solo partes habilitadas de US1–6 y comprobaciones de exclusión/bloqueo. No se ejecutan canjes bloqueados ni escenarios futuros US7/US8 como condición de completar esta iteración. Levantar el bloqueo requiere un contrato acordado y actualización explícita de esta spec, sin incorporarlos automáticamente.

- **SC-001**: El 100 % de escenarios incluidos produce resultado visible esperado, con cancelación, validación, conflicto, indisponibilidad y pérdida de permisos.
- **SC-002**: En diez intentos de invitar/corregir cuenta con al menos cinco profesores ADMIN, al menos nueve se completan sin ayuda en menos de tres minutos por intento, excluyendo espera de correo.
- **SC-003**: En diez recorridos de inicio/cierre con al menos cinco profesores, al menos nueve se completan sin ayuda en menos de dos minutos por recorrido.
- **SC-004**: En diez preguntas de comprensión tras alta, recuperación o cambio de correo, al menos nueve respuestas distinguen pendiente, enviado y completado sin asumir recepción o acceso automático.
- **SC-005**: En el 100 % de casos de falta de permiso, enlace no utilizable, pérdida de sesión y entrega incierta, no se muestran datos indebidos, secretos o éxitos sin confirmar ni se repiten automáticamente operaciones.
- **SC-006**: El 100 % de recorridos incluidos se completa con teclado y permite identificar campo, error, progreso y resultado mediante ayudas de lectura, sin depender solo del color.

## Assumptions

- **Unidad**: El directorio contiene ocho descripciones; se produce una feature agregada, no ocho specs ni una selección arbitraria de una descripción.
- **Actores confirmados**: Solo profesores; ADMIN/TEACHER son roles técnicos. Referencias antiguas a interacción estudiantil no amplían alcance.
- **Reglas reutilizadas**: Políticas de identidad, invitación, correo, contraseña, roles, conservación, recuperación e inactividad permanecen en specs backend 001–003, no se sustituyen por reglas nuevas aquí.
- **Evidencia**: Backend leído estáticamente; sin prueba de despliegue, base, correo ni integración. Frontend sigue sin pantallas, autenticación o llamadas de servicio en esta entrega.
- **Prioridades y metas**: P1/P2 ordenan alcance habilitado y dependencias bloqueadas, no certifican piloto. US7/US8 están diferidas. SC-002–004 y FR-022 son propuestas frontend, no requisitos atribuidos a originales. No se define composición gráfica ni componentes.
- **Gobernanza**: La constitución local sigue como plantilla sin completar; no se presume ratificada ni se modifica. Rigen AGENTS.md y decisiones confirmadas.

## Feature frontend

**Objetivo**: Incorporar, dar acceso y mantener cuentas de profesores con confirmaciones comprensibles, distinguiendo solicitud, persistencia, entrega y acceso efectivo.

**Incluye**: Acceso/cierre, estado mínimo TEACHER, recuperación, gestión ADMIN, invitación/entrega/reemisión, edición y solicitud de correo, inactivación y reducción de rol. Los pasos administrativos de invitación y correo no equivalen a recorridos completos operativos: aceptación/confirmación desde correo están bloqueadas por Q2-A. Entrada, listado, detalle y formulario describen responsabilidades, no rutas ni diseño gráfico aprobado.

**Diferido (Q1-A)**: Solicitudes/decisiones de ascenso, auditoría visible por cuenta y reactivación. US7/US8 y la evidencia backend se conservan para trazabilidad, no como alcance actual. La auditoría interna backend no se elimina ni cambia.

**Excluye**: Implementación en esta entrega; estudiantes usuarios; Académico, Tareas, Evolución, Seguimiento y asignaciones por grupo; registro público; Google; autoservicio de perfil TEACHER; alta ADMIN ordinaria; administración SMTP/bootstrap; Swagger; buscador general; notificaciones; borrado; exportación y auditoría global/inmutabilidad garantizada.

## Feature backend relacionada

La [evidencia técnica separada](fuentes-backend.md) contiene contexto, specs, contratos, disponibilidad observada y límites. No es un plan de implementación.

Reglas canónicas reutilizadas: [cuentas 001](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md), Requirements/Assumptions; [validación 002](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/spec.md), borrador; [autenticación 003](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/spec.md), Requirements/Assumptions con confirmaciones de 2026-10-13. Refactor 004 no agrega capacidades. RF de V3 y análisis no son intercambiables ni quedan aprobados por esta spec.

## Archivos backend consultados

Ver [registro histórico de archivos, revisión y cambios locales](fuentes-backend.md) sobre `cd3c2b485d5b3649310ba1807aac90f0f818d174` y [revalidación de planificación](revalidacion-plan.md) del 2026-10-25 sobre `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`, limpio al consultar. El backend tiene ahora catálogo implementado `docs/api/openapi.yaml`, que documenta también límites de campos y opción de persistencia de login; no se usan los contratos históricos como inventario vigente. Sin modificar backend ni ejecutar sus pruebas. Nuevas capacidades académicas/documentales observadas no amplían esta feature.

## Recorrido de UI

| Entrada | Pasos y salida | Responsabilidad |
| --- | --- | --- |
| Acceso | Credenciales → confirmación → opciones por rol → cierre | TEACHER: solo estado de acceso y cierre; ADMIN: gestión autorizada |
| Gestión ADMIN | Listado/filtro/página → detalle → alta/edición → confirmación/revisión | Listado, detalle y formularios sin buscador |
| Invitación | Gestión de entrega/reemisión ADMIN; aceptación desde correo bloqueada | No implementar canje con enlace indistinguible ni declarar activación operativa |
| Recuperación | Correo → respuesta neutra; enlace → contraseña → confirmación → ingresar | Solicitud y canje sin consulta pública de perfil |
| Correo | Edición ADMIN → pendiente; confirmación desde correo bloqueada | No implementar canje ni declarar cambio completo operativo |
| Estado/rol | Detalle → explicar → confirmar/cancelar → actualizar/revisar acceso | Solo inactivación/reducción; reactivación diferida |
| Ascensos | Sin recorrido en esta iteración | Diferido por Q1-A |
| Historial | Sin sección visible en esta iteración | Diferido por Q1-A; sin alterar auditoría backend |

## Estados y errores

| Situación | Respuesta requerida |
| --- | --- |
| Carga/envío | Mostrar progreso, impedir duplicación y no anunciar éxito anticipado |
| Vacío | Diferenciar ausencia de resultados de falta de permiso o fallo |
| Validación | Asociar campos disponibles y permitir corrección sin exponer secretos |
| Conflicto/no encontrado | Explicar y revisar/volver a listado autorizado, sin sobrescribir o forzar |
| Enlace ausente/no utilizable | No canjear al abrir; salida sin identificar cuenta; nueva recuperación o contacto ADMIN según trámite |
| Sesión vencida/revocada | Retirar datos protegidos y ofrecer autenticación |
| Denegación | Retirar datos indebidos sin suponer que falta todo el acceso si solo falta permiso |
| Servicio/entrega inciertos | Comunicar resultado no confirmado y consultar estado antes de otra acción, sin prometer reversión |
| Cancelación antes de enviar | No mutar; descartar borrador al abandonar sin anunciar guardado |
| Cambio sensible confirmado | Actualizar solo lo confirmado y revisar acceso; activación/recuperación/correo no autentican |

Los [códigos observados](fuentes-backend.md#estados-observados) no son reglas nuevas. Borrador recuperable significa solo datos no secretos durante correcciones autorizadas; no promete conservar contraseñas tras navegación, expiración o recarga. Sin token no se envía un canje.

## Criterios de aceptación

La aceptación actual se verifica mediante partes habilitadas de US1–6, bloqueo US3.6/US5.7 y exclusiones US6.5/US7/US8, con FR-001–025 y SC-001–006, aún no ejecutados. Los escenarios de aceptación/confirmación desde correo y futuros US7/US8 no autorizan implementación en esta iteración. Cancelación no muta; no se exponen datos indebidos ni se conceden permisos por interfaz. Calidad documental completa no levanta el bloqueo ni certifica piloto.

## Pendientes y confirmaciones

1. **Q1-A confirmada el 2026-10-25**: Diferir ascensos, auditoría visible por cuenta y reactivación. Reactivación conserva validación institucional pendiente para una iteración futura.
2. **Q2-A confirmada el 2026-10-25**: Bloquear entrada/canjes de invitación y cambio de correo hasta acordar enlaces distinguibles. No pedir al profesor que adivine ni cambiar backend en esta tarea. Dependencia pendiente de navegación, no pregunta de alcance abierta. Impide declarar incorporación y cambio de correo completos operativos.
3. **Q3-A confirmada el 2026-10-25**: TEACHER ve solo estado de acceso y cierre, sin solicitudes de rol ni panel académico; recuperación permanece en entrada sin sesión.
4. **Planificación técnica confirmada el 2026-10-25**: Transporte, persistencia, perfil local y destino de recuperación confirmados por el responsable en [registro de decisiones](revalidacion-plan.md#decisiones-expresas-obtenidas-durante-speckitplan). Detalles de integración en [plan.md](plan.md). Producción aún requiere configurar y comprobar su entorno; no se presume despliegue disponible.
5. **Operación**: Disponer de correo autorizado y comprobar recepción/canje reales; aceptación por servidor de correo no garantiza bandeja ni lectura.
6. **Entrega incierta**: Se propone consultar estado antes de repetir y no atribuir reversión al fallo externo; requiere revisión del responsable. Si no se puede reconciliar, conservar incertidumbre sin repetir a ciegas.
7. **Contratos**: La revalidación registra que el catálogo actual ya documenta límites de campos y persistencia de login antes ausentes en contratos históricos. Se confirmó el comportamiento de persistencia sin añadir control «recordarme». Reutilizar fuente vigente, no inventar restricciones ni inferir reloj exacto de actividad del vencimiento.
8. Q1–Q3 resueltas por confirmación expresa «Q1: A, Q2: A, Q3: A». Puede planificarse el alcance habilitado y el bloqueo, no los canjes bloqueados ni capacidades diferidas. Documentación no equivale a preparación piloto.
9. **Feedback neutral confirmado**: Fallback visual del manual aprobado durante planificación sin asignar colores semánticos pendientes; ver manual C-06. No se diseñó ni implementó una pantalla al registrar esa confirmación.
