# Instrucciones para agentes de Kudlab Frontend

## Antes de trabajar

1. Leer [el índice frontend](docs/agent-context/INDEX.md) y resolver `[RUTA_LOCAL_DEL_BACKEND]` en el entorno actual.
2. Antes de trabajar en cualquier feature, consultar su descripción bajo `docs/agent-context/modules/` **del backend**: índice → módulo → feature. Leer también los pendientes aplicables.
3. Revisar su spec y contrato backend; comprobar en `src/app.ts`, routers, servicios y `src/auth/` qué está realmente implementado. Una descripción, un contrato planificado, un ADR o una prueba no ejecutada no demuestra disponibilidad de la API.
4. Referenciar en la documentación/spec frontend todos los archivos backend consultados y, cuando corresponda, commit, cambios locales y fecha. Separar implementación observada, decisiones confirmadas, propuestas y pendientes. Los RF de análisis, diseño y V3 no son intercambiables: indicar fuente y versión.
5. Si hay discrepancias, pendientes o falta un contrato, señalarlos y preguntar al responsable antes de implementar el comportamiento afectado. No inventar reglas, rutas, permisos, campos, errores ni comportamiento API. No modificar el backend para hacer coincidir una suposición frontend.

## Documentación y alcance

- Las specs frontend describen la experiencia de interfaz: actores, recorrido, estados/errores y criterios de aceptación. **No duplican la lógica de negocio**; enlazan las reglas canónicas del backend. Usar [la plantilla](docs/specs/TEMPLATE.md).
- Mantener [el inventario de Usuarios](docs/agent-context/modules/usuarios/capabilities.md) y las fuentes de cada feature. No afirmar que una capacidad está lista para el piloto solo porque exista código.
- En esta base no se implementan pantallas, autenticación ni llamadas API. Académico, Tareas, Evolución y Seguimiento están fuera de esta iteración.
- El estudiante no es usuario autenticado en el contexto actual: no diseñar cuentas, login, tokens ni recuperación para estudiantes. Los actores autenticados de Usuarios son ADMIN y TEACHER.
- Los permisos se verifican en servidor. Ocultar controles no autoriza operaciones; un JWT aislado no sustituye la sesión persistida actual.
- No registrar secretos, contraseñas, tokens de un solo uso ni datos reales de menores. No introducir secretos backend en variables `VITE_*`.

## Skills de diseño: uso condicionado

Si una tarea implica **diseñar, crear o modificar la interfaz gráfica**, consultar y utilizar las skills instaladas pertinentes: `@apple-design`, `@ui-ux-pro-max` y/o `@design-taste-frontend`. Elegir según el trabajo (interacciones/movimiento, UX/accesibilidad o composición visual). No cargarlas ni usarlas en tareas que no impliquen diseño de interfaz, como documentación o configuración técnica sin UI.

Comprobar disponibilidad en cada sesión. Si una skill no está disponible, indicarlo y continuar sin fingir que se utilizó. Durante esta inicialización las tres no estaban disponibles y no se utilizaron; tampoco se diseñó interfaz.

## Trabajo en el repositorio

- Crear un worktree antes de inspeccionar o cambiar archivos para una tarea; mover la sesión a él y verificar `pwd`, `git rev-parse --show-toplevel` y `git worktree list`. Si no existe repositorio Git desde el cual crearlo, detenerse y explicar el bloqueo. No editar el repositorio original ni descartar trabajo ajeno.
- Usar npm y conservar `package-lock.json`. Mantener React + TypeScript + Tailwind; no añadir router, cliente HTTP, bibliotecas visuales o de estado sin una necesidad aprobada.
- Verificar con `npm ci`, `npm test` y `npm run build`. Actualmente `npm test` solo comprueba tipos; no declarar pruebas funcionales inexistentes.
- Al entregar: listar cambios, comandos y resultados, fuentes consultadas, asuntos pendientes y límites de lo verificado. Pedir aprobación antes de ampliar alcance o resolver decisiones de producto.
