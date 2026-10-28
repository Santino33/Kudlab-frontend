# J-03 · Gestión docente de accesos

Base `acb9134` origin/main, backend `1756301`, Play `2822769`, revisión 2026-10-27. Fuentes propuestas leídas en `/home/santino/Universidad/TrabajoCampo/Kudlab-play/especificaciones-juegos/`; no copiadas ni modificadas. El responsable confirmó D2–D8/plan y cinco caracteres alfanuméricos, con contadores de 15 minutos y limpieza cada 5 minutos. La restricción de inicialización de AGENTS se aclaró sin permitir pantallas infantiles aquí.

## Recorrido y estados

Detalle de asignación → destinatarios seleccionados conscientemente (máximo 100) → confirmación con tarea/curso/nombres/vigencia → generación atómica/reutilización → metadatos privados → revelado/copia individual. No se selecciona todo por defecto. Los motivos existentes excluyen destinatarios y la API revalida; las asignaciones futuras pueden preparar códigos, no iniciar antes.

Un solo código visible a la vez. Cada revelado consulta servidor; sin plaintext en localStorage/sessionStorage/IndexedDB, rutas o navegación. Se retira con foco/visibilidad/ciclo de acceso y respuestas tardías no lo reponen. Copiar mensaje incluye URL pública/fecha/zona, no datos nominales; solo «Copiado» con éxito de Clipboard API, fallback seleccionable si falla. No «Enviado»/«Leído», impresión, exportación ni copia masiva.

Reemplazo/revocación requieren confirmación y no reinician intentos ni borran evidencia. Sesión iniciada permite generar SUBMIT_ONLY; con acuse, acción explícita de reconciliación. Se explica que el pendiente debe existir en el mismo sitio/perfil de Play y que el iframe no comparte necesariamente su partición. Inicio/recuperación supervisados y guardas AuthRoot permanecen.

El código acredita posesión, no identidad física; distribución individual por canal autorizado a cargo del profesor. La UI infantil y `/pendientes` están solo en Play. ADMIN no recibe lectura nominal ni revelado. Gates institucionales y uso real bloqueados.

## Fuentes backend observadas

Worktree `/tmp/opencode/kudlab-backend-j03`, base anterior más cambios J-03 (no atribuidos al commit base): `docs/{integracion-play,integracion-play-verificacion,acceso-codigo}.md`, contexto INDEX/producto/arquitectura/decisiones/pendientes/Tareas/asignación/ejecución, constitución, `src/app.ts`, `src/auth/{auth,session-guard}.ts`, `src/modules/academico/{shared/academic-auth,shared/participation,groups/groups.service}.ts`, `src/modules/tareas/runtime/{contract,dto,security,access-security,access-limit,service,routes,errors}.ts`, publicación de catálogo, `src/db/schema/{game,access}.ts`, migraciones `0010…0012`, `src/modules/evolucion/{tg01,processor}.ts`, generador contractual y OpenAPI. Contrato de negocio canónico: backend `docs/acceso-codigo.md`, no lógica paralela frontend.

## Diseño y pruebas

Se conservan componentes locales Base UI, marca/tokens/manual y navegación propia; sin dependencias nuevas. Skills ui-ux-pro-max (pegado/campo único/foco/estados) y design-taste-frontend (extensión de sistema existente, sin nuevo sorteo visual). MCP shadcn no disponible: `opencode mcp list` reportó ninguno y discovery no encontró herramientas; se consultó documentación oficial Base UI de Alert Dialog, sin instalar componentes. Ponytail no cargó mediante herramienta; se leyó su copia versionada, sin atribuir carga exitosa.

`npm test` solo verifica tipos. Funcionales: test:auth/usuarios/tareas/estudiantes. Nuevas pruebas de contrato del cliente en `tests/tareas/access-codes.test.mjs`. Recorrido API/PostgreSQL/builds reales en Play `tests/integration/access-code.spec.ts`, más regresión supervisada. Resultados observados y limitaciones: backend `docs/acceso-codigo-verificacion.md`. No declarar validación pedagógica/WCAG por compilar ni pruebas físicas no ejecutadas.
