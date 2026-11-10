# Operación e integración docente

## Configuración

Usar Node 24, `npm ci` y `.env.example`. `VITE_API_ORIGIN` debe ser el origen público exacto de la API, sin credenciales, path, query ni fragmento. Las variables `VITE_*` se publican en el cliente: nunca contienen secretos backend.

La autenticación usa cookies HttpOnly con `credentials: include`. El backend debe autorizar el origen docente exacto mediante CORS/trustedOrigins. HTTPS, topología y política de cookies requieren verificación en el entorno final. Un login HTTP correcto no habilita contenido protegido hasta confirmar la sesión.

El perfil habitual es frontend `http://localhost:5173` y API `http://localhost:3000`; Docker tiene sus propios puertos y se configura mediante [la guía local](docker-local.md). No inferir la versión de una API por su puerto ni usar bases compartidas para pruebas.

## Alcance y seguridad

ADMIN gestiona profesores y cursos; TEACHER opera sus cursos, registros estudiantiles y tareas según los permisos actuales del servidor. Los estudiantes no tienen cuentas en esta plataforma docente: el acceso por código y la experiencia de juego pertenecen a Play.

El frontend no concede consentimiento, habilita menores reales ni convierte una build o fixture sintética en validación del piloto. Las denegaciones se resuelven en servidor. Ante una escritura incierta, no anunciar rollback ni repetirla automáticamente.

El correo y bootstrap pertenecen al backend. Invitaciones y recuperación requieren un proveedor SMTP configurado; un envío aceptado no acredita recepción. No colocar tokens o datos reales de menores en evidencias, logs o archivos versionados. No borrar IndexedDB ni cambiar orígenes si quedan evidencias pendientes en Play.

## Cloudflare Pages (sesión por el mismo origen)

Build Git: rama acordada, Node 24, `npm run build`, salida `dist`. Mantener
previews y despliegues automáticos desactivados hasta verificar la release.
Configurar producción:

- `VITE_API_ORIGIN=https://kudlab-docente.pages.dev`
- `VITE_PLAY_ORIGIN=https://kudlab-play.pages.dev`
- binding servidor `API_UPSTREAM_ORIGIN=https://p01--kudlab-api--cqzkgf2p6mws.code.run`
- Pages Runtime **Fail closed**, compatibility date `2026-11-10`.

`functions/api/[[path]].js` reenvía únicamente `/api/*` al upstream fijo;
`/api` responde JSON 404. `_routes.json` mantiene los assets fuera de Functions.
El proxy requiere origen docente exacto para escrituras, elimina forwarded del
cliente y conserva cookies y cuerpos sin buffering. Tiempo máximo de fetch:
30 segundos; una respuesta incierta no implica rollback. Sin reintentos,
seguimiento de redirects, caché API ni logs de credenciales. El frontend no usa
previews contra la API productiva. Configuración ausente falla cerrada.

Backend: `BETTER_AUTH_URL` y `SPA_ORIGIN` iguales al origen docente, runtime
separado. Play continúa con API Northflank directa y `credentials: omit`.
Verificar en entrega múltiples Set-Cookie host-only, Secure/HttpOnly/Lax,
login/recarga/logout, permisos y CSP; no corregir incompatibilidades relajando cookies.

Por decisión temporal de producto, `/acceso/invitacion` y
`/acceso/cambio-correo` llevan al login al cargar la SPA y retiran query/hash
del historial sin consumir tokens. No activan cuentas ni confirman cambios de
correo. Recuperación conserva `/recuperar-acceso/confirmar`.

`npm run test:pages` verifica el transporte con upstream simulado. Tras build,
`node tests/pages/runtime.smoke.mjs` ejecuta Pages/workerd local y un servidor
sintético loopback, con puertos efímeros, sin API/BD reales. Usa Wrangler 4.160.0
por `npx`, sin dependencia de aplicación. No acredita sesión real desplegada.

## Pruebas de aplicación

`npm test` comprueba tipos. `test:auth`, `test:usuarios`, `test:tareas` y `test:estudiantes` ejecutan regresión lógica con datos sintéticos, no validación contra servicios reales. `test:docker` verifica el generador de configuración sin arrancar Docker. `docker:check` requiere la composición autorizada en ejecución.

Los [recorridos de navegador](../tests/browser/README.md) incluyen un driver versionado, sin skills ni configuración personal. Registrar revisión, entorno y resultados; no presentar pruebas no ejecutadas como aceptación.
