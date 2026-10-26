# Kudlab Frontend

Base de la SPA de Kudlab con React, TypeScript, Tailwind CSS y Vite, gestionada con npm. Kudlab es un piloto de apoyo al seguimiento pedagógico; no produce diagnósticos clínicos ni sustituye la evaluación curricular. El producto y las reglas de negocio se consultan en el backend, no se redefinen aquí.

**Estado:** autenticación del personal implementada localmente: ingreso, comprobación,
cierre actual y denegaciones transversales. Sin módulos académicos, dashboard o recuperación.
La validación todavía no está cerrada ni habilita despliegue/piloto: ver
[evidencia y pendientes](specs/001-autenticacion-personal/validation.md).

## Requisitos e instalación

- Node.js 24 (`>=24 <25`) y npm.
- Tipos, pruebas Node y build no requieren backend. Para integrar se necesita el
  backend corregido descrito abajo y una base exclusiva; no usar bases compartidas.

```bash
npm ci
npm run dev
```

Abrir `http://localhost:5173`. El proxy local `/api` apunta a `http://localhost:3001`
(puerto alternativo autorizado porque 3000 estaba ocupado), conservando Origin.
Arrancar el backend con PORT=3001, BETTER_AUTH_URL=http://localhost:3001 y
SPA_ORIGIN=http://localhost:5173; resto de configuración solo en backend.
Sin API se muestra acceso no comprobado/indisponible, no un login operativo.

## Verificación y compilación

```bash
npm test
npm run test:auth
npm run build
npm run preview
```

`npm test` solo comprueba tipos, incluido el harness. `test:auth` usa Node 24/node:test
para lógica pura con fetch/reloj inyectados; no sustituye DOM, lector de pantalla o API.
`build` verifica tipos y genera `dist/`; `preview` no es servidor productivo ni del harness.
Recetas de navegador, integración y límites en [quickstart](specs/001-autenticacion-personal/quickstart.md).

## Estructura

- `src/main.tsx`: entrada StrictMode; `src/App.tsx`: monta únicamente AuthRoot.
- `src/auth/`: estado, transporte fetch, controlador por raíz y presentación nativa.
- `tests/auth/`: pruebas Node; `tests/browser/auth-harness.html`: fixture manual con
  AuthRoot real y fetch sin red, solo Vite desarrollo y fuera del build productivo.
- `src/styles.css`: entrada Tailwind; `vite.config.ts` y `tsconfig.json`: configuración mínima.
- [AGENTS.md](AGENTS.md): reglas obligatorias para agentes.
- [Índice de contexto](docs/agent-context/INDEX.md): cómo consultar el backend canónico.
- [Manual de diseño para agentes](docs/design/agent-design-manual.md): base visual aprobada, colores confirmados y decisiones pendientes.
- [Usuarios](docs/agent-context/modules/usuarios/module-summary.md): recorridos documentados e inventario real de capacidades.
- [Plantilla de spec frontend](docs/specs/TEMPLATE.md): experiencia de interfaz y trazabilidad, no lógica de negocio duplicada.

## Backend y límites

`[RUTA_LOCAL_DEL_BACKEND]` representa `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`. El índice explica los enlaces locales y cómo adaptarlos en otra máquina. No se copian las fuentes del producto a este repositorio.

Autenticación usa cookie HttpOnly y rutas relativas, mismo origen HTTPS mediante proxy
en producción (gate operativo pendiente). Sin tokens/identidad en almacenamiento web,
JWT, rememberMe, polling ni variables `VITE_*` de secretos. SMTP y bootstrap son backend.
Enlaces de correo/recuperación quedan fuera del alcance de esta feature.

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

## Preparación de gestión de Usuarios

En `feat/gestionar-usuarios` se incorporó `main@664cc5c` mediante merge `e45b05d`,
conservando autenticación, componentes gráficos, pruebas y constitución. Ver
[plan](specs/001-gestionar-usuarios/plan.md), [tareas](specs/001-gestionar-usuarios/tasks.md)
y [preparación verificada](specs/001-gestionar-usuarios/revalidacion-plan.md#preparación-del-worktree-para-desarrollo).
T001 es preparación completada; la gestión/recuperación de esta feature aún no está implementada.

El transporte actual de autenticación descrito arriba no se cambia al preparar la rama.
Los deltas aprobados de Usuarios y su interfaz gráfica integrada se implementarán y probarán
explícitamente, manteniendo los canjes de invitación/correo bloqueados y ascensos,
auditoría visible y reactivación diferidos. No ejecutar aún `test:usuarios`: todavía no existe.
