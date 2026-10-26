---
description: "Tareas frontend de autenticación del personal ADMIN/TEACHER"
---

# Tasks: Autenticación del personal

**Input**: Documentos de `specs/001-autenticacion-personal/`.
**Branch**: `feat/frontend-authentication`.
**Prerequisites**: [plan](plan.md), [spec](spec.md), [research](research.md),
[data-model](data-model.md), [contratos](contracts/auth-client.md),
[UI](contracts/ui-contract.md), [quickstart](quickstart.md) y constitución 1.0.0.

**Estado:** 35/38 completadas; T026, T033 y T034 parcialmente verificadas y pendientes
de cierre de aceptación (dos perfiles, teclado/lector e integración completa).
Ampliación visual T039–T046: 8/8 completadas, total 43/46. Los tres pendientes del
núcleo no se cierran por el rediseño; resultados nuevos al final de este documento.
Puerto local backend 3001 autorizado posteriormente por el responsable (proxy ajustado).
Evidencia y límites en [validation.md](validation.md).
Las pruebas concretan los escenarios/criterios verificables de spec y la estrategia
expresa de pruebas del plan; no se introduce un framework de tests ni TDD global adicional.
Escribir los casos de cada bloque antes de su implementación, observar el fallo pertinente
y ejecutar otra vez después; un error de configuración no prueba el requisito.

**Organization**: Cuatro historias P1, con pruebas independientes mediante estados y
transporte sintéticos. La integración de la raíz completa requiere las cuatro.

## Format: `[ID] [P?] [Story] Description`

Cada línea ejecutable usa checkbox, T001–T046 (38 originales + 8 visuales), `[P]` solo para archivos distintos y
`[USn]` solo en fases de historia. `[P]` permite ejecución paralela **después** de
cumplir sus prerrequisitos, no ignorarlos. No ejecutar dos tareas sobre el mismo archivo.

## Path Conventions

- `src/`, `tests/`, `package.json`, `tsconfig.json`, `vite.config.ts` son relativos a la
  raíz frontend. No existe un subdirectorio adicional `frontend/` o `backend/` aquí.
- La evidencia nueva se registra en `specs/001-autenticacion-personal/validation.md`.
  No sobrescribir los informes históricos `backend-validation.md` o su harness.
- Backend corregido: `/tmp/opencode/kudlab-auth-backend-validation`, rama
  `fix/session-cookie-guarantees`, base `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`
  más cambios locales exactos/hashes de [backend-fixes](backend-fixes.md). Main no los
  contiene automáticamente. Usar esa revisión o integración revisada para pruebas reales.
- No se implementan más correcciones backend, endpoints, dashboards, recuperación,
  estudiantes, router, SDK ni dependencias nuevas mediante estas tareas.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar comprobaciones y configuración mínima sobre la base existente,
sin reinicializar proyecto ni instalar paquetes nuevos.

- [x] T001 Verificar worktree/rama/estado frontend, Node 24 y revisión backend corregida comparando commit y hashes de `specs/001-autenticacion-personal/backend-fixes.md`; contrastar `docs/api/openapi.yaml` y montaje auth del worktree backend identificado, sin editarlo ni hacer merge; registrar versiones, cambios locales, fuentes y resultado de `npm ci` en `specs/001-autenticacion-personal/validation.md`; detener integración si no coincide la revisión.
- [x] T002 [P] Añadir `test:auth` con `node --test tests/auth/*.test.mjs` en `package.json` y habilitar `allowImportingTsExtensions` y `erasableSyntaxOnly` conservando `noEmit` en `tsconfig.json`; incluir `tests/browser/**/*.tsx` en typecheck para el harness U1, sin importarlo al build; mantener `npm test` como tipos, Node 24, dependencias y `package-lock.json` sin cambios de paquetes.
- [x] T003 [P] Configurar exclusivamente proxy local `/api` a `http://localhost:3000` en `vite.config.ts`, conservando Origin y plugins existentes; usar frontend localhost:5173, sin URL API/secretos VITE, cambios de CORS ni configuración productiva.
- [x] T004 [P] Revisar `AGENTS.md`, constitución y disponibilidad de skills antes de implementar UI; registrar en `specs/001-autenticacion-personal/validation.md` las disponibles/usadas o su ausencia y límites; mantener semántica nativa/contrato aprobado sin adoptar bibliotecas visuales, demos, públicos o funcionalidades adicionales.

**Checkpoint**: Configuración y dependencia backend identificadas; skills ausentes
declaradas, sin fingir uso. T002/T003/T004 pueden avanzar después de T001.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Modelo y primitivas compartidas; no completar las historias dentro de setup.
**CRITICAL**: Ninguna fase de historia comienza antes de T005–T008.

- [x] T005 Escribir pruebas de estado inicial, invariantes de identidad visible solo autenticada y descarte de eventos de generación anterior en `tests/auth/state.test.mjs`, usando `node:test`/`node:assert/strict`, datos sintéticos y sin importar JSX, React o el harness backend histórico.
- [x] T006 Definir entidades, estados/eventos y transición inicial pura en `src/auth/state.ts` conforme a `data-model.md`: identidad `id/email/name/role` con «Cadenas según contrato; `role` ADMIN o TEACHER. Solo procede de respuesta válida actual. `id` es identidad Better Auth, no cuenta de negocio»; resultados como «Unión discriminada de resultados, no excepción con cuerpo HTTP crudo. No incluye tokens ni contraseña»; estados `checking`, `signedOut`, `signingIn`, `authenticated`, `checkUnavailable`, `signingOut`, `signOutUnconfirmed`, sin booleanos contradictorios ni identidad renderizable fuera de `authenticated`; pasar T005.
- [x] T007 Crear transporte y type guards compartidos con fetch inyectable en `src/auth/client.ts`, incluyendo GET `/api/auth/get-session` para reconciliación: rutas relativas fijas, `credentials:'same-origin'`, `cache:'no-store'`, `redirect:'error'`, Accept JSON y señal; reconstruir solo campos conocidos y aplicar a `session.id/expiresAt` «En comprobación exitosa se exige forma esperada y fecha válida. Fecha no equivale a última actividad; no se deriva contador ni permiso»; no copiar tokens/headers/cuerpos crudos; JSON/status/código inesperados, red y abortos son `unconfirmed`.
- [x] T008 Crear la fábrica y suscripción/snapshot estables del controlador en `src/auth/controller.ts`, sin red durante construcción/render, con generación, id de operación, tipo e intención de cierre: «Metadatos locales sin credenciales. Permiten aceptar únicamente resultados de la operación vigente. Intención de cierre se conserva durante su recuperación»; bloqueo síncrono, fetch/reloj inyectables, AbortController, espera técnica 15s, limpieza y asentamiento del transporte antes de reconciliar; no implementar destinos ni autoridad de permisos.

**Checkpoint**: Tests de invariantes pasan y módulos puros se comprueban con tipos;
primitivas compartidas disponibles. Las transiciones específicas se añaden por historia.

## Phase 3: User Story 1 — Entrar con correo y contraseña (Priority: P1)

**Goal**: Ingreso válido o rechazo comprensible sin enumeración, doble envío ni secretos.
**Independent Test**: Controlador en fixture `signedOut` tras comprobación, ambos roles,
entrada incorrecta, 400/401/503, promesas tardías y diez activaciones. No depende de
pantallas académicas ni requiere US2 implementada para ejercitar esa fixture.

### Tests for User Story 1

- [x] T009 [P] [US1] Añadir casos de contrato de ingreso en `tests/auth/client.test.mjs`: POST `/api/auth/sign-in/email` solo email/password, sin `rememberMe`, headers de token ni Authorization; 200 exige identidad válida, 400 INVALID_INPUT y 401 INVALID_CREDENTIALS se distinguen, 503/red/JSON/cuerpo/status inesperados son no confirmados; probar descarte de campos sensibles adicionales.
- [x] T010 [P] [US1] Añadir casos US1 en `tests/auth/controller.test.mjs`: éxito ADMIN/TEACHER, rechazo uniforme, diez envíos producen un intento, respuesta de generación anterior ignorada y timeout/red tras login consultan sesión antes de otro ingreso; consulta válida/ausente/fallida lleva a estados correctos, sin replay de contraseña ni credenciales en snapshots.

### Implementation for User Story 1

- [x] T011 [US1] Implementar `signIn` en `src/auth/client.ts` conforme a contrato y T009, con cuerpo exclusivo email/password y normalización por endpoint/status/código; no validar dominio institucional o política de contraseña de alta ni mostrar mensajes arbitrarios del proveedor.
- [x] T012 [US1] Añadir eventos/transiciones US1 en `src/auth/state.ts` y coordinación en `src/auth/controller.ts`: bloquear envío síncronamente, reconciliar login incierto mediante getSession tras asentarse transporte, impedir otro ingreso mientras siga incierto y descartar resultados obsoletos sin cambios de foco; pasar T010 sin guardar contraseña en estado global.
- [x] T013 [US1] Crear presentación de formulario y estado autenticado mínimo en `src/auth/AuthRoot.tsx` con controlador inyectable por raíz; aplicar «Correo requerido con formato válido, contraseña no vacía. No aplicar política de alta ni restricción de dominio extra. Limpiar contraseña al terminar envío y al abandonar formulario; no copiarla a estado global»; etiquetas Correo/Contraseña, nombres email/password, tipos email/password, autocomplete username/current-password, pegar/gestores, botón submit, mensajes anunciables, foco al primer inválido o resumen; sin enlaces/roles seleccionables ni otros módulos.
- [x] T014 [US1] Ejecutar casos Node US1 e inspeccionar `src/auth/AuthRoot.tsx` para uniformidad del mensaje, autocompletado, limpieza de contraseña y ausencia de destinos/controles excluidos; registrar comandos, resultados y límites de la fixture en `specs/001-autenticacion-personal/validation.md`, sin declararlos prueba de navegador o MVP entregable.

**Checkpoint**: Slice US1 comprobable con estado de entrada preparado. No montar un
login que omita comprobación inicial: la raíz productiva se conecta en US2.

## Phase 4: User Story 2 — Entrar o recargar con sesión existente (Priority: P1)

**Goal**: Comprobar antes de mostrar identidad o formulario y recuperar indisponibilidad.
**Independent Test**: Fixture getSession con sesión válida, ausente, inválida, caída o
respuesta antigua; montar/desmontar y simular volver a visible. No necesita login real.

### Tests for User Story 2

- [x] T015 [P] [US2] Completar contrato getSession en `tests/auth/client.test.mjs`: identidad y session.id/expiresAt válidas, fecha/campos/rol inválidos, 401 UNAUTHENTICATED, 503 y JSON inesperado; comprobar opciones de fetch, sin credenciales JavaScript ni inferencia de inactividad a partir de expiresAt.
- [x] T016 [P] [US2] Añadir US2 en `tests/auth/controller.test.mjs`: checking inicial, válida sin contraseña, ausencia sin anuncio de vencimiento, pérdida previamente confirmada, caída/reintento, doble montaje/cleanup StrictMode y resultados tardíos; añadir C1 con ocultación/pagehide, restauración pageshow persisted=true sin remontaje y visibilitychange de la misma activación: identidad retirada síncronamente, una comprobación efectiva y rechazo de generaciones anteriores, sin polling ni identidad en snapshots no autenticados.

### Implementation for User Story 2

- [x] T017 [US2] Implementar arranque, consulta/reintento y suspensión/restauración US2 en `src/auth/controller.ts` y `src/auth/state.ts`: ocultación/pagehide retira identidad e invalida esperas sin consultar en segundo plano; pageshow/visibilidad recuperada comprueban sin remontaje, deduplican activación y conservan contexto/intención de cierre; no restaurar identidad/destino desde almacenamiento ni admitir respuesta antigua; pasar T015/T016.
- [x] T018 [US2] Completar en `src/auth/AuthRoot.tsx` checking, sesión ausente/perdida e indisponibilidad con reintento manual; retirar identidad del DOM síncronamente al suspender para que bfcache no restaure contenido anterior durante comprobación, no solo vaciar snapshot; mantener foco/anuncios ligados a transición vigente y sin contador, formulario operativo o identidad durante checking/indisponibilidad.
- [x] T019 [US2] Montar únicamente AuthRoot en `src/App.tsx` conservando StrictMode de `src/main.tsx`; en `src/auth/AuthRoot.tsx` conectar listeners pagehide/pageshow/visibilitychange a la suspensión/restauración del controlador, retirarlos al limpiar y no añadir unload/beforeunload; crear controlador una vez por raíz, sin red en render, router ni estado externo; pasar T016 sin duplicar comprobación por activación.
- [x] T020 [US2] Crear harness U1 de desarrollo en `tests/browser/auth-harness.html` y `tests/browser/auth-harness.tsx`, más `tests/browser/history-target.html`, montando AuthRoot real con fetch manual sin red, promesas retenidas, panel de respuestas sintéticas sin globals y eventos pagehide/pageshow persisted; seguir la receta de `specs/001-autenticacion-personal/quickstart.md` para login incierto, foco y C1 controlado/navegación real; validar también raíz real con/sin cookie y API caída, y registrar en `specs/001-autenticacion-personal/validation.md` persisted observado/casos no verificados sin confundir simulación con bfcache real.

**Checkpoint**: Entrada/recarga seguras y US1 integrada. Sigue siendo un incremento
interno hasta disponer de cierre y tratamiento transversal.

## Phase 5: User Story 3 — Cerrar únicamente la sesión actual (Priority: P1)

**Goal**: Cierre individual confirmado o incertidumbre explícita, sin éxito anticipado.
**Independent Test**: Controlador preparado autenticado; respuestas de cierre y sesión
inyectadas. Para integración usar dos perfiles de navegador contra backend corregido.

### Tests for User Story 3

- [x] T021 [P] [US3] Añadir contrato signOut en `tests/auth/client.test.mjs`: POST `/api/auth/sign-out` sin cuerpo, 200 solo con success exactamente true, 401 UNAUTHENTICATED como sesión no válida y 403/429/503/JSON/desconocidos como cierre no confirmado; no seguir redirecciones ni almacenar cabeceras del proveedor.
- [x] T022 [P] [US3] Añadir US3 en `tests/auth/controller.test.mjs`: retirada inmediata de identidad, doble cierre bloqueado, éxito/401, pérdida de respuesta, timeout, reintento manual que consulta primero y solo vuelve a cerrar si sigue válida; consulta fallida y suspensión/restauración C1 conservan intención sin identidad, y respuestas antiguas no reabren acceso ni compiten con otro login.

### Implementation for User Story 3

- [x] T023 [US3] Implementar signOut en `src/auth/client.ts` conforme a T021, sin opciones callback/redirección, cierre global ni inferencia de éxito ante error de red; apoyarse en garantía persistida de backend-fixes, no comprobarla guardando/reutilizando tokens en JavaScript.
- [x] T024 [US3] Añadir cierre y reconciliación US3 en `src/auth/state.ts` y `src/auth/controller.ts`: conservar intención hasta confirmar salida, consultar primero al reintentar, permanecer bloqueado si no se comprueba y no exponer identidad si la consulta requiere repetir cierre; pasar T022 sin reintentos automáticos de mutaciones.
- [x] T025 [US3] Completar en `src/auth/AuthRoot.tsx` botón Cerrar sesión, «Cerrando sesión» y «No pudimos confirmar el cierre» con Reintentar, ocultando identidad desde la intención de cierre y gestionando foco/anuncios sin éxito anticipado; nunca describir la acción como cerrar todas las sesiones.
- [ ] T026 [US3] Completar controles de cierre/respuesta perdida/reintento en `tests/browser/auth-harness.tsx` según receta U1 de `specs/001-autenticacion-personal/quickstart.md`; verificar orden de llamadas, identidad/foco y conservación de cierre incierto al restaurar C1; probar además cierre/recarga de dos perfiles contra backend corregido y registrar evidencia real frente a fixture en `specs/001-autenticacion-personal/validation.md`, sin copiar cookies ni usar base de otro worktree.

**Checkpoint**: Ingreso/comprobación/cierre completos para demostración interna; no
marcar piloto listo ni omitir US4, que también es P1.

## Phase 6: User Story 4 — Reconocer cambios de acceso durante el uso (Priority: P1)

**Goal**: Denegaciones vigentes diferenciadas y sin conservar privilegios o repetir cambios.
**Independent Test**: Inyectar 401/403/verificación indisponible con generación actual
y anterior en la interfaz transversal; no requiere construir gestión de cuentas u otros módulos.

### Tests for User Story 4

- [x] T027 [P] [US4] Añadir casos US4 al reducer en `tests/auth/state.test.mjs`: 401 actual retira identidad, 403 inicia comprobación sin diagnosticar vencimiento, aviso persiste si la sesión sigue válida y fallo bloquea acceso; eventos de generación anterior no alteran estado actual.
- [x] T028 [P] [US4] Añadir casos de coordinación US4 en `tests/auth/controller.test.mjs`: notificación tipada con generación/categoría, 403 con consulta válida/401/fallida, 401 durante otra espera, verificación indisponible y respuesta tardía; comprobar que nunca se recibe cuerpo/petición original ni se reejecuta una mutación de negocio.

### Implementation for User Story 4

- [x] T029 [US4] Implementar notificación transversal y transiciones US4 en `src/auth/controller.ts` y `src/auth/state.ts`, sin interceptor global ni cliente de negocio: recibir solo generación y categoría, ignorar obsoletos y conservar aviso genérico con la restricción «No concede ni persiste permisos. Se mantiene al confirmar sesión tras 403, para no ocultar el motivo de la operación denegada»; pasar T027/T028.
- [x] T030 [US4] Completar avisos US4 y retirada de contenido en `src/auth/AuthRoot.tsx`: «No tienes acceso a esta operación» y «Tu sesión ya no es válida. Inicia sesión de nuevo» según evidencia, sin confundir 403 de auth con permiso de negocio ni revelar causa/cuenta; no habilitar acciones por rol cacheado ni crear pantallas protegidas ajenas.
- [x] T031 [US4] Completar panel U1 en `tests/browser/auth-harness.tsx` con notificaciones tipadas 401/403/indisponibilidad de generación actual/anterior y respuestas fuera de orden, usando AuthRoot/controlador reales sin solicitudes de negocio; ejecutar la receta de `specs/001-autenticacion-personal/quickstart.md` y la matriz de `tests/auth/controller.test.mjs`, verificar avisos/foco, y registrar evidencia diferenciada en `specs/001-autenticacion-personal/validation.md`, sin globals, hooks públicos ni endpoints debug.

**Checkpoint**: Las cuatro historias P1 tienen sus casos verificables; resta validación
transversal real y documentación antes de afirmar entrega.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación de seguridad/accesibilidad/integración, sin ampliar diseño ni módulos.

- [x] T032 Auditar y completar casos de secretos/respuestas obsoletas en `tests/auth/client.test.mjs`, `tests/auth/state.test.mjs` y `tests/auth/controller.test.mjs`; revisar `src/auth/` para cero contraseñas/credenciales en snapshots, URLs, logs/telemetría, errores o almacenamiento, sin leer set-auth-token/JWT, sin rememberMe y sin polling; registrar hallazgos sin payloads sensibles en `specs/001-autenticacion-personal/validation.md`.
- [ ] T033 Revisar teclado, nombres/descripciones accesibles, autocomplete/gestores, pegado, progreso/error anunciables y foco en navegador y lector de pantalla sobre `src/auth/AuthRoot.tsx`; ajustar únicamente semántica y foco/estados necesarios en `src/auth/AuthRoot.tsx` y `src/styles.css`, sin nuevas paletas/suites; registrar en `specs/001-autenticacion-personal/validation.md` lector/versiones y evidencia, o limitación explícita si no está disponible, sin fingir aprobación asistiva.
- [ ] T034 Ejecutar integración local de las cuatro historias siguiendo `specs/001-autenticacion-personal/quickstart.md` y la revisión backend de `specs/001-autenticacion-personal/backend-fixes.md`; comprobar HttpOnly/SameSite, Set-Cookie renovada a través de proxy, cierre individual y ausencia de mantenimiento artificial usando cuentas sintéticas y fixture externa autorizada para actividad protegida, nunca nuevas llamadas de negocio en la UI; registrar resultados en `specs/001-autenticacion-personal/validation.md`.
- [x] T035 Documentar en `specs/001-autenticacion-personal/validation.md` el gate separado de despliegue HTTPS mismo origen: TLS, Secure, Origin/Host/Set-Cookie preservados y caché auth desactivada; comprobarlo si existe entorno autorizado, o dejar pendiente operativo explícito sin certificar producción ni instalar proxy/infraestructura fuera de alcance.
- [x] T036 Actualizar `README.md`, `docs/agent-context/modules/usuarios/capabilities.md`, `specs/001-autenticacion-personal/sources.md` y `specs/001-autenticacion-personal/quickstart.md` con comandos/archivos realmente disponibles, estado frontend y revisión backend usada; preservar historia de P-01/P-02 y distinguir cambios locales de merge, pruebas Node, navegador y pendientes operativos.
- [x] T037 Ejecutar `npm ci`, `npm test`, `npm run test:auth`, `npm run build` y `git diff --check`; comprobar tipos del harness y que `dist/` no contiene páginas/controles/entrypoints de `tests/browser/` ni se importan desde `src/`, `index.html` o `public/`; registrar resultados en `specs/001-autenticacion-personal/validation.md`, sin cambios de paquetes ni confundir tests Node con accesibilidad, integración o bfcache real.
- [x] T038 Revisar cobertura FR-001–016 y SC-001–007 de `specs/001-autenticacion-personal/spec.md` contra resultados de `specs/001-autenticacion-personal/validation.md`; resumir historias completas/incompletas, dependencias backend y límites de accesibilidad/despliegue sin inventar resultados ni piloto listo; entregar revisión y esperar autorización antes de ampliar alcance o desplegar.

## Dependencies & Execution Order

### Phase Dependencies

```text
T001
  └─ T002 + T003 + T004 (archivos distintos; paralelizables)
       └─ T005 → T006 → T007 → T008
            └─ US1 T009–T014
                 └─ US2 T015–T020
                      └─ US3 T021–T026
                           └─ US4 T027–T031
                                └─ T032 → T033 → T034 → T035 → T036 → T037 → T038
```

La secuencia de integración es conservadora porque las historias amplían los mismos
cuatro módulos. Las pruebas/contratos permiten ejercitarlas independientemente mediante
estado y transporte sintéticos, no publicar una raíz que omita comprobación/cierre.

### User Story Dependencies

| Historia | Prerrequisito de prueba independiente | Dependencia de integración |
| --- | --- | --- |
| US1 | Foundation; fixture signedOut ya comprobada | La raíz se monta solo con US2; cierre llega con US3 |
| US2 | Foundation; respuestas getSession sintéticas | Integra formulario US1 y la raíz real |
| US3 | Foundation; fixture authenticated | Añade cierre a identidad y reusa getSession de reconciliación |
| US4 | Foundation; fixture autenticada y notificaciones tipadas | Integra invalidación con las esperas de ingreso/comprobación/cierre |

Después de cada par de pruebas, implementar cliente antes de coordinador/estado cuando
este lo consume, luego presentación y validación de historia. No ejecutar en paralelo
dos ediciones de `src/auth/controller.ts`, `src/auth/state.ts` o `src/auth/AuthRoot.tsx`.

### Parallel Opportunities

- Setup: T002 (`package.json`/`tsconfig.json`), T003 (`vite.config.ts`) y T004
  (`validation.md`), todos después de T001 y sin edición conjunta.
- US1: T009 (`client.test.mjs`) y T010 (`controller.test.mjs`).
- US2: T015 (`client.test.mjs`) y T016 (`controller.test.mjs`), después de US1 integrada.
- US3: T021 (`client.test.mjs`) y T022 (`controller.test.mjs`), después de US2 integrada.
- US4: T027 (`state.test.mjs`) y T028 (`controller.test.mjs`), después de US3 integrada.
- No se marca `[P]` en verificaciones que comparten registro o pruebas sobre la misma
  base; no ejecutar fixtures backend destructivas simultáneamente ni usar base compartida.

## Parallel Example: User Story 1

Con T001–T008 completas, escribir simultáneamente T009 en `tests/auth/client.test.mjs`
y T010 en `tests/auth/controller.test.mjs`. Unir resultados antes de T011–T014;
los tests todavía pueden fallar porque el comportamiento aún no está implementado.

## Parallel Example: User Story 2

Tras T014, extender `tests/auth/client.test.mjs` en T015 y
`tests/auth/controller.test.mjs` en T016; no tocar aún sus módulos de implementación
desde agentes distintos. Ejecutar T017–T020 secuencialmente.

## Parallel Example: User Story 3

Tras T020, escribir T021 en `tests/auth/client.test.mjs` y T022 en
`tests/auth/controller.test.mjs`. Luego implementar contrato/cierre/UI T023–T025 y
validar T026; no paralelizar dos sesiones de test que trunquen la misma base backend.

## Parallel Example: User Story 4

Tras T026, escribir T027 en `tests/auth/state.test.mjs` y T028 en
`tests/auth/controller.test.mjs`. Completar T029–T031 después del par de pruebas;
no crear un módulo de negocio para simular denegaciones.

## Implementation Strategy

### MVP First

US1 es una demostración técnica independiente con fixture, **no una entrega segura**:
comprobación inicial y cierre no pueden omitirse. El MVP de esta feature contiene las
cuatro historias P1, sin dashboard ni navegación extra. US1+US2+US3 permiten demostración
interna incremental; antes de entrega se requiere US4 y Phase 7. No prometer piloto
listo por terminar código, pasar typecheck o disponer de backend corregido.

### Incremental Delivery

1. Setup/Foundation sin nuevas dependencias; pruebas Node independientes de servidor.
2. Ingreso sobre fixture, luego entrada/recarga real, cierre y denegaciones transversales.
3. Conservar pruebas anteriores al añadir cada historia; comprobar resultados tras cada bloque.
4. Seguridad, navegador/lector de pantalla, integración y registro honesto de gate HTTPS.
5. Entregar revisión; commit/merge backend o despliegue no ocurren automáticamente.

### Review Before Implementation

Estas tareas no son autorización para ejecutar código ahora. El siguiente comando
recomendado es `/speckit.analyze`, exigido por constitución antes de implementar;
resolver inconsistencias y obtener autorización de implementación. Si falta revisión
backend, skill, lector de pantalla o entorno, declarar el límite y no falsear evidencias.

## Notes

- Cobertura: setup 4 + foundation 4 + US1 6 + US2 6 + US3 6 + US4 5 + cierre 7 = 38.
- Identidad/vista de sesión: T006/T007 y T009/T015; formulario: T013;
  operación/generación/intención: T008/T012/T024; aviso de denegación: T027–T030.
- FR-001,003,004,009,013: T009–T014; FR-002,010,014: T015–T020;
  FR-005,006: T008/T010/T012/T016; FR-007,015: T021–T026;
  FR-008: T027–T031; FR-011: T013/T018/T025/T030/T033;
  FR-012,016: T007/T009/T021/T032/T034. SC-001–007: T020/T026/T031–T038.
- No nuevas reglas de negocio, endpoints, pruebas con menores reales, diagnósticos,
  secret logging ni enlaces sin destino. Los roles son técnicos; solo profesores usan UI.
- Casillas actualizadas solo con evidencia. T026/T033/T034 siguen abiertas: no sustituir
  dos perfiles/teclado/lector por fixtures Node ni declarar aceptación completa.
- Remediaciones aprobadas C1/U1: T016–T020 cubren historial/bfcache y harness de
  navegador; T022/T026/T031 completan sus casos de cierre/denegación; T037 verifica
  tipos y exclusión de producción. Se conservan los 38 IDs y sus dependencias.
- I1 del análisis (redacción de US1.7 sobre correo corregible tras cualquier resultado)
  sigue como observación MEDIUM no aprobada para edición; no declarar que desapareció
  ni habilitar edición de cuenta autenticada por inferencia. No es un bloqueo crítico.

## Phase 8: Presentación gráfica autorizada sobre la misma feature

Autorización posterior: implementar shadcn y modificar solo plan/tasks como artefactos
SDD, sin repetir specify/plan/tasks ni crear otra feature. Manual externo y decisiones
exactas en «Ampliación visual» de plan.md. Feedback neutral aprobado en esta sesión;
no asignar colores semánticos. Las restricciones históricas de no dependencias/suites
se amplían únicamente para el catálogo y paquetes aprobados aquí.

- [x] T039 Verificar worktree basado en edcf759, leer manual/investigación/MCP/validación externos, comprobar skills/herramientas y revisión backend; registrar procedencia, autorización neutral y consistencia acotada en plan.md, conservando T026/T033/T034 e I1 pendientes.
- [x] T040 Incorporar solo Button, Input, Label, Card y Alert de shadcn adaptados, Base UI y Lucide; revisar licencias/peers, mantener atribución y registrar versiones, cn, components.json, alias y lock, sin ejecutar init destructivo ni instalar otra suite.
- [x] T041 Aplicar tokens, tipografía, geometría y estados aprobados en src/styles.css; sin colores semánticos inferidos, opacidad de texto, sombras, fuentes remotas o dark mode nuevo.
- [x] T042 Sustituir presentación de AuthRoot por catálogo compartido para acceso/identidad/comprobación/cierre/fallos; mantener refs, limpieza de contraseña, foco, mensajes, flushSync, listeners y controlador sin cambios de API ni rutas.
- [x] T043 Ejercitar AuthRoot real en harness: validación, credenciales incorrectas, diez envíos, incertidumbre/reintento, sesión vigente, cierre, denegaciones y suspensión DOM; registrar casos y fallos reales en esta sección, sin datos sensibles ni afirmar pruebas no ejecutadas.
- [x] T044 Revisar composición/contraste/foco a 320/390/768/1024/1440px, texto ampliado, reflujo y movimiento reducido; registrar evidencia/limitaciones, sin cerrar T033 por inferencia ni certificar lector o bfcache real.
- [x] T045 Ejecutar npm ci, npm test, npm run test:auth, npm run build, git diff --check y exclusión del harness de producción; revisar diff de dependencias y comprobar cliente/controlador/estado sin cambios.
- [x] T046 Actualizar únicamente plan.md/tasks.md en SDD con resultados y límites de esta ampliación; entregar URL de preview del worktree visual sin reemplazar ni detener servicios ajenos, sin commit/merge automático y sin declarar piloto listo.

Orden: T039 → T040 → T041 → T042 → T043 → T044 → T045 → T046.
Las tareas originales se conservan con sus 38 IDs/estado y evidencia histórica;
estas ocho tareas no convierten la aceptación pendiente en completada.

### Resultados reales T039–T046 — 2026-10-25

- Rama `feat/authentication-interface`, worktree `frontend-authentication-ui`, base
  edcf759. No se crea nueva feature ni se regenera spec/research/modelo/contratos.
  Solo plan/tasks modificados en SDD por autorización explícita. Sin hooks configurados.
- Manual externo de docs/design leído completo; hashes y procedencia en plan.
  Neutral Dark 1/blanco aprobado en pregunta explícita de esta sesión; no colores
  Error/Warning/Info/Success ni variante destructive de preset. Skills y MCP ausentes;
  se usó HTTP al registro oficial shadcn, no herramientas MCP inexistentes.
- Componentes shadcn adaptados manualmente desde registro base-nova, sin init/add.
  Button usa Base UI; Input conserva elemento nativo para no añadir almacén de valor
  que compita con refs, gestores y limpieza de contraseña. No se introduce Radix.
  Licencia MIT de shadcn en src/components/ui/LICENSE; versiones/peers en plan.
- npm añadió 13 paquetes (6 dependencias directas aprobadas y transitivas); no SDK,
  router, animación, formularios, calendario ni suite adicional. Lock actualizado con npm.
- Tokens centrales, fuente de sistema, blancos opacos, bordes/foco Dark 1, tamaños
  16/20/28, radios 8/12, control mínimo 44px, hover de marca e inactivo #F2F2F2.
  Iconos Lucide decorativos aria-hidden; nombres accesibles siguen siendo texto.

**Regresión DOM con fetch manual sin red (harness existente, AuthRoot real):**

| Caso | Resultado observado |
| --- | --- |
| Submit vacío | Errores por campo; foco en Correo |
| Diez submit durante pendiente | Una petición; botón disabled, texto de progreso |
| Rechazo 401 de login | Mensaje uniforme, foco en resumen, correo conservado y contraseña vacía |
| Login de respuesta perdida | Consulta de sesión antes de nuevo intento; no replay de contraseña |
| Consulta 503 | Sin formulario operativo ni identidad; reintento explícito |
| Consulta válida | Identidad sintética propia y cierre, sin destinos nuevos |
| 403 actual | Retira identidad durante consulta; aviso persiste tras sesión válida |
| 401 anterior | DOM y foco del título permanecen sin cambios |
| Pagehide | Identidad retirada del DOM en el mismo evento |
| Pageshow + visibilidad | Una comprobación; sin identidad antes de responder |
| Cierre de respuesta perdida | Sin identidad, incertidumbre y reintento que consulta primero |
| Sesión válida al reintentar cierre | Solo repite cierre solicitado; éxito vuelve a formulario |

En esa entrada se observaron cero recursos /api. El fondo de botón disabled se
comprobó asentado en RGB(242,242,242); durante la transición de 150ms puede verse el
color anterior. Texto y borde nunca dependen de opacidad ni del cambio de color solo.

**Responsive y accesibilidad (alcance preciso):**

- Ensayo con iframes de navegador del mismo origen a 320/390/768/1024/1440 CSS px,
  con texto 100% y 200%. Se midieron scrollWidth, límites del panel y controles.
  Primera revisión detectó controles fuera del panel a 320px/200%; se corrigieron
  tracks minmax(0,1fr), mínimos de grid y wrapping de etiquetas/texto de botones.
  Segunda revisión: diez combinaciones sin desbordamiento general o de controles,
  controles dentro del panel y alturas mínimas 44px (88px al 200%).
- Errores de campo, credenciales y sesión confirmada revisados también a 320/390/1440
  con texto 200%, sin desbordamiento; alertas adaptan icono y texto en una columna
  en estrecho. No se confunde tamaño de captura con viewport responsive real.
- Contraste sRGB recalculado: Dark 1 sobre Primary 6.47:1, Secondary 5.15:1,
  Disabled 11.89:1, blanco 13.31:1. No es certificación WCAG completa.
- En raíz real, click inicial para enfocar contenido y luego Tab recorrió correo →
  contraseña → submit; Enter vacío enfocó correo y mostró errores asociados.
  Controles por teclado mostraron outline sólido 2px/offset 2px Dark 1. Ingreso
  TEACHER sintético mediante controles/Enter terminó con foco en título y sin input
  de contraseña. Tab a Cerrar sesión + Enter volvió al formulario/título.
- Capturas de login e identidad inspeccionadas: composición de un panel, sin sombra,
  jerarquía del manual, sin destinos/acciones extra; exclusivamente datos sintéticos.
- Reglas prefers-reduced-motion y forced-colors revisadas en CSS; preferencia real
  reducida no estaba activa. No se ejecutó emulación de alto contraste, zoom de
  navegador 400%, lector de pantalla ni gestor real/portapapeles. Esos límites no se
  presentan como casos aprobados. bfcache real y T026/T033/T034 siguen pendientes.

**Integración y comandos finales:**

- Puerto 5173 estaba libre; Vite se inició desde este worktree visual sin detener
  servidores ajenos. Backend propio de prueba 3001 no estaba activo y se reanudó
  contra la BD exclusiva ya creada `kudlab_frontend_auth_implementation`, puerto
  34159. Sin reset, nuevas fixtures, bases compartidas ni cambios de archivos backend.
- Integración real en raíz: ingreso y cierre de TEACHER sintético correctos mediante
  el proxy existente. No se reejecutó suite backend ni se certificó HTTPS/producción.
- `npm ci --no-audit --no-fund`: correcto, 54 paquetes desde lock.
- `npm test`: correcto, tipos incluido harness. `npm run test:auth`: 63/63 correctas.
- `npm run build`: correcto, CSS 15.20 kB / gzip 4.01 kB; JS 274.87 kB / gzip 86.59 kB.
  Son tamaños observados, no benchmark ni cumplimiento de SLA.
- Inspección ejecutada de dist/imports: sin páginas, identidad o controles sintéticos
  del harness en producción. git diff --check correcto.
- git diff comprobó sin cambios cliente, controlador, estado, tests/auth, spec,
  research, modelo, contratos, validation.md, README y contexto frontend.
- Sin commit, merge, cambio de reglas backend o cierre ficticio de pendientes.

Preview: http://localhost:5173/; fixture: /tests/browser/auth-harness.html.
Estado de ampliación: 8/8 tareas visuales ejecutadas con los límites anteriores;
estado total 43/46, no aceptación completa ni piloto listo. I1 permanece sin editar.
