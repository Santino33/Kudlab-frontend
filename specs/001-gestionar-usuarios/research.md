# Phase 0 — Investigación y decisiones

**Fecha:** 2026-10-25. **Estado:** completa para el perfil local aprobado. Fuentes/versiones en [revalidacion-plan.md](revalidacion-plan.md). Decisiones de producto Q1–Q3 permanecen en [spec.md](spec.md).

**Base actualizada:** main `664cc5c` ya integrado en `feat/gestionar-usuarios` por `e45b05d`. Reutilizar `src/auth/`, catálogo/CSS, pruebas `tests/auth/` y harness existentes; las hipótesis iniciales de app vacía quedaron superadas. El [plan](plan.md) define los deltas pendientes y la entrega gráfica integrada, no una segunda autenticación.

## R1 — Base existente y cambio mínimo

- **Decision:** React/TypeScript/Tailwind/Vite existentes, estado React, Fetch y AbortController. Un módulo Usuarios; no router, Axios, SDK Better Auth frontend, librería de formularios/validación/estado/caché.
- **Rationale:** La base inicial era vacía, pero ahora se incorporó auth/UI de main: extenderla es menor que recrearla. El alcance finito no necesita duplicar lógica backend. Reducir dependencias no elimina estados, privacidad o aceptación.
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

- **Decision:** Conservar tipos/build, `test:auth` y tests/harness de main; agregar `test:usuarios` con runner nativo Node 24 para módulos puros `.ts`, pruebas `.test.mjs` y `node:assert`. Imports `.ts` sin alias, `import type` separado y configuración `allowImportingTsExtensions`/`noEmit` ya presentes. TSX/DOM/E2E y revisión gráfica se validan en navegador con las vistas reales; no atribuirlos al runner Node.
- **Rationale:** Main ya aporta pruebas de lógica/HTTP y un harness sintético con AuthRoot real, sin dependencias de runner. Node 24 ejecuta tipos borrables; conservar esa infraestructura y extender los casos evita duplicarla. El harness no sustituye integración backend ni accesibilidad real.
- **Alternatives considered:** Vitest/Testing Library/Playwright aportarían cobertura DOM/browser pero requieren necesidad/aprobación e instalación posteriores. Typecheck solo no prueba estados, errores o seguridad funcional.

## R7 — Sistema visual aprobado, no ejemplos de demo

- **Decision:** shadcn/ui exclusivamente Base UI y Lucide al implementar, adaptado al manual. El responsable aprobó durante planificación el fallback neutral Dark 1 sobre blanco, texto explícito e icono etiquetado cuando aporte información; sin asignar Error/Warning/Info/Success ni rojo destructivo.
- **Rationale:** Ahora hay catálogo local heredado de main (Button/Input/Label/Card/Alert), configuración base-nova y dependencias Base UI/Lucide: reutilizar sus adaptaciones. La investigación inicial del MCP encontró ejemplos Radix y `asChild`, rechazados como incorporación automática. Consultar variantes oficiales Base UI para los componentes nuevos mínimos, sin reinicializar catálogo ni copiar estilos/textos de demo.
- **Alternatives considered:** Radix por default del registro, controles ad hoc para evitar instalación, paleta automática o rojo inventado: contradicen decisiones aprobadas. La selección concreta de componentes/paquetes debe revalidarse al incorporar, no ejecutar `init`/`add` durante planificación.
- **Limit:** Skills gráficas no disponibles; solo manual/MCP/docs, sin composición visual, prototipo o accesibilidad verificada.

## R8 — Constitución y backend nuevo

- **Decision:** Aplicar constitución 1.0.0 ya ratificada e integrada desde main, junto a AGENTS.md/manual/decisiones existentes; no ratificar ni enmendar una nueva. Conservar evidencia backend `ff46f8a` y la revisión histórica `cd3c2b4`, añadiendo comprobación de la revisión corregida externa en el registro de preparación.
- **Rationale:** La plantilla del checkout inicial fue sustituida por la constitución real al integrar main. El catálogo y rutas nuevas backend corrigen inventario de disponibilidad, no amplían scope frontend ni autorizan editar aquel repositorio.
- **Alternatives considered:** Copiar reglas de ejemplos constitucionales, bloquear por un principio inexistente o incorporar nuevas features backend automáticamente: no tiene fundamento. Las diferencias que afectan Usuarios se documentan y las decisiones se confirman, no se parchea backend para hacerlas coincidir.

## Cierre de investigación

Sin aclaraciones de diseño abiertas para el perfil local. Dependencias conocidas no levantadas: enlaces distinguibles Q2-A, entorno real/SMTP, incorporación futura de componentes, dominio/hosting productivo y pruebas con profesores. Son gates de ejecución/despliegue explicitados en quickstart, no capacidades supuestas.
