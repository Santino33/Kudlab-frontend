# Contrato de interacción frontend

**Estado:** diseño Phase 1, complementado por [auth-client.md](auth-client.md).
La garantía de cierre requiere las correcciones verificadas en
[backend-fixes.md](../backend-fixes.md), no el backend principal sin actualizar.

Consumidor: personal profesor con rol técnico ADMIN/TEACHER. La aprobación funcional
procede de Q1–Q3 en [spec](../spec.md). Este contrato describe interfaces previstas;
no demuestra que existan componentes o una integración en ejecución.

## Superficie única

- La raíz de la SPA presenta el estado de acceso de [data-model](../data-model.md).
- Sin router: ningún flujo requiere nueva URL. No se conserva destino previo ni se crean
  enlaces a recuperación, dashboard o módulos. El historial no concede acceso.
- Contenido autenticado mínimo: nombre/correo y rol propio como información, más
  «Cerrar sesión». El rol no habilita por sí mismo llamadas ni añade públicos al producto.
- No se diseña en este plan composición gráfica, paleta, tipografía ni componentes
  de una biblioteca visual. Antes de implementación visual, revisar instrucciones y
  skills disponibles; no adoptar demos como decisiones del producto.

## Formulario de acceso

| Control | Contrato |
| --- | --- |
| Correo | Etiqueta visible «Correo», nombre estable `email`, tipo email, autocompletado `username`, requerido; sin imponer dominio adicional |
| Contraseña | Etiqueta visible «Contraseña», nombre estable `password`, tipo password, autocompletado `current-password`, requerida; permitir pegar y gestores |
| Enviar | Botón submit «Iniciar sesión»; Enter produce el mismo intento. Deshabilitar envíos durante operación, con exclusión síncrona adicional |
| Mensajes | Validación por campo cuando se conoce; rechazo general de entrada cuando no hay detalle; credenciales siempre «Credenciales inválidas» |

No registrar formularios en analytics, consola ni capturas de errores. No copiar
contraseña a atributos, rutas o mensajes. No hay checkbox «Recordarme» ni controles
de cuenta de estudiante, registro público, Google, MFA o recuperación.

## Semántica accesible y foco

- Usar formulario, etiquetas asociadas, encabezado principal y botones nativos.
- Errores asociados mediante descripción e invalidez; resumen anunciado cuando sea general.
- Anunciar progreso en región de estado; errores en región de alerta, sin repetir anuncios
  por cada render. No convertir todo el contenido en live region.
- Foco visible y orden lógico; sin trampas. Tras validación, primer campo inválido;
  tras error general, resumen; tras transición de recorrido, encabezado o mensaje principal.
- Una respuesta obsoleta no roba foco. Mantener la referencia de foco solo para transiciones
  efectivas; no moverlo al recibir datos mientras el usuario está escribiendo otro intento.
- Ante pagehide/visibilidad oculta, retirar identidad tanto del snapshot como del DOM
  de forma síncrona antes de conservar la página; al restaurar por pageshow/bfcache no
  se exige remontaje React. Mantener checking hasta comprobación vigente, deduplicando
  la activación con visibilitychange y conservando intención de cierre. No anunciar
  acceso ni mover foco por resultados de una generación anterior.
- Al enviar, no deshabilitar campos de forma que impida autocompletado o acceso al mensaje;
  la protección contra doble envío pertenece también al controlador, no solo al botón.

## Acciones y resultados observables

| Acción | Estado/resultado |
| --- | --- |
| Entrar/recargar | «Comprobando acceso» antes de formulario o identidad |
| Comprobación no disponible | «No pudimos comprobar tu acceso» y «Reintentar» manual; no login operativo |
| Ingreso no confirmado | Mensaje «No pudimos confirmar el inicio de sesión» y reconciliación sin reenviar contraseña |
| Acceso previo invalidado | «Tu sesión ya no es válida. Inicia sesión de nuevo»; no diagnosticar vencimiento/revocación |
| Cerrar | «Cerrando sesión», ocultar identidad inmediatamente |
| Cierre no confirmado | «No pudimos confirmar el cierre» y «Reintentar» manual; comprobar sesión antes de repetir cierre |
| 403 de operación | «No tienes acceso a esta operación»; comprobar sesión sin repetir operación ni atribuirlo automáticamente a vencimiento |

## Interfaz transversal prevista

El módulo de acceso expone a futuras features una notificación tipada de denegación
con la generación de acceso de la petición original y su clasificación (401, 403 o
verificación indisponible). No recibe ni registra el cuerpo de la petición original.
Una notificación obsoleta se ignora; una actual aplica las transiciones del modelo.
Las features propietarias retiran resultados protegidos e impiden mostrarlos al perder
autorización. Este plan implementará el punto de integración y sus pruebas, no llamadas
de negocio ni pantallas de otros módulos para ejercitarlo.

## Comprobaciones de aceptación

- US1/FR-003,004,005,011,012,013: campos accesibles, mensajes, teclado, doble envío y secretos.
- US2/FR-002,009,010,014: comprobación inicial, recarga sin identidad local ni contador.
- US3/FR-007,015: cierre individual, incertidumbre y reintento explícito.
- US4/FR-008,009: 401/403/fallo diferenciados, sin reproducción de mutaciones.
- La revisión visual y con lector de pantalla es futura y no se sustituye por typecheck.

La receta de fixtures de navegador está en [quickstart](../quickstart.md): entrada
separada `tests/browser/auth-harness.html`, AuthRoot real con transporte inyectado y
controles sintéticos solo de prueba. No hooks globals, nuevas rutas backend ni cambios
de seguridad. No forma parte del build de producción.
