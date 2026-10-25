# Consultar historial de gestión por cuenta

**Estado frontend:** sección propuesta de detalle, inclusión piloto por confirmar. **Backend:** consulta implementada. No es panel global ni garantía de inmutabilidad técnica verificada aquí.

## Actor y capacidad API

ADMIN activo consulta GET `/api/v1/accounts/:id/audit`. Devuelve un array de eventos ordenados por fecha ascendente con actor, cuenta objetivo, acción, momento y snapshots opcionales `before`/`after`. La ruta comprueba que la cuenta existe y aplica guardias de gestión.

No devuelve nombres resueltos de actores; `actorId` puede ser identidad de autenticación o actor de sistema, no un ID de cuenta intercambiable. No hay endpoint general de resolución de actores por ese identificador. Consultar spec 001 FR-013/018 y Assumptions; no volver a definir retención o políticas de auditoría en frontend.

## Recorrido de interfaz propuesto

1. Desde detalle autorizado, abrir sección de historial de esa cuenta.
2. Mostrar carga; después eventos cronológicos o mensaje vacío, sin confundir vacío con ausencia de permiso.
3. Presentar acción, fecha y actor con la información efectivamente disponible; mostrar cambios solo si hay snapshots. Etiquetas legibles son propuesta de presentación, no una lista nueva de eventos del backend.
4. Ante error permitir reconsulta de solo lectura, sin inventar edición, borrado, exportación o paginación.

## Estados y errores observados

Cargando, sin eventos, eventos disponibles, acceso denegado, cuenta no encontrada e indisponibilidad. `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `503 UNAVAILABLE`. No hay resultados de otras cuentas ni credenciales/tokens en la presentación prevista. El servicio no implementa filtros o paginación del historial.

## Criterios de aceptación para implementación futura

- Solo se consulta la cuenta seleccionada mediante una sesión autorizada; un error no muestra datos previos de otra cuenta.
- Eventos se muestran en el orden recibido con campos opcionales tratados como ausentes, no inventados.
- No se presenta `actorId` como correo/nombre ni se usa como ID de cuenta para consultas arbitrarias.
- No hay controles de edición/borrado/exportación ni afirmaciones de auditoría global inmutable.
- Vacío, no encontrado, denegado y fallo de servicio tienen estados diferenciados.

## Fuentes backend consultadas

- [Cuentas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/cuentas.md), [decisiones](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/decisions.md) y [pendientes](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/unresolved-issues.md), especialmente ADR-04/D-07.
- [Spec 001](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md) y [contrato de auditoría por cuenta](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/contracts/accounts.openapi.yaml).
- [Montaje](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts), [router de cuentas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/accounts.routes.ts), [servicio de auditoría](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/audit.service.ts) y [guardias](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-guard.ts).

## Pendiente de confirmar

Necesidad y presentación en piloto, etiquetas y tratamiento legible de actores de sistema. La garantía técnica append-only y política institucional de conservación no se verificaron en esta tarea: el diseño y una consulta de eventos no bastan para declararlas. No pedir endpoints nuevos ni duplicar reglas para resolverlo sin aprobación.
