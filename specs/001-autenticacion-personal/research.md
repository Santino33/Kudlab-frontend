# Investigación del plan: autenticación del personal

**Estado:** decisiones técnicas resueltas; diseño completado contra backend corregido.
**Fecha:** 2026-10-25. No equivale a frontend implementado ni despliegue verificado.

## Evidencia y evolución

1. [sources.md](sources.md) conserva revisión estática inicial del backend
   `cd3c2b485d5b3649310ba1807aac90f0f818d174`, las fuentes y sus límites.
2. [backend-validation.md](backend-validation.md) documenta reproducción de P-01/P-02
   en `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`, OpenAPI canónico y pruebas ejecutadas.
   Sus conclusiones de bloqueo describen la revisión anterior a las correcciones.
3. El responsable autorizó corregir ambos puntos en worktree backend separado,
   revalidar y completar plan. [backend-fixes.md](backend-fixes.md) identifica rama,
   cambios locales sobre ese commit, pruebas y límites que sustentan el diseño actual.
   No se editó ni se presume corregido el checkout principal backend.

## R1. Transporte y topología

**Decision:** cookie HttpOnly gestionada por navegador y fetch de misma procedencia,
rutas relativas `/api/auth/...`, sin leer `set-auth-token`, Authorization o JWT.
Frontend/API bajo un único origen HTTPS mediante proxy, opción A confirmada.
En desarrollo, proxy Vite `/api` al backend local; no mezclar localhost/127.0.0.1.

**Rationale:** el backend y Better Auth 1.7.7 soportan cookie persistida; no hace falta
guardar una credencial accesible por JavaScript para sobrevivir a recarga. Los defaults
inspeccionados son HttpOnly, SameSite=Lax, path `/` y Secure según baseURL HTTPS.
Omitir rememberMe no promete cookie no persistente ni cierre al cerrar navegador.
La renovación ahora se propaga, sin reiniciar por ello actividad protegida.

**Alternatives considered:** Bearer opaco solo en memoria pierde acceso tras recarga
sin mecanismo extra; almacenamiento web añade exposición de credenciales; JWT aislado
no pasa guardas actuales. Cross-origin same-site era viable técnicamente, pero no es
la topología elegida. Cross-site requeriría decisiones/configuración no autorizadas.

**Límites:** el plugin también expone `set-auth-token`; HttpOnly no elimina esa otra
vía. El cliente no lo lee ni registra. El proxy debe preservar Origin y todas las
Set-Cookie sin cachear auth; esta documentación no instala infraestructura productiva.

## R2. Revocación persistida — resolución de P-01

**Decision:** el wrapper backend espera al handler del proveedor y, solo si es exitoso,
asegura eliminación de la sesión actual en PostgreSQL antes de devolver respuesta.
Si no puede confirmar esa eliminación, 503 sin publicar cookies de cierre como éxito.
No modifica otras sesiones ni se elimina antes del control CSRF/origen del proveedor.

**Rationale:** el proveedor captura algunos fallos de borrado; su 200 no bastaba.
La validación anterior mostró reutilización efectiva de la cookie tras ese fallo.
La corrección se apoya en sesión persistida y pruebas de fallo/reintento, no en UI.

**Alternatives considered:** borrar cookie local, comprobar sin cookie tras cierre,
guardar token para comprobarlo o rebajar el requisito: no prueban revocación o amplían
exposición/alcance. El responsable eligió conservar la garantía y corregir backend.

**Límite:** red perdida tras revocación sigue siendo resultado incierto para cliente;
la recuperación Q2 permanece: consultar primero y no anunciar éxito anticipado.

## R3. Renovación e inactividad — resolución de P-02

**Decision:** pedir `returnHeaders:true` al consultar sesión internamente y propagar
solo Set-Cookie tras validar identidad/actividad, tanto en GET de sesión como preparación
compartida de acceso. No transmitir cabeceras JWT/token del proveedor.

**Rationale:** la validación anterior demostró registro renovado sin cookie renovada.
La modificación permite que el navegador reciba la extensión del proveedor. El reloj
de última solicitud protegida aceptada sigue separado; consulta o denegación no lo
reinician, y una sesión vencida no se reabre. Cookie renovada no es permiso nuevo.

**Alternatives considered:** polling, rememberMe, duración fija nueva, JWT o persistir
Bearer: no corrigen la propagación sin cambiar el contrato aprobado.

**Límite:** no se mide 30 minutos reales de navegador ni se certifica proxy/TLS real
durante este trabajo. La prueba de reloj/modelo y cabeceras no sustituye esa revisión.

## R4. Orígenes, errores y CSRF

**Decision:** usar los controles existentes sin desactivarlos. Clasificar status/código
por operación; 403/429/otros resultados delegados de cierre son no confirmados, no
credenciales incorrectas ni pérdida global automática. No renderizar cuerpos arbitrarios.

**Rationale:** OpenAPI actual declara fallos del proveedor además de errores del wrapper.
Better Auth valida Origin/Referer y metadata según ruta, pero modo test puede omitir
controles. La suite canónica incluye subproceso no-test para Secure/origen/rate limit.
CORS por sí mismo no autoriza peticiones ni demuestra protección de toda mutación de negocio.

**Alternatives considered:** wildcard CORS, desactivar chequeos, inventar token CSRF o
convertir todo 403 en logout: no corresponden al contrato ni al alcance.

## R5. Estado y coordinación frontend

**Decision:** cuatro módulos de feature: estado puro, cliente fetch inyectable,
controlador con generación/operación y presentación React. Sin dependencias nuevas.
Bloqueo síncrono de envíos, espera técnica 15s y cancelación; respuestas obsoletas no
modifican estado ni foco. Reconciliar mutaciones inciertas; no repetirlas automáticamente.

**Rationale:** tres operaciones auth y una superficie no requieren router/SDK/store.
Abortar o ignorar una respuesta no revierte servidor ni cookies ya procesadas.
Un único estado discriminado evita formulario operativo y acceso confirmado simultáneos.
Revalidación al volver a visible, no polling ni promesa de sincronización instantánea.
La aclaración C1 aprobada precisa suspensión síncrona de identidad/DOM en pagehide u
ocultación y revalidación deduplicada en pageshow/visibilitychange, sin depender de
remontar React y sin desactivar bfcache. La evidencia de restauración real se separa
del caso de eventos controlados; no se promete controlar miniaturas del navegador.

**Alternatives considered:** booleanos independientes, interceptor universal de 401/403,
capas genéricas o framework de estado: añaden estados inconsistentes o complejidad.
La interfaz transversal recibe clasificación/generación sin petición de negocio original.

## R6. Verificación mínima sin paquetes nuevos

**Decision:** conservar typecheck, proponer script `test:auth` con Node 24 node:test
y pruebas `.mjs` que importen lógica `.ts` eliminable. Configuración futura TS permite
extensiones .ts y erasableSyntaxOnly con noEmit. Inyectar fetch y reloj; no JSX ni
import.meta.env en esos módulos. Validar UI con navegador/lector de pantalla aparte.

**Rationale:** el entorno observado es Node 24.18.0/npm 11.16.0 y hoy npm test solo
tipos. No hace falta Vitest/jsdom/MSW/Testing Library para estado/cliente/controlador.

**Alternatives considered:** Vitest es viable si aparece necesidad adicional aprobada;
no se incorpora por anticipado. Si se requiere automatizar DOM, justificar infraestructura
antes de instalar. HTML estático o tests de lógica no demuestran foco ni anuncios reales.

**Precisión U1 aprobada:** crear entrada de navegador en `tests/browser/` con AuthRoot
real y fetch manual inyectado, panel sin red con respuestas retenidas y denegaciones
tipadas. Usa React/Vite existentes, no globals ni rutas backend, y queda fuera de
public/imports/entradas de producción. Incluir su TSX en typecheck y verificar exclusión
de dist. [Quickstart](quickstart.md) fija archivos, controles, pasos y resultados esperados.

## Fuentes de investigación

- Contexto, specs 001–003, contratos históricos y fuentes originales por referencia
  según [sources](sources.md); no se equiparan RF V3 propuestos a decisiones posteriores.
- Contrato actual `docs/api/openapi.yaml`, montaje `src/app.ts`, auth y guards, errores,
  configuración y pruebas exactas en los informes de validación/corrección.
- Inspección inicial de Better Auth 1.7.7 bajo `node_modules/better-auth/dist/`:
  `cookies/index.mjs`, `api/routes/{sign-in,sign-out,session}.mjs`,
  `plugins/{bearer,jwt}/index.mjs`, `db/internal-adapter.mjs`,
  `context/{helpers,create-context}.mjs`, `api/index.mjs`,
  `api/middlewares/origin-check.mjs`; Hono `dist/{compose.js,middleware/cors/index.js}`.
  Durante corrección también `types/api.d.mts` y `api/dispatch.mjs`, para verificar
  returnHeaders sin asumir SDK. Son instalación local, no archivos del commit backend.
- Frontend: AGENTS, README, índice/contexto de Usuarios, plantilla frontend,
  constitución ratificada, package/lock, tsconfig, Vite, raíz/entrada/styles y gitignore.
  Versiones resueltas en lock: React 19.3.1, TypeScript 7.0.2, Vite 8.3.5, Tailwind 4.3.3.
- Dos investigaciones delegadas durante plan conforme al comando; disponibilidad de
  skills de diseño/ponytail limitada en este worktree, no utilizadas. No diseño gráfico.

## Resultado

Sin cuestiones funcionales o técnicas abiertas para desglosar tareas contra la revisión
backend corregida. No confundir correcciones locales con merge a main ni planes de
validación de UI con pruebas frontend ejecutadas. Completar revisión del plan y usar
`/speckit.tasks` como siguiente paso; no implementar automáticamente.
