# Phase 1 — Guía de validación

**Estado:** plan, no implementación. Hoy la raíz React sigue vacía. Los comandos de base son ejecutables; los recorridos de Usuarios y `test:usuarios` solo existirán tras una tarea de implementación autorizada. No describir esta guía como E2E ya superado.

Referencias: [spec y resultados](spec.md), [contrato UI](contracts/ui.md), [consumo](contracts/api-consumption.md), [modelo](data-model.md), [evidencia](revalidacion-plan.md).

## 1. Requisitos

- Node 24 y npm; usar el lockfile del proyecto.
- Backend aislado preparado por su responsable, con datos totalmente ficticios, al menos dos ADMIN activos y un TEACHER activo con credenciales conocidas de prueba. Preparar también cuentas pendiente/inactiva. No activar usuarios por UI de invitación: ese canje está bloqueado. No compartir credenciales reales en documentación ni herramientas.
- PostgreSQL migrado y proveedor de correo de pruebas autorizados son prerrequisitos del backend, no acciones de este comando. Captura de correo backend está restringida a entorno de pruebas; no apuntar a buzones reales de los ejemplos.
- Perfil confirmado: SPA `http://localhost:5173`, API `http://localhost:3000`; `SPA_ORIGIN`/`trustedOrigins` deben coincidir. `RESET_BASE_URL` configurado por el responsable backend como `http://localhost:5173/recuperar-acceso/confirmar`, sin query/fragmento inicial. No editar backend/configuración efectiva desde frontend para acomodar una suposición.
- La aplicación futura leerá `VITE_API_ORIGIN=http://localhost:3000`; es un origen público, no secreto. No colocar credenciales SMTP, contraseñas de prueba, conexión de BD ni secretos Better Auth en variables `VITE_*`.

## 2. Comandos disponibles hoy

Desde raíz del worktree:

```sh
npm ci
npm test
npm run build
npm run dev -- --host localhost --port 5173 --strictPort
```

Resultados esperados actuales: instalación y tipos/build correctos; Vite sirve aplicación base sin recorridos Usuarios. `npm test` solo es TypeScript. `--strictPort` evita cambiar silenciosamente el origen permitido. No arrancar un backend ni enviar correos como efecto de esta guía documental.

## 3. Comandos y preparación después de implementar

El plan prevé añadir `test:usuarios` con runner nativo Node, sin nuevas dependencias:

```sh
npm test
npm run test:usuarios
npm run build
npm run dev -- --host localhost --port 5173 --strictPort
```

`test:usuarios` ejecutará `node --test tests/usuarios/*.test.mjs`: módulos puros y adaptación HTTP con Fetch simulado, sin TSX/DOM ni API real. Validar compatibilidad con imports `.ts` y borrado nativo de tipos antes de incorporarlo; no usa alias de bundler en los módulos probados. No atribuirle pruebas de cookies, navegación, diálogos o accesibilidad.

No instalar paquetes o ejecutar `shadcn init/add` para validar esta planificación. La incorporación futura necesita Base UI, Lucide, consultas oficiales y revisión del diff; los comandos `@latest` que devuelve un registro no se ejecutan sin esa revisión.

## 4. Validación funcional futura en navegador y backend aislado

| Escenario | Pasos | Resultado esperado / evidencia |
| --- | --- | --- |
| Acceso ADMIN | Abrir `/acceso`, ingresar credenciales válidas | Gestión ADMIN accesible; login envía `rememberMe: false`; requests con cookies. No registrar valor de cookies/cabeceras/token en evidencia |
| Acceso TEACHER | Ingresar y abrir `/sesion`; probar entrada directa `/usuarios` | Solo estado/cierre; sin datos o mutaciones de cuentas ni módulos académicos |
| Credenciales inválidas | Probar incorrectas, cuenta desconocida, pendiente/inactiva | Mensaje uniforme; sin datos protegidos. Indisponibilidad distinta de error de credenciales |
| Sesión/permisos retirados | Responsable de pruebas inactiva o reduce rol mientras vista está abierta; luego operar | Retirar datos desde rechazo/revalidación y no mantener controles ADMIN cacheados. No implementar polling para mantener actividad |
| Cierre | Cerrar sesión y probar petición posterior; repetir con red interrumpida | Cierre procesado cuando respuesta válida; sin acceso previo reutilizable en caso normal. Fallo comunica cierre no confirmado y retira datos; no prometer revocación remota |
| Listado | Más de 20 cuentas ficticias, siguiente/anterior, filtrar cada estado y sin resultados | Paginación/filtro correctos y total; filtro reinicia offset. Vacío diferente de fallo/denegación; no buscador |
| Carrera de consultas | Red lenta, cambiar filtro o cuenta antes de terminar respuesta | No publicar respuesta de selección anterior ni datos de otra cuenta |
| Alta | Invitar nombre/correo válidos; doble pulsación; repetir correo ya ocupado | Solo un envío en curso; cuenta pendiente y estado de entrega disponible; validación/conflicto visibles; advertencia de aceptación bloqueada |
| Edición | Corregir nombre; solicitar nuevo correo activo; editar pendiente; cancelar antes de enviar | Solo campos elegidos; vigente/pendiente separados; pendiente reemite invitación; cancelar no muta. No canje público |
| Entrega y resultado inciertos | Responsable simula SMTP fallido o pérdida de respuesta tras persistir | No mostrar rollback ni repetir automáticamente. Revisar detalle/listado autorizado; si no concluye, incertidumbre permanece |
| Reemisión | Desde pendiente confirmar/cancelar reemisión | Advertencia de invalidación de enlace previo y bloqueo del canje; cancelar no PATCH; entrega no equivale lectura/activación |
| Inactivación/reducción | Confirmar/cancelar; intentar último ADMIN y propia cuenta | Cuerpos exactos, cancelación sin llamada, conflictos explicados y acceso propio revalidado |
| Recuperación solicitada | Probar institucional válido de distintos estados/desconocido y formato/dominio inválido | Confirmación neutra idéntica en válidos; errores de entrada diferenciados sin enumerar; 202 no promete recepción |
| Recuperación confirmada | Abrir ruta exacta con enlace ficticio de prueba válido, corregir contraseña inválida y confirmar válida | URL saneada y token solo memoria; abrir no llama canje. Éxito exige nuevo acceso; contraseña anterior y sesiones previas dejan de servir según backend |
| Enlace no utilizable | Sin token, vencido, usado; recargar tras retirar query | Sin canje cuando falta token; error genérico y nueva solicitud, sin datos de cuenta ni persistencia de secretos |
| Bloqueos Q2-A | Abrir URL con token fuera de recuperación; intentar acceder directamente a invitación/correo | Sin elección del trámite, formulario de canje ni llamadas a ambos endpoints bloqueados |
| Diferidos Q1-A | Revisar navegación, detalle y red como ambos roles | Sin ascensos, auditoría visible ni reactivación, incluidas llamadas; no eliminar auditoría backend |

Inspeccionar red solo localmente sin exportar HAR con tokens/cookies/contraseñas. Para fallos que no puedan reproducirse con backend disponible, usar pruebas Fetch simuladas y marcar la comprobación integrada como pendiente, no aprobada.

## 5. Privacidad y accesibilidad

- Teclado completo, foco visible y regreso al disparador tras cancelación, fondo inerte en confirmaciones y ausencia de trampas inesperadas.
- Etiquetas, ayudas/errores asociados y lector de pantalla real; progreso/resultado reconocibles sin color ni toast fugaz. Comprobar cancelación y doble envío sin perder foco/contexto.
- Reflujo a 320 CSS px, zoom 200/400 %, tamaños 320/390/768/1024/1440, espaciado de texto y movimiento reducido. No afirmar certificación WCAG solo por compilar.
- Comprobar contraste de tokens del manual y fallback neutral aprobado; no colores semánticos inventados, blanco sobre Primary/Secondary ni rojo destructivo.
- No tokens/contraseñas/cookies en mensajes, logs, telemetría, almacenamiento web, capturas o documentación. Revisar política de referrer y redacción de query en logs de hosting antes de usar enlaces reales. La captura en memoria no elimina logs de llegada ya escritos.

## 6. Metas de la spec y preparación productiva

- SC-001/005/006: ejecutar matriz completa de alcance habilitado y bloqueos, documentando fallos y pendientes.
- SC-002/003: al menos cinco profesores, diez intentos por evaluación, medir tiempos/ayuda según spec; no sustituir con un benchmark técnico.
- SC-004: diez preguntas de comprensión sobre pendiente/enviado/completado, incluyendo que la confirmación desde correo sigue bloqueada. Nueve respuestas correctas como meta propuesta.
- Producción: aportar dominios públicos HTTPS same-site compatibles con SameSite=Lax; verificar CORS/trustedOrigins, cookies reales, CSRF, acceso directo/fallback y RESET_BASE_URL del origen correcto. No utilizar un proxy que oculte una topología cross-site sin validarla.
- Validar recepción real con buzones autorizados de prueba y configuración de URLs; SMTP aceptado no prueba bandeja/lectura. El responsable del entorno suministra secretos fuera de frontend/repositorio.
- **No declarar piloto completo:** la entrada/canje de invitación y cambio de correo sigue bloqueada por Q2-A aunque todos los pasos habilitados funcionen. Se requiere contrato distinguible y aprobación de actualización de spec antes de desbloquearlos.
