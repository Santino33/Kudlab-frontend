# Revisión de diseño y retirada de `/sesion`

2026-10-26. Implementación anterior guardada en `94572de`, rama
`feat/gestionar-usuarios`. Revisión en worktree `design-usuarios`, rama
`feat/design-usuarios`, sin modificar el checkout original ni backend.

## Decisiones y fuentes

El responsable solicitó mejorar principalmente el diseño y eliminar `/sesion`:
el inicio debe mostrar directamente la interfaz según el rol confirmado. Se
eliminan la ruta y los enlaces; identidad y cierre permanecen en el workspace.
No se añade selector de rol ni se deducen permisos del navegador.

Leídos los cuatro documentos solicitados de
`/home/santino/Universidad/TrabajoCampo/Kudlab-frontend/docs/design/`:
`agent-design-manual.md`, `component-library-research.md`, `shadcn-mcp.md` y
`validation.md`, además del índice frontend y los componentes locales.
Se conservan sus colores, sans-serif de sistema, escala 14/16/20/28, controles
de 44px, radios 8/12px y feedback neutral; sin paletas/fuentes nuevas.

Contexto backend consultado en checkout original limpio
`ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`: `docs/agent-context/INDEX.md`,
`modules/usuarios/module-summary.md`, `features/{autenticacion,autorizacion}.md`,
`docs/agent-context/unresolved-issues.md`, `specs/003-autenticar-usuarios/spec.md`,
`src/app.ts` (login, sesión y montaje de cuentas) y `src/auth/session-guard.ts`.
Implementación observada: rol de cuenta vigente devuelto por sesión y guardas
ADMIN en servidor. RF-003/004 V3 son antecedentes propuestos, no nuevas reglas.
La revisión estética no modifica el contrato API ni resuelve pendientes académicos.
La API de la vista real sigue usando las correcciones locales identificadas en
[backend-restored.md](backend-restored.md), no el backend original sin corregir.

## Skills y composición

Instaladas y cargadas las tres skills pedidas con `npx skills add <URL> --skill
<nombre> --agent opencode --yes`, desde el worktree. Se omitió `--global` para
respetar la instalación local solicitada. `npx skills list --agent opencode`
confirmó `apple-design`, `ui-ux-pro-max` y `design-taste-frontend` en `.agents/skills/`.
Esos archivos se mantienen locales e ignorados según la convención existente.

- Apple: familiaridad, jerarquía, respuesta y control; no vidrio, gestos o springs.
- UI/UX Pro Max: consulta `navigation hierarchy admin dashboard --domain ux`,
  jerarquía semántica y navegación predecible; no sistema de diseño generado.
- Taste, recorrido para **app screens**: estilo `editorial-greeting`, seed
  `456980758`, shell abierto y `--keep palette,type`. Saludo e identidad real;
  tareas antes que decoración. Adaptación al manual: sin KPIs/charts que no existen,
  sin fuentes, tintes o logo inventados, y geometría Kudlab sobre los defaults de la skill.

Pregunta del inicio: «¿Qué puedo hacer con mi acceso actual?»; listado: «¿Qué
cuentas hay y cuál necesito gestionar?»; detalle: «¿Qué acceso tiene esta cuenta?»;
formulario: «¿Qué datos voy a enviar?». No se inventaron contadores ni actividades.

Cambios principales: marco abierto sin cabecera duplicada, navegación plegable en
móvil/tablet, tareas con acciones específicas en lugar de tarjetas gemelas, cuenta
compacta, datos/acciones del detalle agrupados por espacio y listado móvil con
nombre/correo/rol/estado/entrega/enlace completos. Tabla de escritorio conservada.
Advertencias de invitación/correo siguen visibles y no prometen activación.

MCP shadcn conectado (`opencode mcp list`), búsqueda `card`, detalles Card/Table,
ejemplo Card y checklist consultados. Se reutilizan las adaptaciones Base UI locales;
no se instalaron componentes, dependencias de aplicación ni ejemplos Radix.

## Verificación ejecutada

- `npm ci`: correcto, 0 vulnerabilidades frontend.
- `npm test`: tipos; `npm run test:auth`: 66/66;
  `npm run test:usuarios`: 67/67; `npm run build` y `git diff --check`: correctos.
- Chrome local mediante CDP de la skill, no la ventana Review que antes no permitía
  capturas. `TASTE_SKILL_TMP=/tmp/opencode node tests/browser/usuarios-design.check.mjs`:
  30 combinaciones (inicio/listado/alta/detalle/edición/recuperación ×
  320/390/768/1024/1440): un título, sin overflow horizontal general ni controles
  visibles menores de 44px; sin enlaces `/sesion` ni excepciones JS.
- Teclado CDP con documento enfocado: Enter abre menú, Tab accede a enlaces,
  Escape lo cierra y devuelve foco; formulario vacío enfoca primer campo inválido;
  diálogo de inactivación inicia en Cancelar, contiene Tab y restaura el disparador
  con Escape. Sin ejecutar mutaciones contra backend en estas comprobaciones.
- TEACHER: sin destinos de gestión. La prueba de navegación también rechaza `/sesion`.
- Comprobación adicional contra la API real 3002: login del ADMIN ficticio mostró
  directamente el nuevo inicio; listado devolvió cuatro cuentas y ningún enlace
  `/sesion`; la URL retirada mostró «Destino no disponible». Se dejó el inicio
  ADMIN abierto en 5187. Sin mutar cuentas durante esta revisión.
- Inspector final sobre harness **compilado/minificado por Vite en salida separada**,
  en puerto 5189, a 1440/768/390: **0 FAIL, 0 WARN**. Es la misma UI con datos
  ficticios, no el backend real ni el bundle productivo con fixtures incluidos.
  `dist/` ordinario sigue sin harness. Lint app: **0 FAIL, 0 WARN**.

## Comparación visual y crítica final

Capturas abiertas y revisadas en los tres anchos. Antes: cinco bordes de panel
pesados, navegación que desplazaba las tareas en móvil y advertencia de ancho
desaprovechado. Después: ninguna de esas advertencias en el inicio; la tarea
principal aparece en la primera pantalla móvil. Segunda ronda corrigió correo
partido en tablet y tabla móvil poco legible, sin recortar datos.

Evaluación cualitativa del agente, no puntuación de usuarios: pregunta principal
clara; bordes/alineaciones coherentes; color reservado a la acción; datos de sesión
reales en producto y sintéticos declarados en harness; sin cifras que reconciliar,
charts ni leyendas inventadas; navegación plegada y tareas legibles en móvil.
TEACHER deliberadamente tiene menos contenido porque no se aprobaron otros módulos.
El foco inicial sigue visible; no se retiró para embellecer capturas.

Antes/después versionados en [screenshots/design](screenshots/design/). El resto de
informes/capturas y herramientas de compilación temporal queda en `.taste-skill/`
ignorado, sin añadir imágenes externas ni licencias nuevas.

## Límites

No es certificación WCAG ni aceptación con profesores: lector de pantalla, zoom
200/400%, BFCache real, TLS y matriz completa siguen pendientes. Teclado CDP usa
el harness con datos ficticios y no sustituye recorridos integrados/humanos. No se
repitieron las mutaciones reales de la entrega anterior ni pruebas backend. No se
cierran T018/T026/T030/T036/T041/T045 ni T056 solo por esta revisión parcial.
Canjes y capacidades diferidas no cambian. La vista real continúa en
`http://localhost:5187/`, API 3002 y base desechable existente.
