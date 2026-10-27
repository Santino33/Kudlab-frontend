# Kudlab Frontend

**J-02:** asignaciones, inicio supervisado con Kudlab Play 1.1, consulta individual
de sesiones/evidencia/indicadores y recuperación de envíos. Entrega técnica con
datos ficticios y BD aislada, sin acceso por códigos ni habilitación con menores.
Requiere el backend J-02 y Play de la misma entrega. [Contrato UI, fuentes y límites](docs/specs/tareas/02-integracion-play.md).
Las exclusiones históricas de ejecución que siguen describen las iteraciones anteriores.

Base de la SPA de Kudlab con React, TypeScript, Tailwind CSS y Vite, gestionada con npm. Kudlab es un piloto de apoyo al seguimiento pedagógico; no produce diagnósticos clínicos ni sustituye la evaluación curricular. El producto y las reglas de negocio se consultan en el backend, no se redefinen aquí.

**Estado:** dashboard por rol y pantallas de Usuarios implementados: listado,
invitación, detalle, edición, recuperación y confirmaciones de acceso, además de
la autenticación heredada. ADMIN gestiona profesores; TEACHER no tiene gestión.
La validación todavía no está cerrada ni habilita despliegue/piloto: ver
[evidencia y pendientes](specs/001-autenticacion-personal/validation.md).

## Requisitos e instalación

**Cursos en esta rama:** sidebar e inicio usan «Mis cursos». ADMIN crea/edita/elimina cursos vacíos y asigna profesor; TEACHER gestiona estudiantes dentro de sus cursos, incluido registro. Requiere la rama backend `feat/cursos-y-estudiantes`, no solo su `main` base. Transferencia con confirmación; ADMIN sin acceso a registros estudiantiles. [Contrato, fuentes, pruebas y límites](docs/specs/academico/02-cursos.md).

**Vertical 01 en esta rama:** catálogo `/tareas` y ficha `/tareas/:taskId`
conectados a API/persistencia reales para ADMIN y TEACHER activos. TG-01 no se
presenta como integrada ni asignable; no hay ejecución ni segundo juego ficticio.
Requiere el PR backend de la misma feature, que incluye P-01/P-02 en `518e88b`.
Las menciones históricas inferiores de Tareas excluida/arreglos sin commit no
describen esta rama. Ver [spec, pruebas y límites](docs/specs/tareas/01-catalogo-y-ficha.md).

- Node.js 24 (`>=24 <25`) y npm.
- Tipos, pruebas Node y build no requieren backend. Para integrar se necesita el
  backend corregido descrito abajo y una base exclusiva; no usar bases compartidas.

```bash
npm ci
npm run dev
```

Configurar localmente `VITE_API_ORIGIN` siguiendo [.env.example](.env.example)
y abrir `http://localhost:5173`. El perfil aprobado usa API `http://localhost:3000`,
Fetch con cookies y CORS/trustedOrigins para la SPA exacta; no hay proxy a 3001.
Sin origen válido no se hacen solicitudes y se muestra un error de configuración.
Sin API se muestra acceso no comprobado, no un login operativo. No arrancar backend
contra una base compartida ni asumir que el puerto identifica la revisión correcta.

## Verificación y compilación

```bash
npm test
npm run test:auth
npm run test:usuarios
npm run test:tareas
npm run test:estudiantes
npm run build
npm run preview
```

`npm test` solo comprueba tipos, incluido el harness. `test:auth` usa Node 24/node:test
para lógica pura con fetch/reloj inyectados; no sustituye DOM, lector de pantalla o API.
`build` verifica tipos y genera `dist/`; `preview` no es servidor productivo ni del harness.
Recetas de navegador, integración y límites en [quickstart](specs/001-autenticacion-personal/quickstart.md).

## Estructura

- `src/main.tsx`: frontera Vite/StrictMode; `src/App.tsx`: destinos finitos y AuthRoot único.
- `src/auth/`: estado, transporte fetch, controlador por raíz y presentación nativa.
- `tests/auth/`: pruebas Node; `tests/browser/auth-harness.html`: fixture manual con
  AuthRoot real y fetch sin red, solo Vite desarrollo y fuera del build productivo.
- `src/styles.css`: entrada Tailwind; `vite.config.ts` y `tsconfig.json`: configuración mínima.
- `src/features/usuarios/`: dashboard, pantallas, operaciones, tipos y rutas; `src/lib/http.ts`: transporte de negocio generacional.
- Organización actual: `usuarios/accounts/` agrupa gestión de cuentas; `usuarios/recovery/`, recuperación; `usuarios/workspace/`, marco e inicio por rol. `src/lib/navigation.ts` conserva la raíz autenticada al navegar entre destinos protegidos.
- [Revisión integral de interfaz y flujos](docs/design/ui-flow-review.md): hallazgos, cambios, fuentes y límites de la validación con datos ficticios.
- [AGENTS.md](AGENTS.md): reglas obligatorias para agentes.
- [Índice de contexto](docs/agent-context/INDEX.md): cómo consultar el backend canónico.
- [Manual de diseño para agentes](docs/design/agent-design-manual.md): base visual aprobada, colores confirmados y decisiones pendientes.
- [Usuarios](docs/agent-context/modules/usuarios/module-summary.md): recorridos documentados e inventario real de capacidades.
- [Plantilla de spec frontend](docs/specs/TEMPLATE.md): experiencia de interfaz y trazabilidad, no lógica de negocio duplicada.

## Backend y límites

`[RUTA_LOCAL_DEL_BACKEND]` representa `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`. El índice explica los enlaces locales y cómo adaptarlos en otra máquina. No se copian las fuentes del producto a este repositorio.

Autenticación usa cookie HttpOnly, origen público explícito y `credentials: include`.
Envía `rememberMe: false` sin selector y cierre JSON `{}`; después de login comprueba
la sesión antes de mostrar datos. Sin tokens/identidad en almacenamiento web,
JWT, polling ni secretos `VITE_*`. HTTPS/topología/cookies siguen como gate operativo.
SMTP y bootstrap son backend. Invitación/cambio de correo no se canjean;
recuperación implementada con envío explícito y token efímero.

Esta iteración excluye Académico, Tareas, Evolución y Seguimiento. No contempla login de estudiantes. Documentar una capacidad backend no aprueba su inclusión en el piloto ni implementa su interfaz.

## Flujo SDD con Spec-Kit

Spec-Kit 1.0.13 está inicializado para OpenCode con scripts Bash. La configuración y las plantillas están en `.specify/`; los diez comandos locales están en `.opencode/commands/`. No requiere dependencias npm adicionales. Si los comandos no aparecen, volver a abrir el proyecto en OpenCode desde el worktree correspondiente.

Orden de trabajo:

1. `/speckit.constitution`: mantener los principios del frontend respetando `AGENTS.md` y las fuentes backend. La constitución 1.0.0 fue ratificada explícitamente el 2026-10-25; futuras enmiendas requieren revisión y aprobación.
2. `/speckit.specify <feature>`: especificar la experiencia de interfaz, citando contexto,
   spec/contrato y código backend comprobado. Los artefactos viven bajo `specs/`;
   [autenticación del personal](specs/001-autenticacion-personal/spec.md) tiene spec,
   plan, tareas e implementación local con aceptación aún pendiente.
3. `/speckit.clarify` si quedan ambigüedades; después `/speckit.plan` y `/speckit.tasks`.
4. `/speckit.analyze` para revisar consistencia antes de `/speckit.implement`, una vez aprobado el alcance correspondiente.

`docs/agent-context/` conserva contexto y recorridos candidatos; `docs/specs/TEMPLATE.md` es una guía de trazabilidad frontend, no reemplaza las plantillas de Spec-Kit ni implica que ya existan specs ejecutadas. No iniciar una feature desde los ejemplos genéricos de las plantillas sin consultar primero `AGENTS.md`. La inicialización no define decisiones de producto, no crea pantallas ni implementa autenticación.

La integración requiere las [correcciones backend P-01/P-02](specs/001-autenticacion-personal/backend-fixes.md),
todavía locales y sin merge a main. No apuntar a main sin revisar esos cambios.
Implementación y casillas reales en [tasks](specs/001-autenticacion-personal/tasks.md);
faltan validaciones detalladas en el informe, no se declara piloto listo.

## Implementación incremental de Usuarios

En `feat/gestionar-usuarios` se incorporó `main@664cc5c` mediante merge `e45b05d`,
conservando autenticación, componentes gráficos, pruebas y constitución. Ver
[plan](specs/001-gestionar-usuarios/plan.md), [tareas](specs/001-gestionar-usuarios/tasks.md)
y [preparación verificada](specs/001-gestionar-usuarios/revalidacion-plan.md#preparación-del-worktree-para-desarrollo).
Dashboard extensible mediante descriptores tipados en `src/features/usuarios/dashboard.ts`,
sin agregar router ni dependencias. 44/57 tareas completadas; validación manual integral pendiente.
Ver [pantallas y evidencia](specs/001-gestionar-usuarios/evidence/screens-implementation.md).
Verificación actual: 66 pruebas auth + 70 Usuarios, tipos y build correctos.
Revisión local en ejecución: SPA `http://localhost:5187/`, API `http://localhost:3002`,
base desechable y correo capturado; no reemplaza el perfil aprobado 5173/3000.

Revisión visual posterior en `feat/design-usuarios`: navegación móvil plegable,
dashboard sin tarjetas decorativas repetidas y listado móvil legible. `/sesion`
retirada por decisión del responsable; el inicio resuelve ADMIN/TEACHER desde la
sesión confirmada. Skills instaladas localmente en el worktree, no globalmente.
Ver [comparación y comprobaciones](specs/001-gestionar-usuarios/evidence/design-review.md).

Corrección posterior: el sidebar artesanal fue sustituido por la composición
oficial shadcn/Base UI, adaptada al manual, con borde izquierdo en `0px` y Sheet
móvil. Ver [fuentes y comprobaciones](specs/001-gestionar-usuarios/evidence/sidebar-review.md).

Recuperación refinada: solicitud, confirmación neutra, nueva contraseña con
mostrar/ocultar, validación, enlace no utilizable, errores e incertidumbre y retorno
al acceso. [Prueba SMTP real autorizada y límites](specs/001-gestionar-usuarios/evidence/recovery-review.md).
Vista de este ensayo: `http://localhost:5188/recuperar-acceso`, API SMTP 3004 y
base desechable **separada**; no reemplaza los servicios previos 5187/3002 ni el
perfil aprobado 5173/3000. Un envío aceptado no confirma recepción en el buzón.
Ver [reconstrucción autorizada y conexión real](specs/001-gestionar-usuarios/evidence/backend-restored.md):
P-01/P-02 disponibles en worktree backend separado, 154/154 pruebas y validación
SPA/API parcial; T018 aún pendiente de completar. No usar backend main como sustituto:
los arreglos siguen locales y sin merge.
Se mantienen canjes de invitación/correo bloqueados y ascensos, auditoría visible y
reactivación diferidos. No se declara esta entrega completa ni lista para piloto.
