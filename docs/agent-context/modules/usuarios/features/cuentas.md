# Consultar, invitar y editar cuentas del personal

**Estado frontend:** descripción para implementación futura. **Backend:** rutas implementadas; reglas confirmadas en spec 001, validación en 002 (borrador). Ver [inventario y discrepancias](../capabilities.md).

## Actores y alcance UI

ADMIN activo. Listado, detalle, alta docente y edición; acciones de estado/rol e historial se enlazan desde el detalle, sin exigir pantallas independientes. TEACHER no administra cuentas ajenas ni dispone de edición propia por estas rutas.

## Capacidad API

- GET `/api/v1/accounts`: `limit`, `offset`, `status`; devuelve `items`, `total`, `limit`, `offset`.
- GET `/api/v1/accounts/:id`: detalle con nombre, correo, rol, estado y campos opcionales de correo pendiente y última invitación.
- POST `/api/v1/accounts`: nombre/correo/rol TEACHER; alta pendiente y emisión de invitación, no cuenta ADMIN ni sesión automática.
- PATCH `/api/v1/accounts/:id`: nombre y/o correo; cambios de correo siguen el flujo separado enlazado abajo.

Las reglas canónicas de campos, unicidad y elegibilidad están en specs 001 FR-001…006 y 002 FR-001…009 y en sus esquemas reales; no se redefine la política aquí.

## Recorrido de interfaz propuesto

1. Abrir listado autorizado, mostrar carga y luego cuentas o vacío; cambiar página/filtro reinicia la consulta coherentemente.
2. Abrir una cuenta y ofrecer solo acciones respaldadas por el estado actual y permisos vigentes, sin asumir que esto reemplaza validación servidor.
3. En alta, pedir nombre y correo, comunicar que se invita a un docente; no pedir contraseña ni ofrecer ADMIN como rol inicial.
4. Mostrar envío y después cuenta pendiente, no «cuenta activada». Consultar el estado de entrega mediante [invitaciones](invitaciones.md).
5. Editar nombre/correo conservando borrador ante errores corregibles. Un correo activo nuevo aparece como pendiente hasta [confirmación](cambio-correo.md).
6. Volver a consultar ante conflicto o entrega no confirmada; no repetir un POST de alta a ciegas tras `503`.

## Estados y errores observados

Cargando, vacío, listado paginado, detalle, edición/enviando, cuenta pendiente/activa/inactiva, correo pendiente y entrega incierta. Errores `400 INVALID_INPUT` (con `fields` cuando procede), `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 CONFLICT`, `503 UNAVAILABLE`/errores de entrega.

Un `503` posterior al envío SMTP no garantiza que el alta o la edición se haya revertido. Nunca mostrar datos de otras cuentas ante denegación. No implementar búsqueda por nombre/correo: no existe ese parámetro en el listado actual.

## Criterios de aceptación para implementación futura

- Paginación y filtro por estado utilizan únicamente parámetros disponibles, y distinguen vacío de fallo de carga.
- Alta válida muestra la cuenta pendiente y estado de entrega, sin afirmar acceso inmediato ni entrega en bandeja.
- Validación muestra campos corregibles cuando el backend los entrega; un conflicto conserva la edición y explica que requiere revisión.
- Editar no habilita modificación de rol/estado mediante campos extra; correo activo no se sustituye visualmente antes de confirmar.
- Tras respuesta incierta se reconcilia con la consulta autorizada antes de repetir la mutación.

## Fuentes backend consultadas

- [Cuentas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/cuentas.md) y [validación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/validacion-acceso.md).
- [Spec 001](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md) y [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/contracts/accounts.openapi.yaml); [spec 002](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/spec.md) y [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/contracts/validation.openapi.yaml).
- [Montaje y guardias ADMIN](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts), [router](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/accounts.routes.ts), [servicio](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/accounts.service.ts), [esquemas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.validation.ts) y [errores](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.errors.ts).

## Pendiente de confirmar

Tratamiento UX de persistencia confirmada pero entrega fallida, y detalles visuales/accesibilidad cuando se diseñe la UI. No hay directorio/búsqueda general de personal ni creación ordinaria ADMIN. Ver [ciclo de vida](ciclo-vida-roles.md) e [historial](auditoria.md) para acciones adicionales disponibles.
