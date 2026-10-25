# Recuperar acceso del personal

**Estado frontend:** solicitud y canje propuestos, no implementados. **Backend:** capacidad implementada; recuperación confirmada por el responsable en spec 003, Requirements/Assumptions. No se redacta otra política de recuperación aquí.

## Actores y capacidad API

Titular sin acceso que controla su correo vigente. ADMIN y TEACHER; nunca estudiantes.

- POST `/api/v1/auth/password-recovery/request`, `{ email }` → `202` con mensaje neutro para entradas institucionales válidas, independientemente de existencia/estado de cuenta.
- POST `/api/v1/auth/password-recovery/confirm`, `{ token, newPassword }` → `{ success: true }`.
- El mensaje usa `RESET_BASE_URL` del origen SPA. No hay ruta pública de inspección del token ni flujo de recuperación por administrador que sustituya el control del buzón.

## Recorrido de interfaz propuesto

1. Desde entrada de personal, abrir solicitud de recuperación y pedir correo.
2. Enviar; mostrar exactamente una confirmación neutra, sin afirmar que la cuenta existe o que el mensaje ya llegó.
3. Desde enlace de recuperación, solicitar nueva contraseña sin precargar datos de cuenta que la API no entrega. No canjear automáticamente al abrir el enlace.
4. Tras confirmación correcta, indicar cambio completado y necesidad de iniciar sesión nuevamente; retirar cualquier estado local de acceso anterior.
5. Ante enlace no utilizable, permitir volver a solicitar recuperación sin revelar el estado de la cuenta.

## Estados y errores observados

Solicitud inicial/enviando/confirmación neutra, enlace sin token, formulario de nueva contraseña, validación, cambio confirmado, enlace no utilizable e indisponibilidad.

- Solicitud: `400 INVALID_INPUT` por formato/dominio no válido; `503 UNAVAILABLE` ante fallos de infraestructura. Fallo de entrega SMTP se oculta para preservar neutralidad.
- Confirmación: `400 INVALID_INPUT`, `410 VERIFICATION_EXPIRED`, `503 UNAVAILABLE`.
- No afirmar que cualquier cadena obtiene `202`; el servicio valida correo institucional. Neutralidad no significa confirmación de entrega.

## Criterios de aceptación para implementación futura

- El mismo correo institucional válido produce el mismo texto público sin distinguir existencia o estado de cuenta.
- Una contraseña rechazada mantiene el recorrido corregible; no se anuncia consumo del token o cambio exitoso.
- Token inválido/vencido/usado muestra salida genérica para nueva solicitud, sin identificar cuentas.
- El cambio exitoso lleva al inicio de sesión, no autentica automáticamente; los accesos anteriores no se presentan como utilizables.
- No se registran tokens ni contraseñas en logs, telemetría o documentación.

## Fuentes backend consultadas

- [Autenticación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autenticacion.md) y [SMTP](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/correo-smtp.md).
- [Spec 003](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/spec.md), FR-009…012 y Assumptions; [contrato planificado](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/contracts/auth.openapi.yaml).
- [Montaje](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts), [router](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/recovery/recovery.routes.ts), [servicio](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/recovery/recovery.service.ts), [esquemas](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.validation.ts), [errores](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.errors.ts) y [env.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/config/env.ts).

## Pendiente de confirmar

URL concreta del frontend y recepción real por SMTP en el entorno piloto. El contraste formato/dominio frente al resumen del contrato está señalado en [inventario](../capabilities.md); no relajar validación ni cambiar respuesta API para ajustarla a una suposición UI. No se ha probado entrega ni canje de extremo a extremo en esta tarea.
