# Referencia visual y blueprint — 2026-10-26

Base `39d8a83`, auth gráfica heredada de `main@664cc5c`. Se leyeron los cuatro
documentos de `docs/design/`: manual, investigación de biblioteca, guía MCP y
validación histórica. Sus referencias a app vacía son históricas; el catálogo
observado y reutilizado es Button/Input/Label/Card/Alert, `src/lib/utils.ts`,
licencia MIT, `components.json` base-nova, AuthRoot y `src/styles.css`.

## Baseline observado

[Captura de entrada](screenshots/baseline/access.png), viewport 990×986,
harness `tests/browser/auth-harness.html` en Vite 5187. Se resolvió una consulta
simulada con 401 para mostrar el formulario real. Sin credenciales introducidas,
sin API/backend. La captura muestra header/footer, Card de 32rem, superficie
blanca, Dark 1, controles de 44px, Primary con tinta oscura, bordes y sin sombras.
No es una prueba de integración ni una revisión responsive completa.

## Blueprint de las ocho vistas

Fuente: matriz gráfica de `../plan.md` y `../contracts/ui.md` (sin ampliaciones).

| Vista | Composición y estados |
| --- | --- |
| Entrada | AuthRoot/Card 32rem; correo, contraseña, envío único, errores y comprobación; recuperación solo cuando exista |
| Acceso confirmado | Misma Card/identidad filtrada/cierre; TEACHER sin otras operaciones; cierre pendiente e incierto |
| Listado ADMIN | Marco común hasta 75rem; título, invitación, filtro de estado, tabla semántica, paginación; carga, vacío, denegación, error |
| Invitar | Formulario hasta 32rem; nombre/correo y rol TEACHER fijo; entrega separada de persistencia y resultado incierto |
| Detalle | Título/enlace de vuelta, datos confirmados, entrega y correo pendiente si existen; solo acciones incluidas |
| Editar | Nombre/correo con etiqueta/ayuda; conflicto exige consultar, sin éxito anticipado ni canje de correo |
| Solicitar recuperación | Card 32rem con correo, respuesta neutral y envío único; no enumera cuentas |
| Confirmar recuperación | Card 32rem; token efímero fuera de DOM/URL tras captura; contraseña/confirmación, sin auto-login |

Tres diálogos acotados: reemitir invitación, desactivar y reducir ADMIN→TEACHER.
Título/consecuencia/acción específica, cancelar como foco seguro, interacción
modal Base UI, sin colores destructivos inventados. En estrecho, una columna,
acciones apilables, texto sin recorte; tabla en región identificada/operable si
necesita scroll. Conservar fuente de sistema, 8/12px, foco 2px+2px, sin sombras.
Capturas de las nuevas vistas y verificación de teclado siguen pendientes por historia.

## Consultas y componentes

- `opencode mcp list`: shadcn conectado.
- MCP real: búsqueda `alert-dialog`, detalles `@shadcn/table` y
  `@shadcn/alert-dialog`, ejemplo `alert-dialog-demo`. El ejemplo genérico es
  Radix (`asChild`): se rechaza como incorporación.
- Se consultaron los JSON oficiales
  `https://ui.shadcn.com/r/styles/base-nova/{table,alert-dialog}.json` y sus
  ejemplos `/code/apps/v4/registry/bases/base/examples/{table,alert-dialog}-example.tsx`.
  Base UI usa `render`, no `asChild`. No se adoptan datos, colores ni acciones de demos.
- Se incorporan solo `table.tsx` y `alert-dialog.tsx`, adaptados a tokens locales,
  licencia existente y Button. Sin init/add, paquetes, Radix, TanStack o tema nuevo.
- Diff revisado: manifiesto solo añade `test:usuarios`; lockfile intacto.
  `npm test` correcto con ambos componentes; interacción modal pendiente de vistas reales.

Skills gráficas no disponibles en esta sesión; no se afirma su uso. No hay
certificación de accesibilidad ni aceptación gráfica del responsable en esta evidencia.
