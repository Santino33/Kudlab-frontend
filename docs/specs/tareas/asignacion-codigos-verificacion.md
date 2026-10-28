# Crear asignación y preparar códigos · verificación

**Corrección posterior de la vista previa:** el ensayo docente de este registro usaba 5185/4315, pero Play 4184 seguía con 4314. No combinar esos servicios para jugar. La pila integrada corregida es **5185/4315/4185**; ver [diagnóstico y regresión del historial](historial-estudiante-verificacion.md). La PR #14 de este flujo se publicó posteriormente y ya fue fusionada; el cierre local inferior conserva el estado histórico anterior a esa solicitud.

## Alcance y fuentes

Petición del responsable y plan aprobado: corregir únicamente la creación/preparación y su pantalla. Base frontend `d784b27`, worktree `/tmp/opencode/kudlab-frontend-assignment-codes`, rama `fix/assignment-codes-flow`. Sin modificar Play, acuses, recuperación, CI, reglas de participación, APIs o dependencias. Fecha de revisión: 2026-10-27 (sesión local).

Backend observado en `/tmp/opencode/kudlab-backend-j03-aula`, HEAD `8cef84b`: contexto `docs/agent-context/modules/tareas/{module-summary,features/asignacion}.md`, pendientes `docs/agent-context/unresolved-issues.md`, decisiones posteriores `docs/aula-acuse.md`; código efectivo `src/app.ts`, `src/modules/tareas/runtime/{routes,service}.ts` y `src/modules/academico/shared/participation.ts`. La creación y generación son transacciones distintas, ambas idempotentes; generateCodes admite hasta 100 destinatarios por solicitud, devuelve metadatos y revealCode devuelve el código autorizado. Un lote se rechaza atómicamente si cambian sus condiciones: no se fragmenta ni se altera una solicitud incierta para eludir esa validación. Los resúmenes históricos que aún dicen «diseño no implementado» no sustituyen ese código ni las decisiones posteriores.

## Hallazgo reproducido

En el build anterior de `http://localhost:5184`, se retrasó la respuesta de generación después del commit real. Se confirmó creación y generación correctas en servidor, pero el formulario seguía visible y no había detalle: creación + generación compartían el timeout global de la mutación. Es un fallo reproducible, no una atribución demostrada de todo lo observado por el responsable ni una suposición sobre su URL.

## Implementación

- `Activities.tsx`: guardar crea una sola vez; antes de navegar conserva una intención de preparación ligada al actor/asignación. Bloqueo síncrono de doble activación. Si se pierde la respuesta de creación, se comprueba con el mismo requestId. Con ID confirmado en memoria no se crea de nuevo para continuar.
- `code-preparation.ts`: persistencia allowlisted de IDs de destinatarios, IDs de solicitud, siguiente lote confirmado y marca de primer despacho. No contiene nombres ni códigos. La lectura valida pertenencia a la asignación, unicidad y rangos.
- `use-code-preparation.ts`: primer despacho automático únicamente para una intención nueva. Al despachar se marca pausada para que recargar una operación incierta no repita mutaciones silenciosamente. Reintento explícito del lote pendiente, conservando IDs y contenido. Los lotes confirmados se omiten. Al completar se elimina la intención; reabrir el detalle no genera accesos nuevos. Sin cola ni worker que prometa seguir ejecutándose con el navegador cerrado.
- `prepare-codes.ts`: un deadline de 15 s por lote, propagación de cancelación y rechazo de respuestas tardías. Sin cambiar useMutation/useQuery globales.
- `AccessCodes.tsx`: utiliza inmediatamente los metadatos confirmados por cada lote, sin esperar al historial para comenzar a revelar. Renderiza el roster durante carga/fallo; distingue preparación de revelado. Revelado limitado a cinco solicitudes concurrentes, cada una con su deadline. Un fallo de visualización solo reintenta revelado. Códigos en memoria, retirados al perder foco/visibilidad o vencer; respuestas tardías no los reponen.
- Pantalla: nombre de actividad/curso, disponibilidad, fechas/zona, intentos y destinatarios visibles; tabla compacta con copia directa, referencia diferenciada, caducidad real y gestión secundaria. Adaptación por ancho disponible y tamaño de texto mediante container queries, sin romper los cinco caracteres del código. Actualización unificada; proyección separada sin gestión ni resultados.
- Componentes locales Base UI/shadcn y tokens del manual conservados. Skills Ponytail, ui-ux-pro-max y design-taste-frontend; MCP shadcn consultado para table/button, ejemplo table-demo y checklist. No se incorporaron primitivas Radix del registro ni paquetes nuevos. No se sorteó otra estética para una pantalla del sistema existente.

## Verificación ejecutada

Servicios nuevos y datos ficticios: Kudlab `http://localhost:5185`, API `http://localhost:4315`, BD PostgreSQL 17 `kudlab_j02_assignment_codes_browser_test` en el contenedor aislado existente. Se creó/migró esa BD nueva usando el runner sintético ya existente. No se reseteó ninguna BD anterior ni se reiniciaron los servicios 5183/5184 o 4313/4314. Play no se modificó ni se probó su ejecución.

Comandos:

```sh
npm ci
npm test
npm run test:auth
npm run test:usuarios
npm run test:estudiantes
npm run test:tareas
VITE_API_ORIGIN=http://localhost:4315 VITE_PLAY_ORIGIN=http://127.0.0.1:4184 npm run build
KUDLAB_PLAYWRIGHT=/tmp/opencode/kudlab-play-j03-aula/node_modules/@playwright/test/index.mjs node tests/browser/assignment-codes.check.mjs
git diff --check
```

`npm test` solo comprueba tipos. Funcionales: **192 correctas** (66 auth, 72 usuarios, 26 académico, 28 tareas), incluidas siete nuevas pruebas de progreso, validación, cancelación, deadlines y reanudación. Sin vulnerabilidades reportadas por npm ci.

El script de navegador usa una instalación Playwright suministrada explícitamente, sin añadirla a dependencias de la aplicación. Sobre build y API/PostgreSQL reales comprobó:

1. Una selección/guardado y doble activación: una sola solicitud de creación, detalle visible mientras la generación está retenida, códigos reales para uno/dos destinatarios, sin códigos en storage.
2. Respuesta de generación perdida después del commit y timeout: recarga conserva el progreso, reintento explícito con requestId/contenido idénticos, una sola asignación y un código activo por destinatario.
3. Respuesta de creación perdida después del commit: comprobación con el mismo cuerpo y navegación al ID ya creado.
4. Fallo de revelado recuperable sin otra generación; respuestas de revelado tardías tras blur descartadas; copia fallida con texto seleccionable que se retira al ocultar.
5. Revocación preservada al reabrir. Solo la acción secundaria explícita prepara otro acceso, con una solicitud nueva.
6. Anchos 320/390/768/1024/1440, texto 200 %, ausencia de scroll horizontal general, proyección/Escape y retorno de foco. Sin errores JS observados.

**Volumen con dobles de contrato, no 205 filas escritas en PostgreSQL:** creación de 205 destinatarios, dos respuestas de 8 s cada una, fallo del segundo lote, estado 100/205, recarga sin repetición automática, reintento exclusivo del segundo lote con cuerpo idéntico y tercer lote de cinco. Cambio de página revela sin generar. Esto no acredita rendimiento de PostgreSQL con 1000 destinatarios.

## Revisión visual y límites

Inspector sobre build final a 1440/768/390: **0 FAIL / 0 WARN**, capturas en `/tmp/opencode/assignment-codes-inspect-final/`; códigos ocultos antes de capturar. El lint de ambos componentes tiene 0 FAIL y un aviso de guiones que representan datos ausentes en secciones existentes; se conservan, no se convierten en cero. No es una puntuación de calidad ni certificación WCAG.

Capturas adicionales en `/tmp/opencode/assignment-codes-review/` (incluidos 320 px, texto 200 % y proyección), con el texto de los códigos sustituido temporalmente en el DOM para capturar. Se sustituyeron máscaras geométricas, que pueden desalinearse al reflujo; se retiró la captura supersedida y se revocaron sus dos accesos sintéticos. No se publican capturas o logs con códigos utilizables.

Crítica de las capturas: actividad y condiciones dejan de estar escondidas y comparten la primera pantalla de escritorio con los primeros códigos. Los campos y acciones mantienen las mismas alineaciones; sin tarjetas por cada estudiante ni números decorativos. La revisión de texto ampliado detectó códigos/fechas partidos en la tabla estrecha: container queries y no-wrap del código corrigen el reflujo. En móvil prima preservar información y nombres completos, a costa de una lista más larga. Proyección vacía fuera de los pocos destinatarios es deliberada, no se inventan filas para llenar pantalla.

Sin prueba física de proyector, Safari/iOS, lector de pantalla ni certificación de zoom 400 %. No se ejecutaron las E2E históricas del repositorio Play: sus selectores del botón de guardado y la gestión anterior necesitan adaptarse para esta nueva pantalla; el recorrido docente se verifica aquí con el script nuevo, sin modificar Play ni su CI. La preparación se ejecuta en el navegador abierto, no en un trabajo durable de servidor; tras una interrupción puede requerir reintento explícito. No se amplía la vigencia de códigos ni se relajan permisos/participación. El responsable debe validar su recorrido real; uso con menores sigue bloqueado mientras participación institucional y G-01…G-04 estén pendientes. Sin push ni nuevas PR en esta tarea.
