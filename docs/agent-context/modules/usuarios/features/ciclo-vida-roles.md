# Acciones de estado y rol en una cuenta

**Estado frontend:** acciones propuestas para el detalle de cuenta, no pantalla propia. **Backend:** implementadas; reglas registradas en spec 001, con validación institucional de reactivación todavía indicada como supuesto.

## Actor y capacidad API

ADMIN activo con permiso de gestión:

- POST `/api/v1/accounts/:id/deactivate` o `/reactivate`, cuerpo `{ confirm: true }`.
- PUT `/api/v1/accounts/:id/role`, cuerpo `{ role: 'TEACHER' }`, únicamente degradación de administrador activo.

No hay borrado, roles múltiples ni ascenso directo por esta ruta. El ascenso utiliza [solicitudes](solicitudes-rol.md). Consultar spec 001 FR-007…013/019 y Assumptions para las reglas de elegibilidad, último administrador y efectos sobre acceso; no reproducirlas como lógica cliente.

## Recorrido de interfaz propuesto

1. En detalle actualizado, seleccionar una acción disponible; explicar el efecto antes de enviarla.
2. Inactivación/reactivación requieren confirmación explícita; cancelar conserva cuenta y acceso sin solicitud. Para degradación se propone también confirmación UI, no un nuevo campo API.
3. Mostrar progreso sin duplicar la mutación. Confirmado el éxito, actualizar detalle/acciones; si afecta al actor actual, revalidar su acceso antes de continuar gestionando.
4. Ante conflicto, recuperar estado actualizado y explicar por qué no se confirmó la transición. No ofrecer «forzar» ni prometer cambios por ocultar botones.

## Estados y errores observados

Cuenta activa/inactiva/pendiente, confirmación, enviando, éxito, cancelación, acceso perdido, conflicto y servicio no confirmado. `400 INVALID_INPUT`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT` o `LAST_ADMIN`, `503 UNAVAILABLE`.

Los estados no elegibles y acciones repetidas son conflictos, no éxitos nuevos. Reactivación no restaura sesiones anteriores. Los cambios de rol aplican permisos vigentes en la siguiente petición; no se promete que toda modificación de rol cierre automáticamente todas las sesiones.

## Criterios de aceptación para implementación futura

- Cancelar no envía la acción; confirmar muestra éxito solo tras respuesta válida.
- La UI explica `LAST_ADMIN` sin intentar eludirlo o recalcular la autorización localmente.
- No se ofrecen altas ADMIN, asignación TEACHER→ADMIN directa ni dejar la cuenta sin rol.
- Reactivación informa necesidad de iniciar sesión nuevamente y no «recuperar sesión anterior».
- Cambiar el propio estado/rol no deja controles de gestión funcionando con privilegios antiguos.

## Fuentes backend consultadas

- [Cuentas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/cuentas.md) y [autorización](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autorizacion.md).
- [Spec 001](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md) y [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/contracts/accounts.openapi.yaml); [spec 003](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/spec.md), FR-007/008.
- [Montaje](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts), [router](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/accounts.routes.ts), [ciclo de vida](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/lifecycle.service.ts), [roles](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/roles.service.ts) y [guardias](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-guard.ts).

## Pendiente de confirmar

Validación institucional de reactivación y texto/confirmación visual para acciones sobre la propia cuenta. La capacidad existe, pero no sustituye esa validación. El diseño de confirmaciones se abordará con skills pertinentes en una tarea UI, no en esta base.
