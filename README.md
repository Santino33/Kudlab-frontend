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
