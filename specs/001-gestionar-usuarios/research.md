# Phase 0 — Investigación y decisiones

**Fecha:** 2026-10-25. **Estado:** completa para el perfil local aprobado. Fuentes/versiones en [revalidacion-plan.md](revalidacion-plan.md). Decisiones de producto Q1–Q3 permanecen en [spec.md](spec.md).

## R1 — Base existente y cambio mínimo

- **Decision:** React/TypeScript/Tailwind/Vite existentes, estado React, Fetch y AbortController. Un módulo Usuarios; no router, Axios, SDK Better Auth frontend, librería de formularios/validación/estado/caché.
- **Rationale:** App vacía, sin piezas que migrar. El alcance es finito y no necesita duplicar lógica backend. Reducir dependencias no elimina estados, privacidad o aceptación.
- **Alternatives considered:** React Router para navegación cliente, React Query para caché y SDK de autenticación: no necesidad aprobada; aumentarían superficie y persistencia sin resolver los bloqueos del contrato.

## R2 — Cookies y persistencia confirmadas

- **Decision:** El responsable aprobó cookies HttpOnly como único transporte, Fetch con `credentials: 'include'`, sin leer `set-auth-token` ni almacenar tokens. Después confirmó `rememberMe: false`, sin control visible.
- **Rationale:** Backend permite cookies y CORS con credenciales. El catálogo actual documenta que omitir `rememberMe` significa cookie persistente; no se adopta ese default silenciosamente. La política local de inactividad no cambia por la persistencia del navegador.
- **Alternatives considered:** Bearer opaco requiere almacenamiento/ciclo de vida adicional; JWT no satisface guardias de sesión persistida; omitir `rememberMe` se descartó por elección explícita.
- **Limit:** Cookie no persistente no garantiza revocación al cerrar navegador ni impide restauración de sesión del navegador. No prometer cierre remoto sin respuesta; no se puede borrar una cookie HttpOnly desde JavaScript.

## R3 — Perfil local, rutas y producción

- **Decision:** Perfil aprobado: SPA `http://localhost:5173`, API `http://localhost:3000`, recuperación `/recuperar-acceso/confirmar`; rutas de página con enlaces normales y fallback a `index.html`, sin hash. Resolver un conjunto finito de destinos al entrar y consultar sesión antes de mostrar contenido protegido.
- **Rationale:** `RESET_BASE_URL` debe ser una URL del origen SPA sin query/fragmento inicial; backend agrega `?token=…`. Un perfil local concreto permite comprobar cookies/CORS sin simular que conocemos dominios productivos.
- **Alternatives considered:** Hash routing incompatible con `RESET_BASE_URL` actual; router cliente no necesario; SPA/API cross-site no se adopta porque SameSite=Lax puede impedir cookies.
- **Operational prerequisite:** Responsable backend configura sus variables y SMTP; hosting productivo HTTPS y same-site debe validar cookies/origen, navegación directa y eliminación de query sensible de logs. No se cambia backend ni infraestructura aquí. Los valores productivos son configuración de despliegue que se suministra al preparar el entorno, no un contrato pendiente necesario para diseñar el perfil local.

## R4 — Token de recuperación y enlaces ambiguos

- **Decision:** Solo la ruta exacta de recuperación puede capturar un token query no vacío; no validarlo anticipadamente en servidor ni canjear al montar. Capturarlo en memoria y retirar query mediante `history.replaceState`; no guardarlo para recarga. Configurar política de referrer y logs del hosting para no propagarlo. Otras entradas con token permanecen bloqueadas por Q2-A, sin clasificarlo mediante mutaciones.
- **Rationale:** Recuperación tiene destino separado y aprobado; invitación/correo comparten destino sin propósito. La URL no prueba identidad ni validez del token. Tras recargar sin token, solicitar nueva recuperación es preferible a persistir secretos.
- **Alternatives considered:** Inspección pública, probar canjes, elección de trámite o almacenamiento del token: no disponibles/autorizados o contrarios a Q2-A/privacidad.
- **Limit:** La llegada inicial ya contiene token en URL: su exclusión de logs de hosting debe comprobarse; no prometer que JavaScript elimina registros hechos antes de arrancar. No incluir enlaces reales en capturas/evidencia.

## R5 — Resultados inciertos y permisos

- **Decision:** Distinguir rechazo, fallo de transporte y mutación potencialmente aplicada. Sin auto-retry. En edición/estado, consultar cuenta por ID tras recuperar permiso; en alta sin ID, recorrer listado autorizado paginado para localizar correo normalizado si es necesario, sin inventar búsqueda. Ausencia de coincidencia no prueba rollback; si reconciliación no concluye o perdió permiso, conservar incertidumbre y pedir revisión ADMIN.
- **Rationale:** SMTP puede fallar después de persistencia y la guardia puede reemplazar respuesta exitosa por 401 tras handler. No transformar todos los errores en «ningún cambio guardado».
- **Alternatives considered:** Reintentar POST/PATCH automáticamente, optimismo sobre identidad/estado o añadir endpoint de búsqueda/idempotencia: no autorizado y puede duplicar efectos.
- **Permission detail:** 403 retira información denegada y permite consulta puntual de sesión para distinguir pérdida de rol de ausencia de acceso; sin polling ni actividad artificial. Un ID de identidad no se usa como ID de cuenta. TEACHER solo estado/cierre; no se buscan sus datos por endpoints ADMIN.

## R6 — Pruebas sin librerías nuevas

- **Decision:** Mantener tipos/build y proponer runner nativo Node 24 para módulos puros `.ts`, con pruebas `.test.mjs` y `node:assert`. Imports de valor explícitos `.ts` sin alias, `import type` separado, `allowImportingTsExtensions` junto a `noEmit` al implementar. Probar capacidades nativas del runner antes de integrar script, sin instalación. Dejar TSX/DOM y E2E como validación manual guiada de esta iteración; no ocultar esa limitación.
- **Rationale:** No hay harness funcional ni paquetes de test. Node 24 puede ejecutar TypeScript con tipos borrables; helpers no necesitan TSX ni alias. Tests separados de React evitan dependencias por anticipación.
- **Alternatives considered:** Vitest/Testing Library/Playwright aportarían cobertura DOM/browser pero requieren necesidad/aprobación e instalación posteriores. Typecheck solo no prueba estados, errores o seguridad funcional.

## R7 — Sistema visual aprobado, no ejemplos de demo

- **Decision:** shadcn/ui exclusivamente Base UI y Lucide al implementar, adaptado al manual. El responsable aprobó durante planificación el fallback neutral Dark 1 sobre blanco, texto explícito e icono etiquetado cuando aporte información; sin asignar Error/Warning/Info/Success ni rojo destructivo.
- **Rationale:** No hay catálogo local. `opencode mcp list` confirmó shadcn conectado; búsquedas y detalles reales `@shadcn/button` y `@shadcn/alert-dialog` reportaron dependencias Radix y el ejemplo usó `asChild`: se rechazaron como base de incorporación. Documentación oficial `/docs/components/base/button` y `/base/alert-dialog` muestra alternativas Base UI (`render`), sin autorizar copiar sus estilos o textos de borrado.
- **Alternatives considered:** Radix por default del registro, controles ad hoc para evitar instalación, paleta automática o rojo inventado: contradicen decisiones aprobadas. La selección concreta de componentes/paquetes debe revalidarse al incorporar, no ejecutar `init`/`add` durante planificación.
- **Limit:** Skills gráficas no disponibles; solo manual/MCP/docs, sin composición visual, prototipo o accesibilidad verificada.

## R8 — Constitución y backend nuevo

- **Decision:** No ratificar placeholders de constitución; aplicar AGENTS.md/manual/decisiones existentes y repetir gates después del diseño. Actualizar evidencia a backend `ff46f8a`, sin borrar la revisión histórica `cd3c2b4`.
- **Rationale:** La constitución sin completar no demuestra principios adoptados. Backend ahora publica catálogo `docs/api/openapi.yaml` y monta rutas académicas/documentación; eso corrige inventario de disponibilidad, no amplía scope frontend.
- **Alternatives considered:** Copiar reglas de ejemplos constitucionales, bloquear por un principio inexistente o incorporar nuevas features backend automáticamente: no tiene fundamento. Las diferencias que afectan Usuarios se documentan y las decisiones se confirman, no se parchea backend para hacerlas coincidir.

## Cierre de investigación

Sin aclaraciones de diseño abiertas para el perfil local. Dependencias conocidas no levantadas: enlaces distinguibles Q2-A, entorno real/SMTP, incorporación futura de componentes, dominio/hosting productivo y pruebas con profesores. Son gates de ejecución/despliegue explicitados en quickstart, no capacidades supuestas.
