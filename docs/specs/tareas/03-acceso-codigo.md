# J-03 · Gestión docente de accesos

Base `acb9134` origin/main, backend `1756301`, Play `2822769`, revisión 2026-10-27. Fuentes propuestas leídas en `/home/santino/Universidad/TrabajoCampo/Kudlab-play/especificaciones-juegos/`; no copiadas ni modificadas. El responsable confirmó D2–D8/plan y cinco caracteres alfanuméricos, con contadores de 15 minutos y limpieza cada 5 minutos. La restricción de inicialización de AGENTS se aclaró sin permitir pantallas infantiles aquí.

## Recorrido y estados

**Refinamiento aprobado tras prueba manual:** selección consciente una sola vez al crear → guardar crea asignación y prepara códigos → estudiantes/códigos como contenido principal. La configuración y gestión quedan secundarias. Cada lote de códigos mantiene máximo 100; una asignación de más destinatarios usa varios lotes idempotentes. Fallo parcial no revierte ni duplica la asignación: conserva las solicitudes y permite comprobar el mismo flujo. Las asignaciones futuras pueden preparar códigos, no iniciar antes.

El responsable aprobó **proyección colectiva supervisada** aceptando riesgo de uso cruzado, sustituyendo la regla anterior de un solo código visible. Lista paginada de 30, revelado por servidor con concurrencia máxima 5, códigos solo en memoria. La vista modal de proyección muestra tarea/URL/nombres/códigos de actividad, sin resultados ni SUBMIT_ONLY. Se retiran con foco/visibilidad/ciclo de acceso y respuestas tardías no los reponen; sin plaintext en localStorage/sessionStorage/IndexedDB, rutas o navegación. Copia individual con feedback real y fallback seleccionable; no «Enviado»/«Leído», impresión, exportación ni copia masiva.

Reemplazo/revocación requieren confirmación y no reinician intentos ni borran evidencia. **Se elimina del frontend toda acción de reconciliar acuse.** Play confirma automáticamente un acuse existente mediante capacidad original, incluso expirada, nunca revocada; no renueva autorización ni reenvía un paquete distinto. «Resolver un envío pendiente» solo aparece sin recepción, para el caso distinto de resultados nunca recibidos con permiso vencido. El pendiente debe existir en el mismo sitio/perfil de Play; el iframe no comparte necesariamente su partición. Inicio/recuperación supervisados y AuthRoot permanecen.

El código acredita posesión, no identidad física; distribución individual o proyección en aula a cargo del profesor. La UI infantil y `/pendientes` están solo en Play. ADMIN no recibe lectura nominal ni revelado. Gates institucionales y uso real bloqueados. Contrato canónico del refinamiento: backend `docs/aula-acuse.md`, base backend d867879 y cambios locales observados en `runtime/service.ts` (autenticación/receipt), `runtime/routes.ts` y generador OpenAPI. No hay migración ni cambio de sobres.

## Fuentes backend observadas

Worktree `/tmp/opencode/kudlab-backend-j03`, base anterior más cambios J-03 (no atribuidos al commit base): `docs/{integracion-play,integracion-play-verificacion,acceso-codigo}.md`, contexto INDEX/producto/arquitectura/decisiones/pendientes/Tareas/asignación/ejecución, constitución, `src/app.ts`, `src/auth/{auth,session-guard}.ts`, `src/modules/academico/{shared/academic-auth,shared/participation,groups/groups.service}.ts`, `src/modules/tareas/runtime/{contract,dto,security,access-security,access-limit,service,routes,errors}.ts`, publicación de catálogo, `src/db/schema/{game,access}.ts`, migraciones `0010…0012`, `src/modules/evolucion/{tg01,processor}.ts`, generador contractual y OpenAPI. Contrato de negocio canónico: backend `docs/acceso-codigo.md`, no lógica paralela frontend.

## Diseño y pruebas

Se conservan componentes locales Base UI, marca/tokens/manual y navegación propia; sin dependencias nuevas. Skills ui-ux-pro-max (pegado/campo único/foco/estados) y design-taste-frontend (extensión de sistema existente, sin nuevo sorteo visual). MCP shadcn no disponible: `opencode mcp list` reportó ninguno y discovery no encontró herramientas; se consultó documentación oficial Base UI de Alert Dialog, sin instalar componentes. Ponytail no cargó mediante herramienta; se leyó su copia versionada, sin atribuir carga exitosa.

`npm test` solo verifica tipos. Funcionales: test:auth/usuarios/tareas/estudiantes. Nuevas pruebas de contrato del cliente en `tests/tareas/access-codes.test.mjs`. Recorrido API/PostgreSQL/builds reales en Play `tests/integration/access-code.spec.ts`, más regresión supervisada. Resultados observados y limitaciones: backend `docs/acceso-codigo-verificacion.md`. No declarar validación pedagógica/WCAG por compilar ni pruebas físicas no ejecutadas.
