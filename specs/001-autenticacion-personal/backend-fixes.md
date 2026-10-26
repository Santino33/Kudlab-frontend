# Correcciones backend y cierre de P-01/P-02

**Fecha:** 2026-10-25. **Resultado:** corregidos y revalidados en worktree separado.
El plan frontend queda preparado para desglose de tareas contra esta revisión.
No significa merge a main, API desplegada ni frontend implementado.

## Autorización y revisión exacta

El responsable autorizó explícitamente corregir P-01/P-02 en backend separado,
revalidar y completar el plan, manteniendo las garantías funcionales y topología
mismo origen HTTPS. No se amplió alcance de negocio ni se modificó constitución.

- Worktree: `/tmp/opencode/kudlab-auth-backend-validation`.
- Rama: `fix/session-cookie-guarantees`.
- Commit base: `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`.
- Correcciones **locales, sin commit ni merge**. El checkout principal backend conserva
  el mismo commit y estado limpio; no asumir que ya contiene los arreglos.
- Cuatro archivos seguidos modificados y una nueva prueba. Sin dependencias, migraciones,
  rutas nuevas ni cambios de permisos. Para integrar frontend usar este worktree o la
  integración revisada de estos cambios y actualizar el commit de referencia.

Huellas SHA-256 de los archivos revalidados:

| Archivo relativo al worktree backend | SHA-256 |
| --- | --- |
| `src/app.ts` | `183eebc3cbaae4711db37cebfd904c6728656a5e75fa297d0244f798ca80396b` |
| `src/auth/session-guard.ts` | `64ef9ebc10f6d3c29d15ffad171fceedc252588f9368be141c587c125d1b1de5` |
| `docs/api/openapi.yaml` | `a3ce0ff1b607dfb0394ceb9026b74b9122e02b470c89f2f6bbe89c85df21086e` |
| `docs/agent-context/modules/usuarios/features/autenticacion.md` | `f8b4db0a9640d99bbaca365180927b3b590cac0b4fb4af32f62961d5813a8004` |
| `tests/integration/frontend-auth-validation.test.ts` | `5d00b3382a313d097ce634cb05fe0ad0c94b2450235dc6808aeca9a6aeef4331` |

## Cambios mínimos implementados

### P-01: éxito solo tras revocación persistida

En `src/app.ts`, el cierre ahora espera el handler del proveedor. Si responde con
éxito, elimina explícitamente la sesión por id y userId antes de reenviar éxito y
cookies expiradas. Si la eliminación persistida falla, devuelve 503 UNAVAILABLE
sin reenviar la respuesta de éxito/cookies expiradas. Puede haber ocurrido algún
efecto previo: el cliente debe seguir tratando ese 503 como resultado no confirmado.

La eliminación adicional se ejecuta **después**, no antes, de los controles de origen,
CSRF y denegaciones del proveedor. No altera otras sesiones; no cambia roles/estado.
Esto cubre el fallo de borrado absorbido por Better Auth y captura rechazos asíncronos.

### P-02: cabeceras de renovación transmitidas

En GET de sesión y `prepareActive` se usa `auth.api.getSession` con `returnHeaders:true`.
Después de validar sesión/identidad/actividad se añaden las Set-Cookie por separado,
sin transmitir JWT ni `set-auth-token` de esa consulta interna. La preparación compartida
también cubre consumidores académicos ya existentes sin cambiar sus transacciones.

La renovación del proveedor no registra actividad protegida. Una denegación posterior
puede conservar cookie renovada del proveedor, pero no reinicia `lastAcceptedAt`;
inactividad de 30 minutos sigue rechazándose. No se añade polling ni rememberMe.

### Contrato/documentación

`docs/api/openapi.yaml` ahora explicita renovación Set-Cookie y revocación confirmada
antes de 200. Mantiene posibles errores del proveedor y 503 por falta de confirmación.
La ficha backend de autenticación enlaza comportamiento y prueba. No se duplicaron
contratos históricos 001–003 ni se cambió el negocio para seguir una suposición UI.

## Entorno aislado y comandos

- Dependencias ya instaladas mediante npm ci en el worktree de validación, sin cambios
  de package/lock; Node 24.18.0, npm 11.16.0 y Better Auth 1.7.7.
- Contenedor exclusivo `kudlab-auth-fixes`, imagen postgres:17-alpine, base
  `kudlab_auth_fixes`, tmpfs y puerto local asignado 35311. No bases existentes ni `.env`.
  Trust de contenedor local solo para pruebas desechables, nunca producción.
- `DATABASE_URL` y `MIGRATION_DATABASE_URL` explícitas hacia
  `postgres://postgres@127.0.0.1:35311/kudlab_auth_fixes`.
- `BETTER_AUTH_URL=http://localhost:3000`, `SPA_ORIGIN=http://localhost:5173`,
  `RESET_BASE_URL=http://localhost:5173/reset-password`,
  `INVITATION_BASE_URL=http://localhost:5173/accept`; resto sintético de tests/setup,
  sin correo real ni registros reales de menores.
- Al terminar se detuvo y eliminó exclusivamente ese contenedor; la base tmpfs se
  descartó. El worktree corregido y sus archivos quedan conservados para revisión.

| Comando | Resultado |
| --- | --- |
| `npm run db:migrate` con ambas URLs exclusivas | Correcto |
| `npm run typecheck` después de cambios y prueba final | Correcto |
| `npm test -- tests/integration/frontend-auth-validation.test.ts tests/contract/authentication.test.ts tests/contract/api-openapi.test.ts tests/integration/authentication.test.ts tests/integration/auth-boundaries.test.ts tests/unit/session-activity.test.ts tests/unit/openapi-document.test.ts tests/unit/documentation-routes.test.ts` | 55 pruebas / 8 archivos correctos; antes de ampliar un caso focalizado |
| `npm test` con entorno exclusivo anterior | **153 pruebas / 29 archivos correctos**, suite completa, 203.67 s |
| `npm test -- tests/integration/frontend-auth-validation.test.ts --reporter=verbose` | **7 pruebas correctas**, revisión focalizada final |
| `git diff --check` backend/frontend | Correcto |
| Frontend: `npm ci --no-audit --no-fund`, `npm test`, `npm run build` | Correctos sobre base actual; test solo tipos, no login frontend |

El aviso del proveedor sobre IP para rate limit y rechazo de origen inválido en la
suite son conocidos. Los errores SYNTHETIC_* del test focalizado son inyección de
fallos esperada, no incidentes de producción ni secretos. No se copiaron tokens/cookies.

### Siete escenarios focalizados finales

1. Cierre normal invalida credencial original.
2. Fallo de borrado del proveedor: revocación adicional funciona, cookie original
   rechazada y otra sesión independiente sigue válida.
3. Fallan proveedor y eliminación adicional: 503 sin cookies de cierre; permite
   comprobar acceso y reintentar con éxito al recuperarse.
4. Consulta renueva cookie sin crear registro de actividad protegida.
5. Operación protegida aceptada renueva cookie y registra su actividad.
6. Consulta al alcanzar 30 minutos de inactividad: 401, sin cookie renovada ni sesión reabierta.
7. Reloj controlado: una operación a los 61 s entrega cookie renovada; a los 1801 s
   se conserva acceso dentro del plazo protegido, más allá del Max-Age inicial.

El caso 7 modela el tiempo y reutiliza la cookie renovada en app.request; **no es un
navegador real esperando 30 minutos**. Las pruebas canónicas también cubren Secure,
CSRF/rate limit en subproceso no-test, coherencia OpenAPI/montaje y regresión de
consumidores existentes. No demuestran TLS/proxy real, SMTP ni UI frontend.

## Fuentes consultadas y límites

- Montaje/guards actuales y schemas auth/actividad; `src/modules/academico/shared/academic-auth.ts`
  y `tests/integration/students-session-atomicity.test.ts` para comprobar consumidor común,
  sin cambiar las reglas de Académico.
- API instalada Better Auth `dist/types/api.d.mts`, `dist/api/dispatch.mjs`,
  `dist/api/routes/session.mjs`, además de fuentes registradas en research y validación.
- Constitución backend `.specify/memory/constitution.md` v1.1.0, contexto/specs previos,
  contrato canónico y pruebas listadas en [backend-validation](backend-validation.md).

P-01/P-02 quedan cerrados **en esta revisión local corregida**. Revisar e integrar
la rama backend antes de pruebas frontend contra main. El plan puede desglosarse sin
inventar decisiones; integración de esos fixes y validación de navegador/despliegue
son dependencias explícitas de ejecución/entrega, no bloqueos de diseño pendientes.
