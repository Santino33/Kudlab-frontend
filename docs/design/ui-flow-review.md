# Revisión integral de interfaz y flujos

**Fecha:** 2026-10-26. **Estado:** cambios frontend verificados con transporte ficticio; sin integración API/BD ni aceptación con profesores reales.

## Alcance y preparación

Solicitud expresa: mejorar todas las pantallas existentes, sus mensajes, flujos, bugs y organización; conservar los colores principales y permitir colores de apoyo. No incorpora capacidades nuevas del backend.

- Se intentó `git pull --ff-only` antes de inspeccionar: el checkout original estaba en HEAD separado. `git pull --ff-only origin main` terminó correctamente y sin cambios.
- Se creó el worktree `/home/santino/.local/share/opencode/worktree/c4fd7d/mejora-integral-flujos-ui`, se movió la sesión y se verificaron `pwd`, raíz Git y lista de worktrees. La herramienta lo creó desde el main local anterior; en la nueva rama `feat/mejora-integral-flujos-ui` se ejecutó nuevamente `git pull --ff-only origin main`, avanzando a **`862074e`** antes de editar.
- Backend canónico: `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`, **`c989fae8802dec009f75254d32431de249e313f5`**, limpio al consultar. Solo lectura: sin migraciones, fixtures, envíos de correo ni cambios backend.
- El puerto 5193 estaba ocupado: no se detuvo su proceso. Una inspección inicial apuntó allí antes de recibir el error de arranque; **se excluye como evidencia de este worktree**. La captura anterior válida se repitió sobre el servidor propio en **5206**. Preview propio: **5207**.

## Recorrido crítico como profesor

Observaciones de una revisión por agente con datos sintéticos, no citas de entrevistas ni resultados de un estudio de usuarios.

| Queja durante el recorrido | Corrección |
| --- | --- |
| «Entro y solo veo mi cuenta. ¿Dónde empiezo a trabajar?» | Inicio TEACHER ofrece Estudiantes y Tareas; ADMIN mantiene gestión docente y consulta de Tareas. Solo se enlazan destinos existentes y permitidos. |
| «Pulso Registrar estudiante y resulta que no puedo registrar nada.» | Se retira la acción primaria engañosa del listado y se explica la indisponibilidad. La URL directa `/nuevo` conserva el bloqueo y el retorno, sin pedir datos ni enviar POST. |
| «En el móvil veo el código, pero tengo que desplazar la tabla para encontrar la ficha.» | Estudiantes y Tareas tienen listas móviles con todos los campos visibles, estado y acción nombrada. Se conservan sus tablas para escritorio. |
| «En tablet la navegación ocupa un tercio de la pantalla.» | Sidebar plegable por debajo de 1024px, con Sheet Base UI y cierre al navegar. |
| «Cada enlace de Profesores vuelve a cargar todo y puedo perder el aviso de un guardado incierto.» | Navegación interna compartida conserva AuthRoot y el aviso. Ctrl/Cmd, botón central, nueva pestaña, descargas y enlaces externos mantienen su comportamiento nativo. |
| «Una ficha podría conservar el resultado de una operación sobre otra cuenta.» | La clave del contenido incluye el ID de cuenta, no solo el tipo de ruta. Regresión DOM con mutación previa y cambio de ID. |
| «Guardo solo el nombre y me advierte sobre una confirmación de correo que no pedí.» | La confirmación pendiente solo aparece cuando la respuesta contiene correo pendiente o cuenta pendiente. El título de éxito recibe foco. |
| «No puedo comprobar si escribí bien la contraseña.» | Mostrar/ocultar con estado accesible, sin impedir pegado/autocompletado ni persistir credenciales. Los campos se bloquean durante el envío. |
| «Los avisos hablan de escrituras, servidor y decisiones; no de lo que debo hacer.» | Se simplifican errores, recuperación, alcance del catálogo y revisión de un registro incierto. Se conservan las advertencias necesarias sobre persistencia, concurrencia y entrega del correo. |
| «Todo tiene un borde oscuro; cuesta distinguir lo importante.» | Superficies claras, bordes estructurales discretos, foco y controles con Dark 1, acción principal azul y navegación activa neutral. |

## Dirección y criterios de interfaz

Se instalaron globalmente las tres skills con los comandos `npx skills add` pedidos. Se cargó Ponytail full y las tres skills de diseño. Apple Design aporta feedback inmediato, control y continuidad; no se trasladaron vidrio, rebotes ni nuevas bibliotecas. UI/UX Pro Max se consultó para dirección y se revisaron sus referencias de accesibilidad/interacción. Su primera búsqueda devolvió una landing comercial no pertinente; el segundo resultado aportó criterios de claridad/accesibilidad, **no su paleta, fuentes ni estructura de landing**.

Taste Skill: recorrido de **app screens**, dirección `editorial-greeting`, semilla **652873644**. Se eligió por el inicio personal de trabajo y las sesiones docentes; la identidad es la marca azul/navy y el contenido propio son los registros de estudiantes y las fichas pedagógicas. Preguntas principales:

- Inicio: ¿con qué puedo trabajar ahora?
- Profesores: ¿qué cuentas tengo y cuál necesita revisión?
- Estudiantes: ¿qué registro necesito consultar o corregir?
- Tareas: ¿cuál es la finalidad y la disponibilidad de este juego?
- Acceso/recuperación: ¿cómo entro o recupero mi cuenta de forma segura?

Adaptaciones explícitas al manual: fuente de sistema, H1 de 28px, controles de 44px y radios 8/12px, no valores menores de la demo. Retícula de inicio 8+4 columnas con gutter de 24px, apilada cuando falta espacio. Se omiten los contadores y gráficos propuestos por la dirección: no hay datos contractuales para ellos. Sin fotografías, métricas inventadas ni activos de terceros. Colores de apoyo documentados en la sección 11 del manual; no se asignan estados clínicos ni se resuelve P-01.

Contraste sRGB calculado:

| Texto / superficie | Ratio |
| --- | --- |
| `#52627A` / blanco | 6.20:1 |
| `#52627A` / `#F6F8FB` | 5.83:1 |
| `#52627A` / `#E9EEF5` | 5.32:1 |
| Dark 1 / `#F6F8FB` | 12.51:1 |
| Dark 1 / Primary | 6.47:1 |
| Dark 1 / Secondary | 5.15:1 |

Los controles Input, Button y Select mantienen borde funcional Dark 1. Los bordes estructurales tenues no se presentan como límites funcionales suficientes. El foco de controles/resúmenes sigue visible; el H1 enfocado programáticamente no recibe el rectángulo decorativo de las capturas iniciales.

MCP: `opencode mcp list` confirmó shadcn conectado. Se consultaron búsqueda `sidebar`, detalles de `@shadcn/sidebar`, `@shadcn/table`, `@shadcn/input` y ejemplo `sidebar-demo`. El ejemplo usa Radix: no se incorporó. Se reutilizaron/adaptaron los componentes locales Base UI; no se inicializó otro catálogo ni se añadieron dependencias.

## Organización y límites técnicos

- `src/features/usuarios/accounts/`: listado, formulario y detalle.
- `src/features/usuarios/recovery/`: pantallas y validación de recuperación.
- `src/features/usuarios/workspace/`: marco e inicio por rol.
- `src/lib/navigation.ts`: navegación protegida común, antes nombrada como navegación de Tareas pese a ser utilizada por otros módulos.
- Imports y pruebas actualizados; sin wrappers de compatibilidad, router nuevo ni cambios a `package-lock.json`.
- Las rutas públicas de recuperación siguen usando navegación documental: no se reutiliza una captura vieja del token de entrada. No se traslada identidad o datos personales a almacenamiento web.
- Títulos de pestaña específicos por destino y sin nombres/IDs de personas.

## Fuentes backend consultadas

Todas las rutas siguientes son relativas a la raíz backend indicada arriba. Los resúmenes RF **V3 propuestos** se tratan como antecedentes: no reemplazan la spec 005, la vertical 01 ni la implementación observada. Las reglas de negocio permanecen en sus fuentes canónicas.

- `docs/agent-context/INDEX.md`, `docs/agent-context/unresolved-issues.md`.
- `docs/agent-context/modules/usuarios/module-summary.md`; `features/cuentas.md`, `features/autenticacion.md`, `features/flujos-complementarios.md`.
- `docs/agent-context/modules/academico/module-summary.md`; `features/registrar-estudiante.md`, `features/consultar-estudiantes.md`, `features/actualizar-inactivar-estudiante.md`.
- `docs/agent-context/modules/tareas/module-summary.md`; `features/disponibilidad.md`.
- `specs/003-autenticar-usuarios/spec.md`; `specs/004-refactor-servicios-usuarios/contracts/current-interfaces.md`.
- `specs/005-gestionar-estudiantes/spec.md`, `specs/005-gestionar-estudiantes/contracts/students-api.md`.
- `docs/feature-specs/tareas/01-catalogo-y-ficha.md`.
- `src/app.ts`, `src/auth/session-guard.ts`.
- `src/modules/usuarios/accounts/accounts.routes.ts`, `src/modules/usuarios/accounts/accounts.service.ts`.
- `src/modules/academico/students/students.routes.ts`, `src/modules/academico/students/students.service.ts`.
- `src/modules/tareas/catalog/catalog.routes.ts`, `src/modules/tareas/catalog/catalog.service.ts`.

Observado: las operaciones existentes de estudiantes están montadas y restringidas a TEACHER; el catálogo exige acceso activo. No hay consulta HTTP de grupos. No se implementan grupos, filtros académicos, asignaciones, activación o permisos ADMIN sobre estudiantes para completar artificialmente el recorrido. Las discrepancias históricas de resúmenes «no implementado» se conservan como tales, no se usan para negar el código actual.

Fuentes frontend: índice, manual, inventario de Usuarios, specs `docs/specs/academico/01-estudiantes.md` y `docs/specs/tareas/01-catalogo-y-ficha.md`, App, AuthRoot, transporte/controlador/estado, pantallas, hooks, navegación, componentes y pruebas alcanzados por el diff.

## Comprobaciones ejecutadas

| Comando / recorrido | Resultado |
| --- | --- |
| `npm ci` | Correcto; 0 vulnerabilidades reportadas. |
| `npm test` | Correcto; **solo tipos**, no prueba funcional. |
| `npm run test:auth` | 66/66. |
| `npm run test:usuarios` | 72/72, incluidas 2 regresiones nuevas de navegación/títulos. |
| `npm run test:tareas` | 11/11. |
| `npm run test:estudiantes` | 14/14. |
| `npm run build` | Correcto; sin dependencias añadidas. |
| `students.check.mjs` | 17 recorridos DOM académicos + 11 de Tareas; 20 combinaciones de pantalla/ancho, texto al 200%, foco/teclado del diálogo y navegación móvil. |
| `usuarios-design.check.mjs` | 30 combinaciones de pantalla/ancho; validación, Sheet, Tab/Escape y permisos de TEACHER. |
| `recovery.check.mjs` | 15 combinaciones de estado/ancho; validación, 202/200/400/410/503/red/pendiente, envío único y retirada de secretos. |
| `ui-flow.check.mjs` | 5 regresiones de navegación, edición confirmada, separación por cuenta, guardado incierto, contraseña e inicio docente; sin excepciones JS. |
| Taste lint `--app src` | 0 FAIL, 0 WARN. |
| Taste inspect: Inicio y Estudiantes | 0 FAIL en 1440/768/390; 3 WARN por vista: servidor dev y espacio restante con pocos datos. |
| Taste inspect: `http://localhost:5207` | Build real, 0 FAIL, 2 WARN de espacio vacío. **Solo gate de configuración ausente**, no pantallas autenticadas del build. |
| `git diff --check` | Correcto. |

En todos los recorridos de navegador el transporte es ficticio y está separado del build. No se presentan como pruebas de API, persistencia o correo. El build no tiene `VITE_API_ORIGIN` configurado: muestra el error seguro esperado y no un login falsamente operativo.

Reproducción: iniciar `npm run dev -- --host 0.0.0.0 --port 5206 --strictPort`. Ejecutar los scripts de `tests/browser/` con `KUDLAB_CDP_DRIVER=/home/santino/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs`, `KUDLAB_TEST_ORIGIN=http://localhost:5206`; recuperación usa `RECOVERY_PREVIEW_ORIGIN=http://localhost:5206`. El driver es opcional y externo, no una dependencia npm.

Artefactos regenerables fuera de Git: `/tmp/opencode/kudlab-ui-{before-current,home-final,students-final,production-gate,students,usuarios,recovery,flow}`. Capturas solo con nombres/correos/credenciales sintéticos. No hay datos de muestra incorporados al producto que sustituir antes de desplegar.

## Crítica visual final y pendientes

Se revisaron capturas anteriores y posteriores. Las tres correcciones prioritarias fueron: orientar el inicio hacia tareas reales; hacer visibles los datos/acciones en móvil; reducir ruido de bordes y liberar espacio en tablet. En la última revisión la pregunta principal se lee antes que la cuenta, los márgenes cierran, los listados no pierden campos y no se añaden contadores inconsistentes. No hay gráficos ni cifras agregadas cuyo cálculo validar.

Los avisos de espacio vacío se aceptan porque las vistas tienen pocos registros reales del fixture y un footer al final del viewport: no se rellenan con estadísticas o funciones ficticias. El aviso dev se declara como límite; el inspector del build solo alcanza el gate sin configuración. Valoración cualitativa: jerarquía y lectura mejoradas; faltan validación con docentes y verificación integral del build con backend autorizado. No se asigna una puntuación que sugiera certificación.

- Sigue pendiente acordar proveedor/contrato de grupos para registrar estudiantes. La revisión de UI no autoriza implementarlo en backend.
- Canje de invitación/cambio de correo, reactivación y ascensos siguen con sus exclusiones actuales; no se promete completar esos procesos.
- No se probó API/BD real, correo real, BFCache real, TLS, lector de pantalla, zoom nativo 400%, dispositivos físicos ni aceptación con profesores. Texto ampliado y reflujo no sustituyen esas verificaciones.
- Sin merge, push, despliegue ni eliminación de otros worktrees. No se declara piloto listo.
