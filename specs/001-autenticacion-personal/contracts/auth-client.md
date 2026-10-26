# Contrato técnico del cliente de autenticación

Diseño frontend para [spec](../spec.md); reutiliza el catálogo canónico backend
`docs/api/openapi.yaml`, no crea una segunda definición OpenAPI ni endpoints nuevos.
La evidencia de las correcciones P-01/P-02 se registra en
[backend-fixes.md](../backend-fixes.md). Es un contrato previsto, no código implementado.

## Transporte y despliegue

- Cookie de sesión HttpOnly gestionada exclusivamente por navegador; no leer cookies,
  `set-auth-token`, JWT ni añadir `Authorization` desde este cliente.
- `fetch` con URL relativa fija `/api/auth/...`, `credentials: 'same-origin'`,
  `cache: 'no-store'`, `redirect: 'error'`, `Accept: application/json` y señal de cancelación.
  JSON Content-Type solo para el envío de login; logout no necesita cuerpo.
- Producción: un único origen HTTPS para SPA y API mediante proxy; conservar Host,
  Origin y cabeceras Set-Cookie separadas, no cachear autenticación ni contenido protegido.
  Configurar backend `BETTER_AUTH_URL` y `SPA_ORIGIN` con el origen público autorizado.
  No eliminar Secure/HttpOnly/SameSite ni activar CORS wildcard para resolver despliegue.
- Desarrollo: proxy Vite solo para `/api` hacia `http://localhost:3000`, sin reescribir
  Origin. SPA en localhost:5173, backend con ese SPA_ORIGIN; no mezclar localhost/127.0.0.1.
  La excepción HTTP local no se traslada a producción. El destino es configuración local
  no secreta de Vite; no se necesitan variables VITE de credenciales ni URL API en el cliente.
- Fuera de alcance: configurar proveedor/infraestructura de producción, proxy real,
  cambio de transporte cross-origin, service worker o gestión de sesiones de otras pestañas.

## Operaciones y normalización

| Operación | Solicitud | Éxito validado | Resultados negativos conocidos |
| --- | --- | --- | --- |
| `signIn` | POST `/api/auth/sign-in/email`, solo `{email,password}` | 200 con `user` válida | 400 INVALID_INPUT, 401 INVALID_CREDENTIALS, 503 UNAVAILABLE |
| `getSession` | GET `/api/auth/get-session` | 200 con identidad válida y session.id/expiresAt | 401 UNAUTHENTICATED, 503 UNAVAILABLE |
| `signOut` | POST `/api/auth/sign-out`, sin cuerpo | 200 con success exactamente true | 401 UNAUTHENTICATED; 403/429/503 y otros errores del proveedor como cierre no confirmado |

`rememberMe` ya figura en OpenAPI actual, pero se omite por decisión expresa Q3, no
por falta de documentación. Omitirlo no promete que la cookie desaparezca al cerrar navegador.

En éxito, reconstruir únicamente campos conocidos: identidad con id/email/name como
cadenas y role ADMIN/TEACHER; sesión con id y fecha expiresAt válida. No copiar otros
campos o cuerpos de respuesta a estado/errores. Validación pequeña con type guards,
sin añadir dependencia de esquemas. No inferir inactividad exacta de expiresAt.

En errores, cotejar status y código conocido por operación. No renderizar mensajes
arbitrarios del servidor ni tratar un 401 de login como pérdida global de sesión.
Una respuesta incompleta, redirección, JSON inválido, tipo inesperado, estado desconocido,
aborto o timeout se normaliza a `unconfirmed`, sin cuerpo/cabeceras originales.

Solo el controlador decide las transiciones de [data-model](../data-model.md): login
incierto consulta sesión antes de otro envío; cierre incierto espera reintento manual,
consulta primero y vuelve a cerrar solo si sigue vigente. No reintenta automáticamente
mutaciones. 403/429 de auth no se confunden con 403 de una operación de negocio.

## Renovación y revocación

- No pedir tokens ni hacer polling. El navegador aplica Set-Cookie de respuestas de
  sesión/guardas; que pueda renovarse la cookie no reinicia el reloj protegido.
- Una sesión que alcanza 30 minutos sin solicitud protegida aceptada sigue siendo
  rechazada incluso si hay cookie o expiración interna renovada.
- Logout 200 depende de la corrección backend: eliminación persistida confirmada tras
  los controles del proveedor. Si no puede confirmarla, 503 sin publicar éxito/cookies
  de cierre. Conservar el estado incierto del frontend hasta reconciliar.
- El cliente no intenta verificar revocación reutilizando tokens: esa garantía y sus
  pruebas pertenecen al backend corregido.

## Inyección, concurrencia y límite de espera

- Construir el cliente con una función fetch inyectable para tests sin red.
- Un controlador por raíz, generación y operación vigentes; exclusión síncrona de login
  y cierre antes del siguiente render. No exportar estado de contraseña desde controlador.
- Usar AbortController y una espera técnica inicial de 15 segundos, con reloj inyectable
  para pruebas. Es un límite de espera, no SLA ni garantía de que el servidor canceló.
  Cancelar temporizadores y suscripciones al finalizar/desmontar.
- Tras aborto, esperar asentamiento de la operación de transporte antes de reconciliar;
  la cancelación no prueba ausencia de efectos. No permitir otro login concurrente mientras
  la sesión siga sin comprobar. Una respuesta obsoleta no cambia estado, foco ni anuncios.
- La interfaz transversal de denegaciones recibe generación y categoría, sin request
  original, contraseñas ni contenido de negocio. No ejecuta endpoints de negocio para
  inventar pantallas o mantener actividad.
- Suspender al ocultar/abandonar: retirar identidad del snapshot/DOM e invalidar esperas.
  Al restaurar historial/bfcache, comprobar antes de renderizar identidad, sin asumir
  remontaje; deduplicar pageshow/visibilitychange y preservar contexto de cierre.
- La validación de navegador inyecta un fetch manual sin fallback al real desde una
  entrada tests/browser separada; no modifica el transporte por defecto ni añade flags,
  globals, endpoints o controles de depuración en producción. Ver receta en quickstart.

## Evidencia esperada

Pruebas deterministas de parser, status/código, URL/método/body/credenciales, rechazo
de redirecciones, secretos ausentes, timeout, diez envíos repetidos, respuestas fuera
de orden, reconciliación y 401/403. El navegador verifica cookies y accesibilidad en
los recorridos de [quickstart](../quickstart.md); no confundir tipos con ejecución funcional.
