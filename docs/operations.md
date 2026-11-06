# Operación e integración docente

## Configuración

Usar Node 24, `npm ci` y `.env.example`. `VITE_API_ORIGIN` debe ser el origen público exacto de la API, sin credenciales, path, query ni fragmento. Las variables `VITE_*` se publican en el cliente: nunca contienen secretos backend.

La autenticación usa cookies HttpOnly con `credentials: include`. El backend debe autorizar el origen docente exacto mediante CORS/trustedOrigins. HTTPS, topología y política de cookies requieren verificación en el entorno final. Un login HTTP correcto no habilita contenido protegido hasta confirmar la sesión.

El perfil habitual es frontend `http://localhost:5173` y API `http://localhost:3000`; Docker tiene sus propios puertos y se configura mediante [la guía local](docker-local.md). No inferir la versión de una API por su puerto ni usar bases compartidas para pruebas.

## Alcance y seguridad

ADMIN gestiona profesores y cursos; TEACHER opera sus cursos, registros estudiantiles y tareas según los permisos actuales del servidor. Los estudiantes no tienen cuentas en esta plataforma docente: el acceso por código y la experiencia de juego pertenecen a Play.

El frontend no concede consentimiento, habilita menores reales ni convierte una build o fixture sintética en validación del piloto. Las denegaciones se resuelven en servidor. Ante una escritura incierta, no anunciar rollback ni repetirla automáticamente.

El correo y bootstrap pertenecen al backend. Invitaciones y recuperación requieren un proveedor SMTP configurado; un envío aceptado no acredita recepción. No colocar tokens o datos reales de menores en evidencias, logs o archivos versionados. No borrar IndexedDB ni cambiar orígenes si quedan evidencias pendientes en Play.

## Pruebas

`npm test` comprueba tipos. `test:auth`, `test:usuarios`, `test:tareas` y `test:estudiantes` ejecutan regresión lógica con datos sintéticos, no validación contra servicios reales. `test:docker` verifica el generador de configuración sin arrancar Docker. `docker:check` requiere la composición autorizada en ejecución.

Los [recorridos de navegador](../tests/browser/README.md) incluyen un driver versionado, sin skills ni configuración personal. Registrar revisión, entorno y resultados; no presentar pruebas no ejecutadas como aceptación.
