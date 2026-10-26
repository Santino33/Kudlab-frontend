# Revalidación para planificación — 2026-10-25

**Estado vigente de la base frontend:** rama `feat/gestionar-usuarios`, documentos guardados en `72bd7ca` y main `664cc5c` integrado por `e45b05d`. La sección final [Preparación del worktree para desarrollo](#preparación-del-worktree-para-desarrollo) registra evidencia actual. Las referencias iniciales a SPA vacía/constitución sin ratificar describen la revisión histórica, no la base integrada.

## Revisión y límites

Frontend: worktree `spec-usuarios`, base `f0612594ea6f4dff7824cf8a42642947aef7c054`, con los documentos de esta feature e inventario modificados por el mismo trabajo. No se descartan ni sobrescriben cambios de terceros.

Backend actual: `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`, `main`, commit `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`, `git status --short` vacío al consultar. La revisión anterior de [fuentes-backend.md](fuentes-backend.md) corresponde a `cd3c2b4` con cambios locales: se conserva como historia, no inventario vigente de todo el backend.

Investigación delegada de solo lectura por petición del workflow: sesión/integración backend y base frontend/pruebas. Se contrastaron directamente `app.ts`, guardias y catálogo actual. No se leyeron `.env`, secretos o datos reales, no se modificó backend, no se arrancó su servicio ni se ejecutaron sus pruebas/SMTP.

## Diferencias observadas desde cd3c2b4

- `src/app.ts` ahora monta estudiantes y documentación; `src/auth/session-guard.ts` extrae `prepareActive` y conserva revalidación posterior al handler de Usuarios; `session-activity.ts` incorpora soporte transaccional para otros consumidores.
- `git diff cd3c2b4 HEAD --stat -- src/modules/usuarios src/auth src/app.ts src/config/env.ts` solo muestra cambios en `app.ts`, `session-guard.ts`, `session-activity.ts`: módulo Usuarios, configuración y resto de autenticación conservan código previamente consultado.
- README actual identifica `docs/api/openapi.yaml` como catálogo canónico de implementación. Contratos anteriores 001–003 conservan valor de reglas/historia, no prioridad sobre catálogo/código actuales.
- El catálogo documenta `rememberMe` y límites reales de nombre/contraseña: no deben seguir tratándose como campos ausentes del contrato **actual**. El login acepta `rememberMe: false` sin control visible por decisión confirmada aquí.
- Cierre delegado puede dar errores de proveedor 403/429/no normalizados y capturar fallos internos de borrado como éxito. Comunicar respuesta procesada no garantiza ausencia de toda falla interna; validar petición posterior en escenario normal. No afirmar que todo fallo produce 503.
- Invitación/correo siguen usando mismo `INVITATION_BASE_URL?token=…`. Se mantiene bloqueo Q2-A, no se modifican servicios para resolverlo.
- Las afirmaciones históricas «no hay rutas de estudiantes ni Swagger/OpenAPI montados» dejaron de ser válidas como inventario actual. La documentación HTTP se monta mediante `createDocumentationRoutes`; no se auditó su implementación completa ni Académico. Su presencia **no amplía** esta feature ni cambia Q3-A.
- Las antiguas propuestas locales sin seguimiento `acceso-estudiante.md` y `correo-smtp.md` ya no están en el checkout actual. Sus rutas se conservan como citas históricas no enlazadas en fuentes-backend, en lugar de fingir que sus versiones siguen disponibles o corresponden a `ff46f8a`.

## Decisiones expresas obtenidas durante /speckit.plan

| ID | Confirmación del responsable | Consecuencia |
| --- | --- | --- |
| P-01 | «Cookies (recomendado)» | Cookie HttpOnly únicamente, Fetch include, sin almacenamiento tokens ni SDK frontend |
| P-02 | «Aprobar perfil (recomendado)» | Local SPA localhost:5173/API localhost:3000; recuperación `/recuperar-acceso/confirmar`, rutas sin hash y fallback. Producción HTTPS same-site con valores aportados al preparar despliegue |
| P-03 | «rememberMe: false (recomendado)» | Enviar false constante; sin selector, sin prometer revocación al cerrar navegador |
| P-04 | «Aprobar fallback (recomendado)» | Dark 1 sobre blanco, título/texto explícitos e icono etiquetado cuando aporte; sin nuevos colores semánticos ni rojo destructivo |

Q1-A/Q2-A/Q3-A no se reabren. La configuración backend del perfil será responsabilidad del operador; no fue alterada por las confirmaciones ni por este comando.

## Fuentes backend consultadas para esta revalidación

Todos los enlaces apuntan al checkout local de revisión, no a una API remota publicada. Las lecturas delegadas también se incluyen; originales enlazados por estas fuentes no se consideran leídos por transitividad.

- [README](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/README.md)
- [Índice](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/INDEX.md)
- [Pendientes](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/unresolved-issues.md)
- [Resumen Usuarios](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/module-summary.md)
- [Autenticación contexto](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autenticacion.md)
- [Flujos complementarios](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/flujos-complementarios.md)
- [Spec 003](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/spec.md) y [contrato histórico](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/contracts/auth.openapi.yaml)
- [Catálogo actual](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/api/openapi.yaml): secciones de acceso, cuentas, recuperación, esquemas y errores; no se adopta interfaz académica como alcance frontend
- [Montaje src/app.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts)
- [Configuración env.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/config/env.ts), sin leer valores efectivos
- [auth.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/auth.ts)
- [active-identity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/active-identity.ts)
- [credential-identity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/credential-identity.ts)
- [session-activity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-activity.ts)
- [session-guard.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-guard.ts)
- [recovery.routes.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/recovery/recovery.routes.ts)
- [recovery.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/recovery/recovery.service.ts)
- [accounts.validation.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.validation.ts)
- [accounts.errors.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.errors.ts)
- [invitations.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/invitations/invitations.service.ts), generación/entrega de enlace
- [email-changes.service.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/email-changes/email-changes.service.ts), generación de enlace

Resto de routers/servicios de Usuarios y specs 001/002/004: lectura anterior registrada en [fuentes-backend.md](fuentes-backend.md); sin diferencias de código en módulo Usuarios comprobadas por Git. No se afirma reejecución de sus pruebas.

## Fuentes frontend y externas

- `AGENTS.md`, `README.md`, `docs/agent-context/INDEX.md`, módulo/inventario, descripciones autenticación/recuperación y guía Ponytail; skill Ponytail cargada nivel full.
- `package.json`, `package-lock.json`, `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `vite.config.ts`, `tsconfig.json`, `index.html`, `opencode.json`: SPA vacía, versiones existentes, sin catálogo/routing/harness funcional.
- `.specify/memory/constitution.md`, plantillas plan/spec/checklist/tasks y `docs/specs/TEMPLATE.md`: constitución no ratificada; plantilla plan resuelta por setup. No se adoptan sus ejemplos como principios.
- `docs/design/agent-design-manual.md` y `docs/design/shadcn-mcp.md`: sistema aprobado y límites.
- MCP shadcn real: `opencode mcp list` → conectado; búsquedas explícitas `@shadcn` button/dialog, detalles button/alert-dialog y ejemplo alert-dialog-demo. Resultados usaron `radix-ui`/`asChild`, no aptos para incorporación automática con Base UI.
- [Button Base UI oficial](https://ui.shadcn.com/docs/components/base/button), semántica de enlaces/variantes, y [Alert Dialog Base UI oficial](https://ui.shadcn.com/docs/components/base/alert-dialog), composición `render`, consulta de 2026-10-25. No se ejecutaron comandos de instalación de los ejemplos ni se copiaron colores/textos de borrado.
- Skills gráficas no disponibles en esta sesión; no se usaron ni se afirma prototipo/inspección visual. Plan limitado al manual y contratos de comportamiento.

## Verificaciones del workflow

- Pre-hooks: `.specify/extensions.yml` no existe; nada que ejecutar.
- `setup-plan.sh --json`: FEATURE_SPEC/IMPL_PLAN/FEATURE_DIR resueltos dentro de `specs/001-gestionar-usuarios`; `BRANCH` lógico `001-gestionar-usuarios` no prueba que haya rama Git creada.
- Gates pre/post diseño documentados en plan. Constitución sin ratificar no se presenta como aprobada.
- `npm ci`: correcto, cero vulnerabilidades reportadas; `npm test`: tipos correctos, no pruebas funcionales; `npm run build`: correcto; `git diff --check`: sin errores.
- Validación documental detectó dos enlaces históricos de propuestas backend ya ausentes; se conservaron como rutas citadas sin enlace y se documentó su condición. Los enlaces actuales y los artefactos de fases 0/1 se verifican al cerrar.
- Post-hooks: `.specify/extensions.yml` no existe al revisar al finalizar; sin hooks `after_plan` que despachar. Sin comandos de extensión omitidos.
- Recorridos futuros, cookies reales, SMTP, interacción con profesores y accesibilidad no se consideran ejecutados por escribir estos artefactos. El script futuro `test:usuarios` y sus pruebas no se han implementado/ejecutado; no se crearon tareas, componentes, dependencias ni código de aplicación.

## Preparación del worktree para desarrollo

Autorización del responsable: crear rama, guardar documentación e integrar main, sin comenzar implementación de Usuarios.

### Git y conservación

- Worktree verificado: `/home/santino/.local/share/opencode/worktree/c4fd7d/spec-usuarios`; rama `feat/gestionar-usuarios` creada desde `f061259`.
- Commit `72bd7ca`: specs y cambios documentales revisados del trabajo de Usuarios; `.specify/feature.json` local/ignorado conservado con `specs/001-gestionar-usuarios`.
- Merge `e45b05d`: incorpora main `664cc5c`. Único conflicto en `docs/agent-context/modules/usuarios/capabilities.md`, resuelto preservando evidencia de autenticación y planificación de Usuarios, claramente separadas; no se eligió un lado descartando el otro.
- `git merge-base --is-ancestor main HEAD`: correcto después del merge. Sin reset, stash, descartes, cambios al checkout original, publicación remota o modificaciones backend.
- Autenticación, catálogo/CSS, tests/harness, paquete/lock/configuración y constitución heredados de main sin cambios de implementación propios. Los deltas de Usuarios (`rememberMe: false`, origen, recuperación, gestión) siguen futuros: no se aplicaron al copiar la base.

### Backend corregido identificado, no ejecutado

Backend principal sigue en `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`, limpio al comprobar. No contiene automáticamente P-01/P-02 por integrar el frontend.

Se leyó [backend-fixes.md](../001-autenticacion-personal/backend-fixes.md) y se comprobó `/tmp/opencode/kudlab-auth-backend-validation`, rama `fix/session-cookie-guarantees`, misma base `ff46f8a`, con los cuatro cambios locales y prueba nueva documentados. Los cinco SHA-256 de ese informe coinciden exactamente con:

- `src/app.ts`
- `src/auth/session-guard.ts`
- `docs/api/openapi.yaml`
- `docs/agent-context/modules/usuarios/features/autenticacion.md`
- `tests/integration/frontend-auth-validation.test.ts`

Se leyó además el diff de `src/app.ts`/`src/auth/session-guard.ts`: confirmación persistida de cierre y propagación de cabeceras de renovación, sin cambiar esta revisión. No se leyeron secretos ni se arrancó backend, creó BD o reejecutaron sus pruebas. Las cifras históricas 153/153 y 7/7 siguen atribuidas al informe anterior, no a esta preparación. Para integración real usar esta revisión corregida o equivalente comprobada y entorno aislado autorizado.

### Comandos ejecutados en este worktree tras el merge

| Comando | Resultado y límite |
| --- | --- |
| `npm ci` | Correcto, 54 paquetes instalados, cero vulnerabilidades reportadas |
| `npm test` | Correcto; solo tipos, incluye harness TSX heredado |
| `npm run test:auth` | **63/63 correctas**, lógica/HTTP simulado; no prueba API, cookies o accesibilidad reales |
| `npm run build` | Correcto; Vite compila la autenticación gráfica existente |
| `git diff --check` | Correcto tras merge; se repite al cerrar alineación documental |

### Alcance y punto de partida

T001 de Usuarios completada como preparación; T002–T056 pendientes. Se alinearon spec, investigación, modelo, contratos, quickstart, plan/tareas y registro de fuentes con auth/UI existentes y constitución ratificada. No se generó código de Usuarios, nuevos componentes, script `test:usuarios` o fixtures de negocio.

Puede iniciarse el desarrollo incremental frontend reutilizando la base real, con las adaptaciones de esta feature probadas explícitamente y sin reconstruir autenticación. Mantener Q1–Q3, aprobación gráfica final y gates de entorno/SMTP/HTTPS. La verificación de esta preparación no es una nueva ejecución completa de `/speckit.analyze` ni certifica integración/piloto; revisar consistencia antes de implementar y detener el comportamiento afectado ante discrepancias.

Verificación final de artefactos: 56 IDs consecutivos, solo T001 marcada; 25 FR/seis SC conservados, enlaces actuales existentes y sin marcadores de conflicto/aclaración nuevos. `check-prerequisites.sh --json --require-spec --require-tasks --include-tasks` resuelve correctamente esta feature en la rama nueva mediante el estado local conservado. Comparación `git diff --exit-code main -- src tests components.json package.json package-lock.json tsconfig.json vite.config.ts .specify/memory/constitution.md` sin diferencias: aplicación, configuración y constitución coinciden con la base integrada, sin desarrollo de Usuarios iniciado durante la preparación.
