# Validación backend para autenticación frontend

**Registro histórico previo a corrección.** Los problemas reproducidos aquí fueron
corregidos y revalidados posteriormente en [backend-fixes.md](backend-fixes.md).
Las conclusiones de bloqueo de este informe aplican a main original, no al worktree corregido.

**Fecha:** 2026-10-25. **Resultado:** validación ejecutada; P-01/P-02 reproducidos,
no corregidos. No listo para `/speckit.tasks` sin resolver estas garantías.

## Entorno y protección de datos

- Backend actual: `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3` (`main`), limpio antes
  y después. Sustituye como revisión actual al commit anterior registrado en sources.
- Worktree aislado de validación: `/tmp/opencode/kudlab-auth-backend-validation`,
  detached en ese commit. No se movió la sesión frontend ni se editó backend original.
- PostgreSQL 17 Alpine en contenedor exclusivo `kudlab-auth-validation`, puerto
  asignado `127.0.0.1:36557`, base desechable `kudlab_auth_validation`, datos en tmpfs.
  Autenticación trust solo en ese contenedor/puerto local; no configuración de producción.
  Sin conexión a bases existentes, lectura de `.env` ni envío de correo.
- Node 24.18.0, npm 11.16.0, Better Auth 1.7.7, Vitest 5.0.4.
- Único archivo añadido al worktree backend temporal: harness diagnóstico
  `tests/integration/frontend-auth-validation.test.ts`, conservado para inspección.
  No hay cambios en código productivo backend. El harness fuente reproducible está en
  [validation/backend-auth.test.ts](validation/backend-auth.test.ts).
- Al finalizar se detuvo y eliminó exclusivamente el contenedor creado para esta
  validación; su base tmpfs ya no existe. El worktree temporal y harness se conservaron.

## Comandos y resultados

Los comandos se ejecutaron en el worktree backend temporal. Las variables que aparecen
aquí son únicamente de ese entorno de prueba; no son credenciales reales.

1. `SCARF_ANALYTICS=false npm ci --ignore-scripts --no-audit --no-fund`: correcto,
   225 paquetes instalados desde el lock; dos avisos de dependencias obsoletas.
2. `npm run db:migrate`, con `DATABASE_URL` y `MIGRATION_DATABASE_URL` ambas apuntando
   a `postgres://postgres@127.0.0.1:36557/kudlab_auth_validation`: correcto.
3. `npm run docs:check`: **22 pruebas / 2 archivos, correctos**. Valida catálogo
   OpenAPI completo, ejemplos y publicación documental por entorno.
4. `npm run typecheck`: correcto antes y después de añadir harness.
5. Regresión existente: **27 pruebas / 5 archivos, correctos**, mediante:

   ```bash
   npm test -- tests/contract/authentication.test.ts tests/contract/api-openapi.test.ts tests/integration/authentication.test.ts tests/integration/auth-boundaries.test.ts tests/unit/session-activity.test.ts
   ```

   Entorno explícito: base desechable anterior; `BETTER_AUTH_URL=http://localhost:3000`,
   `SPA_ORIGIN=http://localhost:5173`, `RESET_BASE_URL=http://localhost:5173/reset-password`,
   `INVITATION_BASE_URL=http://localhost:5173/accept`. Se conservaron los valores sintéticos
   de `tests/setup.ts`, incluido envío capture. La suite canónica exige origen 5173
   en su subproceso no-test. El rechazo del origen inválido en stderr es esperado.

6. Diagnóstico específico: **4 pruebas correctas como reproducción de comportamiento**,
   no aprobación de las garantías funcionales:

   ```bash
   npm test -- tests/integration/frontend-auth-validation.test.ts --reporter=verbose
   ```

   Misma base desechable; `BETTER_AUTH_URL` y `SPA_ORIGIN` ambos
   `http://localhost:3000`, y enlaces sintéticos de recuperación/invitación bajo ese origen.
   El resto proviene de setup test. Se observaron el error sintético de borrado esperado
   y los cuatro resultados descritos abajo. No se imprimieron cookies ni tokens.

### Intentos previos y límites

- Un primer intento no ejecutó casos: RESET_BASE_URL heredado del setup no coincidía
  con SPA_ORIGIN. Se corrigieron variables, sin modificar código.
- Un segundo intento combinado produjo 30 casos correctos y uno fallido: el test
  canónico de CSRF usa origen 5173 fijo, incompatible con SPA_ORIGIN=3000 usado para
  el diagnóstico. Se separaron ejecuciones con sus configuraciones explícitas;
  no se ocultó el fallo ni se modificó la prueba para hacerla pasar.
- Los 27 casos incluyen una comprobación canónica de respuestas de las 26 operaciones
  montadas. Su ejecución con registros sintéticos no amplía el alcance frontend.
- No se ejecutó la suite backend completa, SMTP real, navegador, proxy ni despliegue
  HTTPS real. El caso existente de Secure/CSRF usa un subproceso no-test con solicitudes
  en memoria, no una conexión TLS ni prueba de aceptación de cookies por navegador.

## P-01: revocación al cerrar — problema reproducido

| Caso | Observado |
| --- | --- |
| Cierre normal por cookie | 200 `{success:true}` y reutilización de cookie original da 401 |
| Fallo sintético en `auth.$context.internalAdapter.deleteSession` | Se invoca borrado y falla; Better Auth devuelve 200 `{success:true}` y cookie expirada |
| Reutilización posterior de la credencial original | `get-session` devuelve 200 y una consulta protegida de cuentas devuelve 200 |

La inyección sustituye únicamente el borrado en el adaptador de esa prueba y se restaura
al terminar; no altera la respuesta de login ni los guards. El resto usa app y PostgreSQL
reales del worktree. Confirma la ruta de error que la lectura estática había detectado.

El 200 de cierre no demuestra revocación bajo ese fallo. Comprobar después sin cookie
no resuelve la garantía. La spec backend 003 FR-006 y frontend FR-007/US3 mantienen
la exigencia; la decisión A pide corregir en trabajo backend separado, no rebajarla.

## P-02: renovación de cookie — problema de propagación reproducido

En pruebas separadas se parte de un login por cookie sin `rememberMe`: cookie HttpOnly,
SameSite=Lax y Max-Age=1800. Se adelanta la condición de actualización ajustando la
expiración del registro a 20 minutos restantes, sin esperar media hora.

| Solicitud | Registro de sesión | Cabecera de respuesta |
| --- | --- | --- |
| GET `/api/auth/get-session` | expiración ampliada en más de 500 segundos | ninguna `Set-Cookie` |
| GET `/api/v1/accounts`, aceptada | expiración ampliada en más de 500 segundos | ninguna `Set-Cookie` |

Se demuestra la ausencia de propagación, no una expiración de navegador observada
durante 30 minutos. Sin una cookie renovada, el cliente no recibe la extensión de su
Max-Age; no se puede prometer continuidad por actividad protegida a partir del registro
servidor. Un proxy de mismo origen no genera por sí solo las cabeceras faltantes.

## OpenAPI de Usuarios contrastado

Ahora existe contrato canónico **`docs/api/openapi.yaml`**, OpenAPI 3.1.0 / versión 0.1.0,
con 26 operaciones (21 Usuarios/auth y cinco estudiantes). Los contratos 001–003 siguen
siendo históricos y no sustituyen el catálogo actual.

| Capacidad | Contrato actual y código |
| --- | --- |
| Login | POST `/api/auth/sign-in/email`, objeto estricto email/password y `rememberMe` opcional; 200/400/401/503. Ahora el contrato canónico sí declara `rememberMe`; frontend sigue omitiéndolo por decisión expresa, no por ausencia documental |
| Sesión | GET `/api/auth/get-session`, 200 identidad/sesión con expiresAt, 401/503; sin lastAcceptedAt ni renovación de actividad protegida |
| Cierre | POST `/api/auth/sign-out`, sin cuerpo requerido; 200/401/403/429/503 y fallback del proveedor. El contrato ya advierte que ciertos fallos de borrado pueden dar éxito: documenta la limitación, no la corrige |
| Documentación | GET `/docs`, `/openapi.yaml` y dos assets locales, solo development/test; 404 en producción/staging/entorno no explícito, comprobado por docs:check |

La suite `api-openapi.test.ts` compara operaciones con montaje real/lista blanca,
valida respuestas contra el catálogo y prueba errores, JWT aislado, cookie Secure y
rechazos de origen. No se navegó visualmente Swagger ni se asumió instancia desplegada.
No se consultó una URL externa ni se enviaron credenciales a Swagger.

## Fuentes actuales consultadas

Rutas relativas al backend en el commit indicado; equivalentes bajo el worktree temporal:

- `README.md`, `docs/agent-context/INDEX.md`,
  `docs/agent-context/modules/usuarios/module-summary.md`,
  `docs/agent-context/modules/usuarios/features/autenticacion.md`,
  `docs/agent-context/modules/usuarios/features/documentacion-api-swagger.md`.
- `docs/api/openapi.yaml` (Acceso, seguridad y catálogo validado por pruebas),
  `src/docs/documentation.routes.ts`, `src/app.ts`, `src/auth/auth.ts`,
  `src/db/client.ts`, `src/config/env.ts`, `drizzle.config.ts`, `vitest.config.ts`,
  `package.json` y lock usado por npm ci.
- `tests/setup.ts`, `tests/helpers.ts`, `tests/openapi.helpers.ts` (consumido por suite),
  `tests/unit/openapi-document.test.ts`, `tests/unit/documentation-routes.test.ts`,
  `tests/contract/api-openapi.test.ts`, `tests/contract/authentication.test.ts`;
  integración y actividad indicadas en los comandos (ejecutadas).
- `node_modules/better-auth/dist/api/routes/sign-out.mjs`,
  `node_modules/better-auth/dist/api/routes/session.mjs`,
  `node_modules/better-auth/dist/cookies/index.mjs`: versión 1.7.7 investigada previamente,
  ahora ejercitada mediante la instalación aislada y el harness.

## Condiciones para desbloquear tareas

Para reproducir en otra sesión, crear otra base exclusiva y migrada, copiar el harness
al destino indicado y sustituir el puerto en ambas URLs. Nunca reutilizar bases de
otros worktrees: `tests/helpers.ts` trunca tablas. Las pruebas diagnósticas esperan el
comportamiento defectuoso observado; después de corregir deben reemplazarse por
aserciones de la garantía requerida, no conservarse como criterio de aceptación positivo.

1. Resolver P-01 en trabajo backend separado: fallo de invalidación no puede presentarse
   como revocación confirmada; probar que credencial anterior es rechazada tras cierre.
2. Resolver P-02 allí: la renovación admitida por actividad debe llegar al navegador;
   probar cabeceras y comportamiento con cookie, sin introducir polling de mantenimiento.
3. Actualizar/revalidar OpenAPI y registrar el nuevo commit y regresiones.
4. Con esa evidencia, finalizar elección de transporte, contratos, quickstart y revisión
   constitucional del plan frontend. No hace falta otra decisión de topología: mismo
   origen HTTPS ya fue aprobado. No hay permiso implícito para cambiar estos requisitos.

**Conclusión:** validación completada; no se puede declarar plan listo para tasks.
