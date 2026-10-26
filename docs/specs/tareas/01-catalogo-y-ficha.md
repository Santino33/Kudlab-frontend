# Vertical 01 — Catálogo y ficha de juegos

2026-10-26. Implementación en rama, sin merge/despliegue. Autorizada por la spec
del responsable y continuación explícita, sin flujo SDD ni planes adicionales.

## Experiencia y alcance

Profesores ADMIN/TEACHER activos abren Tareas desde su espacio existente.
`/tareas` consulta tabla real; `/tareas/:taskId` consulta ficha autorizada. Se
distinguen disponibilidad administrativa, integración y configuración publicada.
La UI usa assignable/razones del servidor, nunca deduce preparación de isEnabled.
Finalidad y aviso no diagnóstico se leen en una columna hasta 65ch. No se muestran
banco, soluciones, claves ni datos de estudiantes. No hay Jugar/Asignar ni enlaces
a features futuras. Segundo juego sin definir; TG-00/TG-06 son apoyos independientes
del catálogo de juegos asignables, no tarjetas ficticias.

Carga, vacío, inexistente y error son estados distintos. Los enlaces explícitos
ficha/volver usan History/popstate conservando un único AuthRoot; abrir URL directa
o recargar pasa por el gate actual. Cleanup por destino y generaciones evita
respuestas obsoletas. Pagehide/suspensión retira DOM protegido sin cambios al auth.
401/403 siguen notificación transversal; 403 no restaura Tareas tras reconciliar
acceso. Red/503 conserva el gate más restrictivo existente: retira contenido,
mensaje persistente y Reintentar comprueba sesión antes de repetir la lectura.

Tabla local shadcn sin datagrid/filtros/paginación; región desplazable identificada
y operable por teclado. Estados neutrales con borde/texto, enlaces subrayados,
controles ≥44px, H1 28px/cuerpo 16px/metadatos 14px de referencia. Reutiliza tokens,
Button/Table/Notice/Loading y sidebar Base UI/Lucide, no rediseña acceso.

## Contrato y reglas canónicas

Backend de esta feature: [spec y fuentes](file:///home/santino/.local/share/opencode/worktree/backend-catalogo-juegos-01/docs/feature-specs/tareas/01-catalogo-y-ficha.md)
y [OpenAPI](file:///home/santino/.local/share/opencode/worktree/backend-catalogo-juegos-01/docs/api/openapi.yaml).
GET tasks → `{items: TaskSummary[]}`, GET tasks/{taskId} → TaskDetail. Query no
soportada/ID mal formado 400, ausente/fuera de alcance 404, sin sesión 401, rol/estado
incompatible 403, indisponibilidad 503. No-store. Cliente tipado valida y proyecta
solo DTO conocido; detalle debe coincidir con el ID solicitado. IDs mal formados
no generan una solicitud que pudiera confundirse con la lista.

## Fuentes observadas y decisiones

- Bases tras fetch exitoso y ambos main...origin/main=0 0: frontend `f26b0c4`,
  backend `c3cd581`. Worktrees aislados `catalogo-juegos-01` y
  `backend-catalogo-juegos-01`, ramas `feat/tareas-catalogo`. Originales intactos.
- Backend: README, índice, constitución, contexto/arquitectura/decisiones/pendientes;
  Tareas índice → resumen → RF-010/014 V3, TG-01, modelo y TD-D13/15/16/30–33.
  Paquete vigente consultado en cambios locales sin commit sobre `cd3c2b4` del
  worktree `d603ad/docs/cerrar-decisiones-tareas`: docs/feature-specs/tareas/README
  y 01-catalogo-y-ficha; docs/agent-context/modules/tareas/module-summary,
  domain-model, design-decisions y features/recursos-configuracion, disponibilidad,
  tg-01-estrellas. No atribuir esas decisiones a backend main ni a toda V3.
- Código backend consultado en nuevo worktree: `src/app.ts`,
  `src/auth/{auth,session-guard,session-activity,active-identity}.ts`,
  `src/db/schema/{auth,authentication,academic,tasks}.ts`, `src/config/env.ts`,
  `src/modules/usuarios/shared/accounts.errors.ts`, rutas de estudiantes como
  patrón, servicio/rutas catalog y pruebas helpers/setup/auth/contrato/catálogo.
  P-01/P-02 autorizados, trasladados y comprobados en commit `518e88b`; original
  `fix/session-cookie-guarantees-restored` con sus cambios locales preservado.
- F Fundamento teorico.docx.pdf pp.25–28 cotejadas: finalidad y limitación clínica,
  no integración real. La falta del proyecto del juego sigue TD-D33, no bloquea
  metadatos ni autoriza configurar/ejecutar.
- Frontend: App/AuthRoot/controller/client/state, lib/http, Workspace/navigation,
  hooks, estilos, componentes actuales; cuatro guías docs/design leídas.
- MCP shadcn conectado (`opencode mcp list`); búsqueda/detalle/ejemplo Table y
  consulta Button/Alert. Un ejemplo devolvía Radix: no se incorporó; se reutiliza
  catálogo local Base UI. Sin instalación de componentes/dependencias.
- Skills instaladas globalmente por petición expresa con los tres comandos
  `npx skills add ... --agent opencode --global --yes`. Usada ui-ux-pro-max:
  consultas table/narrow-screen/reflow y React cleanup; manual prevalece sobre
  paletas/fuentes externas. Apple/taste instaladas, no aplicadas por no ser
  necesarias para movimiento/composición nueva.

## Verificación incremental

- npm ci, npm test (solo tipos), test:auth 66/66, test:usuarios 70/70, test:tareas
  11/11 y build correctos. No dependencias ni cambios de lock.
- Harness DOM separado `tests/browser/tasks-harness.html` (solo Vite dev, sin
  fallback de red). Ejecutar `window.runTaskChecks()` en consola: 11/11 comprobadas
  en Chrome con App/AuthRoot reales: roles, ficha/volver sin nueva autenticación,
  vacío, 404, gate directo, 503/reintento, 403/401, pagehide y respuestas tardías
  de destino/sesión. No es prueba de API/BD real.
- Integración real/navegador y refactor final pendientes en este hito; sus resultados
  se añaden aquí, sin certificar piloto, lector de pantalla, TLS o BFCache real.

## Recorrido real y refactor final

Revisiones de implementación: frontend `e3a6f90`, backend `36d760d` (incluye
auth `518e88b`), más correcciones/refactor posteriores de esta misma rama.
API exclusiva `http://localhost:3011`, SPA `http://localhost:5191`, origen exacto
CORS/trustedOrigins, sin proxy ni cambiar el perfil 5173/3000 aprobado. Puertos
ocupados ajenos preservados. PostgreSQL exclusivo indicado en spec backend,
NODE_ENV=test/MAIL_MODE=capture, solo cuentas sintéticas; ningún correo real.

| Comprobación ejecutada en Chrome con SPA/API/BD reales | Resultado |
| --- | --- |
| TEACHER y ADMIN: login comprobado → catálogo → ficha | Correcto, solo TG-01 y estados/razones reales |
| URL directa/recarga de ficha; volver mediante enlace/Enter | Correcto; navegación interna conserva AuthRoot |
| isEnabled=true en fixture DB | Habilitada pero no lista para asignar; sin versión y con integración pendiente en ambas pantallas |
| Catálogo sin TG-01, por cambio temporal de código en DB exclusiva | Vacío real, sin filas ficticias; ficha TG-01 devuelve 404 y enlace al catálogo |
| Fallo real de consulta por renombrado temporal de tabla exclusiva | 503, contenido retirado, mensaje persistente; tras restaurar tabla, Reintentar comprueba acceso y restaura catálogo |
| Cierre de sesión desde UI | Retira vista y vuelve al acceso |
| Pagehide + expiración de sesiones sintéticas en DB + pageshow | Retirada síncrona, acceso perdido tras revalidar; API catálogo 401 |
| Privacidad | Sin claves en localStorage/sessionStorage; no se copiaron cookies/tokens ni datos reales |

La primera preparación de API usó otro secreto sintético que el de la fixture
con JWKS ya persistido: consulta de sesión produjo 503. Se corrigió el entorno
para usar el mismo secreto de pruebas, sin cambiar código ni tolerar acceso
incierto. No es evidencia de interoperabilidad entre bases/secretos diferentes.

Correcciones observadas: cierre de Sheet móvil al navegar por popstate; enlace
Ver ficha sin partirlo; desbordamientos con texto 200% resueltos con envoltura,
ficha de estado en una columna, toolbar flexible y límite del sidebar a un tercio
del viewport cuando crece el texto (sin cambiar su ancho normal ni controles).

Revisión independiente con dos subagentes en worktrees propios, sin mutar estos
repositorios: backend no encontró defectos bloqueantes; recomendó ampliar
aserciones 401/403/503. Frontend recomendó compartir isTaskId y eliminar aserción
de tipo del parser de listas. Refactor aplicado: validación compartida y recorrido
tipado con rechazo inmediato de filas inválidas/duplicadas; backend concentra
no-store + requireActive en el router montado, quitando repetición root/wildcard,
y amplía pruebas de headers/cuerpos y fallo DB de ficha. Sin alterar contrato.

Verificación posterior del frontend: npm test (solo tipos), test:auth 66/66,
test:usuarios 70/70, test:tareas 11/11 y build correctos. Harness DOM 11/11 repetido
tras refactor, más runMobileTaskChecks() correcto en iframe de 390px.

Navegador: catálogo y ficha en 320/390/768/1024/1440 CSS px, texto 100%/200%
(20 combinaciones, sin scroll horizontal de página; la tabla tiene su región).
Anchos revisados con iframe same-origin, no emulación de dispositivos. Tab →
región desplazable con foco 2px Dark 1 → ArrowRight desplazó tabla → Tab al enlace
nombrado (44px alto) → Enter abre ficha y lleva foco al H1. Contraste de tokens
Dark 1/blanco 13.31:1, borde/foco con mismos colores; sin colores diagnósticos.
Reflujo 320px comprobado, **no zoom nativo 400%** (atajo del navegador embebido no
modificó viewport). No lector de pantalla, dispositivos físicos, BFCache real,
TLS/despliegue ni aceptación con profesores. No se declara piloto listo.
