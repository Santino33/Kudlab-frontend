# Recuperación de contraseña — interfaz y ensayo SMTP

**Fecha:** 2026-10-26. Frontend `feat/recuperacion-password`, worktree
`recuperacion-password`, base `77159c3` (commit solicitado para el sidebar).
La recuperación básica ya existía: esta revisión la completa/refina y contrasta
el entorno real de correo; no se presenta la misma base como una feature creada de cero.

## Interfaz implementada

- Entrada desde «¿Olvidaste tu contraseña?»; solicitud por correo institucional.
- Confirmación neutra con ayuda para revisar spam y acción explícita de nueva
  solicitud, sin revelar cuentas ni prometer recepción.
- Nueva contraseña/confirmación, restricciones visibles, mostrar/ocultar ambas,
  errores junto al campo y foco, y guard síncrono contra doble envío.
- Estados de enlace ausente/usado/vencido, envío, 400 corregible, resultado incierto,
  éxito confirmado y vuelta al acceso sin login automático.
- Iconos según estado, acciones claras, texto neutro y Card/Input/Label/Button
  shadcn existentes con Base UI/Lucide. Sistema y geometría del manual conservados.
- Token solo en memoria y query retirada por la inicialización existente. Al
  ocultar/salir se retiran token/contraseñas; no se guardan en almacenamiento web.
  Contraseñas borradas al enviar; incertidumbre no repite una mutación.

No se modificó el contrato HTTP, el backend ni sus reglas de negocio. No se
habilitaron invitaciones públicas, confirmación de correo o módulos diferidos.

## Fuentes contrastadas

Frontend: índice, `docs/design/agent-design-manual.md`, spec/contrato UI de Usuarios,
`Recovery.tsx`, `api.ts`, `navigation.ts`, `AuthRoot.tsx` y pruebas existentes.
UI/UX Pro Max instalada/cargada localmente: consulta `password visibility error
summary`. MCP shadcn conectado, búsqueda/detalle Input/Card/Alert, ejemplo
`input-demo` y checklist; no se incorporaron ejemplos Radix ni nuevas dependencias.

Backend original limpio `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`:
`docs/agent-context/INDEX.md` → `modules/usuarios/module-summary.md` →
`features/flujos-complementarios.md`, `unresolved-issues.md`,
`specs/003-autenticar-usuarios/spec.md` US3, `docs/api/openapi.yaml` recuperación,
`src/modules/usuarios/recovery/{recovery.routes,recovery.service}.ts` y
`invitations/invitations.mailer.ts`. El código de recuperación muestra token de
30 minutos/un uso, 202 neutro, confirmación 200, 400/410, revocación de sesiones.
Son implementación observada; los RF V3 se conservan como antecedentes, no reglas nuevas.

SMTP existente en `/home/santino/Universidad/TrabajoCampo/Kudlab-backend-configure-smtp`,
commit `a3be18eb1ad3e93eafde5bf1683c6fa7566db775`: `README.md`,
`specs/005-smtp-mailing/validation-results.md`, `src/config/env.ts`, `src/index.ts`,
`src/app.ts`, `recovery/recovery.service.ts`, `shared/transactional-mail.ts`,
`invitations/invitations.mailer.ts`, `drizzle.config.ts`, `tests/{setup,helpers}.ts`.
Ese worktree ya tenía cambios documentales locales en quickstart/tasks e informe
sin seguimiento; no se editaron ni se atribuyen todos al commit. No existe allí
la ficha `features/correo-smtp.md` enlazada por contexto antiguo; se contrastó el código.
Las credenciales configuradas se leyeron solo en memoria por el lanzador local,
sin imprimir/copiar valores ni alterar `.env`. Nunca pasaron al frontend.

## Entorno aislado y autorización

El responsable aprobó explícitamente preparar una cuenta docente de prueba con
su buzón y enviar un solo enlace real. No había una cuenta de ese correo en la
base de preview anterior. Se creó la base **nueva y separada**
`kudlab_recovery_preview` dentro del PostgreSQL desechable existente, loopback
46821. Migraciones existentes aplicadas sin truncar ni cambiar la base anterior.

Fixture TEACHER activa preparada con los helpers existentes en modo captura;
contraseña inicial aleatoria desconocida, sesiones de preparación retiradas.
Ninguna invitación de preparación se envió externamente. El titular elige su
contraseña desde el enlace; el agente no la pide ni la decide.

SPA del ensayo `http://localhost:5188`, API SMTP existente `http://localhost:3004`,
`RESET_BASE_URL=http://localhost:5188/recuperar-acceso/confirmar`.
La configuración del proceso usa las claves SMTP existentes y URLs explícitas;
no se cambió código backend ni se incorporaron P-01/P-02 a esa rama. Se ensaya
recuperación, no se certifican garantías generales de sesión de ese backend.
La vista anterior 5187/API 3002 y el perfil aprobado 5173/3000 permanecen intactos.

## Comprobaciones ejecutadas

- `npm ci`: correcto, 0 vulnerabilidades frontend. `npm test`: tipos correctos;
  `npm run test:auth`: 66/66; `npm run test:usuarios`: 70/70;
  `npm run build` y `git diff --check`: correctos. Manifiesto/lockfile sin cambios.
- `TASTE_SKILL_TMP=/tmp/opencode node tests/browser/recovery.check.mjs`: Chrome local,
  15 combinaciones (solicitud/confirmación/sin enlace × 320/390/768/1024/1440),
  sin overflow general. Validación/foco, visibilidad, doble envío, resultados
  202/200/400/410/503/red/en curso y retirada de secretos al salir correctos.
  Fixture sintética sin red externa ni token real en capturas.
- Backend real, flujo **sintético en captura** antes del envío externo: 202;
  cambio 200; reutilización 410; sesión y contraseña anteriores 401;
  nueva contraseña aceptada 200. No se imprimieron token ni contraseñas.
  No se atribuye esto a una suite backend completa ni a recepción SMTP.

## Único envío externo

Solicitud realizada desde la **UI real**, no mediante un mailer de demostración,
al buzón autorizado por el responsable. La UI recibió la confirmación neutra 202.
Diagnóstico sanitizado del backend: propósito `password-recovery`, resultado
`accepted`, `2026-10-26T17:28:09.421Z`, operación
`b70645bd-61c4-4d3b-9667-13d39d06e14d`. Un solo intento SMTP; sin reenvío automático.

Esto acredita aceptación SMTP, **no llegada a inbox/spam ni lectura**. Se solicitó
al titular confirmar recepción, abrir el enlace en una pestaña visible y elegir
la contraseña sin compartir enlace/credenciales en el chat. Esa parte manual
permanece pendiente; el token vence a los 30 minutos. No se anuncia E2E real completo.

## Calidad y límites

Capturas sintéticas revisadas de solicitud desktop/móvil, nueva contraseña,
solicitud recibida, éxito, enlace no utilizable e incertidumbre, guardadas bajo
`screenshots/recovery/`. Se conserva contraste/marca, sin colores semánticos nuevos,
fuentes ni dependencia adicional. El estado exitoso no usa icono de advertencia.

Faltan recepción/cierre real por el titular, lector de pantalla, zoom, BFCache real,
TLS/topología productiva y aceptación con profesores. T036 y gates integrales
siguen abiertos. El runtime temporal y scripts de preparación quedan locales en
`.taste-skill/` ignorado; no se versionan ajustes SMTP, conexiones ni secretos.
