# Docker Desktop: operación local de Kudlab

## Alcance

Ejecuta Backend, Frontend, Play y PostgreSQL sin simulador ni participación sintética. Es desarrollo local, no despliegue productivo ni habilitación para menores reales. Los clientes son builds estáticas con nginx sin privilegios; la API usa Node 24. Los cambios de código requieren reconstrucción, no hay HMR.

## Arranque

Requisitos: Docker Desktop abierto, contexto `desktop-linux`, Docker Compose, Node 24 y npm. Los tres checkouts deben incluir sus Dockerfile. Desde la raíz frontend:

```bash
npm run docker:setup -- /ruta/Kudlab-backend /ruta/Kudlab-play
npm run docker:up
npm run docker:status
npm run docker:check
```

`docker:setup` valida los proyectos y crea `.env.docker` con permisos `0600`, claves aleatorias independientes y rutas absolutas. No imprime secretos ni sobrescribe archivos existentes. `.env.docker.example` es una plantilla del generador, no una configuración lista para copiar.

| Servicio | Dirección |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:4300/docs |
| Play | http://127.0.0.1:4178 y `/pendientes` |
| PostgreSQL | Solo red interna Docker, sin puerto publicado |

El puerto API 4300 evita desplazar servicios previos en 3000. Cambiar puertos requiere reconstruir clientes: `VITE_*` se fija en compilación. No intercambiar `localhost` y `127.0.0.1`: los orígenes docente y Play se separan deliberadamente. Cambiar el origen puede dejar inaccesibles pendientes IndexedDB anteriores; conservarlo si hay evidencia pendiente.

El bootstrap normal crea únicamente `admin@kudlab.example.edu.co` si la base está vacía. Su contraseña está en `BOOTSTRAP_ADMIN_PASSWORD` de `.env.docker`; no compartirla en chats/logs. Cambiar esa variable no modifica una cuenta existente. No se inyectan profesores, cursos, estudiantes, consentimientos ni juegos habilitados.

## Persistencia y seguridad

- PostgreSQL 17 usa el volumen propio `kudlab-local_postgres-data`; no se conecta a bases previas. La API espera su healthcheck, aplica migraciones y ejecuta bootstrap.
- `npm run docker:down` elimina contenedores/red, **no el volumen**. `docker:up` reutiliza datos. No usar `down -v`, `volume rm` ni `prune` como parada habitual: destruyen datos.
- Conservar configuración privada y BD juntas. No regenerar claves sobre un volumen existente ni perder `.env.docker`.
- Puertos publicados solo en `127.0.0.1`; los navegadores usan los orígenes públicos y solo la API usa el DNS interno `postgres`.
- Los secretos se reciben únicamente en la API en ejecución; los clientes solo reciben orígenes públicos. No publicar `docker inspect`, `compose config` sin `--quiet`, dumps, `.env.docker` ni perfiles del navegador.
- nginx aplica CSP, nosniff, Referrer-Policy, Permissions-Policy y no-cache. Los assets no usan fallback HTML y `_headers` no se publica. Play solo resuelve `/pendientes` a su shell; worker/licencias proceden de su build.
- Los access logs nginx están desactivados para no registrar URLs con tokens. Los secretos siguen siendo accesibles al operador del motor Docker.

## Límites

**Correo:** `smtp.invalid` no es operativo. Configurar SMTP real y recrear API antes de esperar invitaciones/recuperación entregadas. Se conserva TLS y validación de certificados. No habilitar `MAIL_MODE=capture` en desarrollo ni hacer envíos reales sin autorización. `/accept` y `/change-email` en configuración no crean pantallas frontend nuevas.

**Partidas:** la composición normal conserva participación `UNAVAILABLE` y `GAME_ACCESS_ENABLED=false`. Cargar Play no autoriza jugar ni cierra consentimiento, metodología, retención o distribución. Una demostración completa necesita configuración sintética separada y alcance aprobado.

## Verificación

`npm run test:docker` verifica el generador sin arrancar contenedores. `npm run docker:check` requiere la composición activa y comprueba salud/recursos HTTP y sesión con sus credenciales locales, sin imprimirlas. No sustituye la regresión integral, correo real, una partida ni validación metodológica o despliegue HTTPS.
