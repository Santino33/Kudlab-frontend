# Invitación duplicada: conservar y corregir el borrador

2026-10-28. Frontend base `079b9be`, worktree separado
`/tmp/opencode/kudlab-frontend-invitation-conflict`, rama
`fix/invitacion-conflicto-borrador`. Petición del responsable: corregir la pérdida
del borrador tras un correo existente. Implementa US2.4/FR-007; no amplía permisos,
reglas de correo, capacidades backend ni el alcance de activación.

## Diagnóstico observado

`AccountForm.tsx` bloqueaba el submit y todos los controles ante cualquier `409`,
aunque `src/lib/http.ts` lo devuelve con `uncertain:false`. El único recorrido de
revisión del alta navegaba a `/usuarios`: el cambio de ruta desmontaba el editor y
descartaba su estado local. Los controles quedaban sin una corrección posible en
la misma pantalla. La prueba de navegador previa al arreglo reprodujo el bloqueo:
nombre y correo conservados inicialmente, pero inputs y envío deshabilitados.

El backend consultado está limpio en `65d0ad67b1a87b52dcc251f807595fad016e65b9` en
`/home/santino/Universidad/TrabajoCampo/Kudlab-backend`; no se modificó en esta tarea.
El POST crea cuenta/invitación en una transacción y luego envía correo. Una colisión
de unicidad se mapea a `409 CONFLICT`; el contrato no exige descartar ni bloquear el
borrador de alta. Un 503 de entrega no equivale a rollback: no se flexibiliza ese caso.

## Corrección

- Un conflicto de **alta confirmado** permite editar nombre/correo y enviar de nuevo
  solo por acción explícita. Un mismo `blocked` gobierna el submit y los controles.
- El aviso explica cómo corregir sin afirmar éxito ni garantizar disponibilidad.
- «Revisar profesores sin salir» reutiliza `Accounts` en modo de consulta dentro
  de la pantalla. Mantiene filtros/paginación y estados existentes; no ofrece
  navegación a detalle ni otra invitación que desmonte el borrador. No se añade
  búsqueda ni se deduce unicidad de una página del listado.
- Revisión expandible con `aria-expanded`/`aria-controls`, región identificada,
  encabezado h2 sin duplicar el h1 y foco al abrir. «Volver al borrador» devuelve
  el foco al correo sin perder datos. El error conserva su anuncio/foco.
- Los conflictos de edición siguen exigiendo consultar el estado; pendientes,
  dobles envíos, errores de acceso y resultados inciertos conservan su protección.
- No se añade almacenamiento persistente. Cancelación, navegación intencional,
  recarga o retirada de acceso conservan el ciclo de vida anterior; no se recuperan
  borradores de otra sesión. El recorrido de revisión ya no requiere abandonar
  el formulario.

Se leyó el manual de diseño y se aplicó `ui-ux-pro-max` (recuperación accionable
de errores), con `ponytail` full. MCP shadcn conectado: búsqueda, detalles y ejemplos
de Button/Table; se reutilizan los componentes locales adaptados Base UI, sin
copiar primitivas Radix del registro, instalar componentes ni cambiar dependencias.

## Fuentes backend consultadas

Rutas relativas al checkout backend indicado (misma revisión base):

- `docs/agent-context/INDEX.md`, `modules/usuarios/module-summary.md`,
  `modules/usuarios/features/cuentas.md`, `unresolved-issues.md`.
- `docs/api/openapi.yaml`: POST/GET de cuentas y respuesta de conflicto.
- `src/app.ts`, `src/auth/session-guard.ts`,
  `src/modules/usuarios/accounts/{accounts.routes,accounts.service}.ts` y
  `src/modules/usuarios/shared/accounts.errors.ts`.

Los índices/resúmenes y router se habían consultado en esta sesión; se revalidaron
commit/limpieza, montaje, guarda, servicio, mapper y contrato para este arreglo.
Las reglas canónicas permanecen en backend; el flujo frontend no sustituye la
comprobación de permisos o correo en servidor.

## Verificación ejecutada

- `npm ci`: correcto, 0 vulnerabilidades informadas; lock sin cambios.
- `npm test` (solo tipos) y `npm run build`: correctos.
- `test:auth` 66/66, `test:usuarios` 72/72, `test:tareas` 31/31,
  `test:estudiantes` 26/26: **195 pruebas de lógica/transporte correctas**.
- `tests/browser/invitation-conflict.check.mjs`: **7 escenarios correctos** en Chrome
  real con transporte ficticio. A 320/390/768/1440px: 409 con datos editables,
  consulta/filtro dentro de la pantalla sin nuevo POST ni pérdida de valores,
  corrección del correo y envío por Enter con éxito. Además: conflicto de edición
  requiere revisión y conserva su borrador; envío pendiente no se duplica; fallo
  incierto retira contenido protegido y sigue bloqueando tras comprobar acceso.
- `tests/browser/usuarios-design.check.mjs`: **30 combinaciones pantalla/ancho** y
  comprobaciones de teclado, foco, Sheet, confirmación y permisos TEACHER correctas.
- `git diff --check`: correcto. Capturas revisadas a 320/1440px, sin desbordamiento;
  evidencia regenerable en `/tmp/opencode/invitation-conflict` y
  `/tmp/opencode/invitation-conflict-design`.

Reproducción, con Vite desarrollo en `http://localhost:5187` y el driver CDP local:

```bash
KUDLAB_CDP_DRIVER=/ruta/local/cdp.mjs TASTE_SKILL_TMP=/tmp/opencode \
node tests/browser/invitation-conflict.check.mjs
```

No se ejecutó API/PostgreSQL real ni SMTP en esta corrección de interfaz; el 409
del navegador es simulado conforme al contrato observado. No acredita despliegue,
aceptación docente ni auditoría completa con lector de pantalla. La corrección CSRF
anterior permanece en su worktree backend separado, sin integrar aquí trabajo ajeno.
