# Traspaso a otra sesión: preparación de implementación

Este documento es un prompt de preparación para el siguiente agente. No implementa
código ni autoriza iniciar trabajo automáticamente en la sesión que lo generó.

## Objetivo del agente receptor

Lee todos los artefactos, verifica el entorno y queda preparado para ejecutar
`/speckit.implement` cuando el responsable lo indique. No vuelvas a generar spec/plan/tasks
ni instales dependencias o implementes en el turno de preparación. Si recibes después
autorización explícita, ejecuta las tareas en su orden, actualizando evidencia real.

## Entorno exacto y preservación de trabajo

1. Antes de inspeccionar archivos, mueve la sesión a
   `/home/santino/.local/share/opencode/worktree/c4fd7d/frontend-authentication`.
   Verifica pwd, raíz Git, rama `feat/frontend-authentication`, estado y lista de worktrees.
   Si no existe o no coincide, detente y explica; no lo reemplaces por un checkout limpio.
2. Hay trabajo local sin commit: constitución ratificada, documentación, todos los
   artefactos de esta feature y cambios de README/inventario. Son trabajo a conservar,
   no suciedad a descartar. No hagas reset, checkout, limpieza, stash, commit o merge
   automáticamente. No edites el checkout original frontend.
3. Lee `AGENTS.md` del worktree y respétalo junto con la constitución. El worktree
   puede diferir de main; no importes reglas de otro checkout como si fueran idénticas.

## Lectura obligatoria frontend

Lee primero:

- `README.md` y `docs/agent-context/INDEX.md`.
- `docs/agent-context/modules/usuarios/module-summary.md`.
- `docs/agent-context/modules/usuarios/capabilities.md`.
- `docs/agent-context/modules/usuarios/features/autenticacion.md`.
- `docs/specs/TEMPLATE.md`.
- `.specify/memory/constitution.md` (1.0.0 ratificada).
- `.specify/init-options.json` y `.specify/feature.json` (este último es local/ignorado).

Después lee **todos** los artefactos actuales bajo `specs/001-autenticacion-personal/`:

1. `spec.md`: objetivo, cuatro historias P1, FR-001–016, SC-001–007 y decisiones Q1–Q3.
2. `plan.md`: diseño técnico, gates y estructura prevista.
3. `research.md`: decisiones y alternativas descartadas.
4. `data-model.md`: entidades efímeras, estados y transiciones.
5. `contracts/auth-client.md`: transporte, endpoints, parsers y resultados inciertos.
6. `contracts/ui-contract.md`: semántica, interacción, foco y alcance de UI.
7. `quickstart.md`: guía Node, navegador, fixture U1, historial/bfcache C1 e integración.
8. `tasks.md`: 38 tareas, dependencias, paralelismo y checkpoints; todas pendientes.
9. `checklists/requirements.md`: calidad documental, historia y límites.
10. `sources.md`: trazabilidad y distinción entre revisiones históricas/actuales.
11. `backend-validation.md`: reproducción histórica de P-01/P-02 antes del arreglo.
12. `validation/backend-auth.test.ts`: harness histórico de reproducción; no es test
    frontend ni criterio de aceptación positivo del backend corregido.
13. `backend-fixes.md`: revisión local exacta corregida, hashes, cambios y pruebas.
14. Este `implementation-handoff.md`.

Lista además el directorio para detectar artefactos nuevos creados por el responsable;
léelos sin asumir que la lista está cerrada para siempre. No confundir informes históricos
de bloqueo con estado corregido posterior ni con disponibilidad de main.

## Backend: lectura y comprobaciones antes de integrar

- Checkout principal de consulta: `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`.
- Correcciones probadas: `/tmp/opencode/kudlab-auth-backend-validation`, rama
  `fix/session-cookie-guarantees`, base `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`
  más los cambios locales exactos de `backend-fixes.md`. Están sin commit/merge.
- Verifica disponibilidad, commit, estado y hashes de ese informe. Si hay una revisión
  integrada posterior, contrástala y registra su procedencia; no exijas volver al commit
  antiguo, descartar cambios o reconstruir arreglos por suposición. Si falta evidencia,
  detén integración y consulta. No hagas nuevas correcciones backend en esta preparación.
- Revisa índice backend → contexto/pendientes pertinentes → módulo Usuarios → fichas
  de autenticación, autorización, validación y documentación OpenAPI. Sigue enlaces
  vigentes y registra diferencias respecto de las fuentes históricas.
- Contrato canónico actual: `docs/api/openapi.yaml`; revisa Acceso y seguridad/errores
  pertinentes de Usuarios. Contrasta con `src/app.ts`, `src/auth/auth.ts`,
  `active-identity.ts`, `session-activity.ts`, `session-guard.ts`, errores/configuración
  y pruebas enlazadas. No confundas contratos 001–003 históricos con disponibilidad actual.
- Swagger `/docs` y `/openapi.yaml` solo están habilitados en development/test explícitos;
  no inventes una URL desplegada ni lo uses para enviar credenciales. Verifica antes
  el montaje y entorno. OpenAPI documentado no reemplaza lectura del código/pruebas.
- P-01 ya corrige éxito de cierre pese a fallo capturado: confirma borrado persistido
  después de controles del proveedor o devuelve 503. P-02 propaga cookies renovadas,
  sin reiniciar actividad por consulta ni revivir sesión inactiva.
- Resultado previo registrado: suite backend 153/153 y siete focalizadas correctas;
  no son resultados ejecutados en tu sesión. Los contenedores/bases usados se eliminaron.
  Nunca ejecutes las fixtures contra una base existente: truncan tablas. Si luego se
  requiere repetir, crea base exclusiva con ambas URLs explícitas y datos sintéticos.

## Decisiones ya confirmadas: no reabrirlas por defecto

- Solo profesores; ADMIN y TEACHER son roles técnicos. Sin login infantil ni nuevas
  funcionalidades académicas, dashboard, Google, registro, MFA o recuperación.
- Tras acceso: identidad propia y cierre actual; sin destino previo ni enlace a recuperación.
- Cookie HttpOnly y mismo origen HTTPS mediante proxy; JavaScript no lee/persiste
  tokens, set-auth-token ni JWT. No rememberMe, polling o autoridad por rol cacheado.
- Stack existente React/TypeScript/Tailwind/npm; sin router, SDK ni paquetes nuevos.
  Pruebas Node24 de lógica con fetch/reloj inyectables, UI/navegador por separado.
- C1 aprobado: retirar identidad de snapshot **y DOM** al ocultar/pagehide; restaurar
  por pageshow/bfcache con comprobación deduplicada, sin depender de remontaje ni
  desactivar bfcache. No prometer control de miniaturas del navegador/sistema.
- U1 aprobado: harness separado bajo tests/browser con AuthRoot real, panel sintético
  y fetch manual sin red; fuera de public/imports/entradas de producción y con typecheck.
  No globals, endpoints debug, dependencias nuevas ni controles de test en la raíz real.
- Revisa skills disponibles al implementar según AGENTS. Las de diseño y ponytail
  no estaban disponibles en esta sesión; no afirmes haberlas usado ni que sigan ausentes
  sin comprobar tu entorno.

## Análisis y observación pendiente

El análisis anterior no encontró issues HIGH/CRITICAL ni conflictos constitucionales
explícitos. El responsable aprobó corregir documentalmente C1/U1, que se reflejan en
spec/plan/modelo/contratos/quickstart y tareas; **no se probaron aún en una UI**.
No afirmes que hubo otro `/speckit.analyze` completo tras esos cambios si no lo ejecutas.

I1 sigue como observación MEDIUM no aprobada: US1.7 dice que el correo se puede corregir
tras «cualquier resultado», mientras el éxito definido en Q1/FR-014 no muestra formulario
ni editor. No edites esa cláusula ni agregues edición de cuenta por inferencia. Si necesitas
resolverla para el criterio afectado, consulta al responsable; no la presentes como cerrada.

## Entrega del turno de preparación

Resume: worktree/rama comprobados, artefactos leídos, dependencia backend disponible o
no, diferencias encontradas, orden T001–T038 y verificaciones previstas. Confirma que
no implementaste ni marcaste tareas hechas. Revisa instrucciones locales de
`/speckit.implement` y prerequisitos; queda listo para autorización de implementación.
Si debes ejecutar nuevamente `/speckit.analyze`, hazlo solo lectura y comunica hallazgos
reales sin prometer ausencia absoluta de conflictos o rebajar la constitución.
