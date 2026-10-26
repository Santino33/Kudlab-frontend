# Contrato de interfaz — Usuarios

Contrato de comportamiento futuro, no implementación ni maqueta gráfica. Deriva de [spec.md](../spec.md), [modelo](../data-model.md) y [consumo permitido](api-consumption.md). Español para profesores, roles ADMIN/TEACHER sin nuevos públicos.

## Navegación de alcance finito

Rutas frontend de diseño, no rutas backend. Links nativos producen carga de página; App resuelve pathname y consulta sesión antes de mostrar destinos protegidos. No instalar router ni implementar uno genérico. Ruta desconocida presenta destino no disponible y acceso/inicio autorizado, sin abrir módulos de relleno.

| Ruta frontend | Acceso | Contenido/efecto |
| --- | --- | --- |
| `/` | Entrada | Sin token: resolver sesión y ofrecer acceso o destino por rol. Con token query fuera de recuperación: estado de enlace bloqueado sin canje |
| `/acceso` | Público | Correo/contraseña, recuperación, envío único y mensaje uniforme. Sin selector de rol, signup, Google o «recordarme» |
| `/sesion` | Sesión vigente | TEACHER: solo estado de acceso y cerrar sesión. ADMIN puede ir a gestión autorizada, sin sección académica |
| `/usuarios` | ADMIN | Listado, filtro por estado, paginación, invitación y enlaces de detalle |
| `/usuarios/nueva` | ADMIN | Nombre/correo, explicación de cuenta pendiente y bloqueo actual de aceptación; no contraseña ni selector ADMIN |
| `/usuarios/:id` | ADMIN | Datos confirmados, entrega/vencimiento si existen, edición, reemisión pendiente, inactivación/reducción cuando corresponden; sin historial/reactivación/ascensos |
| `/usuarios/:id/editar` | ADMIN | Nombre y/o correo. Correo vigente/pendiente separados y advertencia de confirmación actualmente bloqueada |
| `/recuperar-acceso` | Público | Solicitud de correo y respuesta neutra; volver al acceso |
| `/recuperar-acceso/confirmar` | Público, ruta aprobada | Capturar token query en memoria y limpiar URL; formulario explícito de contraseña o enlace no utilizable; nunca canjear al montar |

No definir ruta de aceptación de invitación ni confirmación de correo como funcional. Si llega un token fuera del destino exacto de recuperación, mostrar bloqueo genérico, sin datos del titular ni selección de trámite y sin llamadas de clasificación/canje. La URL real futura de invitación/correo debe acordarse antes de habilitarlos; no inventarla para configurar backend ahora.

Al arrancar confirmación de recuperación: retirar query antes de cargar recursos/telemetría controlables por aplicación; no enviar token a consulta de sesión o herramientas. Sin token no enviar canje. La página inicial/hosting deben aplicar política de referrer y redacción de query sensible; JavaScript no puede borrar logs previos. Recarga sin token permite nueva solicitud, no recuperar secreto de almacenamiento.

## Formularios y estados

- Etiquetas persistentes y `autocomplete` coherente: correo/usuario, contraseña actual o nueva según trámite; permitir pegar y gestores de contraseñas.
- Usar estado React local; no biblioteca de formularios por anticipación. Validación de formato según contrato vigente y mensajes de campo devueltos; reglas de autorización/unicidad/último ADMIN siguen servidor.
- Mantener borrador no secreto ante error corregible dentro del formulario; no prometer preservarlo al navegar, recargar, cerrar o perder permiso. Nunca persistir contraseñas o tokens.
- Estado de envío con texto explícito («Ingresando…», «Guardando…»), un envío en curso por acción; no desactivar toda navegación arbitrariamente ni perder nombre accesible/foco. No éxito optimista.
- Vacío no equivale a error. Mostrar rechazo, no encontrado, denegación, enlace no utilizable e incertidumbre con textos diferenciados y salida permitida.
- En edición solo de nombre, enviar solo nombre; no disparar cambio/reemisión de correo de forma accidental. Cambiar correo o reemitir se explica como efecto separado.
- Estado `ENVIADA` se describe como envío aceptado, no mensaje recibido/leído; campos ausentes siguen desconocidos. Confirmación de correo no tiene estado propio de entrega publicado: no inventarlo a partir de invitación.

## Acciones confirmadas

| Acción | Confirmación y cancelación | Resultado |
| --- | --- | --- |
| Reemitir invitación pendiente | Advertir invalidación del enlace anterior y que el canje público sigue bloqueado. Cancelar no llama API | Consultar entrega disponible; no activar ni prometer recepción |
| Inactivar | Cuenta objetivo y consecuencia de pérdida de acceso, incluida propia cuenta cuando corresponda. Confirmación explícita, cancelar no muta | Mostrar estado confirmado y revisar acceso actor; conflicto último ADMIN no se elude |
| Reducir ADMIN a TEACHER | Explicar retiro de gestión, especialmente propia cuenta. Confirmación UI sin agregar campos API | Aplicar rol confirmado y revalidar acceso; TEACHER solo estado/cierre |

No construir gestor genérico de acciones/roles. Reutilizar patrón de confirmación adaptado al sistema aprobado. Confirmaciones en Base UI deben mantener foco seguro en cancelación, fondo inerte, título/descripción, teclado contenido y retorno al disparador si existe; durante envío no cancelar la escritura con un cierre que prometa rollback. Cierre de sesión usa acción explícita; un error no presenta una revocación garantizada.

## Sistema visual y accesibilidad

Aplicar `docs/design/agent-design-manual.md`; componentes shadcn/ui Base UI con Lucide, no primitivas Radix de los ejemplos MCP. No hay catálogo local instalado. Incorporación de los mínimos necesarios se hará en tarea autorizada después de consultas oficiales y revisión de diff/paquetes.

- Primary `#53C0F3`, hover Secondary `#4DABD7`, texto/borde/foco Dark 1 `#1C2E57`, fondo disabled `#F2F2F2`. Texto de acción sobre Primary/Secondary siempre Dark 1, no blanco.
- Fallback neutral aprobado en planificación: Dark 1/blanco con título/texto explícitos e icono con etiqueta cuando aporte información. Error/Warning/Info/Success siguen sin colores asignados; no crear rojo destructivo, badge de color ni alias semántico a Primary.
- Tipografía sistema y geometría del manual: cuerpo/control 1rem, mínimos de control 44px, foco visible 2px con separación, radios 8/12px y escala de espacios existente en documentación. Sin nuevos temas, fuentes descargadas, charts, motion library o gestos obligatorios.
- Links semánticos para navegar; botones para mutar. La documentación oficial Base UI advierte que `Button` renderizado como enlace conserva role button: usar enlace nativo con estilo compartido cuando deba ser link.
- Encabezados/tabla semánticos, etiquetas y errores asociados, resumen de errores si varios, anuncios de progreso/resultado sin depender de color ni toast transitorio. Iconos decorativos ocultos a ayudas técnicas.
- Verificar teclado, lector de pantalla, foco al cambiar destino/abrir/cerrar confirmación, zoom 200/400 %, reflujo y anchos 320/390/768/1024/1440 como pruebas, no dispositivos aprobados. Respetar movimiento reducido.

## Condiciones observables de aceptación

1. TEACHER accede a `/sesion` y no ve cuentas, perfil editable, ascensos o módulos académicos. Entradas directas ADMIN no muestran datos ni envían mutaciones.
2. ADMIN ve solo operaciones allowlist y estados actuales; cancelar cualquier confirmación no envía solicitud.
3. Cambiar cuenta/filtro mientras carga no muestra una respuesta vieja como nueva; ante 401/403 retira datos indebidos.
4. Dobles pulsaciones y errores inciertos nunca duplican automáticamente mutaciones; el aviso persiste hasta revisión autorizada o salida explícita.
5. Enlaces ambiguos no abren formularios de canje ni disparan llamadas, aun por URL directa. Recuperación exacta no se canjea al abrir y requiere token/confirmación explícita.
6. Verificación de accesibilidad y privacidad debe dejar evidencia con datos ficticios, sin tokens/correos reales. Tipos/build no prueban este contrato.
