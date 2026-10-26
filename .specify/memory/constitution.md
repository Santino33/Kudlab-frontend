# Kudlab Frontend Constitution

**Estado:** ratificada por aprobación explícita del responsable el 2026-10-25.

## Core Principles

### I. Experiencia del personal y alcance explícito

- La interfaz DEBE estar dirigida exclusivamente a profesores; ADMIN y TEACHER son
  roles técnicos, no públicos adicionales. Los estudiantes pueden ser sujetos de
  registros pedagógicos, nunca usuarios de la interfaz ni de autenticación.
- Cada feature DEBE declarar objetivo, actores, precondiciones, exclusiones y criterios
  de aceptación antes de planificar su implementación.
- Las specs frontend DEBEN describir la experiencia y enlazar las reglas de negocio
  canónicas, sin copiarlas ni redefinirlas.
- Ninguna feature documentada DEBE presentarse como aprobada, implementada o lista
  para el piloto sin evidencia correspondiente a ese estado.

Esto evita ampliar el producto por inferencia o confundir documentación con disponibilidad.

### II. Contrato backend comprobado y trazabilidad

- Antes de especificar una integración, se DEBE consultar el índice frontend y resolver
  la ruta local backend; después, seguir índice backend, módulo, feature y pendientes.
- Cada capacidad utilizada DEBE contrastarse con su spec, contrato y código actual:
  montaje HTTP, rutas, servicios y controles de autenticación/autorización pertinentes.
  Un contrato planificado, una descripción o una prueba no ejecutada no prueba disponibilidad.
- La spec frontend DEBE registrar archivos backend exactos, commit, fecha, cambios
  locales relevantes y límites de la comprobación realizada.
- Se DEBEN separar implementación observada, decisiones confirmadas, propuestas,
  discrepancias y pendientes. Las referencias a requisitos DEBEN identificar fuente y versión.
- Ante una discrepancia o contrato faltante, se DEBE consultar al responsable antes
  de fijar el comportamiento afectado. No se DEBEN inventar rutas, campos, errores,
  permisos ni modificar el backend para acomodar una suposición frontend.

La trazabilidad permite revisar la experiencia sin convertir el frontend en otra fuente de negocio.

### III. Seguridad y autoridad del servidor

- El servidor DEBE ser la autoridad de sesión y permisos vigentes. Ocultar controles
  no autoriza operaciones, y un JWT aislado no sustituye la sesión persistida requerida.
- Las specs DEBEN contemplar acceso no comprobado, sesión inválida y denegaciones
  vigentes, sin mostrar contenido protegido como autorizado antes de comprobar el acceso.
- No se DEBEN registrar contraseñas, credenciales, tokens de un solo uso ni otros
  secretos en logs, mensajes o telemetría, ni incorporarlos a URLs de navegación creadas
  por la UI. No se DEBEN introducir secretos backend en variables `VITE_*`.
- No se DEBEN usar datos reales de menores en pruebas, documentación o herramientas.
- Transporte y persistencia de sesión DEBEN resolverse con el contrato y las decisiones
  aprobadas; esta constitución no elige cookie, token opaco, almacenamiento ni JWT.

La interfaz informa y limita la exposición; no reemplaza los controles de seguridad del servidor.

### IV. Experiencia accesible y estados verificables

- Las specs DEBEN definir los recorridos aplicables de entrada, carga, envío, éxito,
  validación, error, denegación e indisponibilidad, con recuperación explícita.
- Se DEBE distinguir un resultado confirmado de una operación pendiente o de resultado
  desconocido por pérdida de conexión. Los envíos repetidos y respuestas tardías DEBEN
  tener criterios de aceptación sin imponer prematuramente una solución técnica.
- Los formularios DEBEN tener etiquetas asociadas, operación por teclado, foco coherente
  y mensajes anunciables. La autenticación DEBE permitir autocompletado adecuado y
  gestores de contraseñas, sin exponer credenciales.
- El diseño gráfico DEBE consultar las skills pertinentes según `AGENTS.md`; si faltan,
  se DEBE declarar la limitación. Una tarea puramente documental no exige cargarlas.
- No se DEBEN inventar destinos de navegación, enlaces sin destino ni flujos disponibles.
  Las decisiones de producto pendientes DEBEN consultarse antes de cerrar la spec afectada.

La recuperación y la accesibilidad forman parte de la experiencia, no son mejoras opcionales.

### V. Cambios mínimos y evidencia honesta

- Cada cambio DEBE limitarse al objetivo aprobado, conservar las convenciones del
  repositorio y preservar trabajo ajeno. No se DEBEN añadir dependencias sin necesidad aprobada.
- Las verificaciones DEBEN informarse con comandos, resultados y límites reales.
  `npm test` solo comprueba tipos en la base actual: no demuestra recorridos funcionales.
- No se DEBEN inventar resultados de pruebas de usabilidad, rendimiento, integración
  o disponibilidad. Los criterios de éxito DEBEN ser comprobables, no resultados supuestos.
- Las entregas DEBEN distinguir lo documentado, implementado, ejecutado y pendiente;
  simplificar el cambio no permite omitir seguridad, accesibilidad ni manejo de errores aplicable.

Un cambio pequeño solo es completo si conserva los requisitos y declara qué se verificó.

## Restricciones del proyecto

- La base técnica es React, TypeScript y Tailwind CSS con npm; se DEBE conservar
  `package-lock.json`. Router, cliente HTTP y bibliotecas visuales o de estado requieren
  una necesidad aprobada antes de incorporarse.
- El producto es un piloto de apoyo al seguimiento pedagógico: no produce diagnósticos
  clínicos ni sustituye la evaluación curricular.
- En la iteración de base no se implementan pantallas, autenticación ni llamadas API.
  Académico, Tareas, Evolución y Seguimiento quedan fuera de esta iteración.
  Una feature posterior requiere aprobación explícita de su alcance antes de implementar.
- La existencia de documentación o contratos no habilita funcionalidades excluidas.
  Esta constitución tampoco decide destinos tras login, recuperación de contraseña,
  transporte de sesión ni otras cuestiones propias de una feature o su plan.
- Se DEBE trabajar en un worktree verificado, nunca editar el repositorio original para
  la tarea. Se DEBEN comprobar directorio, raíz Git, rama y estado, y preservar cambios ajenos.
  Si no existe repositorio Git o el worktree no coincide con lo solicitado, se DEBE detener el trabajo.

## Flujo de trabajo y verificación

1. Leer `AGENTS.md`, el contexto aplicable y esta constitución. Resolver dudas de alcance
   con el responsable; no convertir una propuesta en una decisión aprobada.
2. Usar `/speckit.specify` para requisitos y escenarios; incorporar la trazabilidad de
   `docs/specs/TEMPLATE.md` sin modificar las plantillas instaladas por este motivo.
3. Resolver bloqueos mediante aclaraciones. Esperar revisión del responsable antes de
   avanzar a `/speckit.plan`, `/speckit.tasks` o implementación cuando así se haya solicitado.
4. Antes de implementar, revisar consistencia entre spec, plan y tareas mediante
   `/speckit.analyze`; cualquier ampliación de alcance requiere aprobación.
5. Para cambios de aplicación, verificar con `npm ci`, `npm test` y `npm run build`.
   Para documentación exclusiva, validar contenido, referencias, marcadores y diff;
   declarar que no se ejecutaron pruebas de aplicación cuando no se ejecuten.
6. Entregar archivos cambiados, fuentes, comandos y resultados, decisiones pendientes
   y límites de verificación. No continuar automáticamente a una fase no autorizada.

## Governance

- Esta primera versión recoge restricciones existentes y fue aprobada explícitamente
  por el responsable el 2026-10-25. La generación de futuras enmiendas no prueba su aprobación.
- Tras la ratificación, toda spec, plan, tarea y revisión de cambios DEBE comprobar su
  conformidad con estos principios y con `AGENTS.md`. Ante conflicto entre instrucciones
  del proyecto, se DEBE detener el comportamiento afectado y pedir resolución al responsable.
- Las enmiendas DEBEN describir motivo, principios afectados, impacto y transición
  necesaria; requieren aprobación explícita del responsable antes de considerarse vigentes.
  Las excepciones requieren el mismo registro y aprobación; no pueden quedar implícitas.
- El versionado DEBE seguir SemVer: MAJOR para eliminar o redefinir principios de forma
  incompatible; MINOR para añadir principios o ampliar materialmente sus obligaciones;
  PATCH para aclaraciones sin cambio de obligaciones. `1.0.0` identifica la primera
  versión sustantiva, no un incremento sobre la plantilla sin versión.
- La fecha de ratificación DEBE registrar la primera adopción real y conservarse en
  enmiendas posteriores. La fecha de última enmienda DEBE actualizarse al modificar el texto.
- El Sync Impact Report es material temporal de revisión, no normativa; se DEBE retirar
  antes de confirmar en Git la constitución ratificada. Plantillas y comandos dependientes
  leen la constitución en ejecución y no se modifican dentro de este flujo.

**Version**: 1.0.0 | **Ratified**: 2026-10-25 | **Last Amended**: 2026-10-25
