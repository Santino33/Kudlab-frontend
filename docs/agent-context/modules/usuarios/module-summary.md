# Usuarios: alcance del frontend

## Propósito y estado

Preparar los recorridos del personal adulto ADMIN/TEACHER para las capacidades de Usuarios existentes. **Son descripciones para futura implementación, no pantallas ni integración disponibles en este frontend.** El estudiante no tiene login, credenciales ni sesión de usuario en este alcance.

La identidad, el ciclo de vida de cuentas, las políticas y los permisos pertenecen al backend. Empezar por [su resumen de Usuarios](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/module-summary.md), seguir [el orden de consulta](../../INDEX.md) y contrastar [el inventario](capabilities.md).

## Recorridos candidatos

| Feature frontend | Actor y ubicación sugerida, no diseño aprobado | Prioridad sugerida |
| --- | --- | --- |
| [Autenticación y sesión](features/autenticacion.md) | Personal; entrada y estado transversal de acceso | Base del acceso |
| [Cuentas](features/cuentas.md) | ADMIN; listado, detalle y formulario de gestión | Gestión básica |
| [Invitaciones](features/invitaciones.md) | ADMIN gestiona entrega; titular acepta enlace | Alta del personal |
| [Ciclo de vida y roles](features/ciclo-vida-roles.md) | ADMIN; acciones confirmadas en el detalle | Gestión básica |
| [Recuperación](features/recuperacion.md) | Titular; solicitud y canje de enlace sin sesión | Recuperación de acceso |
| [Cambio de correo](features/cambio-correo.md) | ADMIN inicia desde edición; titular confirma | Mantenimiento de identidad |
| [Solicitudes de rol](features/solicitudes-rol.md) | TEACHER solicita/consulta; ADMIN decide | Inclusión en piloto por confirmar |
| [Auditoría por cuenta](features/auditoria.md) | ADMIN; sección de solo lectura del detalle | Inclusión en piloto por confirmar |

Validación de perfil y autorización no requieren pantallas propias: forman parte de formularios y estados transversales. SMTP es integración operativa, bootstrap es administración del backend y Swagger es documentación para desarrolladores; no son nuevas pantallas del producto.

## Convenciones de experiencia futura

- Distinguir carga, vacío, operación pendiente, éxito confirmado, validación, conflicto, acceso denegado e indisponibilidad. No mostrar éxito anticipado para cambios de identidad, rol o estado.
- Cancelar una confirmación no envía una mutación. Después de un conflicto volver a consultar el estado permitido, sin sobrescribir silenciosamente.
- Un error de entrega no implica rollback del alta o solicitud ya persistida: consultar antes de repetir. Ver [discrepancias](capabilities.md#discrepancias-y-confirmaciones).
- No confundir ID de identidad Better Auth con ID de cuenta de negocio. La sesión devuelve identidad; las rutas de cuentas y solicitudes utilizan sus identificadores de negocio. No asumir igualdad.
- No inventar navegación destino para TEACHER hacia módulos que todavía no tienen API en este alcance.
- Aplicar skills de diseño solo al implementar/diseñar UI, conforme a [AGENTS.md](../../../../AGENTS.md).

## Límites

No hay gestión de estudiantes/grupos, consentimiento, tareas, indicadores ni seguimiento. No hay registro público, acceso Google, exportación de auditoría o panel global de actividad. La lista de capacidades no equivale a un compromiso de todas para el piloto.
