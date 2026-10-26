# Feature Specification: Autenticación del personal

**Feature Branch**: `feat/frontend-authentication`

**Created**: 2026-10-25

**Status**: Especificada y aclarada — Q1–Q3 confirmadas por el responsable.
Plan completado tras corrección y revalidación autorizadas de P-01/P-02 en backend
separado. Ver [backend-fixes.md](backend-fixes.md), [plan.md](plan.md) y
[research.md](research.md). No hay implementación frontend ni autorización implícita para iniciarla.

**Input**: Especificar exclusivamente la experiencia frontend de inicio de sesión,
comprobación de sesión, cierre actual y denegaciones transversales de ADMIN y TEACHER.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar con correo y contraseña (Priority: P1)

Como profesor con cuenta ADMIN o TEACHER habilitada, quiero identificarme y reconocer
el resultado de mi intento sin revelar información sobre otras cuentas.

**Why this priority**: Es la entrada al acceso autorizado del personal.

**Independent Test**: Desde una entrada sin sesión, ensayar ambos roles y la matriz de
entrada inválida, credencial incorrecta, cuenta no elegible y servicio no disponible;
observar estados y mensajes sin necesitar módulos académicos.

**Acceptance Scenarios**:

1. **Given** una comprobación terminada sin sesión, **When** se accede al formulario,
   **Then** hay correo y contraseña etiquetados, sin selector de rol ni acceso de estudiantes.
2. **Given** campos vacíos o correo mal formado, **When** se envía el formulario,
   **Then** se indican las correcciones, se dirige el foco al primer campo inválido
   y no se presenta el rechazo como credenciales incorrectas.
3. **Given** datos de entrada válidos, **When** se envían, **Then** se anuncia progreso
   y las activaciones repetidas no originan intentos simultáneos desde el mismo formulario.
4. **Given** una cuenta elegible con credenciales correctas, **When** se confirma el ingreso,
   **Then** se reconoce la identidad y rol devueltos, sin conceder permisos por datos locales;
   se muestra un estado autenticado mínimo con identidad propia y «Cerrar sesión»,
   sin dashboard, enlaces a recuperación ni conservación de destino previo.
5. **Given** contraseña incorrecta, correo desconocido o cuenta no elegible, **When** se
   recibe rechazo de credenciales, **Then** se muestra el mismo mensaje «Credenciales
   inválidas», sin identificar existencia, estado ni causa interna; se permite corregir.
6. **Given** un fallo de servicio o pérdida de conexión, **When** no puede confirmarse el
   ingreso, **Then** se informa «No pudimos confirmar el inicio de sesión», sin atribuirlo
   a la contraseña ni mostrar contenido protegido. Antes de un nuevo envío se comprueba
   si el intento anterior dejó una sesión utilizable; no se repite automáticamente el login.
7. **Given** cualquier resultado del envío, **When** deja de estar pendiente,
   **Then** el correo puede corregirse y la contraseña no se conserva como dato de sesión
   ni se traslada a otro recorrido. Limpiar la entrada de contraseña no altera el gestor del navegador.

### User Story 2 - Entrar o recargar con una sesión existente (Priority: P1)

Como miembro del personal, quiero que se compruebe mi acceso al entrar o recargar antes
de mostrarme contenido reservado, sin tener que escribir credenciales si sigo autorizado.

**Why this priority**: Evita tanto exposición inicial como solicitar credenciales innecesarias.

**Independent Test**: Abrir y recargar con sesión válida, ausente, vencida, revocada
y con servicio inaccesible; verificar que nunca se usa una identidad local como confirmación.

**Acceptance Scenarios**:

1. **Given** una entrada o recarga, **When** aún no terminó la comprobación,
   **Then** se muestra «Comprobando acceso», sin contenido protegido ni formulario de
   login operativo que compita con la comprobación.
2. **Given** una sesión válida, **When** se confirma la comprobación,
   **Then** se reconoce la identidad vigente y se muestra el estado autenticado mínimo
   con «Cerrar sesión», sin pedir contraseña ni recuperar un destino previo.
3. **Given** ausencia de sesión, **When** la comprobación la confirma,
   **Then** se ofrece iniciar sesión sin anunciar un vencimiento que no se conoce.
4. **Given** acceso previamente confirmado en el recorrido actual, **When** la comprobación
   posterior devuelve que ya no es válido, **Then** se retira contenido protegido y se
   comunica «Tu sesión ya no es válida. Inicia sesión de nuevo», sin distinguir vencimiento
   de revocación ni asegurar que la cuenta fue inactivada.
5. **Given** una comprobación fallida por indisponibilidad, **When** se presenta el resultado,
   **Then** no se declara sesión válida ni ausencia de sesión; se muestra «No pudimos
   comprobar tu acceso» con reintento manual y sin login operativo ni contenido protegido.
6. **Given** una página autenticada que se oculta o abandona, **When** vuelve mediante
   historial, incluida restauración bfcache, **Then** la aplicación no restaura identidad
   renderizable ni contenido protegido antes de una comprobación vigente. Si no se puede
   comprobar, permanece bloqueada; una respuesta del recorrido anterior no concede acceso.
   Este criterio se refiere al DOM de la aplicación, no a miniaturas del historial o
   capturas gestionadas fuera de su control por navegador/sistema operativo.

### User Story 3 - Cerrar únicamente la sesión actual (Priority: P1)

Como persona autenticada, quiero cerrar mi acceso actual y saber si el cierre se confirmó.

**Why this priority**: Permite terminar voluntariamente el acceso, sin prometer cierre global.

**Independent Test**: Con dos sesiones independientes, cerrar una, consultar de nuevo
esa sesión y comprobar que la otra no se describe ni se trata como cerrada por esta acción.

**Acceptance Scenarios**:

1. **Given** acceso confirmado, **When** se elige «Cerrar sesión», **Then** se anuncia
   «Cerrando sesión», se oculta contenido protegido y no se permite otro cierre concurrente.
2. **Given** cierre en curso, **When** se confirma su éxito, **Then** se retira la identidad
   del recorrido y se muestra el acceso sin autenticar; recargar no restaura esa sesión.
3. **Given** cierre en curso, **When** se confirma que la sesión ya no es válida,
   **Then** se pasa a acceso sin autenticar, sin afirmar que se cerraron otras sesiones.
4. **Given** una respuesta perdida o fallo de cierre, **When** no se confirma el resultado,
   **Then** se muestra «No pudimos confirmar el cierre», sin contenido protegido ni
   suponer revocación servidor. Un reintento explícito comprueba primero la sesión:
   si falta, se muestra acceso sin autenticar; si sigue válida, se repite el cierre;
   si la comprobación falla, permanece el cierre no confirmado con opción de reintento.

### User Story 4 - Reconocer cambios de acceso durante el uso (Priority: P1)

Como personal que ya entró, quiero una explicación segura si una operación deja de
estar permitida, sin conservar privilegios antiguos ni repetir cambios de forma inadvertida.

**Why this priority**: Una sesión abierta no garantiza permisos ni estado de cuenta futuros.

**Independent Test**: Con respuestas controladas de las capacidades protegidas existentes,
ensayar falta de sesión, permiso insuficiente e indisponibilidad. No exige crear otra pantalla
ni implementar gestión de cuentas como parte de esta feature.

**Acceptance Scenarios**:

1. **Given** acceso abierto, **When** una operación informa sesión no válida,
   **Then** se retira contenido protegido, se pide nuevo ingreso y una respuesta antigua
   no puede volver a mostrar el contenido retirado.
2. **Given** una operación denegada por permisos o estado, **When** se recibe esa denegación,
   **Then** se oculta su contenido y se informa «No tienes acceso a esta operación»;
   no se diagnostica vencimiento y se vuelve a comprobar el acceso general.
3. **Given** esa nueva comprobación, **When** la sesión sigue siendo válida,
   **Then** permanece autenticado con identidad vigente y la operación sigue denegada;
   si ya no hay sesión se solicita login, y si no se puede comprobar se bloquea el acceso
   sin declarar una causa no confirmada.
4. **Given** una operación no confirmada por indisponibilidad, **When** se recupera el acceso,
   **Then** no se repite automáticamente la mutación original ni se afirma que fue revertida;
   su reconciliación corresponde a la feature propietaria de esa operación.

### Edge Cases

- Enter y clic repetidos durante el mismo envío: un único intento pendiente y un anuncio de progreso.
- Una respuesta antigua de comprobación llega después de cerrar o de iniciar otro recorrido:
  no restaura identidad ni contenido. Un éxito de login tardío no se acepta como sesión cerrada;
  antes de continuar se reconcilia el estado actual sin prometer que el envío nunca ocurrió.
- La conexión se pierde después de enviar login o cierre: resultado desconocido, no fracaso
  de credenciales ni éxito de cierre. Recuperación conforme a FR-006 y Q2.
- Cuenta inactivada o rol incoherente durante uso: puede resultar en denegación general o
  por operación; la UI no deduce el estado de la cuenta a partir del mensaje genérico.
- Se llega directamente o mediante historial a un destino protegido: se comprueba acceso
   antes de mostrar contenido. No se conserva ni se reproduce el destino previo;
    después del ingreso se muestra únicamente el estado autenticado mínimo.
  La restauración bfcache no se considera un montaje nuevo garantizado: se deben probar
  ocultación/abandono y restauración, no solo recarga. Si el navegador no restaura desde
  bfcache, registrar esa limitación y verificar también el caso controlado equivalente.
- Recarga tras sesión vencida: sin evidencia previa, se presenta acceso no autenticado;
  no se inventa un diagnóstico de vencimiento.
- Dos sesiones independientes: cerrar una no significa cerrar todas. No se promete
  sincronización instantánea entre pestañas ni detección de revocación sin consulta/respuesta.
- Cambiar la hora del dispositivo, escribir, mover el mouse o consultar sesión no permite
  prometer prolongación del acceso ni un contador exacto de inactividad.
- Respuesta inesperada o incompleta: no conceder acceso, no mostrar datos técnicos o secretos;
  informar que no se pudo confirmar y permitir recuperación sin un bucle de reintentos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El acceso DEBE limitarse al personal ADMIN/TEACHER y usar correo y contraseña.
  La elegibilidad y permisos se rigen por las fuentes canónicas B11–B13 y B17–B21,
  no por reglas de negocio duplicadas en la UI. Comprobación: historias 1 y 4.
- **FR-002**: Toda entrada o recarga DEBE comenzar con acceso sin comprobar y sin contenido
  protegido; lo mismo aplica al restaurar mediante historial/bfcache. Antes de abandonar
  u ocultar una página autenticada se DEBE retirar su identidad renderizable para que
  el DOM restaurado no muestre acceso anterior mientras se revalida. Solo una confirmación
  vigente permite reconocer acceso. Comprobación: historia 2, incluidos escenarios 1 y 6.
- **FR-003**: El formulario DEBE exigir correo con formato válido y contraseña no vacía,
  sin imponer al login las reglas de creación/cambio de contraseña ni inventar validación
  institucional de dominio en este formulario. Un rechazo de entrada sin detalle por campo
  DEBE mostrarse como corrección general, no atribuirse a un campo inventado. Historia 1.2.
- **FR-004**: La interfaz DEBE distinguir entrada inválida, credenciales inválidas, ausencia
  de sesión, acceso que dejó de ser válido, permiso insuficiente e indisponibilidad, sin
  enumerar cuentas ni inferir causas que el servidor no distingue. Historias 1, 2 y 4.
- **FR-005**: Envío y cierre DEBEN anunciar su estado pendiente e impedir activaciones
  duplicadas; respuestas obsoletas NO DEBEN sobreescribir un estado de acceso más reciente.
  Los errores DEBEN permitir corregir o recuperar sin recargar obligatoriamente toda la aplicación.
- **FR-006**: Ante login de resultado desconocido, se DEBE comprobar la sesión antes de
  reenviar credenciales: si es válida continuar según Q1; si falta, permitir un nuevo intento;
  si no se puede comprobar, mantener acceso sin confirmar y permitir reintentar comprobación.
- **FR-007**: Se DEBE ofrecer cierre de la sesión actual; solo confirmación de cierre o de
  ausencia de sesión permite abandonar el estado de cierre incierto. No prometer cierre global.
- **FR-008**: Ante pérdida confirmada de sesión se DEBE retirar información protegida y pedir
  nuevo ingreso, sin repetir automáticamente la operación original. Ante permiso denegado
  se DEBE comprobar la sesión antes de tratarlo como pérdida general de acceso. Historia 4.
- **FR-009**: La identidad y el rol recibidos DEBEN servir para informar la experiencia,
  nunca como autorización de operaciones; no se DEBE restaurar acceso por datos cacheados.
- **FR-010**: No se DEBE presentar actividad local, consulta de sesión o intento rechazado
  como renovación de inactividad. No habrá contador exacto, cuenta atrás ni mantenimiento
  artificial de sesión; la política se referencia en B11 FR-005, no se redefine.
- **FR-011**: Los campos DEBEN tener etiquetas asociadas, acceso por teclado, foco visible,
  correo identificado como usuario de acceso y contraseña como contraseña actual. Se DEBE
  permitir pegar y usar gestores de contraseñas. Progreso y errores DEBEN ser anunciables,
  y errores asociados a campos cuando exista evidencia; sin trampas de foco ni cambios
  de foco durante escritura por respuestas tardías. Al concluir un recorrido, el foco DEBE
  quedar en su título o mensaje principal; al fallar, en el primer campo inválido o resumen.
- **FR-012**: Contraseñas y credenciales de sesión NO DEBEN aparecer en logs, URLs de
  navegación creadas por la UI, mensajes, errores o telemetría. No se DEBEN reenviar
  contraseñas fuera del envío explícito de login ni persistirlas como estado de acceso.
- **FR-013**: No se DEBEN ofrecer Google, registro público, MFA, selectores de estudiante,
  recuperación implementada, enlace de recuperación ni «recordarme» en esta iteración.
  No se DEBE enviar el parámetro `rememberMe`, ni siquiera con un valor por defecto.
- **FR-014**: La salida tras ingreso y comprobación válidos DEBE respetar el alcance sin
  destinos ficticios: un estado autenticado mínimo con identidad propia y «Cerrar sesión»,
  sin dashboard ni módulos adicionales. No se DEBE conservar el destino previo ni mostrar
  navegación a recuperación. Comprobación: historias 1.4 y 2.2 y entrada directa de Edge Cases.
- **FR-015**: La indisponibilidad al comprobar o cerrar DEBE conservar el acceso bloqueado
  sin afirmar ausencia de sesión o cierre confirmado. Al comprobar se DEBE mostrar un
  estado separado «No pudimos comprobar tu acceso», con reintento manual y sin login
  operativo. Ante cierre incierto se DEBE mostrar «No pudimos confirmar el cierre»;
  el reintento explícito DEBE comprobar primero sesión y salir si falta, repetir el cierre
  si sigue válida o mantener incertidumbre si falla la comprobación. Historias 2.5 y 3.4.
- **FR-016**: La integración futura DEBE usar sesión persistida válida, no JWT aislado,
  y no fijar almacenamiento inseguro. La elección entre cookie y token opaco y sus condiciones
  de seguridad quedan para el plan y DEBEN resolverse antes de integrar. La ausencia del
  control y parámetro `rememberMe` se DEBE comprobar en todos los envíos de la historia 1;
  no se promete una política de persistencia concreta por omitirlo.

### Key Entities *(include if feature involves data)*

- **Identidad del personal**: Identidad propia confirmada con nombre, correo y rol vigente.
  Su identificador no se presupone igual al identificador de cuenta de negocio.
- **Estado de acceso**: Sin comprobar, comprobando, no autenticado, enviando ingreso,
  autenticado, acceso ya no válido, comprobación indisponible, cierre pendiente o cierre
  no confirmado. Permiso denegado es resultado de una operación, no prueba de logout.
- **Sesión actual**: Acceso individual cuya validez decide el servidor; la fecha de
  expiración recibida no informa por sí sola última actividad protegida aceptada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Estas son metas de aceptación futuras, no resultados de pruebas ejecutadas ni nuevas
metas de rendimiento o usabilidad institucionalmente aprobadas.

- **SC-001**: En el 100 % de casos de entrada/recarga de la historia 2, no se muestra
  contenido protegido antes de confirmar acceso; los casos válidos no exigen otra contraseña.
- **SC-002**: El 100 % de los rechazos por credenciales de la historia 1.5 muestra el mismo
  mensaje; entrada inválida e indisponibilidad tienen mensajes diferenciados y accionables.
- **SC-003**: En los casos de cierre confirmado, el 100 % deja el recorrido sin acceso
  actual; ninguno anuncia cierre global ni éxito ante resultado incierto.
- **SC-004**: En el 100 % de los escenarios de denegación y respuestas tardías, no reaparece
  contenido retirado ni se repite automáticamente una operación; un permiso insuficiente
  con sesión confirmada no se describe como sesión vencida.
- **SC-005**: Los recorridos de ingreso, corrección, comprobación recuperable y cierre
  pueden completarse íntegramente con teclado; cada campo tiene nombre accesible y cada
  transición de progreso/error produce un mensaje anunciable en la revisión de accesibilidad.
- **SC-006**: En todos los escenarios definidos, se registran cero contraseñas o credenciales
  de sesión en URLs de navegación de la UI, mensajes, logs o telemetría inspeccionados.
- **SC-007**: En diez activaciones repetidas durante un mismo envío pendiente, se observa
  un único intento del formulario; después de recuperar conexión el usuario puede distinguir
  éxito, rechazo y resultado todavía no confirmado sin asistencia técnica.

## Assumptions

- **Objetivo y actores**: especificación frontend exclusiva para profesores con rol técnico
  ADMIN/TEACHER. Precondiciones del acceso válido: cuenta e identidad habilitadas por backend,
  contraseña establecida y servicio accesible; el formulario no habilita cuentas.
- **Exclusiones de la fase specify original**: implementación visual, código, integración,
  dependencias, plan y tareas. Posteriormente se autorizó plan y correcciones backend
  separadas; no se implementó frontend. Se mantienen excluidos de la feature:
  login de estudiantes, Google, registro público, MFA, recuperación implementada,
  invitaciones, cambio de correo, cuentas/roles, ascensos, auditoría, Académico, Tareas,
  Evolución, Seguimiento, dashboards y cambios o endpoints nuevos backend.
- **Fuentes**: [evidencia por capacidad y registro completo](sources.md), revisión inicial
  estática del 2026-10-25, ampliada con validación ejecutada y correcciones autorizadas
  en [backend-fixes.md](backend-fixes.md). No se verificó despliegue real ni UI frontend.
  Fuentes de análisis/diseño/V3 mantienen su condición de propuestas donde corresponda.
- **Dependencias**: contratos y configuración de sesión, origen de SPA y capacidades actuales
  backend. Las denegaciones son una conducta transversal para futuras features aprobadas,
  no autorización para construir sus pantallas en este alcance.
- **Supuestos de presentación**: textos en español; no se pide elegir rol. No se supone
  conexión estable ni detección instantánea de revocación. La identificación de una sesión
  anterior perdida solo usa evidencia del recorrido actual, no un diagnóstico del navegador.
- **Decisiones confirmadas**: constitución frontend 1.0.0 ratificada por el responsable;
  correo/contraseña, actores y alcance original. Inactividad y cierre se referencian en
  spec backend 003. El responsable confirmó además Q1: A, Q2: A y Q3: A en esta conversación.

### Aclaraciones confirmadas

- **Q1 — Navegación (FR-014), opción A confirmada**: un estado autenticado con identidad propia
  y «Cerrar sesión», sin dashboard ni módulos; no conservar destino previo en esta iteración
  ni mostrar enlace de recuperación. Agregar navegación de recuperación o conservación
  de destinos requerirá una decisión posterior de alcance, no una suposición del plan.
- **Q2 — Indisponibilidad (FR-015), opción A confirmada**: estado separado «No pudimos comprobar
  tu acceso» con reintento manual, sin login operativo mientras la comprobación sea incierta.
  Para cierre: «No pudimos confirmar el cierre», contenido oculto y reintento explícito;
  reconciliar primero: sin sesión equivale a salida, con sesión válida repetir el cierre
  solicitado, y si falla la comprobación mantener incertidumbre. No ofrecer «cerrar solo
  localmente» como si revocara acceso servidor.
- **Q3 — Contrato y decisiones técnicas (FR-016), opción A confirmada**: no mostrar «recordarme» ni
  enviar `rememberMe`; no fijar almacenamiento ni transporte en specify. Se resolverá
  el transporte con evidencia de despliegue y seguridad
  antes de integrar.

### Decisiones que pueden esperar a `/speckit.plan`

- Cookie frente a token opaco, atributos/orígenes, persistencia, protección frente a
  falsificación de solicitudes y tratamiento de credenciales, conforme a Q3 confirmada.
  Código permite ambas modalidades; no demuestra cuál debe usar esta SPA.
- Mecanismo para descartar respuestas obsoletas, coordinación de solicitudes, tiempos
  de espera y política de reintento. Los resultados observables ya se exigen arriba.
- Respuestas delegadas a Better Auth en cierre: verificar contrato de éxito/errores
  efectivo antes de integrar, sin asumir normalización completa del wrapper (ver sources).

Q1–Q3 están resueltas. Durante la planificación solicitada se detectaron discrepancias
de revocación y continuidad de sesión: P-01/P-02 en [research.md](research.md).
Se corrigieron y revalidaron con autorización explícita; usar la revisión backend
identificada en [backend-fixes.md](backend-fixes.md), no asumir merge a main.
Siguiente paso posible: `/speckit.tasks`, sin iniciar implementación automáticamente.
