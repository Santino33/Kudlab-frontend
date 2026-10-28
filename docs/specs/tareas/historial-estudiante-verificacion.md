# Historial individual · diagnóstico de la vista previa

## Hallazgo y diagnóstico observado

El responsable informa que la actividad realizada se ve desde asignaciones, pero la ficha individual indica que no tiene sesiones; confirmó que usa **localhost:5185**. No se atribuye un fallo del listado al mero hecho de existir ese mensaje.

Se comprobó:

- Build Kudlab 5185: API `http://localhost:4315`, enlace Play `http://127.0.0.1:4184`.
- Build Play 4184: API `http://localhost:4314`, host docente `http://localhost:5184`.
- API 4314: los dos destinatarios ficticios del curso A1 tienen 2 y 6 sesiones recibidas. Desde sus fichas en 5184 se ven exactamente esas sesiones, sin estado vacío.
- API 4315: los dos estudiantes de A1 tienen 0 sesiones; sus IDs de estudiante y de curso son distintos de los de 4314. La igualdad de nombres ficticios no equivale a identidad de registro ni de base.

Hay un desajuste confirmado en la vista previa entregada: profesor y juego apuntaban a APIs/bases distintas. Ese build no era una pila integrada válida para probar el recorrido completo. No se reprodujo una consulta incorrecta de `StudentActivities` contra una API coherente; por eso no se inventa una corrección de filtros ni se relajan guardias o permisos.

Fuentes observadas: frontend base `dcf6762`, `src/features/academico/students/Students.tsx`, `src/features/tareas/activities/{ActivityRoutes,Activities,api,types}.tsx/.ts` y `src/features/usuarios/navigation.ts`. Ambos enlaces usan `studentTasksPath(groupId, studentId)` y ambos recorridos consultan `GET /api/v1/students/{studentId}/task-sessions`. Backend `/tmp/opencode/kudlab-backend-j03-aula` HEAD `8cef84b`: `src/modules/tareas/runtime/{routes,service}.ts` (listSessions filtra por studentId), `src/app.ts`, `src/modules/academico/shared/participation.ts`, `tests/{setup,game-fixture,game-server}.ts`. Contexto y pendientes siguen en las fuentes canónicas ya enlazadas por J-02/J-03.

## Corrección operativa, sin migraciones

Pila nueva alineada:

| Servicio | Origen | Configuración pública |
| --- | --- | --- |
| Kudlab | `http://localhost:5185` | API 4315, Play 4185 |
| Play | `http://127.0.0.1:4185` | API 4315, host docente 5185 |
| API | `http://localhost:4315` | SPA 5185, runtime 4185 |

Se conserva la BD `kudlab_j02_assignment_codes_browser_test`. Se detuvo únicamente el proceso 4315 creado para esta vista previa, verificando su puerto, comando y nombre de BD antes de señalizarlo. **No se ejecutó de nuevo `tests/game-server.ts`**, porque reinicia su fixture y borra los datos de esa BD. El reemplazo `tests/browser/serve-existing-game.mjs` inicia la app/processor/cleanup ya existentes sin reset: exige backend, puerto y BD explícitos, usa `assertTestDatabase()` y solo restaura en memoria las autorizaciones de los dos participantes ficticios esperados ya activos. No activa estudiantes ni cambia participación productiva.

Play se compiló en el worktree separado `/tmp/opencode/kudlab-play-student-sessions`, sin cambios de código ni dependencias. El build de la vista previa docente se recompiló en `/tmp/opencode/kudlab-frontend-assignment-codes`; no cambia el commit publicado en PR #14. El nuevo worktree frontend de regresión es `/tmp/opencode/kudlab-frontend-student-sessions`, rama `fix/student-session-history`.

No se reiniciaron 4314/5184/4184, ni se copiaron o eliminaron sus sesiones. **Los historiales previos permanecen en su base anterior y se consultan en 5184.** Las actividades nuevas de 5185 se hacen en 4185 y quedan en 4315. No se unen estudiantes de distintas bases por nombre ni se trasladan pendientes entre orígenes/perfiles del navegador.

## Repetir la verificación

Compilar ambos productos con una misma API (los puertos son de esta vista previa, no valores productivos):

```sh
# En el frontend
VITE_API_ORIGIN=http://localhost:4315 VITE_PLAY_ORIGIN=http://127.0.0.1:4185 npm run build

# En el worktree de Play
VITE_API_ORIGIN=http://localhost:4315 VITE_TEACHER_ORIGIN=http://localhost:5185 npm run build
PORT=4185 node scripts/serve-production.mjs

# En el backend, con DATABASE_URL/puerto/orígenes/claves de su entorno sintético existente
# Nunca usar las credenciales/claves de prueba en un despliegue real.
KUDLAB_BACKEND_DIR=/ruta/al/backend node --import tsx /ruta/al/frontend/tests/browser/serve-existing-game.mjs

# Frontend: paquete Playwright suministrado explícitamente, sin dependencia nueva
KUDLAB_PLAYWRIGHT=/ruta/a/node_modules/@playwright/test/index.mjs node tests/browser/student-sessions.check.mjs
```

El script primero revisa los orígenes de **los bundles compilados** y falla antes de crear/jugar si Kudlab y Play usan configuraciones incompatibles. No basta con que los tres puertos respondan 200.

Pruebas unitarias `tests/tareas/preview-origins.test.mjs`: acepta pila coherente y rechaza el desajuste reportado o discrepancias individuales de API/host/enlace. Junto con las suites previas: **195 funcionales frontend** (66 auth + 72 usuarios + 26 académico + 31 tareas), tipos/build/diff check correctos. `npm ci` sin vulnerabilidades reportadas. Sin cambios en la lógica de historial del producto ni en Play/CI.

Regresión real de `tests/browser/student-sessions.check.mjs`: **correcta en la ejecución completa**. Se asignó a un participante ficticio, se canjeó su código desde Play sin cookies docentes, se ejecutó la actividad completa de 120 s y se confirmó ejecución COMPLETED, evidencia recibida y procesamiento COMPLETED. Desde asignación y después desde ficha se obtuvieron el mismo ID de estudiante, URL de consulta, IDs de sesiones y detalle persistido, sin el estado vacío. El otro destinatario no recibió esa sesión. Sin errores JS observados. Capturas de sesiones ficticias, sin códigos, abiertas y revisadas a 1440/768/390 en `/tmp/opencode/student-sessions-review/`; en móvil la tabla conserva su región desplazable existente, sin scroll horizontal general. Los conteos anteriores de recepción en 4314 se volvieron a comprobar: siguen siendo 2 y 6.

Durante la verificación se fusionaron #13 y #14: `origin/main=f06aae6`, mismo árbol de aplicación que la base `dcf6762`. Los cambios de esta corrección son configuración/documentación y regresiones del entorno; no un filtro nuevo de StudentActivities ni una modificación backend para disimular un vacío legítimo de otra base.

Límites: diagnóstico de la pila local confirmada por el responsable, no validación de otro despliegue ni migración de datos históricos. El conjunto previo puede seguir teniendo datos que el nuevo no tiene; no se promete reproducirlos sin migración autorizada. Sin validación pedagógica, física, Safari/iOS ni lector de pantalla. Participación institucional y G-01…G-04 siguen pendientes; uso real con menores no habilitado.
