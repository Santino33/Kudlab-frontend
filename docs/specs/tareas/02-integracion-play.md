# J-02 · Asignar, supervisar y consultar TG-01

Decisiones confirmadas por responsable el 2026-10-27: contrato 1.1 para nuevas partidas,
datos ficticios/BD aislada y propuestas operativas de J-02. Sin códigos J-03 ni cuentas
estudiantiles. El iframe contiene la aplicación independiente Play; no se trasladan
mecánicas ni identidad infantil al frontend docente.

## Recorrido

Mis cursos → curso → Asignaciones → destinatarios fijos/fechas/límite de intentos →
detalle → Iniciar actividad supervisada → puente cross-origin → juego real →
sesión/evidencia/indicadores. La ficha individual enlaza Tareas digitales.

TEACHER actual del curso; ADMIN conserva sus capacidades previas sin lectura nominal.
La API es autoridad. AuthRoot, claves por generación/selección y respuestas obsoletas
se conservan; suspender/retomar revalida el acceso antes de restaurar contenido.

Creación incierta conserva en sessionStorage la solicitud y requestId por
identidad/curso, sin nombres ni secretos. Reconciliar reutiliza ese cuerpo. Grants
solo en memoria y postMessage con origen exacto; nunca URLs, estado de navegación
o almacenamiento docente. Los enlaces de ejecución conservan solo operationId/bridgeId
públicos: recargar reusa la operación, otro inicio consciente genera IDs distintos.
El servidor confirma resultados después de mensajes del frame; sin red no se lanza
una consulta docente condenada a fallar, y se comprueba al reconectar sin relajar AuthRoot.

Estados separados: vacío, preparado sin consumo, en ejecución, sin cierre confirmado,
interrumpido/parcial, guardado pendiente de cálculo, cálculo fallido y valor no
disponible. No sustituir null por cero ni usar semáforos o interpretación clínica.
La tabla conserva unidades, muestra/denominador, sesión/segmentos y motivos.

Recuperar abre la misma partición del runtime; el puente comunica el submissionId
local, el host comprueba sesión/generación y obtiene capacidad solo de entrega.
Sin copia local informa y no reconstruye respuestas. Disponible también si el
servidor tiene acuse pero el navegador pudo perder su confirmación.

## Fuentes backend contrastadas

Raíz original `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`, commit base
`49eb0403c319c73cda84b4ee31693d8e6b8a47e5`, más cambios locales de J-02 en
`/tmp/opencode/kudlab-backend-integracion-play`; revisión 2026-10-27. Los enlaces
locales no son dependencias de ejecución. No se atribuye el código nuevo al commit base.

- `README.md`, `package.json`, `.env.example`, `drizzle.config.ts`, `vitest.config.ts`.
- `docs/agent-context/{INDEX,unresolved-issues,games-integration}.md`.
- `docs/agent-context/modules/tareas/{module-summary,features/asignacion,features/ejecucion}.md`;
  `modules/academico/features/consentimiento.md`, `modules/evolucion/module-summary.md`
  y `modules/seguimiento/module-summary.md` bajo ese mismo contexto.
- `src/{app,index}.ts`, `src/config/env.ts`, `src/auth/{auth,session-guard}.ts`.
- `src/db/{client,schema/tasks,schema/academic,schema/game}.ts` y migración `0010_game_integration.sql`.
- `src/modules/academico/{shared/academic-auth,shared/academic.errors,shared/participation,students/students.service,groups/groups.routes}.ts`.
- `src/modules/tareas/catalog/{catalog.service,catalog.routes,publish}.ts`.
- `src/modules/tareas/runtime/{contract,dto,security,service,routes,errors}.ts` y
  `src/modules/evolucion/{tg01,processor}.ts`.
- `docs/api/openapi.yaml`, `docs/integracion-play.md` y
  `specs/006-api-swagger-docs/contracts/documentation.md`.
- `tests/{setup,helpers,openapi.helpers,game-fixture,game-server}.ts`,
  `tests/integration/{task-catalog,game-integration}.test.ts`,
  `tests/unit/openapi-document.test.ts`, `tests/contract/api-openapi.test.ts`.

## UI y verificación

Se reutilizan manual de diseño, navegación propia, cliente HTTP, hooks, tablas,
botones, campos y AlertDialog locales Base UI/Lucide. MCP shadcn consultado para
búsqueda/detalle/ejemplo de tabla; no se incorporan componentes Radix ni dependencias.
Skills ui-ux-pro-max y design-taste-frontend: tablas desplazables dentro de región
identificada, controles 44px, estados honestos y feedback neutral. Sin rediseñar shell
ni sortear otra dirección visual para esta extensión del sistema existente.

Build genera `dist/_headers`: aplicar CSP con frame-src exacto y connect-src API en
hosting. `tests/browser/serve-build.mjs` solo sirve para verificación local.

Pruebas: `npm test` comprueba tipos; las funcionales separadas son `test:auth`,
`test:usuarios`, `test:tareas` y `test:estudiantes`. La integración real reside en
Play `tests/integration/kudlab.spec.ts`, con API/PostgreSQL sintéticos aislados,
no mocks de resultados. Consultar el registro final de verificación backend.

Pendientes: uso con participantes reales, políticas institucionales y hardware físico.
No se certifica WCAG, lector de pantalla ni aprobación docente por compilar o tomar capturas.
