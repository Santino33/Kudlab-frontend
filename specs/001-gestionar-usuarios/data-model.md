# Phase 1 — Modelo de datos de presentación

Este modelo describe datos consumidos y estado efímero frontend, no tablas, migraciones ni reglas de negocio nuevas. Fuente de campos: catálogo backend actual y código contrastado en [revalidacion-plan.md](revalidacion-plan.md). Consumo permitido en [contracts/api-consumption.md](contracts/api-consumption.md).

## Datos externos

| Entidad | Campos consumidos | Relación y tratamiento |
| --- | --- | --- |
| Identity | `id`, `email`, `name`, `role: ADMIN \| TEACHER` | Identidad de autenticación. Su `id` **no** es ID de cuenta de negocio; rol indica presentación, no autoriza operaciones |
| SessionView | `user: Identity`, `session: { id, expiresAt }` | Resultado de consulta propia. ID interno no es token; `expiresAt` no permite deducir reloj exacto de actividad. No se persiste en navegador |
| Account | `id`, `name`, `email`, `role`, `status: PENDIENTE \| ACTIVA \| INACTIVA`, `createdAt`; opcionales `pendingEmail`, `deliveryStatus`, `invitationExpiresAt` | ID de negocio procedente de listado/detalle o alta, usado en rutas de gestión. Una cuenta tiene una identidad vinculada en backend, pero ese enlace no se devuelve aquí ni se infiere |
| AccountPage | `items: Account[]`, `total`, `limit`, `offset` | Página de resultados según estado. Sin búsqueda por nombre/correo ni orden arbitrario |
| Delivery | `PENDIENTE \| ENVIADA \| ERROR` y vencimiento opcional de invitación | Información de última invitación dentro de Account; ausencia sigue siendo desconocida, no éxito. No es estado de lectura del correo ni estado de entrega de confirmación de correo |
| UserError | `code`, `message`, opcional `fields: { field, reason }[]` | Campos de perfil `name/email/role/password` cuando existen; validar forma antes de usarlos. No reflejar respuesta inesperada o secretos como texto bruto |
| ProviderError | `code?`, `message?` y estado HTTP | Cierre delegado puede responder 403/429/u otro error no normalizado. Convertir a mensaje seguro, no asumir UserError en todo fallo |

No modelar DTO de estudiantes, ascensos, eventos de auditoría o canjes de invitación/correo para implementar «por si acaso». Sus capacidades backend no están en la allowlist de esta iteración.

## Entradas de formularios

| Formulario | Datos efímeros | Referencia de validación |
| --- | --- | --- |
| Login | correo, contraseña; `rememberMe: false` constante sin selector | Contrato actual login: correo con formato y contraseña existente no vacía. **No** aplicar política de nueva contraseña al login |
| Alta docente | nombre, correo; `role: TEACHER` constante | `Name` e `InstitutionalEmail` del catálogo y esquemas actuales; autorización y unicidad siempre servidor |
| Edición | ID de cuenta, nombre/correo seleccionados para cambiar | Al menos un campo permitido. No reenviar correo activo sin cambios como si fuera edición solo de nombre; reemisión pendiente es acción explícita separada |
| Reemisión | cuenta pendiente y correo de esa cuenta consultada | PATCH de correo confirmado; no formulario de nueva identidad |
| Inactivación | ID de cuenta y confirmación explícita | `confirm: true` solo al confirmar, nunca cancelar |
| Reducción de rol | ID de cuenta y confirmación UI | `role: TEACHER`; no agregar campo confirm al cuerpo que no lo acepta |
| Solicitud recuperación | correo | Correo institucional válido según esquema vigente; neutralidad por existencia/estado, no para cualquier cadena |
| Confirmación recuperación | token en memoria y nueva contraseña | Token no vacío y `NewPassword` del catálogo. Servidor decide vigencia/usabilidad; no hay inspección pública |

Nombre máximo 200 y nueva contraseña entre 8 y 128, con mayúscula ASCII, minúscula ASCII y número, están ahora documentados en el catálogo actual y coinciden con esquemas. El plan reutiliza esa fuente, no promueve el contrato histórico incompleto. Ayudas/validación cliente anticipan errores de formato; nunca comprueban localmente unicidad, último ADMIN, elegibilidad o permiso como autoridad.

## Estado interno mínimo

### Acceso

`checking → authenticated(identity) | anonymous | unavailable`.

- Inicio/recarga de destino protegido: `checking`, sin datos anteriores visibles; consulta de sesión determina salida.
- Login confirmado: identidad válida, comprobar sesión y pasar a destino autorizado; no sintetizar accountId.
- 401 protegido: retirar identidad/datos y pasar a acceso requerido. No confundir con 401 de login, que son credenciales inválidas.
- 403 de gestión: retirar datos de esa operación y consultar una vez sesión. Si ahora TEACHER, estado mínimo; si falla verificación, no mostrar gestión anterior.
- Logout confirmado o sesión ya inválida: `anonymous`. Error/red: retirar vista protegida y presentar cierre no confirmado; no borrar HttpOnly manualmente ni asegurar revocación remota.
- No polling, actividad de ratón ni emisión de JWT como mantenimiento.

### Consulta de cuentas/detalle

`idle → loading(selection) → loaded(data) | empty | notFound | denied | unavailable`.

Selección mínima: estado y offset para listado, ID para detalle. AbortController y comprobación de selección evitan publicar respuesta obsoleta; abortar consulta no modifica cuenta. Cambiar filtro reinicia offset a 0. `empty` solo tras respuesta válida, nunca fallback de error.

### Mutación

`editing → confirming (si aplica) → submitting → confirmed | validationError | conflict | denied | uncertain`.

- Cancelar antes de enviar regresa sin llamada de mutación.
- `submitting` bloquea segundo envío de la misma operación; no garantiza idempotencia backend.
- Cambios sensibles no se actualizan optimistamente.
- Fallo de transporte, 503 o 401 final tras mutación pueden pasar a `uncertain`. 409 requiere consultar estado sin sobrescribir borrador silenciosamente.
- Reconciliación autorizada puede mostrar estado actual de la cuenta, **no probar entrega, lectura o causalidad de una operación**. Sin acceso/no concluyente: mantener incertidumbre, no reintentar automáticamente.
- Alta sin ID: revisar listado paginado autorizado; encontrar el correo prueba cuenta actual, no que este intento específico la creó. No encontrarlo no demuestra rollback.

### Recuperación

Solicitud: `editing → submitting → neutralConfirmation | validationError | unavailable`.

Canje: `missingToken | editingWithToken → submitting → confirmed | invalidPassword | unusableLink | unavailable`.

- Capturar token solo en ruta exacta aprobada, retirar query de URL, no almacenar de forma persistente. Sin token no enviar.
- Envío solo explícito. Un 400 conserva token en memoria para corregir, sin afirmar consumo; 410 descarta token y permite nueva solicitud; éxito limpia token/contraseña/estado de acceso y lleva a login.
- Navegar, recargar o salir elimina el token local; solicitar otro enlace si ya no está. Mensajes/registros/capturas nunca incluyen el valor.

## Transiciones de negocio observables, no reimplementadas

| Operación habilitada | Resultado que se puede presentar |
| --- | --- |
| Alta | Cuenta pendiente, entrega conocida o incierta; aceptación bloqueada |
| Edición de nombre | Nombre confirmado; no altera visualmente otros campos |
| Correo en pendiente | Correo e invitación nuevos según respuesta; canje bloqueado |
| Correo en activa | Vigente conservado y pendiente distinto; confirmación bloqueada |
| Inactivación | Cuenta inactiva confirmada y acceso revalidado; no borrar historial |
| Reducción de rol | Rol TEACHER confirmado, sin conservar gestión por estado cacheado |
| Recuperación confirmada | Nueva contraseña aceptada sin sesión automática; accesos anteriores revocados por backend |

Reglas de elegibilidad, concurrencia, último ADMIN, TTL y conservación siguen canónicas en backend. Reactivación, ascenso y auditoría visible no tienen transición UI en esta iteración.
