# Pantallas implementadas y validación parcial

Fecha: 2026-10-26. Rama frontend `feat/gestionar-usuarios`, base `39d8a83`
con implementación local sin commit. 44/57 tareas completadas; no aceptación final.

## Entrega observable

- `/` y `/acceso` autenticado: dashboard por rol. ADMIN abre usuarios/invitación;
  TEACHER consulta identidad/sesión/cierre, sin operaciones administrativas.
- `/usuarios`: listado, filtro por estado y paginación de 20.
- `/usuarios/nueva`: invitación docente pendiente, validación y envío único.
- `/usuarios/:id`: datos, entrega y confirmaciones de reemisión, inactivación y
  reducción ADMIN→TEACHER; `/editar`: nombre/correo vigente y pendiente separados.
- `/recuperar-acceso` y `/confirmar`: solicitud neutra y cambio explícito con
  token solo en memoria, URL saneada y retirada al ocultar/abandonar la página.
- Descriptores tipados en `dashboard.ts` permiten añadir destinos implementados
  por rol. Se reutilizan shadcn/Base UI/Lucide y tokens existentes, sin dependencias nuevas.

## Entorno y fuentes

SPA temporal `http://localhost:5187`, API `http://localhost:3002`; perfil aprobado
5173/3000 sin modificar. PostgreSQL desechable `kudlab-usuarios-preview`, datos
ficticios y captura de correo, sin SMTP real. No se reinició la fixture tras las
acciones: hay una cuenta inactivada, un ADMIN reducido y otro ADMIN de prueba.
Identidad/backend, hashes y correcciones locales P-01/P-02:
[backend-restored.md](backend-restored.md). No se modificó el checkout backend original.

Fuentes backend consultadas en el worktree
`/home/santino/.local/share/opencode/worktree/d603ad/session-cookie-guarantees`,
base `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3` + cambios locales identificados:
`docs/agent-context/INDEX.md`, módulo Usuarios y `features/flujos-complementarios.md`,
`docs/api/openapi.yaml`, `src/app.ts`, `src/auth/`, routers/servicios de
`src/modules/usuarios/{accounts,invitations,email-changes,recovery}/` y
`shared/accounts.validation.ts`. En particular `accounts.service.ts`,
`lifecycle.service.ts`, `roles.service.ts`, `email-changes.service.ts`,
`recovery.routes.ts` y `recovery.service.ts`. Son implementación observada;
no se deducen nuevas reglas de RF históricos. Decisión de producto posterior:
[dashboard-amendment.md](../dashboard-amendment.md).

## Comprobación ejecutada

Navegador contra API real, mediante interacción DOM (no certificación de teclado):

- Dashboards ADMIN/TEACHER y listado; alta con validación y doble envío produjo
  un solo POST 201. Edición de nombre confirmada por PATCH.
- Reemisión cancelada sin PATCH y confirmada con PATCH 200.
- Rechazo LAST_ADMIN sin cambio de rol; posterior reducción propia autorizada
  retiró datos/controles ADMIN y mostró denegación. Inactivación confirmó INACTIVA.
- Recuperación: solicitud neutra 202, enlace inválido 410 y enlace válido con éxito;
  no hubo solicitudes iniciales de canje ni login automático. Query retirada y
  formularios/token retirados con pagehide/pageshow sintéticos.
- Rutas excluidas/ambiguas sin llamadas API: ver exclusiones US7/US8.
- Listado en iframe real de 320/390/768/1024/1440 px: sin desbordamiento horizontal
  general; en estrecho solo región de tabla desplazable. No se extrapola al resto.

Última ejecución completa tras los cambios de foco, pruebas y guard de denegación:
`npm ci` correcto (0 vulnerabilidades frontend), `npm test` correcto (solo tipos),
`npm run test:auth` 66/66, `npm run test:usuarios` 67/67,
`npm run build` y `git diff --check` correctos. Suites Node usan Fetch simulado,
no prueban DOM/cookies/accesibilidad. Guard `denied` probado a nivel de selección
de acceso; inyección integrada de 403 repetido pendiente.

## Límites y pendientes

Capturas y foco/teclado real bloqueados: el navegador informa que necesita una
pestaña visible, aun tras enfocarla; `document.hasFocus()` era falso. No se certifican
trampa/restauración de foco ni fondo inerte por clics DOM. T018/T026/T030/T036/T041/T045
y gates transversales/gráficos siguen abiertos. Faltan matriz completa, edición de
correo activo integrada, paginación con más de 20, accesibilidad/lector, perfiles
independientes, BFCache real, TLS, SMTP/recepción, participantes y aprobación gráfica.
Backend reportó vulnerabilidades de dependencias (una alta); sin upgrades en este alcance.

Canjes de invitación/correo bloqueados; ascensos, auditoría visible, reactivación y
módulos académicos diferidos. No se declara piloto ni feature completamente aceptada.
