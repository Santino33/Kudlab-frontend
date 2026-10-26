# Contrato de consumo — Usuarios

Contrato del **cliente frontend**, no especificación de nueva API. Fuente de verdad técnica: catálogo backend actual `docs/api/openapi.yaml` y rutas/servicios observados; reglas de negocio en specs backend 001–003. Referencias exactas, commit y diferencias en [revalidacion-plan.md](../revalidacion-plan.md). No copiar un OpenAPI histórico propuesto como disponibilidad actual.

**Distinción de base frente a extensión:** ya existe `src/auth/client.ts` de main con cookie same-origin, rutas relativas, login sin rememberMe y cierre sin cuerpo; proxy local 3001. La tabla siguiente describe los deltas **futuros aprobados para esta feature**, no cambios aplicados al hacer merge. Adaptar ese cliente con pruebas, sin duplicarlo en API Usuarios ni modificar el transporte existente durante la preparación. La revisión corregida backend exigida por autenticación está identificada en el [registro de preparación](../revalidacion-plan.md#preparación-del-worktree-para-desarrollo); verificar esa revisión antes de integración real.

## Transporte acordado

- Único transporte de sesión: cookies HttpOnly gestionadas por Better Auth/backend; Fetch `credentials: 'include'`. No leer `set-auth-token`, no pedir JWT/JWKS ni construir `Authorization`.
- Login envía `rememberMe: false` constante, aprobado por el responsable; no control visible. No afirmar que cerrar navegador revoque sesión.
- Configuración cliente propuesta: `VITE_API_ORIGIN`, solo origen público sin secretos; perfil local `http://localhost:3000`. Validar valor al arrancar, no aceptar un origen suministrado por query o formulario. Sin fallback silencioso a un servidor ajeno.
- SPA local `http://localhost:5173`; backend debe permitir exactamente ese origen en CORS/trustedOrigins. JSON en mutaciones, no intentar fijar `Cookie`, `Origin` o `Set-Cookie` desde JavaScript. Respetar controles de origen/CSRF; no deshabilitarlos para resolver errores.
- Sin reintentos automáticos de mutaciones ni redirects externos como destino de acceso. Solo rutas allowlist; IDs de negocio codificados como segmento, nunca ID de sesión/identidad.
- HTTP 2xx inesperado o cuerpo inválido no da éxito: exigir forma mínima de la respuesta antes de mostrar datos. Parseo de errores tolera JSON no esperado/ausente sin volcar cuerpo bruto.

## Allowlist de operaciones

| Uso | Método/ruta | Entrada del cliente | Éxito esperado |
| --- | --- | --- | --- |
| Acceso | POST `/api/auth/sign-in/email` | `email`, `password`, `rememberMe: false` | 200 con `user` Identity; confirmar sesión antes de vista protegida |
| Sesión | GET `/api/auth/get-session` | Sin cuerpo | 200 SessionView; no renueva actividad protegida |
| Cierre | POST `/api/auth/sign-out` | JSON `{}`; sin callback/redirect | 200 `{ success: true }`; 401 significa ya sin sesión utilizable |
| Listado ADMIN | GET `/api/v1/accounts` | `limit=20`, `offset`, `status` opcional | 200 AccountPage |
| Detalle ADMIN | GET `/api/v1/accounts/:id` | ID de negocio | 200 Account |
| Alta ADMIN | POST `/api/v1/accounts` | `name`, `email`, `role: TEACHER` | 201 Account pendiente |
| Edición ADMIN | PATCH `/api/v1/accounts/:id` | `name` y/o `email`, sin extras | 200 Account, con correo pendiente si aplica |
| Reemisión ADMIN | PATCH `/api/v1/accounts/:id` | `email` actual de cuenta pendiente | 200 Account con última invitación; no `/resend` nuevo |
| Inactivación ADMIN | POST `/api/v1/accounts/:id/deactivate` | `{ confirm: true }` | 200 Account inactiva |
| Reducción ADMIN | PUT `/api/v1/accounts/:id/role` | `{ role: 'TEACHER' }` | 200 Account con rol confirmado |
| Solicitud recuperación | POST `/api/v1/auth/password-recovery/request` | `{ email }` | 202 con texto neutro; no garantiza entrega |
| Confirmar recuperación | POST `/api/v1/auth/password-recovery/confirm` | `{ token, newPassword }` | 200 `{ success: true }`; no sesión automática |

DTO y límites por fuente en [data-model.md](../data-model.md). Reemisión advierte invalidación de enlace previo y bloqueo actual del canje; edición/alta no prometen un recorrido completo operativo.

## Operaciones que el cliente NO implementará ni llamará

- `/api/v1/account-invitations/accept` y `/api/v1/account-email-changes/confirm`: bloqueadas por Q2-A, incluso si se recibe un token o una ruta manual.
- `/api/v1/admin-role-requests` y sus decisiones, `/api/v1/accounts/:id/audit`, `/api/v1/accounts/:id/reactivate`: diferidas por Q1-A.
- `/api/auth/token`, `/api/auth/jwks`, registro público, Google, endpoints de estudiantes/grupos/tareas/otros módulos. No descubrir funcionalidad con llamadas de prueba.

## Errores y efectos

| Respuesta | Tratamiento del cliente |
| --- | --- |
| 400 `INVALID_INPUT` | Error corregible; asociar `fields` solo si existe y corresponde. Login usa su contrato de credencial existente, no reglas de contraseña nueva |
| 401 login `INVALID_CREDENTIALS` | Mensaje uniforme sin enumerar cuenta; no acceso |
| 401 protegido `UNAUTHENTICATED` | Limpiar vista/identidad y pedir acceso; tras mutación conservar resultado potencialmente aplicado para revisión, no repetir |
| 403 `FORBIDDEN` | Retirar datos denegados; revalidar sesión una vez y aplicar rol actual, sin inventar permisos |
| 404 `NOT_FOUND` | Mostrar no encontrado y salida a listado si autorizado, sin datos viejos de otro ID |
| 409 `CONFLICT` / `LAST_ADMIN` | Explicar rechazo y consultar estado permitido antes de otra acción; no ofrecer forzar |
| 410 `VERIFICATION_EXPIRED` en recuperación | Enlace no utilizable, sin identificar cuenta; nueva solicitud |
| 503 `UNAVAILABLE` / `DELIVERY_FAILED` / `DELIVERY_STATUS_UNKNOWN` | Operación/entrega incierta, no rollback garantizado; reconciliar de forma autorizada |
| Cierre 403 proveedor, 429 u otro error delegado | Mensaje seguro de cierre no confirmado; retirar datos visibles. No suponer esquema normalizado ni que el acceso remoto acabó. 429 permite explicar espera indicada, no repetir automáticamente |
| Red, aborto o JSON/forma inválida | Consulta: resultado no disponible. Mutación: posible resultado incierto; cancelación de Fetch no revierte escritura |

El catálogo de backend main `ff46f8a` advierte que el proveedor de cierre captura ciertos fallos internos y puede responder éxito. La base de autenticación requiere P-01/P-02 de su revisión corregida externa para confirmar revocación/propagar renovación; esa revisión se identificó por hashes, pero no se ejecutó en esta preparación ni se incorporó al backend main. No integrar contra main sin revisar esa diferencia ni dar por válidas garantías de cierre/continuidad por los tests frontend. Mantener tratamiento de resultado incierto y comprobar las garantías con el backend aislado correcto, sin corregirlo como parte de esta feature.

## Reconciliación limitada

1. No repetir la mutación a partir de una respuesta incierta. Mostrar aviso estable, no toast fugaz.
2. Recuperar sesión/permiso cuando sea necesario; no consultar listado ADMIN como TEACHER ni conservar datos ajenos mientras se verifica.
3. Con ID conocido, volver a detalle; sin ID de alta, consulta paginada por estado si procede o listado completo autorizado. No hay búsqueda por correo: cualquier comparación es sobre datos ya autorizados.
4. Mostrar **estado actual**, sin atribuir causalidad ni confirmar entrega/lectura. Reemisión puede no ser distinguible si marcas disponibles no resuelven el resultado.
5. Si no concluye o no hay permiso, mantener aviso y revisión por ADMIN, no añadir endpoint, polling, bucle infinito ni reintento ciego.

## Pruebas de contrato futuras

Con Fetch simulado probar método/ruta/cuerpo exactos, `credentials: include`, `rememberMe: false`, errores/cuerpos inesperados y ausencia de llamadas prohibidas; comprobar que mutaciones no se reintentan. No usar tokens reales, BD productiva ni destinatarios de ejemplos. Navegador real con backend aislado es necesario para validar cookies/CORS; un mock no lo demuestra.
