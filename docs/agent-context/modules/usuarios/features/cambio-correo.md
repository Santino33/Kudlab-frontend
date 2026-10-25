# Solicitar y confirmar un cambio de correo

**Estado frontend:** recorrido propuesto. **Backend:** solicitud/confirmación implementadas; el destino del enlace requiere confirmación antes de UI. Las reglas se reutilizan por referencia a specs 001/002 y contrato de cuentas, no se duplican.

## Actores y capacidad API

- ADMIN inicia cambio desde PATCH `/api/v1/accounts/:id`, con `email` y opcionalmente `name`.
- Cuenta activa: consulta devuelve `pendingEmail` mientras el correo vigente permanece; el titular confirma sin sesión con POST `/api/v1/account-email-changes/confirm`, `{ token }` → `{ verified: true }`.
- Cuenta pendiente: el cambio pertenece al flujo de [invitación](invitaciones.md), no a confirmación de correo de cuenta activa.
- No existe endpoint de autoservicio para docente ni endpoint dedicado de reenvío de esta confirmación.

## Recorrido de interfaz propuesto

1. ADMIN abre edición de una cuenta y envía correo nuevo. La UI distingue nombre actualizado de correo pendiente de verificar.
2. Consultar detalle para mostrar por separado correo vigente y pendiente; no permitir acceder con el pendiente por una afirmación frontend.
3. Titular llega desde enlace identificado como confirmación de correo y confirma explícitamente. No canjear enlaces al renderizar ni intentar clasificarlos ejecutando mutaciones.
4. Tras éxito, mostrar confirmación e indicar nuevo inicio de sesión; las sesiones anteriores se revocan por el backend.
5. Un error de entrega requiere revisar el estado persistido; no mostrar «ningún cambio guardado» ni ofrecer reenvío genérico inexistente.

## Estados y errores observados

Edición/enviando, correo pendiente, confirmación en curso, verificado, enlace no utilizable, conflicto e indisponibilidad.

- Solicitud: errores de edición `400`, `401`, `403`, `404`, `409 CONFLICT` (incluido correo sin cambios en cuenta activa o reservado), `503 DELIVERY_FAILED`/`UNAVAILABLE`.
- Confirmación: `400 INVALID_INPUT`, `409 CONFLICT`, `410 TOKEN_EXPIRED`, `503 UNAVAILABLE`.
- La solicitud puede estar persistida aunque falle SMTP; confirmar token no implica que el titular ya tenga sesión autenticada.

## Criterios de aceptación para implementación futura

- Correo actual y pendiente son visualmente distinguibles sin anunciar cambio completado antes de verificar.
- El flujo de cuenta pendiente redirige conceptualmente a invitación, no presenta un resultado de verificación activa inexistente.
- Confirmación válida muestra éxito y exige acceso nuevo; token inválido/usado/vencido no modifica visualmente la identidad.
- Duplicidad, correo sin cambios y fallas de entrega no se convierten en éxitos ni en reintentos ciegos.
- No se ofrece al TEACHER una edición propia que estas rutas no autorizan.

## Fuentes backend consultadas

- [Cuentas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/cuentas.md), [validación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/validacion-acceso.md) y [SMTP](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/correo-smtp.md).
- [Spec 001](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md) y [contrato de cuentas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/contracts/accounts.openapi.yaml); [spec 002](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/spec.md), FR-004 y Assumptions, y [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/contracts/validation.openapi.yaml).
- [Montaje](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts), [edición](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/accounts/accounts.service.ts), [router de confirmación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/email-changes/email-changes.routes.ts), [servicio](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/email-changes/email-changes.service.ts) y [env.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/config/env.ts).

## Pendiente de confirmar

La URL de correo es actualmente la misma `INVITATION_BASE_URL?token=…` que aceptación de invitaciones, sin tipo de operación. Acordar diferenciación de navegación con el responsable, sin inventar parámetros que el backend no envía. También confirmar recuperación ante verificación no recibida y validación SMTP piloto. La descripción de correo es propuesta operativa; no prueba recepción real.
