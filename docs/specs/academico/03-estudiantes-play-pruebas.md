# Spec frontend: registro habilitado para Play en pruebas

**Estado:** implementación local autorizada; verificación al final. Fecha: 2026-10-28 UTC. Fuente: el responsable pidió crear estudiantes habilitados para probar las features recientes mientras no existe carga de consentimientos. Sin habilitación de menores reales.

## Feature frontend

TEACHER registra un participante ficticio dentro de un curso propio, consulta el estado confirmado por el servidor y puede asignarle una actividad, distribuir su código y consultar su sesión. No crea cuenta estudiantil. ADMIN no obtiene acceso nominal. La habilitación sintética solo pertenece al runner de pruebas backend; el frontend no envía estado, consentimiento ni permisos.

## Feature backend relacionada

Reglas canónicas: [variante sintética](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/pruebas-estudiantes-play.md), [contrato estudiantil normal/variante](/tmp/opencode/kudlab-backend-diagnostico-asignacion/specs/005-gestionar-estudiantes/contracts/students-api.md), [cursos](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/feature-specs/academico/02-cursos.md), [integración](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/integracion-play.md) y [códigos](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/acceso-codigo.md). La composición normal permanece bloqueada sin autorización real; no duplicar reglas legales ni confundir estado activo con consentimiento.

Capacidades observadas en montaje y ejecución: POST `/api/v1/students`, GET `/api/v1/groups/:id/students`, POST `/api/v1/task-assignments`, emisión/canje de códigos y start/results del runtime. Misma sesión persistida docente, roles y ámbito existentes; Play usa capacidades propias sin cookies docentes.

## Archivos backend consultados

Backend `/tmp/opencode/kudlab-backend-diagnostico-asignacion`, base **65d0ad6**, más cambios locales de esta feature. Frontend base **74c6ea3**, Play base **cf0fb2e**. No atribuirlo a main/despliegue. Revisión estática y pruebas aisladas; fuentes de producto posteriores explícitas, no RF A/D/V3 intercambiados.

- [Índice](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/agent-context/INDEX.md), [Académico](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/agent-context/modules/academico/module-summary.md), [registro](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/agent-context/modules/academico/features/registrar-estudiante.md), [Tareas](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/agent-context/modules/tareas/module-summary.md), [asignación](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/agent-context/modules/tareas/features/asignacion.md), [pendientes](/tmp/opencode/kudlab-backend-diagnostico-asignacion/docs/agent-context/unresolved-issues.md).
- [Montaje](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/app.ts), [router estudiantil](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/modules/academico/students/students.routes.ts), [servicio](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/modules/academico/students/students.service.ts), [guardia académica](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/modules/academico/shared/academic-auth.ts), [participación](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/modules/academico/shared/participation.ts), [sesión](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/auth/session-guard.ts).
- [Router runtime](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/modules/tareas/runtime/routes.ts), [servicio](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/modules/tareas/runtime/service.ts), [catálogo](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/modules/tareas/catalog/catalog.service.ts), [entorno](/tmp/opencode/kudlab-backend-diagnostico-asignacion/src/config/env.ts).
- [Fixture](/tmp/opencode/kudlab-backend-diagnostico-asignacion/tests/game-fixture.ts), [composición preview](/tmp/opencode/kudlab-backend-diagnostico-asignacion/tests/game-preview.ts), [runner](/tmp/opencode/kudlab-backend-diagnostico-asignacion/tests/game-server.ts), [setup](/tmp/opencode/kudlab-backend-diagnostico-asignacion/tests/setup.ts), [helpers](/tmp/opencode/kudlab-backend-diagnostico-asignacion/tests/helpers.ts), [regresión backend](/tmp/opencode/kudlab-backend-diagnostico-asignacion/tests/integration/game-preview.test.ts).

## Recorrido de UI

Mis cursos → curso vacío → Registrar estudiante → estado activo confirmado en la vista sintética → Asignaciones → seleccionar destinatario → Guardar asignación y códigos → Play público en perfil independiente → inicio/cierre y acuse → consulta docente. Se conserva navegación SPA, consulta posterior a escritura y protección contra doble envío.

## Estados y errores

- Alta acepta el estado booleano confirmado por backend: la vista de pruebas devuelve activo, el arranque normal conserva inactivo. No hay optimismo ni campo cliente para elegirlo. La información de registro explica el alcance ficticio.
- Inactivos visibles pero no seleccionables; Seleccionar todos solo marca activos. Guardar exige destinatarios seleccionados. Esto no sustituye elegibilidad en servidor.
- `403 PARTICIPATION_BLOCKED`, solo en peticiones explícitas de actividades y respuesta JSON reconocida, es rechazo local conocido: no cambia acceso global ni queda como creación incierta. El formulario se conserva, retira la solicitud rechazada y vuelve a consultar estudiantes. El error tiene texto claro y foco con el componente Notice existente.
- 401, `403 FORBIDDEN`, códigos desconocidos y respuestas no JSON conservan retirada de acceso. Generaciones obsoletas se descartan. Fallos realmente inciertos conservan requestId/reconciliación sin replay automático.
- Backend no cambia códigos HTTP ni concede acceso por esconder controles. Se conservan aislamiento de cursos, inactivación e idempotencia.

## Criterios de aceptación

- [x] Cliente acepta alta activa confirmada sin enviar estado/consentimiento; pruebas Node.
- [x] PARTICIPATION_BLOCKED es local, sin incertidumbre ni replay; 401/FORBIDDEN/desconocidos/no JSON/obsoletos conservan protecciones; pruebas Node.
- [x] Curso vacío → alta → asignación/código → Play y acuse, con API/PostgreSQL reales; cierre parcial explícito, un intento, procesamiento completado.
- [x] Inactivación entre selección y guardado rechaza sin bloquear Mis cursos ni persistir otra asignación.
- [x] Reflujo 320/1440 y revisión de capturas del rechazo local.

## Verificación ejecutada

- Frontend: `npm ci`, `npm test` (solo tipos), `npm run build` y suites `test:auth`, `test:usuarios`, `test:tareas`, `test:estudiantes`: **66 + 72 + 33 + 27 = 198 pruebas correctas**.
- Backend: `npm ci`, `npm run typecheck`, migraciones y `npm test -- --reporter=verbose`: **276 pruebas / 45 archivos correctos**, con PostgreSQL dedicado `kudlab_j02_habilitados_unit_test`. La primera ejecución alcanzó el timeout de 120 s del comando; la repetición completa finalizó correctamente en 244 s. Ocho vulnerabilidades de dependencias preexistentes informadas por npm (7 moderadas, 1 alta), sin remediación fuera de alcance.
- Play: `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` (**61 pruebas**) y build correctos. No se modificó su runtime.
- Chromium real: `new-student.spec.ts`, **1 prueba correcta**, builds servidas con cabeceras; SPA 5196, API 4326, Play 4196 y otra BD exclusiva `kudlab_j02_habilitados_browser_test`. Primera navegación esperaba load y alcanzó timeout; la prueba espera ahora DOM y controles reales, sin cambiar el comportamiento de Play.
- Reinicio de la API con `serve-existing-game.mjs`, sin reset: los dos registros, la asignación y su historial permanecen; nuevo activo sigue elegible sin mapa de autorizaciones, inactivado sigue bloqueado.
- Capturas revisadas: Play `test-results/kudlab-integration/new-student-local-rejection-{320,1440}.png`. Sin códigos utilizables en capturas; solo datos ficticios. `git diff --check` correcto en los tres repositorios.

No se probó partida completa de 120 s, recuperación offline en esta nueva regresión, aceptación docente, producción, consentimiento real ni WCAG completa. Las suites existentes de backend conservan pruebas de recuperación, revocación y aislamiento; no equivalen a probar todos los escenarios en navegador.

## Pendientes y confirmaciones

No hay migración/reactivación de registros anteriores, consentimiento real, activación productiva ni cambios de mecánica Play. Para probar registrar nuevos participantes en esta composición; los inactivos históricos siguen inactivos. No usar el runner que resetea datos para reanudar una base; `tests/browser/serve-existing-game.mjs` conserva la base y usa la nueva composición.

Ponytail full y UI/UX Pro Max aplicados a errores claros, foco y controles inactivos; manual de diseño preservado. MCP shadcn conectado, búsqueda/detalle/ejemplo de Button consultados: el registro mostró variante Radix, **no se incorporó**; se reutiliza el Button local Base UI. No se añadieron dependencias ni componentes visuales.
