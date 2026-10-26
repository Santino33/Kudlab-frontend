# Evidencia de implementación frontend

Fecha: 2026-10-25. Implementación autorizada mediante `/speckit.implement`.
Registro incremental; no certifica piloto ni despliegue.

## Estado vigente al entregar

Código de las cuatro historias implementado. **35/38 tareas cerradas**; T026, T033 y
T034 permanecen parcialmente verificadas, no se declara completada la feature.
Las secciones del primer bloqueo y de su limpieza son históricas; la ejecución se
reanudó con permiso para puerto 3001. Se conservan como evidencia, no como estado actual.

## Entorno y fuentes (T001–T004)

- Worktree frontend: `/home/santino/.local/share/opencode/worktree/c4fd7d/frontend-authentication`,
  rama `feat/frontend-authentication`, base `f7a8d19bf7b7e105723643af491e0722f215a40b`.
- Trabajo previo conservado: constitución, README, inventario y todos los artefactos de specs.
- Node 24.18.0, npm 11.16.0; `npm ci --no-audit --no-fund`: correcto (41 paquetes).
- Backend: `/tmp/opencode/kudlab-auth-backend-validation`, rama
  `fix/session-cookie-guarantees`, base `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`.
  Los cuatro archivos modificados y la prueba nueva coinciden en las cinco SHA-256
  de [backend-fixes.md](backend-fixes.md). Sin editar backend ni merge; main no contiene fixes.
- Fuentes leídas: todo el handoff y sus 14 artefactos, AGENTS, constitución 1.0.0,
  contexto frontend y backend, specs backend 001–003, contrato histórico 003,
  `docs/api/openapi.yaml` (Usuarios, Acceso, seguridad/errores), `src/app.ts`,
  `src/auth/{auth,active-identity,session-activity,session-guard}.ts`,
  `src/config/env.ts`, errores/tipos compartidos, montaje documental y pruebas
  `authentication`, `auth-boundaries`, `api-openapi`, `session-activity` y focalizada.
- Los resultados backend 153/153 y 7/7 son previos, no ejecutados en esta sesión.
- Prerrequisitos correctos; checklist documental 16/16; no extensions.yml/hooks.
- Skills apple-design, ui-ux-pro-max, design-taste-frontend y ponytail no disponibles
  en catálogo ni directorios locales comprobados. No utilizadas. UI nativa mínima.
- T002: test:auth Node sin paquetes nuevos y typecheck del harness; T003: proxy
  local conserva Origin. Ignore existente ampliado solo con build y logs; proyecto
  privado, sin publicación, Docker, ESLint, Prettier, Terraform ni Helm que configurar.
- I1 no se edita ni se interpreta como permiso para edición de cuenta.

## Resultados incrementales

### Reanudación autorizada: puerto 3001 y cierre de T020

- El responsable autorizó «Ejecutalo en otro puerto». Backend y BETTER_AUTH_URL
  ahora en localhost:3001; proxy frontend /api a 3001, Origin preservado y SPA_ORIGIN
  localhost:5173. No se modificó el backend ni se tocó el proceso previo de 3000.
- Recreada BD exclusiva nueva, mismo nombre sintético, ahora puerto 34159 y ambas URLs
  explícitas. Migración correcta; servidor test/capture propio arrancado correctamente.
- Navegador OpenCode 2.1.4 / Electron 44.9.1 / Chrome 152.0.7977.167 Linux.
  Raíz sin cookie ofrece login; ingreso ADMIN sintético y recarga reconocen identidad.
- API caída simulada suspendiendo SOLO el proceso propio de 3001 (PID/cwd/comando
  comprobados), con restauración garantizada tras 25s. A 16.5s: acceso indisponible,
  sin formulario ni identidad; reintento explícito posterior recuperó identidad vigente.
- Harness: diez submit => una llamada; pérdida de login => get-session sin replay;
  consulta 503 => acceso bloqueado, sin input de contraseña, foco en mensaje principal.
- C1 controlado: identidad visible antes de pagehide, retirada del DOM en el mismo
  evento; restauración + visibilidad => una consulta y DOM checking hasta respuesta;
  401 => sesión perdida y foco en encabezado. Cero recursos /api en el harness.
- Navegación real a history-target y Atrás: performance.type=back_forward, instancia
  recargada y checking; NO se observó persisted=true. bfcache real queda no verificado,
  separado del caso controlado aprobado. No se desactivó bfcache.
- Un primer ensayo con requestAnimationFrame no terminó en 60s en el navegador remoto;
  se inspeccionó el estado, se navegó a otra página para abandonar esa ejecución y se
  repitió con esperas de render explícitas (100ms). No se presenta el intento fallido
  como evidencia de funcionalidad.

### T005–T008: foundation

- Antes de completar transición: `npm run test:auth`, 2 correctas/1 fallida por
  identidad que permanecía autenticada tras suspender (fallo de comportamiento).
- Después: 3/3 correctas y `npm test` correcto.

### T009–T014: US1

- Antes de implementar ingreso: 15/26 correctas, 11 fallidas; faltaban éxito/parser,
  rechazo de credenciales y coordinación de login. Algunos casos dependientes no
  pudieron alcanzar el envío por esa ausencia; no se confunden con pruebas positivas.
- Después: 26/26 correctas y `npm test` correcto.
- Inspección de AuthRoot: etiquetas asociadas, autocomplete username/current-password,
  contraseña solo en input/ref y envío explícito, limpieza al terminar/abandonar;
  mensaje uniforme local, sin recuperación, rol elegible ni dominios extra de login.
- No certifica teclado/gestor/lector real; esas verificaciones siguen pendientes.

### T015–T019: US2 y ciclo de página

- Casos previos a suspensión/restauración: 36/38 correctos, 2 fallidos por identidad
  aceptada/conservada durante ocultación.
- Después: `npm run test:auth`, **38/38 correctos**; `npm test`, correcto,
  incluyendo TSX del harness. Cubre StrictMode lógico, generaciones y deduplicación.
- AuthRoot retira DOM mediante flushSync en eventos nativos de ocultación/pagehide;
  listeners limpios, sin unload/beforeunload. Falta comprobar garantía visual en navegador.

### T020 parcial: bloqueo de integración

- Creadas tres entradas separadas bajo tests/browser; AuthRoot real con fetch manual
  sin red, datos sintéticos, respuestas retenidas, aborto y panel sin globals.
- Vite iniciado en 5173. Se abrió el harness en navegador y se observó su estado
  de comprobación indisponible tras el timeout de 15 segundos; no se completó la receta.
  Un intento de resolver desde el panel llegó después del timeout (botón ya ausente);
  no se atribuye a un ensayo de login, foco o bfcache aprobado.
- Base NUEVA y exclusiva: contenedor `kudlab-frontend-auth-implementation`,
  PostgreSQL 17 Alpine/tmpfs, puerto 42507, BD `kudlab_frontend_auth_implementation`.
  Ambas URLs explícitas a esa BD. Migración correcta. No se ejecutó reset/fixtures
  contra bases existentes, no se leyó .env ni se envió correo real.
- Arranque del backend corregido con datos sintéticos y capture: **falló EADDRINUSE**
  en puerto 3000. `ss` muestra un proceso previo (PID 6118) en 127.0.0.1:3000.
  No se detuvo ni se enviaron credenciales a ese servicio desconocido.
- Conforme al comando se detiene avance antes de T021. Requiere liberar 3000 por
  el responsable o autorizar explícitamente otra configuración local coherente.
- No se completaron US3/cierre ni US4/denegaciones: métodos aún vacíos; esta raíz
  es un incremento interno, NO una entrega de autenticación utilizable ni desplegable.
- T020 queda sin marcar. T021–T038 no ejecutadas; I1 sin editar.

### Comprobación del incremento y limpieza

- `npm run build`: correcto (tipos y Vite); no convierte este incremento en entregable.
- `git diff --check`: correcto. `package-lock.json` sin cambios.
- Eliminado únicamente el contenedor creado aquí y su BD tmpfs; detenida únicamente
  la instancia Vite propia, comprobando PID/cwd/comando antes. El proceso ajeno de 3000
  quedó intacto. Backend conserva exactamente sus cambios locales previos.
- Sin extensions.yml al inicio/final: no hooks que ejecutar.
- No se completó T037: faltan sus inspecciones de dist, imports y la verificación final
  tras las historias restantes. Tampoco se certifican navegador, accesibilidad o HTTPS.

## Verificación posterior de US3/US4 y cierre técnico

### T021–T026: cierre

- Pruebas antes de implementación: 38/52 correctas, 14 fallidas (cliente no enviaba
  cierre y controlador mantenía identidad). Después: 52/52 y tipos correctos.
- Harness con AuthRoot real: cierre retira identidad; pérdida de respuesta muestra
  incertidumbre; ocultación/restauración conserva intención, get-session precede
  a sign-out repetido; success=true vuelve a formulario con foco en título.
- Raíz real con cookie: cierre y recarga no restauran acceso.
- Fixture externa `/tmp/opencode/kudlab-frontend-auth-live.mjs` ejecutada con ambas
  URLs a BD exclusiva 34159: dos almacenes de cookies independientes, cerrar uno deja
  el otro válido. Esto NO es el ensayo de dos perfiles de navegador; T026 queda abierta.

### T027–T031: denegaciones

- Antes: 53/61 correctas, 8 fallidas por identidad conservada al denegar. Después:
  61/61 y tipos correctos. Matriz incluye consulta válida/ausente/fallida tras 403,
  401 durante espera, categorías actuales/obsoletas y no replay de negocio.
- Harness: 403 actual retira identidad, anuncia denegación y revalida; respuesta válida
  conserva aviso e identidad vigente. 401 anterior no modifica DOM ni foco (título
  autenticado); 401 actual vuelve a formulario/mensaje de sesión perdida y título.
  Cero recursos API en esa entrada. No hay pantallas de negocio para simularlo.

### T032: auditoría de seguridad y limpieza

- Caso adicional de cleanup con transporte que ignora abort falló primero (quedaba un
  temporizador); corregido cancelando timer al invalidar/suspender/desmontar sin liberar
  el bloqueo de transporte antes de asentarse. No se confunde abortar con rollback.
- Casos nuevos verifican filtrado de campos secretos en todos los estados. Asserts de
  opciones de cierre se movieron fuera del mock para que el catch no oculte sus fallos.
- Revisión de src/auth: sin console/telemetría, almacenamiento web, document.cookie,
  Authorization, lectura de set-auth-token/JWT, rememberMe, setInterval o hooks unload.
  Contraseña solo en input y envío explícito; no se conserva en snapshot o errores.
  No se copiaron cookies, tokens o payloads sensibles a este informe.

### T033 parcial: presentación y accesibilidad

- Semántica nativa y estilos de sistema mínimos: etiquetas, entradas, botones,
  foco visible, ancho adaptable, mensajes de campo con aria-describedby/aria-invalid,
  roles status/alert. Sin suite, paleta de producto nueva o dependencias.
- En navegador: submit vacío enfocó Correo y asoció ambos errores; ingreso TEACHER
  terminó en identidad propia/foco en título, sin input de contraseña. Se comprobó
  estructura accesible/autocomplete y foco de errores, reconciliación y respuestas antiguas.
- Orca existe: **50.3**, AT-SPI2 2.60.7, Wayland GNOME (`orca --version`). No se
  evaluó salida de voz ni gestor de contraseñas real/pegado por portapapeles.
- Los intentos de Tab mediante browser.press no movieron document.activeElement del
  título, incluso tras enfocar pestaña. No se atribuye la causa al navegador o a la app
  sin investigar; teclado completo y anuncios asistivos NO aprobados. T033 abierta.

### T034 parcial: integración real con backend corregido

- Fixture externa usa únicamente BD nueva dedicada y datos sintéticos. PASS de login,
  HttpOnly/SameSite=Lax, renovación get-session y operación protegida mediante el proxy,
  dos sesiones independientes y TEACHER con 403 de cuentas/sesión todavía válida.
- Para renovación ajustó solo expiresAt/updatedAt del registro sintético propio;
  llamada de actividad protegida en fixture externa, nunca añadida a UI.
- Profesor TEACHER provisionado por flujo real de cuenta/invitación/capture en proceso
  de fixture, sin correo real. ADMIN/TEACHER también ingresaron por la raíz de navegador.
- C1 real raíz: tras navegar al destino estático se revocaron SOLO sesiones TEACHER
  sintéticas en BD dedicada. Atrás mostró formulario, sin identidad anterior.
  Navigation type=back_forward, notRestoredReasons=masked: no persisted=true observado.
- NODE_ENV=test: estos ensayos NO revalidan CSRF/rate limit productivos. Evidencia previa
  de esos controles sigue en backend-fixes; no se repitió suite 153/153 en esta sesión.
- Falta completar matriz integrada con dos perfiles independientes y aceptación
  accesible; T034 no se marca completa. C1 controlado no demuestra bfcache real.

### T035: gate operativo separado

Sin entorno HTTPS autorizado en este trabajo. TLS, flag Secure real, preservación
Host/Origin/Set-Cookie y caché auth desactivada quedan pendientes operativos explícitos.
HTTP local no certifica producción. No se instaló infraestructura ni se cambiaron
flags, controles de origen o transporte para eludir esas validaciones.

### T036–T038: documentación, comandos y cobertura

- README, inventario, sources y quickstart actualizados sin sobrescribir informes
  históricos, constitución o cláusula I1. Fixes backend siguen sin commit/merge.
- Última ejecución: `npm ci --no-audit --no-fund` correcto (41 paquetes), `npm test`
  correcto (tipos, incluido harness), `npm run test:auth` **63/63**, `npm run build`
  correcto y `git diff --check` correcto. Lock sin cambios.
- Inspección ejecutada de dist y entradas: sin auth-harness/history-target, identidad
  synthetic-browser ni controles de panel; src/index/public no importan tests/browser.
- Sin extensions.yml, no hay hooks antes/después que ejecutar.

| Requisito | Implementación/evidencia y límite |
| --- | --- |
| FR-001 | Cliente filtra ADMIN/TEACHER; ambos ensayados en navegador y Node |
| FR-002 | checking inicial, suspensión snapshot/DOM y generaciones; bfcache real no observado |
| FR-003 | Validación de entrada nativa, no política de alta ni dominio extra; prueba DOM de campos vacíos |
| FR-004 | Normalización por endpoint/status/código y avisos propios; matriz Node |
| FR-005 | Exclusión síncrona, generaciones, timeout; diez submit Node y navegador |
| FR-006 | Login incierto consulta antes de reenvío; Node y harness |
| FR-007 | Cierre actual/reconciliación; Node, navegador y dos cookie jars; falta dos perfiles |
| FR-008 | Interfaz tipada, 401/403 y no replay; Node y harness sin módulos nuevos |
| FR-009 | Identidad efímera, servidor autoridad, sin cache de permisos |
| FR-010 | Sin polling, actividad local o contador; actividad externa solo fixture |
| FR-011 | Semántica/foco implementados; teclado y lector reales pendientes |
| FR-012 | Filtrado de datos, sin logs/URLs/almacenamiento de secretos; revisión y tests |
| FR-013 | No funcionalidades excluidas ni rememberMe; contrato/test del cuerpo |
| FR-014 | Solo identidad/cierre, sin destinos previos ni recuperación |
| FR-015 | Reintentos explícitos y acceso bloqueado ante incertidumbre; Node/DOM/API caída |
| FR-016 | Cookie HttpOnly mismo origen, no JWT; depende de fixes locales y gate HTTPS |

| Meta | Evidencia y límite |
| --- | --- |
| SC-001 | Comprobación previa en lógica, DOM y recarga; no cerrar 100% de matriz/bfcache real |
| SC-002 | Mensaje uniforme probado en cliente/controlador; cobertura visual parcial |
| SC-003 | Cierre, recarga y dos sesiones con jars; falta ensayo con dos perfiles |
| SC-004 | Matriz Node y denegaciones actuales/obsoletas en harness; sin replay |
| SC-005 | No satisfecha como aceptación: falta teclado/lector completos |
| SC-006 | Sin exposición en código/snapshots/URLs inspeccionados; sin certificación general de telemetría externa |
| SC-007 | Diez activaciones => un intento en Node/harness; no estudio de usabilidad |

Implementación de US1–US4 disponible, aceptación incompleta. 35/38 tareas cerradas;
T026/T033/T034 abiertas. I1 continúa pendiente no autorizado; no existe edición de
cuenta autenticada. Sin nueva afirmación de analyze completo ni piloto listo.

## Servicios locales al entregar

Backend corregido en localhost:3001, SPA/Vite en localhost:5173 y contenedor dedicado
`kudlab-frontend-auth-implementation` (BD tmpfs 34159) conservados en ejecución por la
solicitud de ejecutar en otro puerto. Son desarrollo/prueba sintética, no producción.
La primera BD 42507 se eliminó; esta segunda 34159 es diferente. El proceso de 3000
no se modificó. No se hicieron commits, merges, stash o descartes de trabajo previo.
