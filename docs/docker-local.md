# Docker Desktop · Kudlab local

## Alcance confirmado

El responsable eligió **desarrollo normal** el 2026-10-28: ejecutar backend,
frontend y Play, sin runner de demostración ni participación sintética. No se
modifican UI, reglas, rutas, permisos ni contratos API. La plataforma docente
conserva ADMIN/TEACHER; Play sigue siendo una aplicación separada.

La composición sirve builds estáticas con nginx sin privilegios y Node 24 para
la API. Es un entorno **local**, no un despliegue productivo ni una habilitación
para menores reales. Los cambios de código requieren reconstrucción, no hay HMR.

## Arranque

Requisitos: Docker Desktop abierto, contexto `desktop-linux`, Docker Compose,
Node 24 y npm. Los tres checkouts deben contener los Dockerfile de esta entrega.
Desde la raíz frontend:

```bash
npm run docker:setup -- /ruta/Kudlab-backend /ruta/Kudlab-play
npm run docker:up
npm run docker:status
npm run docker:check
```

`docker:setup` valida los proyectos y crea `.env.docker` con permisos `0600`,
claves aleatorias independientes y rutas absolutas. No imprime secretos ni
sobrescribe archivos existentes. El ejemplo `.env.docker.example` es una plantilla
del generador, no una configuración lista para copiar.

| Servicio en `kudlab-local` | Dirección pública exacta |
| --- | --- |
| frontend | http://localhost:5173 |
| backend | http://localhost:4300/docs |
| play | http://127.0.0.1:4178 y `/pendientes` |
| postgres | Solo red interna Docker; sin puerto publicado |

La API usa 4300 para no desplazar el proceso preexistente en 3000. Cambiar puertos
en `.env.docker` requiere `docker:up` para reconstruir ambos clientes: `VITE_*`
se fija en compilación. No intercambiar `localhost` y `127.0.0.1`: se separan
deliberadamente los hosts del entorno docente y de Play. Cambiar el origen puede
dejar inaccesibles pendientes de IndexedDB del origen anterior; conservarlo si
hay evidencia pendiente.

El bootstrap normal crea **solo** `admin@kudlab.example.edu.co` en una base vacía.
Su contraseña está en `BOOTSTRAP_ADMIN_PASSWORD` dentro de `.env.docker`; abrir
ese archivo localmente, no pegarlo en chats o logs. Cambiar esa variable después
no cambia una cuenta existente. No se crean profesores, cursos, estudiantes,
consentimientos ni juegos habilitados mediante fixtures.

## Persistencia, seguridad y operación

- PostgreSQL 17 tiene volumen propio `kudlab-local_postgres-data`. No se conecta a
  bases previas. La API espera a PostgreSQL saludable y aplica migraciones antes
  del bootstrap. Los clientes esperan a la API saludable.
- `npm run docker:down` elimina contenedores/red del grupo, **no su volumen**.
  `docker:up` reutiliza los datos. No usar `down -v`, `volume rm` ni `prune` para
  una parada habitual; destruirían datos. No regenerar claves sobre un volumen
  existente ni perder `.env.docker`: conservar configuración y BD juntas.
- Los puertos se publican únicamente en `127.0.0.1`. El navegador utiliza los
  orígenes públicos; solo la API usa el DNS Docker `postgres`.
- `.dockerignore` excluye `.env*`, Git y dependencias locales. Solo la API recibe
  secretos en ejecución. Los clientes solo reciben orígenes públicos.
- nginx aplica CSP, Referrer-Policy, nosniff, Permissions-Policy y no-cache,
  equivalentes a los generadores actuales de `_headers`. `/assets/*` no usa
  fallback HTML, `_headers` no se publica y Play solo resuelve `/pendientes` al
  shell. La política local mantiene no-cache también en assets; no introduce
  caché immutable adicional. El worker y las licencias se sirven desde su build.
- Los access logs de nginx están desactivados para no registrar URLs con tokens.
- Los secretos de entorno siguen siendo accesibles al operador del motor Docker.
  No publicar salidas de `docker inspect`, `compose config` sin `--quiet`, dumps,
  `.env.docker` o perfiles del navegador. El MCP no recibe credenciales.

### Límites que permanecen

**Correo pendiente:** `smtp.invalid` es un destino reservado no operativo;
credenciales ficticias permiten validar el arranque sin usar un proveedor real.
Invitaciones, cambio de correo y recuperación no pueden entregar mensajes hasta
configurar `MAIL_HOST/PORT/USER/PASSWORD/FROM` y recrear la API. Se conserva TLS
obligatorio y validación de certificados. No se habilita `MAIL_MODE=capture` en
desarrollo ni se hicieron envíos reales. Los canjes de invitación/correo siguen
fuera del alcance frontend actual; `/accept` y `/change-email` son destinos de
configuración heredados de las fixtures backend, no pantallas nuevas.

**Partidas bloqueadas:** la composición normal conserva participación
`UNAVAILABLE` y `GAME_ACCESS_ENABLED=false`. Que Play cargue no autoriza jugar.
No se publica/habilita TG-01 ni se cierran consentimiento, metodología, retención
o distribución por ejecutar contenedores. Si se necesita una demostración
completa, requiere una configuración sintética separada y aprobación de alcance.

## MCP instalado

Se añadió a la configuración **global del usuario** de OpenCode
`~/.config/opencode/opencode.jsonc` el servidor comunitario
[`ckreiling/mcp-server-docker`](https://github.com/ckreiling/mcp-server-docker),
fijado a `0.3.0`, mediante:

```bash
opencode mcp add docker --global \
  --env DOCKER_HOST=unix:///home/santino/.docker/desktop/docker.sock \
  -- uvx mcp-server-docker==0.3.0
opencode mcp list
```

`uvx` y Docker MCP Toolkit ya estaban instalados. Este MCP administra Docker;
el Toolkit/Gateway oficial sirve para conectar otros servidores MCP y no es el
servidor instalado aquí. El socket anterior es específico de esta máquina:
resolver la ruta propia en otra instalación. No se cambió el contexto global
Docker ni permisos del socket del motor `default`.

El MCP tiene capacidad de administrar **todo el motor Desktop**, no solo este
grupo; no es una frontera de seguridad. Usar filtros por etiqueta
`com.docker.compose.project=kudlab-local` y no actuar sobre otros contenedores.
Su conexión y una lectura real de contenedores quedaron comprobadas. OpenCode
recargó la configuración sin reiniciar; `/reload` solo si no aparecen herramientas.

## Fuentes consultadas y trazabilidad

Revisión 2026-10-28. Bases: frontend `079b9be`, backend
`65d0ad67b1a87b52dcc251f807595fad016e65b9`, Play
`8b883081d12990246eaf9f2327a7e1a6bbbf815d`.
Se trabaja en ramas `feat/docker-local` de worktrees nuevos,
sin modificar los checkouts originales ni la carpeta no versionada
`Kudlab-play/especificaciones-juegos/`. En backend/Play solo se añaden archivos
Docker y documentación; no se infiere disponibilidad de una API por su spec.

Backend canónico local: `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`.
Archivos consultados (contenido de la base indicada, antes de cambios Docker):

- `README.md`, `docs/agent-context/INDEX.md`,
  `docs/agent-context/unresolved-issues.md`,
  `docs/agent-context/modules/usuarios/module-summary.md`,
  `docs/agent-context/modules/usuarios/features/autenticacion.md`.
- `docs/integracion-play.md`, `docs/acceso-codigo.md`: composición normal frente
  a runner sintético, configuración, orígenes y pendientes vigentes.
- `src/index.ts`, `src/app.ts`, `src/config/env.ts`, `src/auth/auth.ts`:
  arranque/montaje, CORS y validación **observados en código**, no contratos propuestos.
- `src/modules/usuarios/shared/transactional-mail.ts`,
  `src/scripts/bootstrap-admin.ts`,
  `src/modules/academico/shared/participation.ts`: TLS, bootstrap y bloqueo normal.
- `src/modules/tareas/runtime/routes.ts`: ruta runtime existente para comprobar
  el preflight CORS sin crear sesiones ni canjear códigos.
- `package.json`, `.env.example`, `drizzle.config.ts`, `tsconfig.json`,
`tests/setup.ts` y `.dockerignore` preexistente: comandos, variables, migraciones y valores de pruebas; las
  fixtures no se convierten en una política productiva.

Frontend: `AGENTS.md`, `docs/agent-context/INDEX.md`, `.env.example`, `README.md`,
`package.json`, `vite.config.ts`, `scripts/build-headers.mjs`,
`tests/browser/serve-build.mjs`, referencias SMTP de
`specs/001-autenticacion-personal/backend-validation.md` y `backend-fixes.md`,
y pendientes de `specs/001-gestionar-usuarios/{revalidacion-plan,fuentes-backend}.md`.
Play: `README.md`, `.env.example`, `package.json`, `tsconfig.json`, `vite.config.ts`,
`scripts/{build-sw,check-production,serve-production}.mjs`. Los servidores de
verificación existentes solo escuchan loopback y no sustituyen el nginx añadido.

Configuración MCP contrastada con [OpenCode V2](https://opencode.ai/v2/docs/mcp-servers),
[Docker MCP Toolkit](https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/),
[Gateway](https://docs.docker.com/ai/mcp-catalog-and-toolkit/mcp-gateway/) y README
del servidor comunitario. Se evaluó también `ofershap/mcp-server-docker`, pero no
se instaló. No se usaron skills de diseño: no se modifica interfaz gráfica.

Resultados y límites de las comprobaciones: [verificación local](docker-local-verificacion.md).
