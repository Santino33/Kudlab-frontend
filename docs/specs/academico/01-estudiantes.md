# Spec frontend: gestión de estudiantes

**Fecha:** 2026-10-26. **Estado:** implementación parcial, verificada con dobles de transporte; no integración API/BD ni entrega completa del registro.

## Feature frontend

Implementación solicitada por el responsable a partir de [la spec de entrega](file:///home/santino/.local/share/opencode/worktree/d603ad/docs/cerrar-decisiones-tareas/docs/feature-specs/academico/01-estudiantes-frontend.md), secciones 1–9. Esa solicitud amplía para esta feature el alcance histórico de la base frontend. No se implementan otros recorridos académicos ni las propuestas de Tareas.

Docente TEACHER con acceso vigente: listado, ficha, edición e inactivación de registros académicos. Estudiantes no tienen interfaz, cuenta ni credenciales. El registro presenta el bloqueo de proveedor de grupos previsto en la spec, sin campos personales, UUID manual, selector ficticio ni POST desde la pantalla.

Se reutilizan AuthRoot, workspace, navegación History/popstate, componentes locales shadcn/Base UI y tokens del manual. No se agregaron dependencias. Los permisos efectivos corresponden al servidor, no al sidebar.

## Feature backend relacionada

Raíz backend resuelta mediante [INDEX](../../agent-context/INDEX.md): `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`.

- Reglas canónicas: [005, spec](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/005-gestionar-estudiantes/spec.md) y [contrato estudiantes](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/005-gestionar-estudiantes/contracts/students-api.md). No se reproducen sus reglas de negocio.
- Observación estática: cinco operaciones montadas bajo `/api/v1/students`, con guardia TEACHER, sesión persistida y ámbito actual. No hay consulta HTTP de grupos, aunque exista tabla `groups`.
- Los resúmenes académicos históricos aún dicen «no implementado» y citan RF V3 propuestos. Para estas operaciones prevalecen contrato 005 y código de `c989fae`; no se aplican los permisos ADMIN, filtros ni activación de aquellos diseños.

## Archivos backend consultados

Proveedor: **`c989fae8802dec009f75254d32431de249e313f5`**, `main`, checkout limpio al consultar y al finalizar. Solo lectura; no cambios backend, migraciones, fixtures ni ejecución de su suite.

Contexto y contratos:

- [README](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/README.md).
- [Índice](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/INDEX.md).
- [Académico, resumen](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/academico/module-summary.md).
- [Registro](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/academico/features/registrar-estudiante.md), [edición/inactivación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/academico/features/actualizar-inactivar-estudiante.md), [consulta](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/academico/features/consultar-estudiantes.md).
- [Pendientes](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/unresolved-issues.md), especialmente AC-01/02 y SE-03. No se resuelven grupos, consentimiento ni permisos administrativos.
- [Spec 005](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/005-gestionar-estudiantes/spec.md), [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/005-gestionar-estudiantes/contracts/students-api.md) y [OpenAPI, entradas de estudiantes](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/api/openapi.yaml).

Implementación observada:

- [Montaje](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts).
- [Rutas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/academico/students/students.routes.ts), [servicio](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/academico/students/students.service.ts), [validación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/academico/students/students.validation.ts).
- [Guardia académica](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/academico/shared/academic-auth.ts), [ámbito](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/academico/shared/scope-provider.ts), [errores](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/academico/shared/academic.errors.ts).
- [Esquema académico](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/db/schema/academic.ts).
- [Guardia de sesión](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-guard.ts), [actividad](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-activity.ts).
- [Scripts backend](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/package.json), [configuración de pruebas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/tests/setup.ts), consultados para evaluar ejecución aislada; no usar su BD por defecto ni truncar bases compartidas.

## Recorrido de UI

1. TEACHER accede a **Académico → Estudiantes**, `/academico/estudiantes`. ADMIN y acceso no confirmado no montan pantallas ni solicitan estudiantes.
2. Listado conserva colección/orden de API, incluye inactivos y distingue carga, vacío y fallo. Tabla con nombre accesible, cabeceras y acciones inequívocas; región de desplazamiento horizontal identificada/operable por teclado, no scroll de página. No se muestran UUID de grupo ni filtros inventados.
3. «Ver ficha» navega a `/:studentId` y obtiene detalle por GET. «Editar estudiante» abre `/:studentId/editar`, también en inactivos; el formulario precarga desde GET autorizado. Tras PATCH confirmado navega a ficha, vuelve a consultar y anuncia «Datos actualizados».
4. Formulario de una columna, etiquetas visibles sin sufijos, required, límites Unicode y resumen enfocable enlazado a errores inline. Envía solo cambios recortados; no envía PATCH vacío. Cancelar no escribe.
5. Inactivar abre AlertDialog con foco inicial en Cancelar, contención de foco y Escape. Confirmar envía POST con cuerpo ausente. Tras confirmación se vuelve a consultar, anuncia el resultado y enfoca la ficha si desapareció el disparador. No ofrece reactivación ni altera sesión docente.
6. `/nuevo` muestra «El registro requiere una consulta de grupos autorizados que todavía no está disponible» y permite volver. El cliente tipado de alta existe y se prueba aisladamente; la UI no lo invoca mientras falte el proveedor real.

## Estados y errores

- Los errores académicos objeto se decodifican con claves/motivos permitidos y mensajes locales. Usuarios conserva su decodificación de arrays; nunca se refleja mensaje arbitrario de la respuesta.
- 400 corregible conserva entradas; 409 se asocia al código sin identificar titular. 404 retira formulario/datos anteriores y presenta texto neutral, incluido ID malformado.
- 401/403/indisponibilidad notifican al controlador existente; se retiran datos protegidos. Lecturas permiten reintento manual. No se repite ninguna mutación automáticamente.
- Escrituras en curso o inciertas bloquean nuevas escrituras incluso al navegar o reconciliar acceso. Solo se conserva en App un indicador y el ID de destino, sin nombres/códigos/borradores. Después de una lectura explícita válida, el docente puede revisar el estado observado y permitir una nueva decisión; 404/403 no desbloquean por sí mismos.
- Si el formulario continúa montado tras un aborto, una consulta explícita compara el estado leído con sus campos sin sobrescribirlos. Si el controlador retiró el formulario por pérdida/revalidación de acceso, se descarta el borrador: la ficha permite revisar el estado observado, no reconstruye valores de otra generación ni atribuye autoría al guardado.
- Las respuestas antiguas se descartan por destino, montaje, señal y generación. Sin persistencia de datos personales, polling ni parámetros personales en URL.
- El indicador de incertidumbre es efímero: una recarga completa pierde ese aviso. No se promete diario durable de operaciones ni idempotencia inexistente; ante una respuesta perdida se debe consultar el recurso antes de volver a escribir.

## Criterios de aceptación

- [x] Cliente tipado de cinco operaciones, DTO/status/identidad coherentes, cuerpos estrictos y cero bytes en deactivate, comprobados con dobles.
- [x] E-01/E-02/E-04/E-05, errores, cancelación, edición inactiva, resumen accesible y retirada de datos comprobados en navegador con datos ficticios.
- [x] Rutas directas simuladas, atrás/adelante, sidebar TEACHER, generación, suspensión y ausencia de replay comprobados con dobles.
- [x] Fuentes y contrato real contrastados estáticamente; sin cambios backend ni reglas de dominio duplicadas.
- [ ] E-03 completa con proveedor autorizado real, incluidos grupos vacíos. **Bloqueante de la feature completa.**
- [ ] Recorrido navegador → API → BD → recarga, dos docentes con ámbitos diferentes, ADMIN/cuenta inactiva, conflictos reales y pérdida de ámbito real.
- [ ] Zoom real 400%, lector de pantalla, BFCache real y validación con docentes. No son acreditados por la suite DOM.

## Evidencia ejecutada

Frontend base **`966509e5ac653f27d77a358e962ab4f1a272517a`**, rama nueva `feat/academico-estudiantes`, worktree `/home/santino/.local/share/opencode/worktree/c4fd7d/estudiantes-frontend`. Se creó el worktree aislado antes de inspeccionar archivos por AGENTS; después se efectuó fetch exitoso de ambos repos, se verificó `main...origin/main = 0 0` en ambos y se creó la rama desde `main` antes de editar. No hubo que actualizar ni descartar cambios. Código en `4a633b8` (cliente/contrato) y `1810a8d` (pantallas/navegación).

| Comando / comprobación | Resultado |
| --- | --- |
| `npm ci` | Correcto, 0 vulnerabilidades reportadas, lockfile conservado |
| `npm test` / `npm run typecheck` | Correcto; solo comprobación de tipos |
| `npm run test:auth` | 66/66 |
| `npm run test:usuarios` | 70/70, incluidos cuerpos previos y sanitización de arrays |
| `npm run test:tareas` | 11/11 |
| `npm run test:estudiantes` | 14/14, dobles; no pruebas de servidor |
| `npm run build` | Correcto |
| `git diff --check` | Correcto |
| `opencode mcp list` | shadcn conectado; búsqueda, detalles, ejemplo y checklist consultados |
| `tests/browser/students.check.mjs` | 17 recorridos DOM de estudiantes + 11 de regresión de Tareas, correctos en Chrome con transporte ficticio |
| Responsive | 20 combinaciones (4 pantallas × 320/390/768/1024/1440px), nombres largos, controles ≥44px, sin desbordamiento horizontal de página |
| Texto / reflujo | Fuente raíz 200% a 320/360/1440px en lista/edición/bloqueo, sin desbordamiento. 360px es ancho de reflujo 1440/4, **no prueba de zoom real 400%** |
| Teclado | Enter abre diálogo, foco inicial seguro, Tab contenido, Escape/cancelación devuelve foco, foco tras inactivación; sidebar móvil cierra al navegar |
| Consola | Sin excepciones JavaScript en la ejecución final CDP |
| Integración real | No ejecutada: Docker deniega acceso al socket; no se identificó BD exclusiva autorizada ni se reutilizó una compartida |

Reproducción de navegador (sin nueva dependencia npm): iniciar `npm run dev -- --host 0.0.0.0 --port 5193 --strictPort`; después:

```bash
KUDLAB_CDP_DRIVER=/home/santino/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs \
TASTE_SKILL_TMP=/tmp/opencode node tests/browser/students.check.mjs
```

El driver CDP es el mismo tipo de herramienta opcional usado por las pruebas de diseño existentes; ajustar su ruta local si cambia la instalación. Artefactos regenerables: `/tmp/opencode/estudiantes-evidence/results.json` y capturas PNG ficticias. También puede abrirse `/tests/browser/students-harness.html` en desarrollo y ejecutar `window.runStudentChecks()`.

Se leyó el manual y sus guías de biblioteca/MCP/validación. Skills usadas: Ponytail full y UI/UX Pro Max, consulta específica `error summary validation`. MCP devolvió ejemplo Radix: **no se incorporó**; se reutilizaron los componentes locales Base UI. No se inicializó ni reinstaló shadcn. Revisión visual de capturas detectó y corrigió ruptura de estado/acción en tablas y desbordamiento de acción principal con texto al 200%. No certifica WCAG ni lector de pantalla. Se conservaron los tokens/colores y el feedback neutral aprobado.

## Pendientes y confirmaciones

- Acordar con el responsable una fuente HTTP de **grupos autorizados**, incluidos vacíos, su contrato y la autorización separada de implementación backend. No se inventa `GET /groups` ni se deducen grupos desde estudiantes. Esta entrega no declara el registro terminado.
- Disponer de BD/cuentas ficticias exclusivas para integración real, sin resetear bases compartidas. Probar recarga con persistencia y aislamiento real de dos docentes antes de considerar piloto.
- Concurrencia sin revisión/ETag sigue limitada por el contrato actual; la UI lo explica. Consentimiento, activación/reactivación, traslados, borrado y asignaciones continúan excluidos.
- No se fusionó, publicó ni eliminó ningún worktree.
