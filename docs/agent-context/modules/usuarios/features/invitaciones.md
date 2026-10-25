# Invitaciones: entrega y aceptación

**Estado frontend:** recorrido propuesto. **Backend:** emisión/aceptación implementadas; entrada desde correo requiere resolver la ambigüedad de URL indicada en pendientes. Reglas canónicas: spec 001 FR-004/015, Assumptions, y validación 002; no se redefinen aquí.

## Actores y capacidad API

- ADMIN invita desde POST `/api/v1/accounts` y consulta `deliveryStatus`/`invitationExpiresAt` mediante listado/detalle.
- Titular sin sesión acepta con POST `/api/v1/account-invitations/accept`, `{ token, password }` → `{ status: 'ACTIVA' }`.
- ADMIN puede reemitir una invitación pendiente mediante PATCH `/api/v1/accounts/:id` con su correo, incluso sin cambiarlo. No hay ruta dedicada `/resend`.
- No existe GET público de inspección del token ni respuesta que permita precargar nombre/correo del titular antes de canjearlo.

## Recorrido de interfaz propuesto

1. Tras alta, presentar estado pendiente y estado de entrega en gestión de cuentas; no confundir aceptación SMTP con activación.
2. Una acción explícita de reemisión desde cuenta pendiente informa que el enlace anterior dejará de servir; consultar el resultado y evitar envíos duplicados.
3. Titular llega desde un enlace de invitación ya identificado como tal, establece contraseña y confirma. No mostrar datos personales que no entrega la API.
4. Tras aceptación confirmada, indicar activación y ofrecer iniciar sesión; no tratar el token de invitación como credencial de sesión.

## Estados y errores observados

- Gestión: entrega `PENDIENTE`, `ENVIADA`, `ERROR`; vencimiento disponible. La ausencia de campos opcionales no demuestra envío exitoso.
- Aceptación: falta de token, enviando, activada, enlace no utilizable, validación de contraseña, conflicto e indisponibilidad.
- `400 INVALID_INPUT` con campos cuando corresponde; `409 ACCOUNT_CONFLICT`; `410 INVITATION_EXPIRED`; fallos de servicio `503`.
- Emisión: `503 DELIVERY_FAILED` o `DELIVERY_STATUS_UNKNOWN`; una cuenta/invitación puede existir aunque la mutación devuelva error. Consultar antes de repetir. Reemitir requiere autorización de gestión.

## Criterios de aceptación para implementación futura

- El estado «enviada» no se presenta como «recibida/leída» ni «cuenta activa».
- Una contraseña rechazada conserva el formulario sin exponer el token; no se promete consumo exitoso del enlace.
- Enlace inválido/vencido/usado muestra salida comprensible para contactar al administrador, sin activar cuenta.
- El éxito de aceptación no inicia sesión automáticamente.
- Reemisión usa solo el mecanismo comprobado para cuentas pendientes y advierte sobre el enlace previo.

## Fuentes backend consultadas

- [Cuentas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/cuentas.md) y [SMTP](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/correo-smtp.md).
- [Spec 001](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md) y [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/contracts/accounts.openapi.yaml); [contrato de validación 002](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/contracts/validation.openapi.yaml).
- [Montaje](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts), [router](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/invitations/invitations.routes.ts), [servicio](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/invitations/invitations.service.ts), [mailer](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/invitations/invitations.mailer.ts), [reemisión](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/email-changes/email-changes.service.ts) y [esquemas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.validation.ts).

## Pendiente de confirmar

`INVITATION_BASE_URL?token=…` se usa también para cambio de correo sin discriminador. Acordar con el responsable cómo distinguir el destino antes de implementar la entrada desde enlaces; no intentar ambos canjes para adivinar. SMTP real/URL pública requieren validación de extremo a extremo. La propuesta SMTP deja abierta la necesidad de reenvíos, pero el código ya permite reemitir invitaciones pendientes por edición; no extrapolarlo a confirmaciones de correo.
