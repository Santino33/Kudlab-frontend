# Kudlab Frontend

Plataforma docente del piloto Kudlab: React, TypeScript, Tailwind CSS y Vite, con npm. ADMIN y TEACHER son roles del personal; no hay cuentas STUDENT. La experiencia infantil y el acceso público por código pertenecen a Kudlab Play.

El producto apoya seguimiento pedagógico; no produce diagnósticos clínicos ni sustituye evaluación curricular. Las builds y pruebas con datos sintéticos no habilitan uso con menores reales.

## Requisitos e instalación

- Node.js 24 (`>=24 <25`) y npm.
- Para integración, backend compatible y entorno autorizado. Las pruebas lógicas y build no requieren API ni PostgreSQL.

```bash
npm ci
npm run dev
```

Configurar `VITE_API_ORIGIN` según [.env.example](.env.example). Perfil habitual: frontend `http://localhost:5173`, API `http://localhost:3000`. La API debe permitir el origen exacto y cookies de sesión; no hay proxy implícito a otro puerto. Sin origen válido no se envían solicitudes; sin sesión comprobada no se muestra contenido protegido.

Ver [operación, seguridad y límites](docs/operations.md). No usar una base compartida ni suponer que el puerto identifica la revisión de un servicio.

## Docker Desktop: los tres proyectos

Con los Dockerfile correspondientes presentes en backend y Play:

```bash
npm run docker:setup -- /ruta/Kudlab-backend /ruta/Kudlab-play
npm run docker:up
npm run docker:status
npm run docker:check
```

El grupo `kudlab-local` incluye API, frontend, Play y PostgreSQL aislado. Frontend: `http://localhost:5173`; API/docs: `http://localhost:4300/docs`; Play: `http://127.0.0.1:4178`. La configuración y contraseña inicial están en `.env.docker`, ignorado y privado. `npm run docker:down` detiene el grupo sin eliminar su base.

El correo queda pendiente hasta configurar SMTP y las partidas siguen bloqueadas por las restricciones normales del backend. [Guía de operación y persistencia](docs/docker-local.md).

### TG-01 con datos ficticios

Con aislamiento comprobado y autorización del operador, el setup admite:

```bash
# Instalación nueva, exclusivamente con datos sintéticos:
npm run docker:setup -- /ruta/Kudlab-backend /ruta/Kudlab-play --synthetic-local --confirm-synthetic-data
# Configuración existente: agregar solo claves/ajustes faltantes:
npm run docker:setup -- --extend-synthetic-local --confirm-synthetic-data
```

La confirmación declara que la BD solo contiene datos ficticios; el nombre local
por sí solo no lo demuestra. El segundo comando conserva rutas, puertos, secretos
y permisos privados. Si encuentra ajustes explícitamente desactivados, claves
inválidas o compartidas, se detiene para revisión sin rotarlos ni sobrescribirlos.
Sin opt-in, Compose mantiene desactivados el modo sintético y los códigos.

El backend valida development, BD local autorizada y orígenes loopback. Tras
autorizar migraciones/arranque y comprobar el entorno, preparar TG-01 mediante
`npm run game:prepare-local` dentro del backend configurado (o `docker --context
desktop-linux compose --env-file .env.docker exec backend npm run game:prepare-local`).
Es una operación explícita/idempotente, ajena al arranque. La regla metodológica
permanece PROPOSED; no habilita uso real. Nuevos estudiantes activos pueden recibir
asignaciones; inactivarlos bloquea nuevas operaciones. No se modifican los antiguos.

Para reiniciar servicios ya preparados sin borrar datos: `docker --context
desktop-linux compose --env-file .env.docker restart`. Cambios de código requieren
reconstrucción autorizada. No eliminar volúmenes ni datos del navegador. Desactivar
`KUDLAB_LOCAL_SYNTHETIC_ENABLED` restaura la política normal conservando evidencia.
SMTP y cuentas docentes siguen requiriendo preparación del operador; el setup no
crea docentes ni simula consentimiento. `docker:check` comprueba solo humo técnico.

El detalle docente muestra el resumen de la sesión y los resultados por sesión y
partes, con una ayuda breve por columna. No recalcula indicadores; los datos ausentes
siguen diferenciados de cero. La ficha del estudiante lista sus asignaciones
(individuales y colectivas). La actividad se juega solo en Kudlab Play por código:
este frontend no la ejecuta y solo conserva la recuperación de un envío histórico.

## Capacidades y límites

- Usuarios: acceso, sesión, cierre, gestión docente de cuentas e invitaciones, edición y recuperación. La aceptación de invitación/cambio de correo y otros flujos deben comprobarse contra la API y alcance implementados; no se habilitan por documentarlos.
- Cursos/estudiantes: ADMIN gestiona cursos y asigna profesor; TEACHER opera los registros de sus cursos según autorización del servidor. ADMIN no recibe acceso implícito a datos estudiantiles.
- Tareas: catálogo, asignaciones, integración supervisada con Play, consulta individual de sesiones/evidencia e indicadores y recuperación de envíos.
- Códigos: gestión/distribución individual de cinco caracteres alfanuméricos; la entrada pública y `/pendientes` viven en Play. El acuse perdido se comprueba allí, no con una acción docente adicional.

Las API, orígenes y versiones de los tres servicios deben ser coherentes. No mezclar perfiles locales con puertos/bases diferentes. El servidor mantiene la autoridad sobre rol, ámbito, participación y estado; ocultar controles no autoriza operaciones.

## Verificación y compilación

```bash
npm test
npm run test:auth
npm run test:usuarios
npm run test:tareas
npm run test:estudiantes
npm run test:docker
npm run test:browser-driver
npm run build
npm run preview
```

`npm test` solo comprueba tipos, incluidos los harnesses TSX. Las suites Node prueban lógica con transporte/reloj/datos sintéticos; no sustituyen API real, DOM ni accesibilidad manual. `test:browser-driver` comprueba imports y un navegador real cuando existe; no instala skills. Ver [recorridos de navegador](tests/browser/README.md).

`build` genera `dist/`; `preview` no es servidor productivo ni aplica por sí mismo las cabeceras del hosting. Los harnesses de `tests/browser/` no se incluyen en el artefacto productivo. La preparación para entrega requiere comprobar URLs reales, HTTPS, cookies/CORS, cabeceras y pruebas de aceptación en el entorno final.

## Estructura

- `src/main.tsx`, `src/App.tsx`: entrada SPA y raíz autenticada.
- `src/auth/`: estado, transporte de sesión y presentación de acceso.
- `src/features/`: áreas docentes de Usuarios, Académico y Tareas.
- `src/lib/`: navegación y transporte de negocio con control de generaciones.
- `tests/`: regresión lógica, harnesses de navegador y verificación Docker.
- `scripts/`: cabeceras de build y preparación de composición local.
- `docs/`: guías técnicas independientes del entorno personal de desarrollo.

Las herramientas personales y documentos de planificación no son dependencias de ejecución, compilación o pruebas ni se distribuyen con este repositorio.
