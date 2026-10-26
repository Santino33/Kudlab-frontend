---
description: "Tareas de Usuarios con interfaz funcional y gráfica integrada, reutilizando autenticación y catálogo de main"
---

# Tasks: Gestionar usuarios del personal — interfaz funcional y gráfica integrada

**Input**: Documentos de `specs/001-gestionar-usuarios/`.

**Base preparada**: `feat/gestionar-usuarios` incorpora `main@664cc5c` por merge `e45b05d`, tras guardar documentos en `72bd7ca`. **Reutilizar** auth, componentes, estilos y pruebas ahora presentes, no recrearlos. La entrega requerida es una aplicación con pantallas gráficas conectadas, responsive y estados reales, no solo servicios, CSS, galería o demo sintética. Fuentes/matriz gráfica en [plan.md](plan.md); preparación y verificación real en [revalidacion-plan.md](revalidacion-plan.md#preparación-del-worktree-para-desarrollo).

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contrato UI](contracts/ui.md), [consumo API](contracts/api-consumption.md), [quickstart.md](quickstart.md) y [revalidación](revalidacion-plan.md). Constitución **1.0.0 ratificada en main**, no la plantilla del checkout viejo. T001 prepara la base y alinea referencias antes de implementar. No enmendar la constitución ni cambiar Q1–Q3 por esta actualización gráfica.

**Tests**: Conservar y ejecutar `test:auth` y `tests/auth/` de main; extender `test:usuarios` para negocio/recuperación con Node 24. Navegador y capturas son obligatorios para la integración gráfica; reusar `tests/browser/auth-harness.*` y añadir fixture Usuarios solo si necesita estados nuevos, siempre con vistas reales y fuera del build productivo. No añadir harness DOM por inferencia ni borrar casos existentes para adaptar transporte. Escribir tests de contrato antes de cambiar comportamiento y verificar fallo de comportamiento/éxito, no contar error de importación como cobertura. `npm test` sigue siendo tipos.

**Organization**: Setup → base compartida → una fase por historia, manteniendo P1 antes de P2. US7/US8 están **diferidas**: sus tareas solo verifican exclusión, no implementan sus escenarios futuros. En US3/US5 los canjes públicos permanecen bloqueados; completar sus tareas no habilita incorporación/cambio de correo extremo a extremo.

**Alcance de este archivo**: Al generarse no se había ejecutado ninguna tarea; posteriormente el responsable autorizó preparar rama/base y se completó T001, sin implementar Usuarios. El resto sigue pendiente. Este archivo no autoriza por sí solo instalar componentes, implementar pantallas, cambiar backend, desplegar, contactar profesores o enviar correo real. Ejecutar implementación solo con autorización y preservar trabajo ajeno; preguntar ante contrato cambiado o decisión nueva.

## Format: `[ID] [P?] [Story] Description`

- IDs consecutivos T001–T056; T001 es preparación completada y T002–T056 siguen pendientes. Completar una preparación no declara implementada la feature.
- `[P]`: ejecutable en paralelo con otra tarea independiente **dentro de la ventana de dependencias indicada**, no autorización para editar simultáneamente archivos compartidos.
- `[USn]`: historia de la spec; solo presente en fases de historia.
- Cada descripción indica los archivos exactos que modifica o donde deja evidencia. Rutas relativas a la raíz frontend, no a otro backend ficticio dentro del proyecto.

## Path Conventions

Un único frontend en `src/`: auth existente en `src/auth/`, negocio/recuperación en `src/features/usuarios/`, catálogo existente en `src/components/ui/`, tests existentes `tests/auth/` más `tests/usuarios/`. No crear `Access.tsx`, `session.tsx` o una segunda Identity/provider para sustituir lo ya implementado. Evidencia saneada y capturas en `specs/001-gestionar-usuarios/evidence/`; no archivos vacíos por anticipación. Backend externo resuelto por índice, solo lectura para contrastar disponibilidad.

Cada evidencia manual debe indicar revisión/entorno, casos, resultado y limitaciones sin contraseñas, tokens, cookies, HAR sensible o datos de menores. Si faltan backend aislado, buzones autorizados, navegador/lector o participantes, registrar el bloqueo y **no marcar como superada/completada la validación pendiente**. Los escenarios bloqueados por Q2-A se validan por ausencia de canje, no intentando ejecutarlos.

**DoD por historia**: además de lógica/API, debe terminar la pantalla de la matriz gráfica del plan, reutilizar marco/componentes/tokens de main, cubrir estados aplicables, desktop/estrecho y teclado/foco, adjuntar capturas y conectarse al recorrido real. Los mocks facilitan estados, pero no sustituyen integración real ni revisión gráfica. T056 cierra la continuidad visual del conjunto y aprobación del responsable. Las tareas de US7/US8 solo prueban exclusión.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar el proyecto existente sin reinicializarlo ni instalar dependencias innecesarias.

- [x] T001 Preparar la implementación sobre `main@664cc5c` preservando artefactos/trabajo ajeno en rama `feat/gestionar-usuarios`, commit documental `72bd7ca` y merge autorizado `e45b05d`; conservar `.specify/memory/constitution.md` 1.0.0 y alinear `specs/001-gestionar-usuarios/spec.md`, `research.md`, `data-model.md`, `contracts/ui.md`, `quickstart.md`, `plan.md` y `revalidacion-plan.md` sin cambiar alcance. Backend main `ff46f8a` sin cambios; revisión P-01/P-02 externa disponible con cinco hashes coincidentes y diff app/guardias leído. Evidencia de preparación y verificaciones en `specs/001-gestionar-usuarios/revalidacion-plan.md`, sin backend modificado ni prueba integrada atribuida a esta comprobación estática.
- [ ] T002 Conservar scripts/pruebas `test:auth` y `tests/auth/` de main y añadir solo `test:usuarios` = `node --test tests/usuarios/*.test.mjs` en `package.json`; reutilizar `tsconfig.json`/aliases/`allowImportingTsExtensions`/`noEmit` ya existentes, comprobar Node 24 y tests `.ts` borrables sin TSX/alias ni nueva librería; ejecutar baseline tipos, test:auth y build y registrar resultados en `specs/001-gestionar-usuarios/evidence/setup.md`, conservando `package-lock.json`.
- [ ] T003 [P] Documentar exclusivamente el origen público `VITE_API_ORIGIN=http://localhost:3000` en `.env.example` y su tipado en `src/vite-env.d.ts`, con SPA `http://localhost:5173` y recuperación `/recuperar-acceso/confirmar` referenciados a quickstart; no incluir secretos ni editar configuración efectiva backend, y no añadir fallback de origen obtenido de URL/formulario.
- [ ] T004 Leer las cuatro fuentes `docs/design/` y consultar skills/MCP disponibles; inventariar y reutilizar `main` `src/auth/AuthRoot.tsx`, `src/styles.css`, `src/components/ui/{button,input,label,card,alert}.tsx`, `src/lib/utils.ts`, licencia y `components.json` base-nova, sin reinicializar/generar variantes paralelas. Fijar baseline visual y blueprint de todas las vistas de la matriz del plan en `specs/001-gestionar-usuarios/evidence/visual-reference.md` con capturas de autenticación sin secretos; consultar detalles/ejemplos oficiales para añadir solo `src/components/ui/table.tsx` y `src/components/ui/alert-dialog.tsx` necesarios, verificando Base UI/Lucide y adaptaciones, revisando diff/paquetes en `package.json`/`package-lock.json` antes de incorporarlos. Sin Radix, TanStack Table, otro tema o comandos `@latest` ciegos; no reemplazar configuración existente.

**Dependencias internas**: T001 primero; T002 y T004 secuenciales porque comparten configuración/manifiesto/evidencia. T003 puede ejecutarse en paralelo con T002 o T004. La incorporación T004 requiere autorización de implementación, no la proporciona este comando documental. Si el registro exige dependencias fuera de la base aprobada, pedir aprobación antes de incorporarlas.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Transporte, tipos, navegación y presentación comunes antes de historias. No construir SDK, router genérico, stores universales ni nuevas reglas backend.

- [ ] T005 [P] Escribir pruebas de `src/lib/http.ts` en `tests/usuarios/http.test.mjs` para origen inválido, `credentials: 'include'`, JSON/cuerpos inesperados, estados no 2xx, aborto/red y ausencia de auto-retry; comprobar que mutación incierta no se anuncia revertida ni vuelca cuerpos/secretos, usando Fetch simulado sin API real.
- [ ] T006 [P] Escribir pruebas puras de resolución finita de rutas y bloqueo de tokens fuera de `/recuperar-acceso/confirmar` en `tests/usuarios/navigation.test.mjs`, incluyendo ruta desconocida, entrada directa, ausencia de clasificación/canjes, y destinos de `contracts/ui.md`; no crear rutas funcionales de invitación/correo.
- [ ] T007 [P] Reutilizar Identity de `src/auth/state.ts` y los resultados de `src/auth/client.ts`, sin tipo/controlador de acceso paralelo; en `src/features/usuarios/types.ts` definir solo DTO de negocio/errores necesarios con UserError «opcional `fields: { field, reason }[]`», campos `name/email/role/password` y ProviderError «`code?`, `message?` y estado HTTP». Preservar identidad `id/email/name/role` y «`role: ADMIN | TEACHER`», sesión «`session: { id, expiresAt }`», validación mínima existente y separación de ID de identidad/sesión/cuenta; no inferir `lastAcceptedAt` ni persistir datos/credenciales.
- [ ] T008 Implementar solo transporte de negocio en `src/lib/http.ts` contra T005: origen explícito validado y Fetch sustituible, sin `import.meta.env` en módulos Node; cookies include, JSON/AbortController, no-store/redirect seguro y sin auto-retry/logs sensibles. Reutilizar el contrato generacional `notify` de `src/auth/controller.ts` para 401/403/no disponible, llevando generación original y no cuerpos/credenciales; descartar respuesta obsoleta, no reproducir mutaciones ni implementar segunda sesión o lógica de login en este helper.
- [ ] T009 Implementar `src/features/usuarios/navigation.ts` contra T006 con destinos finitos de `contracts/ui.md`, enlaces de página sin hash/router y estado de enlace bloqueado si hay token fuera de recuperación exacta; devolver destinos/estados, no ejecutar canjes ni conceder permisos; dejar la captura efímera de recuperación para US4.
- [ ] T010 [P] Extender, no sustituir, tokens y CSS de `src/styles.css` y componentes existentes según main/manual: Primary `#53C0F3`, hover `#4DABD7`, Dark 1 `#1C2E57`, disabled `#F2F2F2`, blanco, tipografía sistema, cuerpo 1rem, controles 44px, radios 8/12px y foco 2px/separación 2px; mantener header/footer, Card auth 32rem, bordes sin sombras y fallback neutral. Preparar clases de gestión hasta 75rem y responsive de la matriz gráfica, extrayendo `src/components/StaffLayout.tsx` del marco existente solo si evita duplicación; no colorear estados ni regenerar catálogo.
- [ ] T011 Ampliar composición de `src/App.tsx` y `src/auth/AuthRoot.tsx` con `src/features/usuarios/navigation.ts`/`src/components/StaffLayout.tsx` si se extrajo: mantener AuthRoot/controlador como dueño único de lifecycle y punto mínimo para contenido autenticado, sin desmontarlo al entrar a negocio ni crear listeners/provider paralelos; destino no disponible y enlace bloqueado usan el mismo marco/Alert real, sin vistas inexistentes ni endpoints prohibidos. Reusar `tests/browser/auth-harness.*` y preparar, si hace falta para las nuevas vistas, `tests/browser/usuarios-harness.html`/`.tsx` con composición real y transporte inyectado por parámetros/props, sin globals/red API/controles de test en producción; ampliar escenarios por historia sin copiar las pantallas. Ejecutar tipos, test:auth, test:usuarios y build; ninguna ruta protegida muestra datos antes de acceso comprobado.

**Dependencias internas**: T005/T006/T007/T010 pueden arrancar en paralelo tras setup, con archivos independientes. T008 después de T005/T007; T009 después de T006; T011 después de T008/T009/T010. Pruebas Node no validan TSX/DOM ni cookies reales. No iniciar historias hasta terminar la base.

## Phase 3: User Story 1 — Iniciar y finalizar acceso (Priority: P1) — MVP

**Goal**: Acceso/cierre y estado mínimo TEACHER, sin gestión de cuentas todavía.

**Independent Test**: Con ADMIN y TEACHER ficticios previamente activados, ingresar/cerrar, probar inválidos, sesión retirada, errores de red y rutas protegidas directas; TEACHER solo ve estado/cierre. No requiere invitaciones, Académico ni implementar otras historias. Un ADMIN puede usar `/sesion` mientras su gestión aún no está implementada.

### Tests for User Story 1

- [ ] T012 [P] [US1] Escribir `tests/usuarios/auth-http.test.mjs` para POST login con «`rememberMe: false` constante sin selector», «correo con formato y contraseña existente no vacía» sin política de contraseña nueva, GET sesión, POST cierre `{}`, 200/400/401/503 y cierre delegado 403/429/no JSON; exigir ausencia de JWT/Bearer/almacenamiento y ninguna repetición automática.
- [ ] T013 [P] [US1] Ampliar `tests/auth/controller.test.mjs`/`tests/auth/state.test.mjs` conservando sus casos y escribir `tests/usuarios/access-navigation.test.mjs` para destinos por rol, denegaciones actuales/obsoletas y composición con negocio; mantener suspend/resume/generaciones, deduplicación pageshow/visibilitychange y retiro del snapshot. Sin usar Identity.id como ID de cuenta, sin opciones ADMIN al perder rol ni atribuir cobertura DOM a Node; pruebas de DOM/historial en T018/T056.

### Implementation for User Story 1

- [ ] T014 [US1] Adaptar `src/auth/client.ts` existente, no añadir login/sesión/cierre duplicados en API Usuarios: origen/perfil de esta feature, `credentials: include`, `rememberMe: false` y cierre `{}` del contrato, manteniendo no-store, redirect:error, normalización/filtrado y Fetch inyectable. Ampliar `tests/auth/client.test.mjs` con esos deltas explícitos aprobados y T012, conservando los casos de seguridad/rechazo; no copiar sin revisión same-origin/proxy3001/omisión rememberMe de la demo ni introducir SDK/selector/tokens JS.
- [ ] T015 [US1] Extender `src/auth/controller.ts`/`src/auth/state.ts` solo para integración necesaria, conservando estados más ricos de main, bloqueo síncrono de transporte, timeout, generaciones y reconciliación de login/cierre sin replay. Mantener retiro de identidad/DOM desde AuthRoot al ocultar/pagehide, deduplicar restauración sin remontaje y limpiar también datos protegidos de negocio antes de revalidar; 401/403 y fallo muestran estados existentes, no crear `session.tsx`, borrar HttpOnly o prometer cierre de otras sesiones.
- [ ] T016 [US1] Reutilizar y extender visualmente `src/auth/AuthRoot.tsx`, no crear `Access.tsx`: conservar header/footer, Card, Input/Label, botón/loader, Alerts neutrales, identidad/cierre, foco y limpieza de contraseña de main. Integrar todos los estados de acceso y sus errores sin regresión gráfica, gestores/pegado/autocomplete, progreso/envío único; TEACHER solo estado/cierre. Incorporar enlace a recuperación únicamente cuando su destino real esté integrado por US4, nunca placeholder; sin signup/Google/selector «recordarme»/perfil editable.
- [ ] T017 [US1] Integrar `/`, `/acceso` y `/sesion` en `src/App.tsx`, `src/main.tsx`, `index.html` y `src/features/usuarios/navigation.ts` con el mismo marco visual, idioma español, enlaces semánticos y acceso comprobado antes de negocio; mantener un controlador/AuthRoot montado, origen validado desde frontera Vite y T013, sin destinos académicos/ascensos ni duplicación de layout. Enlazar cierre con estados/acciones reales, no controles sin efecto.
- [ ] T018 [US1] Ejecutar US1.1–5 y SC-005 aplicables con navegador/backend autorizado y tests T012/T013/test:auth; comparar capturas de login, checking, acceso confirmado, errores, cierre pendiente/no confirmado contra main en desktop/estrecho, revisar teclado/foco y retiro de DOM en pagehide/restauración, conservando pendientes de bfcache real/dos perfiles/HTTPS no demostrados. Registrar evidencia saneada en `specs/001-gestionar-usuarios/evidence/us1.md` y `evidence/screenshots/us1/`, sin considerar Node/build o la demo sintética como integración real.

**Checkpoint MVP**: Solo US1 operativa y validada. No declarar incorporación piloto completa; la activación desde correo permanece bloqueada. Dependencias: base → T012/T013 en paralelo → T014 → T015 → T016 → T017 → T018.

## Phase 4: User Story 2 — Consultar e invitar personal (Priority: P1)

**Goal**: ADMIN consulta listado/detalle y crea cuenta pendiente, con validación y reconciliación limitada; sin aceptación pública de invitación.

**Independent Test**: Con sesión ADMIN preparada y cuentas ficticias en varias páginas, filtrar, abrir detalle e invitar; comprobar pendiente y errores. TEACHER no obtiene datos. No depende de implementar US3, US4, US5 o US6.

### Tests for User Story 2

- [ ] T019 [P] [US2] Escribir `tests/usuarios/accounts-http.test.mjs` para GET listado `limit=20`/offset/status, GET detalle con ID de negocio codificado y POST alta `{ name, email, role: 'TEACHER' }`, 200/201/400/401/403/404/409/503 y cuerpo inválido; incluir alta incierta sin ID, consulta paginada autorizada sin parámetro búsqueda y ausencia de repetición del POST.
- [ ] T020 [P] [US2] Escribir `tests/usuarios/account-input.test.mjs` para forma mínima Account/AccountPage y entradas de alta: «Nombre máximo 200», «`role: TEACHER` constante», cuenta con «`status: PENDIENTE | ACTIVA | INACTIVA`» y «opcionales `pendingEmail`, `deliveryStatus`, `invitationExpiresAt`»; campos ausentes opcionales no implican entrega exitosa y campos requeridos ausentes impiden éxito; contrastar correo institucional con catálogo/esquema vigente sin inventar unicidad cliente.

### Implementation for User Story 2

- [ ] T021 [US2] Ampliar `src/features/usuarios/types.ts` para Account requerido `id/name/email/role/status/createdAt`, «`status: PENDIENTE | ACTIVA | INACTIVA`», «opcionales `pendingEmail`, `deliveryStatus`, `invitationExpiresAt`», Delivery «`PENDIENTE | ENVIADA | ERROR`» y AccountPage «`items: Account[]`, `total`, `limit`, `offset`»; validar forma y entradas de T020, con nombre no vacío tras trim y «Nombre máximo 200», correo institucional `.edu.co` según fuente vigente y rol fijo, sin DTO de otros módulos.
- [ ] T022 [US2] Añadir listAccounts/getAccount/createAccount en `src/features/usuarios/api.ts` contra T019, limit 20 inicial, offset desde 0 y status exacto opcional; sin filtros/orden/búsqueda nuevos, sin alta ADMIN ni contraseña; conservar resultado incierto ante red/503/401 final después de mutación, usando solo consulta autorizada para revisar estado, sin deducir rollback o causalidad por encontrar/no encontrar correo.
- [ ] T023 [US2] Implementar `src/features/usuarios/Accounts.tsx` con el marco gráfico de main ampliado hasta 75rem, título/explicación, toolbar de filtro etiquetado e «Invitar profesor», Table oficial simple de nombre/correo/rol/estado/entrega disponible, enlace textual al detalle, total y paginación. Diseñar carga/vacío/sin resultados/denegado/no disponible con Alert/estilo neutral del catálogo; toolbar/acciones se apilan en estrecho y tabla mantiene información accesible sin scroll horizontal general. Filtro reinicia offset; AbortController/selección/generación descartan respuestas obsoletas; no buscador, métricas ni tabla avanzada de demo.
- [ ] T024 [US2] Implementar `src/features/usuarios/AccountDetail.tsx` con jerarquía del plan y componentes de main: nombre/título, retorno al listado, datos nombre/correo/rol/estado en lista de definición y **entrega mínima disponible o desconocida desde US2**, sin esperar US3. Separar secciones con espaciado/borde, no una tarjeta por dato; presentar 404/denegado/fallo con el mismo marco y sin datos de otro ID, sin activación ni acciones de historias no integradas/auditoría/ascensos/reactivación.
- [ ] T025 [US2] Implementar alta gráfica de `src/features/usuarios/AccountForm.tsx` como Card de hasta 32rem de la familia del login: contexto/título/ayuda, Input/Label de nombre/correo, rol docente informado, acción «Invitar profesor» y cancelar, errores junto a campo/resumen, loader/envío único y borrador no secreto corregible. Integrar rutas `/usuarios`, `/usuarios/nueva`, `/usuarios/:id` en `src/App.tsx` mediante composición protegida existente; mostrar cuenta pendiente y entrega conocida/desconocida al confirmar alta, advertencia de activación bloqueada y Alert persistente/revisión paginada ante incertidumbre, sin contraseña/búsqueda ficticia/éxito optimista.
- [ ] T026 [US2] Ejecutar US2.1–6, carreras, doble envío, duplicidad y resultado incierto con las pantallas reales conectadas; capturar listado con datos/carga/vacío/error, alta/validación/pendiente/entrega incierta y detalle en desktop/estrecho, revisando relaciones de tabla, foco y consistencia con auth de main. Registrar T019/T020 y ausencia de exposición TEACHER en `specs/001-gestionar-usuarios/evidence/us2.md` y `evidence/screenshots/us2/`, sin canjear invitación ni declarar integración solo por mocks.

**Checkpoint**: Consulta/alta pendientes verificables con sesión preparada. Dependencias: base y US1 para integración; T019/T020 paralelos → T021 → T022 → T023/T024 en paralelo → T025 → T026. T023/T024 son una ventana explícita de paralelismo tras tipos/API aunque no llevan `[P]` porque el orden de lectura de tareas prioriza conservadoramente su implementación secuencial.

## Phase 5: User Story 3 — Gestión de invitaciones y bloqueo de aceptación (Priority: P1; parcial)

**Goal**: ADMIN observa entrega/reemite solo invitaciones pendientes; ningún canje de invitación desde frontend.

**Independent Test**: Con cuenta pendiente ficticia preparada, revisar entrega conocida/ausente, cancelar/confirmar reemisión y abrir enlace ambiguo. No activar la cuenta ni ejecutar los escenarios futuros US3.1–3; validar US3.4–6.

### Tests for User Story 3

- [ ] T027 [P] [US3] Escribir `tests/usuarios/invitations.test.mjs` para reemisión por PATCH con mismo correo de cuenta pendiente, errores DELIVERY_FAILED/DELIVERY_STATUS_UNKNOWN y bloqueo de token ambiguo usando resolución pura; comprobar que no se llama `/account-invitations/accept`, `/account-email-changes/confirm` ni un `/resend` inventado; cancelación del diálogo se verifica en navegador en T030, no simulando DOM con Node.

### Implementation for User Story 3

- [ ] T028 [US3] Añadir operación explícita de reemisión pendiente a `src/features/usuarios/api.ts` contra T027 usando PATCH de email actual, no un endpoint nuevo; no clasificar token ni llamar canjes y no repetir PATCH tras error; respetar que autorización/elegibilidad definitivas siguen servidor.
- [ ] T029 [US3] Ampliar la presentación de entrega ya visible desde US2 en `src/features/usuarios/AccountDetail.tsx` con «`PENDIENTE | ENVIADA | ERROR`», «ausencia sigue siendo desconocida, no éxito» y vencimiento opcional, sin badges de colores. Integrar AlertDialog Base UI de apariencia compartida, título/consecuencia/acciones explícitas de reemisión, invalidación de enlace previo y canje bloqueado; foco seguro/fondo inerte/cancelación sin llamada, fallo revisa detalle o conserva Alert de incertidumbre y ENVIADA no significa recibida/leída/activa.
- [ ] T030 [US3] Verificar US3.4–6 y capturar sección de entrega conocida/desconocida/error y diálogo de reemisión/resultado incierto en desktop/estrecho, con foco/cancelación/doble envío y entrada ambigua bloqueada bajo el mismo marco; registrar T027 y red saneada en `specs/001-gestionar-usuarios/evidence/us3.md` y `evidence/screenshots/us3/`, manteniendo US3.1–3 fuera de implementación.

**Checkpoint**: Gestión de entrega habilitada, aceptación bloqueada. Dependencias: base + US1 + detalle US2 → T027 → T028 → T029 → T030. Sin paralelismo interno de implementación seguro en el detalle compartido; T027 puede escribirse en paralelo con T019/T020 una vez fijados contratos, sin tocar API/TSX.

## Phase 6: User Story 4 — Recuperar acceso (Priority: P1)

**Goal**: Solicitud neutra y confirmación explícita de recuperación en ruta aprobada, sin persistir tokens ni autenticar automáticamente.

**Independent Test**: Con cuentas/enlaces ficticios de recuperación preparados, solicitar para diferentes estados/desconocido, corregir contraseña y confirmar; probar sin token/vencido/usado y recarga sin token. No depende de gestión de cuentas, reemisión, edición o ciclo de vida UI.

### Tests for User Story 4

- [ ] T031 [P] [US4] Escribir `tests/usuarios/recovery-http.test.mjs` para POST solicitud email y confirmación `{ token, newPassword }`, 202 neutro, 400 formato/dominio, confirmación 200/400/410/503 y red; citar restricciones «Token no vacío» y «nueva contraseña entre 8 y 128, con mayúscula ASCII, minúscula ASCII y número»; sin inspección pública previa, auto-canje, auto-retry ni inicio automático.
- [ ] T032 [P] [US4] Escribir `tests/usuarios/recovery-token.test.mjs` para captura solo en `/recuperar-acceso/confirmar`, limpieza de query conservando token únicamente en memoria, ausencia de canje al arrancar, navegación/recarga sin secreto persistido y rechazo de entrada ambigua; usar sustitutos de location/history/Fetch, sin afirmar cobertura DOM o logs reales de hosting.

### Implementation for User Story 4

- [ ] T033 [US4] Añadir requestRecovery/confirmRecovery en `src/features/usuarios/api.ts` y validación de entrada mínima en `src/features/usuarios/types.ts` contra T031: correo institucional vigente para solicitud, «Token no vacío», «nueva contraseña entre 8 y 128, con mayúscula ASCII, minúscula ASCII y número»; 202 siempre neutro para válidos sin prometer entrega, 400 permite corrección, 410 enlace no utilizable y éxito no crea sesión.
- [ ] T034 [US4] Implementar captura efímera en `src/features/usuarios/navigation.ts` e inicialización única en `src/main.tsx` antes de renderizar/consultar sesión, preservando StrictMode; limpiar query con replaceState y token/contraseña al salir/ocultarse mediante el ciclo existente de AuthRoot/controlador, sin listeners/provider de sesión paralelos ni retención al restaurar historial. No canjear al montar ni persistir/loggear token; política no-referrer temprana en `index.html`, sin prometer borrar logs de hosting previos; ampliar T032 y casos de historial/ciclo existentes.
- [ ] T035 [US4] Implementar solicitud/confirmación reales en `src/features/usuarios/Recovery.tsx` y composición de `/recuperar-acceso`/`/recuperar-acceso/confirmar` en `src/App.tsx`, reusando marco/Card/Input/Label/Button/Alert de main con ancho 32rem, título/ayudas y retorno a acceso. Diseñar entrada/validación/envío/confirmación neutra, nueva contraseña, sin-token/enlace no utilizable/no disponible y éxito con nuevo login, con texto/icono/foco reales; envío explícito único, 400 corregible sin anunciar consumo y 410 limpia token. Añadir en `src/auth/AuthRoot.tsx` enlace a recuperación solo en entrada ahora funcional; no agregar acciones al estado TEACHER confirmado.
- [ ] T036 [US4] Ejecutar US4.1–4 y token/recarga/ocultación/historial con recuperación conectada al backend autorizado; capturar todas sus vistas/errores/confirmaciones y navegación de retorno en desktop/estrecho, revisar teclado/foco y continuidad visual con login. Registrar T031/T032, límites de hosting/SMTP y revocación en `specs/001-gestionar-usuarios/evidence/us4.md` y `evidence/screenshots/us4/`; sin tokens/credenciales en evidencia ni afirmar recepción real a partir de harness.

**Checkpoint**: Recuperación separada de canjes ambiguos, sin depender de UI ADMIN. Dependencias: base + US1 → T031/T032 paralelos → T033 → T034 → T035 → T036. Puede adelantarse como incremento tras MVP, antes de US2/US3, integrando cambios de `api.ts`, `App.tsx` y navegación secuencialmente.

## Phase 7: User Story 5 — Editar datos y solicitar correo (Priority: P2; confirmación bloqueada)

**Goal**: ADMIN edita nombre/solicita correo con vigente/pendiente separados; confirmación pública sigue bloqueada.

**Independent Test**: Con sesión ADMIN y cuenta preparada, corregir nombre, pedir correo activo y editar pendiente; cancelar/error/conflicto preservan borrador no secreto; ninguna entrada ejecuta canje de correo. No requiere UI de reemisión US3 ni de ciclo de vida US6; US5.4 sigue solo referencia futura.

### Tests for User Story 5

- [ ] T037 [P] [US5] Escribir `tests/usuarios/account-edit-http.test.mjs` para PATCH de nombre y/o correo sin extras, «Al menos un campo permitido», nombre solo sin email accidental, error/conflicto/correo sin cambios/cuenta inactiva, persistencia previa a DELIVERY_FAILED y bloqueo de confirmación pública; no asumir rollback tras 503/401 final.
- [ ] T038 [P] [US5] Escribir `tests/usuarios/account-edit-input.test.mjs` para «Nombre máximo 200», correo institucional según fuente vigente, «No reenviar correo activo sin cambios como si fuera edición solo de nombre», borrador separado de datos confirmados y «opcionales `pendingEmail`, `deliveryStatus`, `invitationExpiresAt`»; comprobar que correo pendiente no reemplaza vigente y campos de invitación no se usan como entrega de verificación de correo.

### Implementation for User Story 5

- [ ] T039 [US5] Añadir edición PATCH en `src/features/usuarios/api.ts` y validación/selección de campos de `src/features/usuarios/types.ts` contra T037/T038 con «Al menos un campo permitido», «Nombre máximo 200» y correo institucional; enviar solo campos elegidos y omitir email en edición solo de nombre, nunca rol/estado/ID de identidad, y revisar detalle por ID ante conflicto/incertidumbre sin sobrescribir borrador silenciosamente.
- [ ] T040 [US5] Extender `src/features/usuarios/AccountForm.tsx`, `src/features/usuarios/AccountDetail.tsx` y composición de `src/App.tsx` para edición `/usuarios/:id/editar` con el mismo marco y formulario de alta/login: Input/Label/Card, título, ayuda, «Guardar cambios»/cancelar, correo vigente/pendiente etiquetados separados y advertencia persistente de confirmación bloqueada. Implementar gráficamente validación/envío/conflicto/resultado incierto y confirmación real de nombre/correo pendiente; cancelar no muta, borrador no secreto se conserva solo en corrección autorizada y TEACHER no recibe perfil/canje alternativo.
- [ ] T041 [US5] Ejecutar US5.1–3 y US5.5–7 con formulario/detalle real, revisar layout de nombres/correos largos, estado pendiente, ayudas/errores y acciones al perder permiso, con capturas desktop/estrecho y teclado/foco; registrar T037/T038 y bloqueo de US5.4 en `specs/001-gestionar-usuarios/evidence/us5.md` y `evidence/screenshots/us5/`, sin declarar correo nuevo efectivo o cambio completo operativo.

**Checkpoint**: Edición administrativa verificable, confirmación bloqueada. Dependencias: base + US1 + US2 → T037/T038 paralelos → T039 → T040 → T041. Serializar cambios de AccountForm/AccountDetail/App con US3/US6.

## Phase 8: User Story 6 — Inactivar y reducir rol (Priority: P2)

**Goal**: Acciones confirmadas de inactivación y reducción ADMIN→TEACHER, sin reactivación ni permiso cacheado.

**Independent Test**: Preparar más de un ADMIN y cuentas activas/inactivas; confirmar/cancelar, intentar último ADMIN y propia cuenta. Rechazos no se eluden; la reactivación no se presenta ni se llama.

### Tests for User Story 6

- [ ] T042 [P] [US6] Escribir `tests/usuarios/account-lifecycle-http.test.mjs` para inactivación POST con «`confirm: true` solo al confirmar, nunca cancelar», reducción PUT con «`role: TEACHER`; no agregar campo confirm al cuerpo que no lo acepta», 409 LAST_ADMIN/CONFLICT, 401 final posiblemente persistido, 403 y red; sin llamadas a reactivación/ascenso; comprobar cancelación sin mutación en navegador mediante T045, no atribuir cobertura DOM al runner Node.

### Implementation for User Story 6

- [ ] T043 [US6] Añadir deactivateAccount/demoteAccount en `src/features/usuarios/api.ts` contra T042 con cuerpos exactos y validación Account; sin API de reactivación/ascenso, sin auto-retry y sin éxito anticipado; no calcular localmente último ADMIN como autoridad ni convertir rechazo en transición exitosa.
- [ ] T044 [US6] Integrar confirmaciones Base UI en `src/features/usuarios/AccountDetail.tsx` con apariencia del catálogo/Card de main, superficie neutral, título/cuenta/consecuencia y verbos «Inactivar cuenta»/«Cambiar a docente», cancelar/foco seguro/fondo inerte y envío único. Diseñar rechazo LAST_ADMIN/conflicto/error/resultado incierto con Alert y detalle actualizado solo tras confirmación; revisar sesión y retirar DOM/datos/controles al perder permisos, incluso propia cuenta, sin rojo inventado, forzar/reactivar/borrar.
- [ ] T045 [US6] Ejecutar US6.1–5 con acciones reales, capturar ambos diálogos, conflicto último ADMIN, incertidumbre y detalle actualizado en desktop/estrecho, revisar teclado/Escape/cancelación/foco/retorno y pérdida de acceso; registrar T042 y resultados saneados en `specs/001-gestionar-usuarios/evidence/us6.md` y `evidence/screenshots/us6/`, sin restaurar sesiones ni modificar backend para hacer pasar casos.

**Checkpoint**: Revocación/reducción implementadas conforme al estado servidor, reactivación ausente. Dependencias: base + US1 + detalle US2 → T042 → T043 → T044 → T045. La prueba T042 puede escribirse junto a T037/T038; las implementaciones que comparten API/detalle se serializan.

## Phase 9: User Story 7 — Ascensos diferidos (solo verificación de exclusión)

**Goal**: Preservar Q1-A y FR-017/023, no implementar solicitud ni decisión de ascenso.

**Independent Test**: Como ambos roles, revisar destinos/allowlist y navegación/red: no controles ni llamadas de ascenso, incluso por entrada directa. Los escenarios futuros US7.1–4 no se ejecutan como alcance actual.

- [ ] T046 [P] [US7] Crear `tests/usuarios/role-request-exclusion.test.mjs` con comprobaciones de resolución finita de rutas/contrato exportado de operaciones habilitadas, sin exigir SDK nuevo para probarlo, para demostrar que solicitud/decisión de ascenso no tiene destino ni operación frontend; no crear DTO, servicio o pantalla de ascensos para que esta prueba exista.
- [ ] T047 [US7] Revisar `src/features/usuarios/api.ts`, `src/App.tsx` y `src/auth/AuthRoot.tsx` y comprobar navegación/red de las pantallas gráficas como ADMIN/TEACHER; registrar ausencia de ascensos en `specs/001-gestionar-usuarios/evidence/us7-exclusion.md`, sin marcar implementados los escenarios futuros ni añadir controles de relleno.

**Checkpoint**: Exclusión verificada, historia funcional sigue diferida. T046 independiente de la prueba T048; T047 requiere historias integradas y no modifica aplicación salvo corregir una exposición accidental dentro del scope.

## Phase 10: User Story 8 — Historial visible diferido (solo verificación de exclusión)

**Goal**: Preservar Q1-A y FR-018/023 sin tocar auditoría interna del backend.

**Independent Test**: ADMIN no ve sección de historial ni genera consultas `/audit`; entrada directa no expone eventos. No ejecutar ni implementar US8.1–3 futuros como feature actual.

- [ ] T048 [P] [US8] Crear `tests/usuarios/audit-exclusion.test.mjs` para resolución finita de destinos y ausencia de operación frontend de consulta de historial, sin inventar DTO/store/panel de auditoría; comprobar que rutas/operaciones ajenas no se habilitan por conocer un ID de cuenta.
- [ ] T049 [US8] Revisar `src/features/usuarios/AccountDetail.tsx`, `src/features/usuarios/api.ts` y navegación/red ADMIN; registrar ausencia de historial/exportación/edición de eventos en `specs/001-gestionar-usuarios/evidence/us8-exclusion.md`, sin borrar ni desactivar la auditoría backend existente.

**Checkpoint**: Exclusión visible verificada; no se afirma auditoría global/inmutable implementada. T048 puede escribirse con T046; T049 requiere detalle integrado.

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Cerrar verificación transversal, documentación y límites reales, sin añadir alcance.

- [ ] T050 [P] Revisar privacidad/seguridad de `src/auth/`, `src/lib/http.ts`, `src/features/usuarios/`, `src/main.tsx`, `index.html` y `.env.example`; comprobar ausencia de secretos en logs/storage/URLs propagadas/capturas, cuerpos renderizados, JWT/Bearer, auto-retries, canjes bloqueados y módulos excluidos. Verificar la limpieza DOM/snapshot y pruebas generacionales extendidas en T015/T034 a cuentas/borradores/token al pagehide/ocultación/restauración, sin deshabilitar bfcache ni mover foco por respuesta antigua; registrar SC-005 y límites reales de historial/logs/referrer en `specs/001-gestionar-usuarios/evidence/security.md`, sin modificar infraestructura externa ni editar aplicación en paralelo a T051; serializar cualquier corrección antes de revalidar.
- [ ] T051 [P] Verificar manualmente teclado/lector de pantalla, semántica/errores/foco, confirmaciones, contraste real, zoom 200/400 %, reflujo y anchos 320/390/768/1024/1440, movimiento reducido y feedback neutral de todas las vistas habilitadas; registrar SC-006 y fallos concretos en `specs/001-gestionar-usuarios/evidence/accessibility.md`, sin declarar WCAG certificada por tipos/build ni usar datos reales en capturas.
- [ ] T052 Ejecutar matriz integrada de `specs/001-gestionar-usuarios/quickstart.md` con backend aislado preparado por su responsable, incluidos cookies/CORS/CSRF, `rememberMe: false`, sesión retirada/cierre, errores inciertos, recuperación y bloqueo Q2-A/exclusiones; registrar SC-001/005, pruebas reales/pendientes y prerrequisitos HTTPS/same-site/fallback/RESET_BASE_URL/SMTP en `specs/001-gestionar-usuarios/evidence/integration.md`, sin configurar/desplegar backend ni enviar correo real fuera del entorno autorizado.
- [ ] T053 Validar con participantes disponibles y autorizados las metas SC-002/003/004: al menos cinco profesores, diez intentos de invitar/corregir y diez recorridos inicio/cierre, nueve de diez sin ayuda en menos de tres/dos minutos respectivamente, y nueve de diez preguntas de comprensión correctas; registrar tiempos, ayuda, respuestas agregadas y límites sin datos personales en `specs/001-gestionar-usuarios/evidence/usability.md`; si no hay participantes/entorno, documentar bloqueo sin inventar resultados ni marcar cumplida la tarea.
- [ ] T054 Actualizar `README.md`, `docs/agent-context/modules/usuarios/capabilities.md`, `specs/001-gestionar-usuarios/quickstart.md` y `specs/001-gestionar-usuarios/revalidacion-plan.md` con scripts/paquetes/recorridos realmente implementados y resultados de evidencia; mantener distinción tipos/pruebas Node/manuales y bloqueo Q2-A, sin anunciar piloto completo, canjes/ascensos/auditoría/reactivación ni cambiar checklist de requisitos para simular pruebas funcionales.
- [ ] T055 Ejecutar `npm ci`, `npm test`, `npm run test:auth`, `npm run test:usuarios`, build, `git diff --check` y trazabilidad FR-001–025/SC-001–006 en `specs/001-gestionar-usuarios/evidence/validation.md`; revisar dist/imports para excluir fixtures `tests/browser/`, preservar suites existentes, corregir regresiones y registrar revisión/entorno real. La verificación técnica no cierra entrega hasta gate gráfico T056 y validaciones funcionales aplicables; no marcar completa evidencia bloqueada.
- [ ] T056 Completar gate gráfico integrado de todas las vistas/estados de la matriz de `specs/001-gestionar-usuarios/plan.md`: reutilizar `tests/browser/auth-harness.html`/`.tsx` y, si hacen falta estados de Usuarios, añadir solo `tests/browser/usuarios-harness.html`/`.tsx` con componentes reales/composición y Fetch sintético aislado, nunca una galería o ruta de producción. Revisar app conectada y fixture, comparar autenticación antes/después contra `main@664cc5c`, recorrer acceso→gestión→alta/detalle→edición/acciones y recuperación, capturar desktop/estrecho y estados en `specs/001-gestionar-usuarios/evidence/screenshots/`, corregir inconsistencias en `src/styles.css`/vistas/componentes sin perder funcionalidad y repetir comandos T055 si cambió código. Registrar matriz visual, procedencia/viewport, límites y revisión del responsable en `specs/001-gestionar-usuarios/evidence/visual-integration.md`; no cerrar esta tarea con CSS sin pantallas, mocks como prueba API, estética aislada o aceptación del responsable no obtenida.

## Dependencies & Execution Order

### Phase Dependencies

```text
Setup T001–T004 → Base T005–T011 → US1 T012–T018 (MVP)
                                  ├── US4 T031–T036 (recuperación independiente de gestión)
                                  └── US2 T019–T026 (gestión ADMIN)
                                       ├── US3 T027–T030 (entrega/reemisión + bloqueo)
                                       ├── US5 T037–T041 (edición + bloqueo)
                                       └── US6 T042–T045 (inactivación/reducción)
Historias habilitadas integradas → Exclusiones US7 T046–T047 / US8 T048–T049
                               → Polish T050–T056 (incluye aceptación gráfica integrada)
```

Los tests de exclusión pueden adelantarse tras base, pero su validación manual final espera integración. Numeración conserva prioridad de la spec (US1/US2/US3/US4 P1 → US5/US6 P2 → exclusiones diferidas); el grafo permite recuperar antes de gestión como propone el plan. No se confunde dependencia de integración con requisito de implementar otras features backend.

### User Story Dependencies

| Historia | Tareas | Dependencias de integración | Criterio independiente |
| --- | --- | --- | --- |
| US1 | T012–T018 (7) | Base | Acceso/cierre por rol con cuentas previamente activadas |
| US2 | T019–T026 (8) | US1 y base | Lista/filtro/detalle/alta pendiente con sesión ADMIN preparada |
| US3 | T027–T030 (4) | US1 y detalle US2 | Entrega/reemisión/cancelación; aceptación permanece bloqueada |
| US4 | T031–T036 (6) | US1 y base | Solicitud/canje de recuperación separado, sin UI de gestión |
| US5 | T037–T041 (5) | US1 y US2 | Edición con vigente/pendiente distintos; confirmación bloqueada |
| US6 | T042–T045 (4) | US1 y detalle US2 | Confirmar/cancelar inactivación/reducción y último ADMIN |
| US7 | T046–T047 (2) | Base para tests; vistas integradas para revisión | Ausencia de controles/llamadas de ascenso, no flujo futuro |
| US8 | T048–T049 (2) | Base para tests; detalle integrado para revisión | Ausencia de historial/llamadas audit, sin alterar backend |

### Within Each User Story

Tests de contrato/validación antes de añadir la operación → tipos/validación mínima → API permitida → interfaz/integración → evidencia manual. No construir endpoints backend ni duplicar sus reglas para satisfacer una prueba cliente. Una llamada que rechaza por permiso sigue requiriendo que el servidor lo compruebe; ocultar controles no autoriza nada.

### Parallel Opportunities

- Setup: T003 con T002 o T004; no ejecutar T002/T004 a la vez por configuración/manifiesto compartidos.
- Base: T005/T006/T007/T010 independientes después de setup; T008 y T009 pueden implementarse en paralelo una vez terminadas sus pruebas/tipos.
- Historias: pruebas de archivos distintos `[P]` se pueden escribir en paralelo con contratos fijados. No editar simultáneamente `api.ts`, `types.ts`, `App.tsx`, navegación o detalle entre historias.
- Interfaz US2: T023/T024 admiten ejecución paralela solo después de T021/T022, al tocar vistas distintas.
- Final: T050/T051 dejan evidencia en archivos distintos y son paralelas si el entorno no se modifica; serializar correcciones de aplicación halladas antes de revalidar.

## Parallel Example: User Story 1

T012 `tests/usuarios/auth-http.test.mjs` y T013 `tests/usuarios/access-navigation.test.mjs`, tras base. Después serializar API → sesión → vista → composición. No hay paralelismo seguro entre escritores de esos mismos módulos.

## Parallel Example: User Story 2

T019 `tests/usuarios/accounts-http.test.mjs` y T020 `tests/usuarios/account-input.test.mjs`. Tras T021/T022, T023 `src/features/usuarios/Accounts.tsx` y T024 `src/features/usuarios/AccountDetail.tsx` pueden avanzar con interfaz de tipos/API ya estable.

## Parallel Example: User Story 3

T027 `tests/usuarios/invitations.test.mjs` puede adelantarse junto a pruebas T019/T020 de otros archivos. Dentro de la implementación de US3, T028 → T029 → T030 es secuencial: API, detalle y evidencia dependen del resultado anterior. No inventar tareas paralelas para el canje bloqueado.

## Parallel Example: User Story 4

T031 `tests/usuarios/recovery-http.test.mjs` y T032 `tests/usuarios/recovery-token.test.mjs`. La integración T033–T035 se serializa frente a otros cambios en API/navegación/App; recuperación no necesita esperar funcionalidades de cuentas.

## Parallel Example: User Story 5

T037 `tests/usuarios/account-edit-http.test.mjs` y T038 `tests/usuarios/account-edit-input.test.mjs`. Serializar implementación/edición de AccountForm/AccountDetail con US2/US3/US6; ningún trabajo incluye confirmación pública de correo.

## Parallel Example: User Story 6

T042 `tests/usuarios/account-lifecycle-http.test.mjs` puede escribirse junto a T037/T038. T043 → T044 → T045 es secuencial por dependencia API/detalle/validación; no paralelizar cambios de rol/estado sobre las mismas cuentas de prueba.

## Parallel Example: User Story 7

T046 `tests/usuarios/role-request-exclusion.test.mjs` con T048 `tests/usuarios/audit-exclusion.test.mjs`. T047 puede revisarse en paralelo con T049 una vez terminadas vistas, dejando evidencias distintas y sin alterar API/App durante observación.

## Parallel Example: User Story 8

T048 `tests/usuarios/audit-exclusion.test.mjs` con T046; evidencias finales `us8-exclusion.md` y `us7-exclusion.md` son independientes. No se implementa el historial para verificar su exclusión.

## Implementation Strategy

### MVP First (User Story 1 Only)

Completar setup/base, US1 y validación de privacidad/accesibilidad aplicable al MVP. Detenerse para demostrar acceso/cierre y estado mínimo TEACHER con cuentas preexistentes y backend aislado. No presentar una aplicación con incorporación operativa, no activar usuarios mediante canjes bloqueados y no desplegar automáticamente.

### Incremental Delivery

1. US1 → evaluar recuperación US4 como siguiente incremento pequeño o continuar orden P1 de gestión.
2. US2 → consultar/invitar cuentas pendientes, sin aceptación.
3. US3 → información de entrega y reemisión, sin activar.
4. US4 → recuperación separada; si ya se adelantó, revalidarla tras integración.
5. US5/US6 → mantenimiento administrativo e inactivación/reducción; no reactivación.
6. US7/US8 → verificaciones de exclusión, nunca expansión de alcance.
7. Validación transversal y documentación real. Bloqueos operativos requieren responsable/entorno, no resultados inventados ni sustitución por mocks.

### Parallel Team Strategy

Compartir contratos/tipos de base, paralelizar tests independientes y vistas con dependencias satisfechas. Un solo escritor por archivo compartido; integrar incrementalmente API/App/tipos/navegación. `[P]` describe oportunidades, no pide ni autoriza lanzar agentes durante este comando.

## Trazabilidad y cobertura

| Requisitos / resultados | Tareas que los implementan o verifican |
| --- | --- |
| FR-001, FR-017, FR-018, FR-023, FR-025 | T009/T011, T013/T016/T017, T045–T050 |
| FR-002–004 | T005/T007/T008, T012–T018, T052 |
| FR-005–007 | T019–T026; validación posterior T031/T033/T035, T037–T041 |
| FR-008–010 | T025–T030; bloqueo T006/T009/T011/T050 |
| FR-011–012 | T031–T036 |
| FR-013–014 | T037–T041 y bloqueo T006/T009/T011/T050 |
| FR-015–016 | T042–T045 |
| FR-019–020 | T005/T008, T015/T018, T022–T026, T028–T030, T033–T036, T039–T045, T052 |
| FR-021 | T005/T008, T034–T036, T050/T052 |
| FR-022 | T004/T010, T016/T018, T023–T026, T029/T030, T035/T036, T040/T041, T044/T045, T051 |
| FR-024 | T006/T009/T011, T027/T030, T032/T034, T037/T041, T050/T052 |
| SC-001 | Validaciones por historia T018/T026/T030/T036/T041/T045/T047/T049 y T052/T055 |
| SC-002–004 | T053, con casos/entorno de T052 y documentación de resultados T054 |
| SC-005 | Pruebas de contrato/errores por historia y T050/T052/T055 |
| SC-006 | Revisiones por historia y T051/T055 |

La matriz gráfica del plan forma parte de todas las historias habilitadas: T004/T010/T011 fijan referencia/catálogo/marco, T016/T023–T025/T029/T035/T040/T044 construyen vistas integradas, sus validaciones por historia incluyen capturas y T056 revisa continuidad visual del conjunto. T051 es accesibilidad; **no sustituye** el gate gráfico T056. Backend real e incertidumbre siguen en T052, no se certifican con screenshots del harness.

Campos compartidos del modelo se distribuyen a T007 (identidad/sesión/errores), T020/T021 (cuentas/páginas/opcionales/entrega), T031/T033 (recuperación) y T037–T039 (edición). Restricciones se citan literalmente en esas tareas; la fuente técnica vigente sigue siendo el catálogo/esquemas backend, no una política alternativa de validación local.

## Notes

- **Total vigente: 56 tareas**: setup 4, base 7, US1 7, US2 8, US3 4, US4 6, US5 5, US6 4, US7 2, US8 2, cierre transversal 7. **T001 completada; 55 pendientes**. No se implementó Usuarios; las pruebas heredadas de autenticación no completan las extensiones de US1 ni las demás historias.
- Skills gráficas se comprobarán al implementar; si no disponibles, informar y aplicar manual sin fingir uso. Esta generación solo organiza documentación y no incorpora componentes ni diseño gráfico nuevo.
- No modificar backend, reglas/TTL, permisos, estructura de datos del servidor ni configuración efectiva para hacer pasar un caso frontend. Pedir aprobación ante discrepancia.
- No marcar el checklist de calidad de requisitos como prueba de implementación. Los checkboxes de este archivo solo se completan después de ejecutar y verificar la tarea correspondiente; una tarea bloqueada conserva checkbox pendiente.
- La autorización para próximos cambios de aplicación debe ser explícita; esta entrega acaba con `tasks.md`, no con `npm run test:usuarios` ficticio ni interfaces generadas.

## Validación histórica de generación — 2026-10-25

`setup-tasks.sh --json` resolvió la feature y plantilla local de tareas mediante su contenido JSON; disponibles `research.md`, `data-model.md`, `contracts/` y `quickstart.md`. Se leyeron también plan/spec y constitución sin ratificar. Backend continúa en `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3` sin cambios locales al consultar; se reutiliza la evidencia enlazada de esa misma revisión, sin declarar nueva ejecución de su API.

Validación documental automática: 55 tareas con IDs consecutivos, checkbox pendiente, labels de historia solo donde corresponden y rutas concretas en cada descripción; distribución coincidente con la tabla, 19 marcadores `[P]`, enlaces existentes y estado local de feature correcto. Matriz de trazabilidad revisada para los 25 FR/seis SC, diferenciando implementación habilitada de exclusión/bloqueo y pruebas Node de validación DOM/manual.

`npm ci`, `npm test`, `npm run build` y `git diff --check`: correctos sobre la aplicación base sin implementación nueva. `npm test` solo comprobó tipos; no se ejecutó el comando futuro `test:usuarios`, casos funcionales, backend, SMTP ni estudios de usabilidad/accesibilidad. Ninguna de T001–T055 se marca ejecutada por estas comprobaciones de generación.

Hooks `before_tasks`/`after_tasks`: `.specify/extensions.yml` no existe en las comprobaciones inicial/final; nada que despachar. No se creó rama ni se editó el checkout original; se continuó este workflow en el worktree `spec-usuarios`, HEAD separado.

## Actualización gráfica solicitada — 2026-10-25

Prevalece sobre las referencias antiguas a reconstruir app vacía, inicializar shadcn, crear Access/session o constitución sin ratificar. Se revisaron `main@664cc5c`, sus componentes/auth/CSS/constitución y las cuatro fuentes docs/design; fuentes exactas y observación de navegador en plan. Se mantuvo Q1–Q3 y el transporte/persistencia ya aprobados para esta feature, documentando diferencias con main y revisión necesaria de integración/backend, sin merge ni cambios de aplicación en este worktree.

En snapshot temporal exacto de main: instalación, tipos, **test:auth 63/63** y build correctos; login gráfico inspeccionado en harness real con transporte sintético y cero recursos API. Esa observación no es UI Usuarios implementada, integración backend o prueba responsive completa. La aceptación futura requiere vistas conectadas, capturas por historia y gate T056 con revisión del responsable; no solo tests funcionales/CSS ni galería separada.

Las únicas modificaciones de esta petición son `plan.md` y `tasks.md`. Se debe revalidar consistencia de artefactos tras preparar la base actualizada; este cambio documental no afirma haber ejecutado nuevamente `/speckit.analyze` completo ni haber cerrado sus observaciones residuales de decisiones pendientes.

Validación de la actualización gráfica anterior al merge: 56 IDs consecutivos entonces pendientes, formato/labels/rutas correctos, 19 marcadores `[P]`, siete tareas de cierre, enlaces existentes y sin aclaraciones nuevas; `git diff --check` correcto. La instancia temporal de revisión 5187 y su pestaña se cerraron sin tocar servicios ajenos. No se modificaron app, paquetes, main, backend o constitución durante esa actualización.

## Estado posterior a preparación autorizada

Rama `feat/gestionar-usuarios`, commit documental `72bd7ca` y merge `e45b05d` de main `664cc5c`, sin descartar fuentes. T001 completada; **T002–T056 pendientes**. Instalación/tipos/**63 tests auth**/build correctos en este worktree real; backend corregido externo identificado por hashes y diff, no ejecutado/modificado. Ver [registro de preparación](revalidacion-plan.md#preparación-del-worktree-para-desarrollo). No se aplicaron todavía adaptaciones de transporte, componentes nuevos, rutas o pantallas de Usuarios; empezar por T002 cuando se autorice implementación.
