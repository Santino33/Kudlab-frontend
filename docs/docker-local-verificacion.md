# Verificación · Docker local

Fecha: **2026-10-28**. Solo entorno local y cuenta de bootstrap ficticia.

## Entorno y cambios

- Frontend: `/home/santino/.local/share/opencode/worktree/c4fd7d/docker-three-projects`,
  base `079b9be`, rama `feat/docker-local`.
- Backend: `/home/santino/.local/share/opencode/worktree/kudlab-backend/docker-three-projects`,
  base `65d0ad67b1a87b52dcc251f807595fad016e65b9`, rama `feat/docker-local`.
- Play: `/home/santino/.local/share/opencode/worktree/kudlab-play/docker-three-projects`,
  base `8b883081d12990246eaf9f2327a7e1a6bbbf815d`, rama `feat/docker-local`.
- Cambios verificados antes de publicar commits/PR (sin merge): Dockerfile y exclusiones en cada repositorio;
  nginx en los clientes; Compose, generador privado, pruebas y guía en frontend.
  Backend ya tenía `.dockerignore`: se conservaron sus exclusiones y se ampliaron.
  Sin cambios en código de negocio ni en `package-lock.json`.
- Docker Desktop respondió mediante su socket propio. El motor `default` devolvía
  error de permisos; no se modificó ni se utilizó. Los contenedores preexistentes
  quedaron fuera de las operaciones.
- Grupo **`kudlab-local`**: `backend`, `frontend`, `play`, `postgres`, todos saludables.
  Puertos loopback 4300, 5173 y 4178; PostgreSQL no publicado.

## Comandos y resultados

| Comprobación ejecutada | Resultado |
| --- | --- |
| `opencode mcp add docker --global …`, `opencode mcp list` | Servidor comunitario 0.3.0 conectado; configuración ajena preservada por CLI |
| MCP `docker.list_containers` con filtro de proyecto | Cuatro servicios running/healthy, puertos correctos |
| `npm run docker:setup -- <backend-worktree> <play-worktree>` | `.env.docker` creado; ignorado por Git, permisos 0600, secretos no impresos |
| `docker --context desktop-linux compose --env-file .env.docker config --quiet` | Configuración válida sin volcar secretos |
| `npm run docker:up` | Tres imágenes construidas; migraciones/bootstrap y cuatro healthchecks correctos |
| Frontend: `npm ci`, `npm test`, `npm run build` | Correctos; `npm test` comprueba **solo tipos** |
| Frontend: `test:auth`, `test:usuarios`, `test:tareas`, `test:estudiantes` | 66 + 72 + 31 + 26 = **195 pruebas** correctas |
| `TMPDIR=/tmp/opencode npm run test:docker` | **4 pruebas**: generación privada, claves independientes/no impresión, no sobrescritura, rutas/archivos requeridos |
| `npm run docker:check` | **2 pruebas smoke** contra contenedores reales; no equivalen a toda la regresión funcional |
| Backend: `SCARF_ANALYTICS=false npm ci`, `npm run typecheck`, `npm run docs:check` | Correctos; **22 pruebas** documentales |
| Play: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:production` | Correctos; **61 pruebas**; build sin simulador/bypass/fixtures/CDN |
| Parada `compose down` y nuevo `compose up -d --wait` | La consulta interna de IDs de `user_accounts` conservó exactamente la cuenta anterior; no se borró volumen |
| `npm run docker:check` después de recrear contenedores | Correcto; login/logout funcionan sobre los datos persistidos |
| `git diff --check` en los tres repositorios | Sin errores de espacios |

Las smoke verifican HTML/assets/CSP, nosniff, referrer, no-cache, enlaces profundos,
`/pendientes`, `/sw.js`, ausencia pública de `_headers`, simulador y `.env` en Play,
Swagger, denegación anónima, CORS docente y preflight runtime sin cookies, login,
consulta de sesión ADMIN y revocación efectiva al cerrar. Leen la contraseña solo
desde el archivo local para enviarla a la API local; no la imprimen ni la pasan
a herramientas MCP.

Se abrieron frontend y Play en el navegador real mediante sus URLs Docker.
Frontend mostró el acceso del profesorado y Play su entrada por código; también
se abrió `/pendientes`. La consola docente mostró únicamente el 401 esperado de
`get-session` sin cookie; la entrada de Play no mostró errores de consola.
El login/logout se comprobó por HTTP, no mediante interacción del formulario.

La primera build de Play falló al excluir `tests/`: su configuración TypeScript
incluye configuraciones de Vite/Playwright que importan utilidades de pruebas.
Se corrigió conservándolas **solo en la etapa de build**. La imagen final copia
únicamente `dist/` y nginx; no publica el simulador ni el repositorio.

## Riesgos y límites pendientes

- `npm audit` backend informó **8 vulnerabilidades existentes: 7 moderadas y 1
  alta**. La alta afecta a `zod` 4.3.6; también aparecen `drizzle-kit`,
  `@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `esbuild`, `fast-uri`,
  `nodemailer` y `smtp-server`. No se ejecutó `npm audit fix` ni se cambiaron
  dependencias: requieren revisión aparte, no un downgrade automático de Drizzle.
- npm informó paquetes de instalación no cubiertos por `allowScripts` y
  deprecaciones heredadas de esbuild-kit. No se cambió la política de instalación.
- No se ejecutó la suite completa destructiva de integración backend ni las
  suites Playwright de J-02/J-03. No se probó una partida, correo real, usuarios
  TEACHER, menores reales, consentimiento, metodología, carga o despliegue HTTPS.
- No hay proveedor SMTP configurado y el modo normal sigue bloqueando partidas.
  No se habilitó transporte J-03 ni se migraron pendientes de otros orígenes.
- No se realizó un escaneo de seguridad de imágenes ni se cerró preparación
  productiva. Las etiquetas de imágenes fijan familia/versión, no digest inmutable.
- El MCP comunitario puede operar sobre todo Docker Desktop; las operaciones de
  esta entrega se limitaron al grupo nuevo. Mantener esa restricción operativa.

Fuentes y decisiones confirmadas: [guía y trazabilidad](docker-local.md).
