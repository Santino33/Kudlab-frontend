# Instrucciones para agentes de Kudlab Frontend

## Antes de trabajar

1. Leer [el índice frontend](docs/agent-context/INDEX.md) y resolver `[RUTA_LOCAL_DEL_BACKEND]` en el entorno actual.
2. Antes de trabajar en cualquier feature, consultar su descripción bajo `docs/agent-context/modules/` **del backend**: índice → módulo → feature. Leer también los pendientes aplicables.
3. Revisar su spec y contrato backend; comprobar en `src/app.ts`, routers, servicios y `src/auth/` qué está realmente implementado. Una descripción, un contrato planificado, un ADR o una prueba no ejecutada no demuestra disponibilidad de la API.
4. Referenciar en la documentación/spec frontend todos los archivos backend consultados y, cuando corresponda, commit, cambios locales y fecha. Separar implementación observada, decisiones confirmadas, propuestas y pendientes. Los RF de análisis, diseño y V3 no son intercambiables: indicar fuente y versión.
5. Si hay discrepancias, pendientes o falta un contrato, señalarlos y preguntar al responsable antes de implementar el comportamiento afectado. No inventar reglas, rutas, permisos, campos, errores ni comportamiento API. No modificar el backend para hacer coincidir una suposición frontend.
6. Antes de diseñar o modificar UI, leer el [manual de diseño](docs/design/agent-design-manual.md). La plataforma es y será de uso exclusivo de profesores: no diseñar interfaces, actividades o accesos para estudiantes o niños. ADMIN/TEACHER son roles técnicos, no públicos adicionales.

## Documentación y alcance

- Las specs frontend describen la experiencia de interfaz: actores, recorrido, estados/errores y criterios de aceptación. **No duplican la lógica de negocio**; enlazan las reglas canónicas del backend. Usar [la plantilla](docs/specs/TEMPLATE.md).
- Mantener [el inventario de Usuarios](docs/agent-context/modules/usuarios/capabilities.md) y las fuentes de cada feature. No afirmar que una capacidad está lista para el piloto solo porque exista código.
- En esta base no se implementan pantallas, autenticación ni llamadas API. Académico, Tareas, Evolución y Seguimiento están fuera de esta iteración.
- Los estudiantes no usan ni usarán la plataforma; pueden ser sujetos de registros pedagógicos, no destinatarios de la interfaz. Esta aclaración expresa del responsable prevalece sobre menciones antiguas de uso directo por estudiantes. Los roles de Usuarios son ADMIN y TEACHER; no redefinir sus permisos por esta aclaración.
- Los permisos se verifican en servidor. Ocultar controles no autoriza operaciones; un JWT aislado no sustituye la sesión persistida actual.
- No registrar secretos, contraseñas, tokens de un solo uso ni datos reales de menores. No introducir secretos backend en variables `VITE_*`.

## Skills de diseño: uso condicionado

Si una tarea implica **diseñar, crear o modificar la interfaz gráfica**, consultar y utilizar las skills instaladas pertinentes: `@apple-design`, `@ui-ux-pro-max` y/o `@design-taste-frontend`. Elegir según el trabajo (interacciones/movimiento, UX/accesibilidad o composición visual). No cargarlas ni usarlas en tareas que no impliquen diseño de interfaz, como documentación o configuración técnica sin UI.

Comprobar disponibilidad en cada sesión. Si una skill no está disponible, indicarlo y continuar sin fingir que se utilizó. Durante esta inicialización las tres no estaban disponibles y no se utilizaron; tampoco se diseñó interfaz.

## Ponytail: cambios mínimos completos

- Cargar la skill de proyecto `ponytail` antes de tareas de código, refactor, revisión o selección de dependencias y cuando el usuario la solicite. Usar su nivel predeterminado `full`, salvo indicación distinta del usuario. Ver [instalación, procedencia y límites](docs/agent-context/ponytail.md).
- Simplificar la solución, no los requisitos: conservar validación, manejo de errores, seguridad, accesibilidad, pruebas necesarias y convenciones del producto. No reemplazar componentes del sistema de diseño por variantes inconsistentes ni eliminar trabajo ajeno para reducir el diff.
- Está instalada como skill, sin plugin ni hooks; no asumir comandos slash o inyección automática en cada turno. Si no puede cargarse, informar la limitación sin fingir uso.

## Componentes aprobados y MCP de shadcn

- La elección aprobada es **shadcn/ui con Base UI y Lucide**; no mezclar primitivas Radix/Base UI ni otras suites para resolver el mismo patrón. La elección no significa que los paquetes o componentes estén instalados: la base todavía no tiene catálogo ni `components.json`.
- **Cuando una tarea implique componentes shadcn, usar el MCP `shadcn`** configurado en [opencode.json](opencode.json) para buscar el componente oficial y consultar sus detalles/ejemplos antes de incorporarlo o modificarlo. Revisar primero componentes locales existentes; reutilizar los ya adaptados al manual en lugar de duplicarlos.
- Descubrir las herramientas realmente disponibles; usar las de búsqueda, detalle y ejemplos del registro `@shadcn`. Si el proyecto aún no está inicializado, las consultas explícitas a `@shadcn` permiten explorar sin instalar; no crear `components.json` automáticamente para superar una limitación de una herramienta.
- El manual y el contrato de la feature prevalecen sobre los ejemplos del MCP. Adaptar tokens, texto Dark 1 sobre Primary, tamaños, radios, foco y estados. No importar paletas, colores pendientes, fuentes, charts o funcionalidades de una demo como decisiones de Kudlab. `secondary` de shadcn no equivale automáticamente al color Secondary de marca.
- El MCP no autoriza mutaciones: ejecutar un comando de incorporación/inicialización solo si la tarea permite implementar, revisar antes archivos y dependencias afectados, preservar cambios ajenos y usar npm. En tareas de documentación o configuración, limitarse a consultas; no generar componentes ni cambiar dependencias de la aplicación.
- Verificar conexión con `opencode mcp list`; si falla, informar el bloqueo, consultar documentación oficial como alternativa y declarar que no se utilizó el MCP. No inventar respuestas de herramientas ni instalar otro servidor como sustituto. Para recargar configuración usar `/reload` si hace falta, no reiniciar el servicio por un cambio normal.
- Seguir la [guía de configuración y verificación](docs/design/shadcn-mcp.md). No enviar datos reales de estudiantes, credenciales ni tokens a registros o herramientas.

## Trabajo en el repositorio

- Crear un worktree antes de inspeccionar o cambiar archivos para una tarea; mover la sesión a él y verificar `pwd`, `git rev-parse --show-toplevel` y `git worktree list`. Si no existe repositorio Git desde el cual crearlo, detenerse y explicar el bloqueo. No editar el repositorio original ni descartar trabajo ajeno.
- Usar npm y conservar `package-lock.json`. Mantener React + TypeScript + Tailwind; no añadir router, cliente HTTP, bibliotecas visuales o de estado sin una necesidad aprobada.
- Verificar con `npm ci`, `npm test` y `npm run build`. Actualmente `npm test` solo comprueba tipos; no declarar pruebas funcionales inexistentes.
- Al entregar: listar cambios, comandos y resultados, fuentes consultadas, asuntos pendientes y límites de lo verificado. Pedir aprobación antes de ampliar alcance o resolver decisiones de producto.
