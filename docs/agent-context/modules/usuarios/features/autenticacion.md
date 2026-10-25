# Autenticación y estado de sesión del personal

**Estado frontend:** recorrido propuesto, sin implementación. **Backend:** capacidad implementada por lectura estática; reglas de actividad/recuperación confirmadas en spec 003, no RF V3 aprobado. Ver [inventario](../capabilities.md).

## Actores y alcance UI

ADMIN y TEACHER con cuenta habilitada. Entrada con correo/contraseña, consulta de acceso y cierre; sesión vencida/denegación como estados transversales. No incluye estudiantes, Google, registro público ni destinos académicos ficticios.

## Capacidad API

- POST `/api/auth/sign-in/email`: `{ email, password }`; éxito devuelve identidad con rol vigente y credencial de sesión mediante Better Auth.
- GET `/api/auth/get-session`: identidad y sesión válidas; no renueva actividad protegida.
- POST `/api/auth/sign-out`: cierra la sesión presentada.
- Las rutas protegidas verifican sesión persistida, cuenta y rol vigentes; un JWT aislado no basta. No se necesita interfaz para `/token` o `/jwks`.

No se repite la política de sesión: consultar spec 003 FR-001…008 y Assumptions. El transporte SPA y su despliegue se deben confirmar antes de integrar.

## Recorrido de interfaz propuesto

1. Entrada muestra campos de correo y contraseña y acceso a recuperación, sin selectores de rol o estudiante.
2. Enviar una vez, mostrar progreso y no revelar contraseña en mensajes o logs.
3. Tras respuesta válida, mostrar estado de acceso conforme al rol actual; el destino concreto requiere una feature aprobada. No asumir que TEACHER tiene un panel académico disponible.
4. Si una operación exige nuevo acceso, retirar datos protegidos y ofrecer autenticarse de nuevo. No mantener privilegios por rol cacheado.
5. Cierre explícito: reflejar éxito solo cuando se confirme; ante sesión ya inválida tratar el estado como sin acceso. Un fallo de red no demuestra que el cierre servidor se completó.

## Estados y errores observados

- Inicial, enviando, sesión válida, sin sesión, cierre pendiente.
- Login: `400 INVALID_INPUT`, `401 INVALID_CREDENTIALS` uniforme por credenciales/cuenta no elegible, `503 UNAVAILABLE`.
- Consulta/cierre: `401 UNAUTHENTICATED`, `503 UNAVAILABLE`. Operaciones protegidas pueden devolver `403 FORBIDDEN` por rol/estado.
- No mostrar «correo no registrado» ni distinguir cuenta pendiente/inactiva mediante el error público. No conceder acceso ante indisponibilidad.

## Criterios de aceptación para implementación futura

- Una respuesta válida habilita únicamente el recorrido autorizado; respuestas fallidas no muestran información protegida.
- Errores de credenciales presentan el mismo mensaje sin enumerar cuentas; errores de red no se confunden con contraseña errónea.
- La sesión vencida o revocada obliga a identificarse de nuevo; consultar sesión o mover el mouse no se presenta como actividad que prolonga el acceso.
- Cerrar una sesión no se describe como cierre de todas las sesiones.
- Ningún JWT, rol de formulario ni dato local se utiliza para saltar la autorización servidor.

## Fuentes backend consultadas

- [Descripción de autenticación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autenticacion.md) y [autorización](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autorizacion.md): antecedentes V3 propuestos.
- [Spec 003](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/spec.md), Requirements/Assumptions, y [contrato planificado](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/contracts/auth.openapi.yaml).
- [src/app.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts): lista blanca y respuestas; [auth.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/auth.ts), [active-identity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/active-identity.ts), [session-activity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-activity.ts) y [session-guard.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-guard.ts).

## Pendiente de confirmar

Cookie frente a token opaco, despliegue/orígenes, navegación tras login y UX de expiración. No agregar «recordarme» por el mero hecho de que el código acepte `rememberMe`, ausente del contrato. `expiresAt` no permite calcular por sí solo el reloj de última actividad aceptada. No hay pruebas de autenticación ejecutadas en esta tarea.
