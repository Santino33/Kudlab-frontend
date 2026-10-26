# Backend reconstruido y conexión real parcial — 2026-10-26

## Revisión disponible

El responsable autorizó reconstruir P-01/P-02 en backend separado y validar con
base desechable. El antiguo worktree `/tmp/opencode/kudlab-auth-backend-validation`
sigue ausente; se conserva su evidencia como historia, no como revisión actual.

- Nuevo worktree: `/home/santino/.local/share/opencode/worktree/d603ad/session-cookie-guarantees`.
- Rama: `fix/session-cookie-guarantees-restored`, base
  `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`, cambios locales sin commit/merge.
- Checkout backend principal permanece limpio en esa base, sin las correcciones.
- Informe backend: `docs/validation/session-cookie-guarantees.md` en el nuevo worktree.
- Se verificaron cwd, raíz, worktrees y diff; no se cambió el checkout principal.

Huellas SHA-256 **de esta reconstrucción**, no las del informe histórico:

| Archivo relativo al nuevo worktree backend | SHA-256 |
| --- | --- |
| `src/app.ts` | `db7c097cc951d55f92b1a37a684fae981a4a31c40e128f7737457cf41f083e6f` |
| `src/auth/session-guard.ts` | `e8b096bb2a27dccd465ab8b913f127b5cfa4b4811c880689e76cb8d246f5aae5` |
| `docs/api/openapi.yaml` | `d8de8bdbab196b1dd9e9c07d15d23e4de011cc6ee5ef0960f08e91308c37bd2f` |
| `docs/agent-context/modules/usuarios/features/autenticacion.md` | `ec6a6ff144233a19ca18eac43f2f00d9bfde212a9faa461fa3adbce784e81199` |
| `tests/integration/frontend-auth-validation.test.ts` | `69eccf68bae188b5f5afe706d11bca3a16a98616a853a6cd8759103002a25bfd` |

## Validación backend ejecutada

- Pruebas focalizadas escritas primero: 5 fallos/3 éxitos antes del arreglo;
  **8/8** después. Revocación ante fallo absorbido del proveedor, 503 cuando no se
  confirma, rechazo antes de borrar, renovación y límite de inactividad.
- `SCARF_ANALYTICS=false npm ci`, migración exclusiva y tipos: correctos.
- Suite completa: **154/154 pruebas, 29 archivos**, 162.39 s. Incluye regresión
  de consumidores académicos, CSRF/rate limit en subproceso no-test y contratos.
- `npm run docs:check`: **22/22** con OpenAPI actualizado; diff correcto.
- Sin dependencias/migraciones/roles/rutas nuevas; cookie/actividad siguen siendo
  responsabilidad backend. No se duplican aquí las reglas de negocio.

Docker no era accesible. Se utilizó Podman rootless con imagen local PostgreSQL 17,
contenedor exclusivo `kudlab-session-fixes-restored`, base tmpfs
`kudlab_session_fixes`, puerto loopback 34521. Ambas URLs DB explícitas hacia ese
contenedor; sin `.env`, bases compartidas o SMTP real. Al terminar se verificó su
id/etiqueta, se detuvo/eliminó y se descartó solo esa base.

## Navegador con SPA/API reales, no harness

Frontend `39d8a83` + cambios locales T002–T017, Vite temporal
`http://localhost:5187`, API corregida `http://localhost:3002` y origen CORS exacto.
3000/5173 estaban ocupados: no se detuvieron ni utilizaron esos servicios. No se
cambió `.env.example` ni el perfil de producto 5173/3000. Es una topología local de
validación equivalente, no comprobación de aquellos procesos ni despliegue.

Fixture de profesores ficticios preparada mediante helpers backend existentes
después de terminar las suites, sin concurrir con sus truncados. La aceptación
de invitación ocurrió solo en preparación backend, nunca desde el cliente frontend
ni como habilitación del canje Q2-A.

| Caso | Resultado observado |
| --- | --- |
| Login ADMIN | OPTIONS 204, POST login 200 y GET sesión 200 antes de identidad; [captura](screenshots/us1/integration/admin.png) |
| Login TEACHER | Solo identidad confirmada/cierre, sin links de gestión o módulos; [captura](screenshots/us1/integration/teacher.png) |
| Contraseña existente incorrecta de un carácter | Llega al servidor, 401 uniforme; contraseña limpiada, cero dd y foco en alerta; [captura](screenshots/us1/integration/invalid-credentials.png) |
| Cierre normal por teclado | Retira identidad inmediatamente; POST cierre 200 y vuelve a entrada |
| TEACHER directo `/usuarios` | Denegación; solo consulta propia, ninguna llamada a cuentas |
| Pagehide y sesión vencida durante suspensión | DOM inmediato con título de comprobación, cero dd; se envejecen únicamente sesiones de la fixture en DB exclusiva; pageshow/visibility revalida y muestra sesión no válida sin restaurar identidad |
| Cierre sin red | Se detiene solo nuestra API, la acción retira datos y muestra cierre no confirmado; [captura](screenshots/us1/integration/signout-unconfirmed.png) |
| Revisión explícita tras restaurar API | Antes de pulsar reintentar no hubo nuevo POST; después GET sesión 200 y POST cierre 200; entrada sin identidad |
| Privacidad | Sin claves en localStorage/sessionStorage, contraseña ausente tras acceso, cookie auth no visible a JavaScript; no se exportaron cabeceras/cuerpos/cookies/tokens |
| Ancho 390 | App real en iframe same-origin 390×900 dentro de host sin sesión; ancho sin overflow y controles 44px; [captura](screenshots/us1/integration/access-390-embedded.png) |
| Ancho 320 y teclado | Tab correo→contraseña→enviar, Enter vacío devuelve foco a correo y presenta resumen/campos; sin overflow de elementos; [captura](screenshots/us1/integration/errors-320-embedded.png) |

Las capturas desktop usan viewport 990×986; las estrechas muestran el contenedor
con iframe, no emulación móvil. El aborto inicial de lectura por StrictMode no
se cuenta como rechazo API. Sin lectura de cabeceras sensibles o credenciales en
evidencia. Se cerraron las pestañas/servidores propios al terminar.

## Estado de T018 y límites

**Se elimina el bloqueo por backend ausente. T018 sigue pendiente, parcialmente
ejecutada**, sin marcar su checkbox: faltan completar/capturar todos los estados
de su matriz y cerrar la revisión de accesibilidad/gráfica correspondiente.
No se afirman BFCache real, dos perfiles de navegador independientes, HTTPS/TLS,
lector de pantalla, zoom completo, gestores reales, usabilidad o aceptación final.
No se inició T019 ni se implementaron pantallas de cuentas/recuperación.

`npm ci` backend reportó 8 vulnerabilidades (7 moderadas/1 alta); audit omit-dev
reportó 6 (5 moderadas/1 alta), señalando esbuild, Nodemailer y Zod. Revisar antes de
despliegue; no se ejecutó audit fix ni se ampliaron versiones sin autorización.

## Fuentes consultadas

En backend base y worktree reconstruido: índice, módulo Usuarios, ficha auth,
contexto/arquitectura/decisiones/pendientes, constitución 1.1.0, spec 003
FR-004/005/006/012 y OpenAPI vigente. Implementación:
`src/app.ts`, `src/auth/{auth,session-guard,session-activity}.ts`,
`src/db/schema/auth.ts`, `src/config/env.ts`,
`src/modules/academico/shared/academic-auth.ts`, `tests/{setup,helpers}.ts`,
tests auth/fronteras/contratos/atomicidad académica y configuración Vitest/Drizzle.
Se revisó Better Auth instalado 1.7.7 (tipos, dispatch, rutas sesión/cierre),
no se atribuye soporte a búsquedas MCP sin resultados. Las reglas vienen de la
spec confirmada/autorización del responsable, no de nuevos RF de análisis o V3.
