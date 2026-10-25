# Solicitar y decidir ascenso a administrador

**Estado frontend:** candidato documentado; inclusión en piloto por confirmar. **Backend:** implementado, con decisiones expresas registradas en spec 001. No es asignación libre de roles ni aprobación automática.

## Actores y capacidad API

- TEACHER activo: POST `/api/v1/admin-role-requests` crea solicitud propia; GET de la misma ruta devuelve las propias.
- ADMIN activo: GET devuelve solicitudes pendientes; POST `/api/v1/admin-role-requests/:id/approve` o `/reject` decide según elegibilidad del servidor.
- No se envía un ID de solicitante elegido por el cliente al crear. Los resultados contienen `requesterAccountId`, estado y fechas/decisor cuando corresponde, no nombre/correo del solicitante.

Reutilizar spec 001 FR-007/013/017/019 y Assumptions para reglas de rol, decisión y auditoría; no reimplementarlas como autoridad frontend.

## Recorrido de interfaz propuesto

1. TEACHER accede a una acción de solicitar ascenso y consulta su estado. Mostrar solicitud pendiente sin habilitar controles administrativos.
2. ADMIN abre una sección de solicitudes pendientes; distingue carga/vacío de error. Para identificar a la persona puede consultar detalle de cuenta, autorizado para ADMIN; no asumir que el listado ya trae nombre.
3. Proponer confirmación UI antes de decidir, enviar una vez y mostrar el resultado confirmado; no inventar cuerpo con justificación o comentario que la API no acepta.
4. Tras decisión, actualizar lista pendiente. No prometer historial completo de decisiones a ADMIN mediante este GET, que solo devuelve pendientes.
5. El docente aprobado revalida permisos mediante la sesión/solicitudes del servidor, no por anticipación local al ver «solicitado».

## Estados y errores observados

Vacío, cargando, solicitud enviándose, `PENDIENTE`, `APROBADA`, `RECHAZADA`, decisión pendiente, acceso denegado, conflicto e indisponibilidad.

`401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND` al decidir, `409 CONFLICT` por duplicidad/decisión previa/elegibilidad y `503 UNAVAILABLE`. La API no publica cancelación de solicitud, filtrado arbitrario, paginación ni campo de motivo. Tras conflicto consultar estado accesible en vez de repetir aprobación.

## Criterios de aceptación para implementación futura

- TEACHER solo consulta/solicita en su propio contexto y nunca decide o gana controles ADMIN por una solicitud pendiente.
- ADMIN ve pendientes reales y no una lista fabricada de todo el historial; nombres se obtienen solo por capacidad autorizada.
- Una decisión ya resuelta o un solicitante no elegible genera tratamiento de conflicto sin éxito anticipado.
- El formulario no ofrece justificación, ascenso directo o autoaprobación como capacidades actuales.
- Aprobar/rechazar actualiza el estado mostrado solo al confirmar la API, respetando permisos vigentes.

## Fuentes backend consultadas

- [Cuentas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/cuentas.md) y [autorización](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autorizacion.md).
- [Spec 001](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md) y [contrato de cuentas/ascensos](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/contracts/accounts.openapi.yaml).
- [Montaje](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts), [router](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/promotion-requests/promotion-requests.routes.ts), [servicio](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/promotion-requests/promotion-requests.service.ts), [consulta de cuenta](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/accounts.service.ts) y [guardias](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-guard.ts).

## Pendiente de confirmar

Necesidad de este recorrido para el piloto y ubicación en la navegación. Se puede documentar por capacidad actual sin aprobar pantalla propia, notificaciones o un gestor general de roles. No se incorporan permisos académicos por aprobación de esta feature.
