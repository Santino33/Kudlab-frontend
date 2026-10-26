# Sidebar shadcn y margen izquierdo

2026-10-26, worktree `sidebar-shadcn`, rama `fix/sidebar-shadcn`, sobre `60cb2d1`.
El responsable señaló que el sidebar anterior era artesanal y tenía demasiado
margen exterior. Era correcto: solo sus botones eran componentes shadcn.

## Corrección

- `src/components/ui/sidebar.tsx`: adaptación de la composición oficial Base Nova:
  Provider, Sidebar, Trigger, Inset, Header/Content/Group/Menu/MenuButton/Footer.
  Se conservan offcanvas, slots y composición `useRender`/`mergeProps` de Base UI.
- `sheet.tsx` y `hooks/use-mobile.ts`: adaptaciones oficiales para navegación móvil
  con diálogo Base UI, cierre, contención/restauración de foco y breakpoint 768.
- Se incorporan solo las piezas utilizadas; no variantes icon/floating, tooltip,
  skeleton, atajo global ni cookie de preferencia. No nuevas dependencias.
- El marco autenticado deja de estar centrado con `max-width:75rem`: el sidebar
  de 16rem es fijo en `left:0`, sin margen exterior; solo 8–16px de padding interno.
  El contenido conserva su padding y límite de lectura por separado. Login y
  recuperación mantienen su marco anterior. Sin `main` anidados.

## Fuentes

MCP conectado (`opencode mcp list`), búsqueda/detalle `@shadcn/sidebar`, ejemplo
`sidebar-01` y checklist. El resultado genérico del MCP usaba Radix: **no se incorporó**.
Fuentes Base UI contrastadas directamente:
`https://ui.shadcn.com/r/styles/base-nova/{sidebar,sheet,use-mobile}.json`.
Se adapta el código MIT al manual: tinta Dark 1, blanco opaco, 44px, sin blur/sombra
ni colores nuevos. Skill UI/UX Pro Max local cargada, consulta `keyboard focus modal`.

Contexto sin cambios de negocio: índice frontend y manual; backend original
`ff46f8a`, índice → resumen Usuarios → `features/autorizacion.md`,
`src/auth/session-guard.ts` (`requireActive/requireAdmin`). Se mantiene la revisión
de contrato/routers registrada en [design-review.md](design-review.md), sin nuevas
reglas ni modificaciones API. Solo profesores; menú ADMIN/TEACHER sin ampliaciones.

## Comprobación y límites

`npm ci` (0 vulnerabilidades frontend), `npm test` (tipos), 66 pruebas auth,
67 Usuarios, build y `git diff --check`: correctos. Manifiesto/lockfile sin cambios.
`TASTE_SKILL_TMP=/tmp/opencode node tests/browser/usuarios-design.check.mjs`:
30 combinaciones de pantalla/ancho, sin overflow ni controles visibles menores de
44px; sidebar en `left=0` a 768/1024/1440; colapso/reapertura desktop;
Sheet móvil con Enter/Tab contenido/Escape/restauración; formularios/diálogo/rol
TEACHER sin regresión detectada. Chrome local con fixtures, sin mutaciones backend.
Capturas revisadas: inicio desktop/móvil, panel abierto móvil y listado desktop.

Vista real continúa en `http://localhost:5187/`, API 3002 y base desechable existente.
No certifica accesibilidad completa, lector, zoom ni aceptación humana; no se
marcan como cerrados los gates manuales de Usuarios.
