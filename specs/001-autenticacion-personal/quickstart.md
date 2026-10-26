# Guía de validación: autenticación del personal

## Estado y prerrequisitos

La implementación y los tests Node ya existen; la matriz completa de aceptación no
está cerrada. Consultar resultados actuales y pendientes en [validation.md](validation.md).
La evidencia backend previa está en [backend-fixes.md](backend-fixes.md), separada de
los ensayos nuevos. No afirmar que toda esta guía end-to-end ya pasó.

- Node 24, npm y worktree frontend verificado.
- Backend con las correcciones P-01/P-02 del worktree y rama indicados en el informe,
  más PostgreSQL exclusivo/migrado y configuración válida. El checkout principal
  backend no incorpora automáticamente esas correcciones.
- Cuentas sintéticas ADMIN/TEACHER preparadas por fixtures autorizadas, nunca datos
  reales de menores; SMTP capture solo en test. No enviar correo real para esta guía.
- Navegador con perfil de prueba limpio; lector de pantalla para anuncios reales.

## Verificación disponible actualmente

Desde el worktree frontend:

```bash
npm ci
npm test
npm run build
```

`npm test` hoy solo comprueba tipos; estos comandos no validan login ni API.
Estos comandos no sustituyen pruebas de lógica, navegador o aceptación integrada.

## Verificación automatizada tras implementar

Los módulos `.ts` eliminables, pruebas `.mjs` y script `test:auth` están disponibles:

```bash
npm test
npm run test:auth
npm run build
```

`test:auth` ejecutará `node --test tests/auth/*.test.mjs`. No depende de backend ni DOM:
inyecta fetch, promesas y reloj para comprobar [data-model](data-model.md) y
[auth-client](contracts/auth-client.md). Cubrir parsers, bloqueo de envíos, timeout,
respuestas tardías, estados iniciales, reconciliación y denegaciones sin registrar secretos.

## Integración local tras implementar

1. Arrancar backend corregido siguiendo su README, con base aislada, PORT=3001 y BETTER_AUTH_URL=http://localhost:3001,
   SPA_ORIGIN localhost:5173 y configuración sintética válida. No usar la base de otro
   worktree: las fixtures backend truncan tablas. Las URLs de recuperación configuradas
   son requisito de arranque backend, no enlaces/frontend de recuperación disponibles.
2. Ejecutar `npm run dev -- --host localhost --port 5173 --strictPort` en frontend.
   El proxy Vite previsto pasa `/api` al backend local; conservar el origen real del navegador.
   Si hay otro puerto ocupado, corregir configuración explícita, no eludir trustedOrigins.
3. Abrir localhost:5173 con DevTools. No exportar HAR, cookies ni capturas con credenciales;
   inspeccionar flags y presencia de headers sin copiarlos a informes.

## Recorridos y resultados esperados

| Caso | Pasos | Resultado esperado y criterio |
| --- | --- | --- |
| US1 válido | Ingresar como ADMIN; repetir en perfil separado como TEACHER | Identidad propia y cierre, sin dashboard/enlaces/selector de rol; SC-001/002 |
| US1 inválido | Omitir campos, correo mal formado, contraseña errónea y cuenta no elegible sintética | Corregir entrada o mensaje uniforme, sin enumerar cuentas; SC-002 |
| US1 repetido | Diez activaciones durante envío retenido en fixture de transporte | Un intento pendiente, sin otro login automático; SC-007 |
| US1 incierto | Perder respuesta de login en fixture sin reenviarlo | Comprobar sesión antes de permitir otro login; nunca contraseña incorrecta por fallo de red |
| US2 entrada/recarga | Recargar con cookie vigente; repetir sin cookie y con sesión inválida | Comprobación antes de identidad/formulario, acceso válido no pide contraseña; SC-001 |
| US2 indisponible | Detener API de prueba y reintentar manualmente al recuperarla | Estado bloqueado, sin identidad ni login operativo; no afirmar sesión ausente |
| US3 cierre | Cerrar una de dos sesiones en perfiles separados y recargar | Solo sesión actual pierde acceso; SC-003 |
| US3 incierto | Perder respuesta de cierre en fixture; pulsar reintento | Consultar primero; salir si falta sesión, cerrar si sigue válida; no éxito anticipado |
| US4 401/403 | Inyectar denegaciones con generación actual y antigua | 401 actual retira acceso; 403 comprueba sesión y conserva aviso si sigue válida; obsoletos ignorados; SC-004 |
| Recuperación de conexión | Recuperar API tras operación no confirmada | No reproducir mutación de negocio ni limpiar incertidumbre por suposición |
| Accesibilidad | Recorrer solo teclado y lector de pantalla, provocar errores y progreso | Etiquetas, foco visible/coherente, mensajes anunciados, sin robo de foco; SC-005 |
| Secretos | Revisar URLs, errores, logs/telemetría y estados de tests | Cero contraseñas/credenciales en esas superficies; no copiar payloads; SC-006 |

Los fallos controlados usan dobles de transporte de test, no rutas de depuración en
producción ni endpoints nuevos. La raíz autenticada no tiene operaciones de cuentas:
US4 se prueba mediante la interfaz transversal prevista, sin construir otros módulos.

## Fixture de navegador reproducible — U1

**Infraestructura creada en T020; controles de cierre y denegaciones disponibles.**
Resultados sintéticos y límites reales en validation.md; sin dependencias nuevas:

| Archivo previsto | Responsabilidad |
| --- | --- |
| `tests/browser/auth-harness.html` | Entrada HTML de pruebas con script auth-harness.tsx, servida solo por Vite desarrollo |
| `tests/browser/auth-harness.tsx` | Crear cliente con fetch manual inyectado, controlador por raíz y AuthRoot real; panel de controles fuera de AuthRoot |
| `tests/browser/history-target.html` | Página estática sin datos para navegación real de ida y vuelta; no una ruta de producto |

Incluir TSX del harness en typecheck; no importarlo desde `src/` o `index.html`, no
ponerlo en `public/` ni añadirlo como entrada del build. `npm run build` debe producir
solo la aplicación y sus assets, nunca estas páginas o controles. `npm run preview`
no es el servidor del harness: un fallback a index no significa que se haya publicado.

### Contrato del transporte y panel de pruebas

- Cada llamada fake se retiene como promesa pendiente hasta una acción del panel.
  Mostrar solo operación, número/orden y contador, nunca contraseña/cuerpo/cookies.
- El panel permite resolver la llamada elegida con identidad/sesión sintéticas válidas,
  401 conocido, 503, success true para cierre o JSON inesperado; también rechazarla
  como fallo de red. Honrar AbortSignal y permitir orden controlado para pruebas tardías.
  No hay fallback a fetch real, lectura de `.env` ni solicitudes API desde este harness.
- Usar exclusivamente datos ficticios, sin token ni cookies de sesión: por ejemplo
  identidad sintética ADMIN/TEACHER y expiresAt de prueba. Ninguna respuesta representa
  autenticación real y no se debe intentar reutilizarla contra API.
- Añadir botones de notificación 401/403/indisponibilidad con generación actual y anterior
  mediante la interfaz tipada del controlador. Nunca almacenar petición de negocio.
- No publicar objetos de control en window, hooks globals o rutas debug; todas las
  acciones pertenecen al panel de esta entrada de prueba y a sus dependencias inyectadas.

### Procedimiento de respuestas perdidas y foco

1. Ejecutar `npm run dev -- --host localhost --port 5173 --strictPort` y abrir
   `http://localhost:5173/tests/browser/auth-harness.html`. Backend no es necesario.
   Comprobar en Network que no se solicitan endpoints API; recursos/HMR locales de Vite
   no son operaciones de negocio.
2. Resolver la consulta inicial como 401 UNAUTHENTICATED. Introducir datos sintéticos
   en formulario y enviar; observar progreso y un único intento al activar diez veces.
3. Rechazar el login retenido como red no confirmada. Debe aparecer el aviso de ingreso
   incierto y una consulta de sesión, nunca otro envío de contraseña. Resolver esa consulta
   como válida, ausente o indisponible en ensayos separados y comprobar los tres estados.
4. En estado autenticado, cerrar y rechazar la respuesta. Debe ocultarse la identidad y
   ofrecer reintento manual. Al reintentar aparece primero consulta; si se resuelve válida
   se solicita cierre, si 401 se sale y si falla queda incertidumbre. El panel permite
   observar ese orden sin mutaciones reales.
5. Con la misma instancia real de AuthRoot, inyectar denegaciones actuales/obsoletas y
   resolver llamadas fuera de orden. Verificar mensaje, foco y ausencia de identidad
   antes de confirmar; una respuesta obsoleta no cambia estado ni foco. Repetir con teclado
   y lector de pantalla, registrando versiones y casos no verificados.

Esto valida presentación integrada con controlador bajo condiciones sintéticas. No
prueba cookies, CSRF, persistencia ni API: esos puntos requieren la integración real
del apartado anterior y el backend corregido. No introducir el panel en la raíz de producto.

## Historial y bfcache — C1

### Caso controlado

En el harness, añadir controles que emitan `pagehide` y `pageshow` con persisted=true
y un aviso de visibilitychange para la misma activación, sin alterar propiedades readonly
del navegador. Autenticar sintéticamente, emitir ocultación y comprobar inmediatamente
que snapshot/DOM ya no muestran identidad. Emitir restauración y mantener getSession
pendiente: el DOM debe seguir bloqueado y el contador mostrar una única comprobación
efectiva. Resolver como válida, ausente o fallida; repetir con cierre incierto y con una
respuesta antigua que no debe restablecer acceso. Node cubre además el ciclo de vida
equivalente con reloj/eventos inyectados. Un evento sintético no demuestra bfcache real.

### Navegación real

1. Autenticar en el harness y dejar preparada la retención de la próxima comprobación.
   Navegar en la misma pestaña a `http://localhost:5173/tests/browser/history-target.html`;
   usar Atrás del navegador, no un enlace que cree una navegación nueva.
2. Observar si pageshow informa persisted=true. Si ocurre, comprobar que la identidad
   previa no aparece en el DOM restaurado mientras la nueva consulta está retenida.
   Resolver como ausencia o caída de sesión y confirmar que no se restaura acceso.
3. Repetir el ciclo sobre la raíz real `/` contra backend de prueba corregido: abandonar
   la página, invalidar la sesión desde un cliente de prueba separado y volver mediante
   Atrás. No añadir navegación ni controles de administración a la UI para hacerlo.
4. Registrar navegador, persisted observado, consultas, estados y límites. Si Vite/HMR,
   DevTools o el navegador impiden bfcache, no afirmar que pasó: repetir con herramientas
   cerradas cuando sea posible y conservar como evidencia diferenciada recarga y caso
   controlado. No usar unload/beforeunload para «resolver» el ensayo desactivando bfcache.

La protección exigida cubre snapshot y DOM controlados por la aplicación, no capturas
o miniaturas históricas del navegador/sistema operativo. No guardar identidad en
almacenamiento ni mostrar contenido anterior mientras se espera nueva validación.

## Validación de cookie, inactividad y despliegue

- En local observar HttpOnly/SameSite=Lax, sin exigir Secure bajo excepción HTTP local.
  En el entorno HTTPS mismo origen aprobado, exigir Secure; no cambiar flags para
  conseguir que una cookie funcione. No leer `set-auth-token` ni emitir JWT.
- El backend tiene pruebas de renovación con reloj/registro controlados y de inactividad
  exacta. Para navegador, verificar que Set-Cookie renovada llega a través del proxy;
  si se requiere ensayo prolongado, realizar actividad protegida autorizada en un cliente
  de prueba separado, no añadir llamadas de negocio o mantenimiento a esta UI mínima.
- No atribuir a escribir/mover mouse/consultar sesión renovación de actividad protegida.
- Validar despliegue real por separado: origen público consistente con BETTER_AUTH_URL
  y SPA_ORIGIN, ninguna caché de auth, Origin/Set-Cookie preservados y TLS operativo.
  Este plan no instala ni certifica infraestructura. Si falla, no sustituir cookies por
  almacenamiento de tokens ni modificar permisos para sortear el problema.

## Registro de resultados

Registrar commit frontend y backend, diff local aplicado, versiones, comandos,
escenarios aprobados/fallidos y límites. Separar pruebas Node, tipos/build, pruebas
backend, inspección de navegador, lector de pantalla y despliegue. No marcar casos
como ejecutados solo por existir esta guía; cualquier ampliación requiere aprobación.
