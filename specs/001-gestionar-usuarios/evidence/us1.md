# US1 — implementación y validación parcial, 2026-10-26

Frontend base `39d8a83`, cambios locales en `feat/gestionar-usuarios`.
**T012–T017 completadas; T018 parcialmente ejecutada. No es un MVP integrado validado.**

**Actualización posterior de este día:** el responsable autorizó reconstruir el
backend corregido; sus pruebas y conexión real ya se ejecutaron. Ver
[revisión actual y resultados](backend-restored.md). El bloqueo de revisión
ausente que se describe abajo es histórico; T018 sigue pendiente por matriz incompleta.

## Código y pruebas

- Pruebas escritas antes de las adaptaciones: fallaron como se esperaba por firma
  anterior, ausencia de helpers y acceso concedido antes de comprobar cookie/sesión.
- Cliente auth existente adaptado, sin segunda autenticación: origen explícito,
  include/no-store/redirect:error, `rememberMe: false` y cierre `{}`.
- Se conservan todos los casos auth; solo cambian las expectativas aprobadas de
  transporte y se añade la comprobación de sesión después de login exitoso.
  Una identidad devuelta por login no abre contenido protegido por sí sola.
- AuthRoot conserva lifecycle, flushSync, generaciones, deduplicación, bloqueo de
  transporte, foco y limpieza de contraseña; el marco se reutiliza como StaffLayout.
  Se añade resumen de errores de entrada sin política nueva de contraseña de login.
- `/`, `/acceso`, `/sesion` componen el mismo acceso gráfico. TEACHER solo ve
  identidad confirmada y cierre. No se enlazan destinos todavía no implementados.
- Origen en frontera Vite; configuración ausente/inválida muestra aviso sin API.
  Se retira deliberadamente el proxy heredado a 3001. Producción exige fallback
  a index.html y HTTPS/cookies compatibles, aún no comprobados. Referrer: no-referrer.
- Checkpoint Node: **65/65 auth**, **23/23 Usuarios**, tipos/build y diff correctos.
  Runner sin dependencias nuevas; lockfile intacto. No son pruebas API/DOM.

## Navegador sintético — no integración API

Vite propio 5187, `tests/browser/usuarios-harness.html` con App/AuthRoot reales y
Fetch inyectado sin red API. Sin credenciales reales ni datos de menores.

| Caso | Resultado observado y límite |
| --- | --- |
| TEACHER `/sesion` | Identidad filtrada y solo cierre; [captura](screenshots/us1/confirmed.png), viewport 990×986 |
| Cierre 503 simulado | Retira identidad y ofrece reintentar; [captura](screenshots/us1/signout-unconfirmed.png), sin prometer revocación |
| Pagehide sintético | Lectura DOM inmediatamente posterior: título «Comprobando acceso», cero dd y correo ausente; no demuestra BFCache real |
| Entrada directa `/usuarios` TEACHER | Aviso de denegación y enlace a sesión; sin datos/acciones de cuentas |
| Entrada estrecha | App dentro de iframe same-origin de 390×900 CSS px: scrollWidth=390, inputs/botón de 44px; [captura del viewport contenedor](screenshots/us1/access-390-embedded.png) |
| Teclado en iframe | H1 → Tab correo → Tab contraseña → Tab enviar; Enter vacío devuelve foco a correo y muestra errores de campos. No prueba lector/zoom/gestor real |

Se conserva baseline en `../evidence/visual-reference.md`. No se completó la matriz
gráfica T018 de todos los estados/ancho; no se atribuye a estas capturas aprobación
del responsable, certificación WCAG o éxito con profesores.

## Bloqueo de integración descubierto

La ruta `/tmp/opencode/kudlab-auth-backend-validation/src/app.ts` ya no existe.
`git worktree list` del backend registra ese worktree como **prunable**.
Backend principal verificado en `ff46f8ab5d65b81ac4f01b865852ca63b1327ec3`, limpio;
no contiene P-01/P-02. La verificación histórica de cinco hashes no prueba disponibilidad
actual. No se recreó worktree, restauraron cambios, arrancó backend, tocó BD o envió correo.

**Para continuar T018:** el responsable debe proporcionar/restaurar una revisión
corregida verificable y autorizar/preparar un entorno aislado con cuentas ADMIN/TEACHER
ficticias, configuración CORS/cookies y base exclusiva. Detenido el trabajo secuencial
en este gate; T019–T056 no iniciadas. No se marca validación completa con mocks.

## Fuentes backend reconsultadas

Raíz: `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`; commit y estado arriba.
Índice → módulo Usuarios → features cuentas/autenticación y pendientes generales;
`specs/003-autenticar-usuarios/spec.md` (reglas confirmadas, RF V3 solo antecedente),
`docs/api/openapi.yaml` (operaciones auth), `src/app.ts`,
`src/auth/{auth,active-identity,session-activity,session-guard}.ts`,
`src/modules/usuarios/accounts/accounts.routes.ts` y
`src/modules/usuarios/shared/accounts.errors.ts`. Fuentes frontend:
spec/plan/modelo/contratos/research/quickstart, constitución y cuatro docs de diseño.
No se modificó backend. Diferencias del worktree corregido se remiten al informe
histórico `../../001-autenticacion-personal/backend-fixes.md`, no a ejecución nueva.
