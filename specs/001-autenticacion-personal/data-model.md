# Modelo de estado frontend: autenticación del personal

**Estado:** diseño Phase 1. Requiere la revisión backend corregida de
[backend-fixes.md](backend-fixes.md), especialmente para el éxito de cierre persistido.

Este es estado efímero del cliente, no un esquema de base de datos ni un duplicado
de las reglas de cuentas. Referencias: [spec](spec.md), [evidencia backend](sources.md).
No se crean entidades backend, migraciones ni persistencia de credenciales.

## Entidades y datos mínimos

| Entidad | Campos conceptuales | Validación y relación |
| --- | --- | --- |
| Identidad propia | `id`, `email`, `name`, `role` | Cadenas según contrato; `role` ADMIN o TEACHER. Solo procede de respuesta válida actual. `id` es identidad Better Auth, no cuenta de negocio |
| Vista de sesión | identidad; `session.id`, `session.expiresAt` | En comprobación exitosa se exige forma esperada y fecha válida. Fecha no equivale a última actividad; no se deriva contador ni permiso |
| Formulario | correo, contraseña mientras se edita/envía, errores de campos | Correo requerido con formato válido, contraseña no vacía. No aplicar política de alta ni restricción de dominio extra. Limpiar contraseña al terminar envío y al abandonar formulario; no copiarla a estado global |
| Operación de acceso | número de generación, identificador de operación, tipo, intención de cierre | Metadatos locales sin credenciales. Permiten aceptar únicamente resultados de la operación vigente. Intención de cierre se conserva durante su recuperación |
| Resultado de transporte | éxito validado, entrada inválida, credenciales inválidas, sin sesión, denegado, no confirmado | Unión discriminada de resultados, no excepción con cuerpo HTTP crudo. No incluye tokens ni contraseña |
| Aviso de operación denegada | mensaje genérico, señal de que exige comprobación | No concede ni persiste permisos. Se mantiene al confirmar sesión tras 403, para no ocultar el motivo de la operación denegada |

La contraseña vive solo en el formulario y en el envío explícito. No entra en snapshots
del controlador, historial, query strings, almacenamiento web, eventos ni diagnósticos.
La credencial de sesión no es un campo del modelo JavaScript.

## Estados de acceso

Representar con una unión discriminada, sin combinaciones independientes de booleanos
que permitan mostrar formulario y acceso autenticado a la vez.

| Estado | Datos permitidos | Controles visibles |
| --- | --- | --- |
| `checking` | contexto inicial/revalidación/reconciliación y generación | Mensaje de comprobación; sin formulario operativo ni datos de identidad |
| `signedOut` | motivo ausente/perdido/cerrado, mensaje genérico | Formulario de ingreso |
| `signingIn` | referencia de operación; formulario sin conservar copia global de contraseña | Progreso; sin envío duplicado |
| `authenticated` | identidad propia confirmada | Identidad y «Cerrar sesión»; sin dashboard ni enlaces a módulos |
| `checkUnavailable` | contexto a recuperar; mensaje, sin identidad | «Reintentar»; sin login operativo |
| `signingOut` | intención de cierre y operación | Progreso; sin identidad ni contenido protegido |
| `signOutUnconfirmed` | intención de cierre, sin identidad | «No pudimos confirmar el cierre» y reintento explícito |

El acceso ya no válido se representa como `signedOut` con motivo `lost`; no se añade
un diagnóstico de vencimiento/revocación. `FORBIDDEN` no es un estado global de sesión.

## Transiciones

| Origen y evento | Acción | Destino |
| --- | --- | --- |
| Montaje/recarga | consultar sesión una vez por recorrido efectivo | `checking` |
| Página oculta o pagehide | retirar identidad de snapshot y DOM, invalidar generación/esperas; conservar solo contexto de reconciliación e intención de cierre | `checking`, sin iniciar consultas en segundo plano |
| Visibilidad recuperada o pageshow, incluido persisted=true | deduplicar eventos de la misma activación y comprobar sesión antes de mostrar contenido | `checking` hasta respuesta vigente; reconciliación de cierre mantiene su intención |
| `checking` + sesión válida actual | validar forma de respuesta | `authenticated`, excepto reconciliación de cierre |
| `checking` + sin sesión | no inferir motivo si nunca hubo acceso confirmado | `signedOut` (`absent` o `lost` según contexto) |
| `checking` + fallo/red/respuesta inesperada | no restaurar identidad anterior | `checkUnavailable`, o `signOutUnconfirmed` si existe intención de cierre |
| `signedOut` + formulario inválido | error accesible, sin solicitud | `signedOut` |
| `signedOut` + envío válido | fijar exclusión de envío sin esperar otro render | `signingIn` |
| `signingIn` + éxito válido | limpiar contraseña y validar identidad | `authenticated` |
| `signingIn` + entrada/credenciales inválidas | limpiar contraseña; conservar correo corregible | `signedOut` con error apropiado |
| `signingIn` + resultado incierto | limpiar contraseña; no reenviar login | `checking` de reconciliación de ingreso |
| Reconciliación de ingreso válida/ausente/fallida | aplicar resultado de comprobación, nunca reenviar contraseña | `authenticated` / `signedOut` / `checkUnavailable` |
| `authenticated` + cierre | retirar identidad antes de esperar respuesta | `signingOut` |
| `signingOut` + éxito confirmado o sin sesión | borrar estado de identidad e intención | `signedOut` (`closed` o `lost`, según evidencia) |
| `signingOut` + fallo/respuesta desconocida | no afirmar que el cierre ocurrió | `signOutUnconfirmed` |
| `signOutUnconfirmed` + reintento manual | primero consultar sesión | `checking` de reconciliación de cierre |
| Reconciliación de cierre + sesión válida | no revelar identidad; repetir solo el cierre solicitado | `signingOut` |
| Reconciliación de cierre + sin sesión/fallo | confirmar salida o preservar intención | `signedOut` / `signOutUnconfirmed` |
| `checkUnavailable` + reintento manual | repetir solo comprobación, conservando contexto | `checking` |
| Sesión actual + 401 protegido | invalidar generación, retirar identidad/contenido | `signedOut` (`lost`) |
| Sesión actual + 403 protegido | bloquear resultado de operación y comprobar acceso | `checking`; con sesión válida, `authenticated` y aviso de operación denegada |
| Fallo de verificación de acceso protegido | no tratar como credencial incorrecta ni repetir mutación | `checkUnavailable`; reconciliación de efectos pertenece a feature propietaria |

## Invariantes y concurrencia

1. Solo `authenticated` contiene identidad renderizable; todo otro estado oculta contenido
   protegido. Una operación específica puede seguir denegada aunque la sesión sea válida.
2. Todas las operaciones de autenticación se coordinan en un único controlador por raíz;
   un bloqueo síncrono impide doble envío por Enter/clic antes del siguiente render.
3. Cada resultado lleva generación y operación de origen. Un resultado obsoleto no
   modifica estado ni genera cambios de foco o anuncios. Una denegación procedente de
   una generación anterior tampoco invalida una sesión nueva.
4. No se inicia otro login/cierre en paralelo al anterior. Abortar una espera no prueba
   cancelación servidor: una mutación incierta exige reconciliación, nunca éxito local.
   Ignorar una respuesta no deshace sus efectos ni las cookies procesadas por navegador.
5. Tras una mutación incierta, esperar terminación/cancelación de su transporte antes
   de reconciliar. Si no puede establecerse un estado actual, mantener acceso bloqueado.
   No afirmar que se eliminaron todas las posibles sesiones creadas por un intento perdido.
6. El montaje de desarrollo repetido y desmontaje deben limpiar suscripciones/esperas;
   no deben crear envíos de login automáticos. Los efectos iniciales de consulta son
   idempotentes respecto al estado y no mantienen artificialmente la sesión.
7. Una recarga siempre reconstruye acceso desde servidor; no restaura identidad,
   motivos de error ni destinos desde almacenamiento. No se promete detección instantánea
   entre pestañas; antes de volver a usar contenido tras recuperar visibilidad se revalida.
8. La suspensión por `pagehide` o visibilidad oculta retira la identidad del snapshot y
   del DOM de forma síncrona antes de conservar/restaurar la página. La presentación debe
   confirmar ese cambio visual sin esperar una respuesta de red. No guardar una copia
   renderizable anterior para «restaurarla» después ni perder intención de cierre incierto.
9. `pageshow` con `persisted=true` no depende de remontar React. Se integra con
   `visibilitychange` y montaje inicial para realizar una única comprobación por activación
   efectiva; se ignoran resultados de generaciones previas y se limpian listeners.
   No añadir `unload`/`beforeunload` para eludir bfcache ni polling de mantenimiento.

## Fuera del modelo

Sin `lastAcceptedAt`, temporizador exacto de inactividad, JWT, lista de permisos cliente,
destino de retorno, almacenamiento de sesión JavaScript ni estado de módulos académicos.
