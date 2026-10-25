# Kudlab Frontend

Base de la SPA de Kudlab con React, TypeScript, Tailwind CSS y Vite, gestionada con npm. Kudlab es un piloto de apoyo al seguimiento pedagógico; no produce diagnósticos clínicos ni sustituye la evaluación curricular. El producto y las reglas de negocio se consultan en el backend, no se redefinen aquí.

**Estado:** inicialización técnica y documentación de Usuarios. La aplicación monta una raíz vacía intencionalmente: no hay pantallas, autenticación, llamadas API ni funcionalidades académicas implementadas.

## Requisitos e instalación

- Node.js 24 (`>=24 <25`) y npm.
- No se necesita base de datos, SMTP ni backend en ejecución para verificar esta base.

```bash
npm ci
npm run dev
```

Vite informa la URL local (normalmente `http://localhost:5173`). La página vacía es el resultado esperado, no un login pendiente de configurar.

## Verificación y compilación

```bash
npm test
npm run build
npm run preview
```

`npm test` ejecuta únicamente la comprobación estática de TypeScript (`npm run typecheck`). **Todavía no hay pruebas unitarias, de componentes ni de integración**; compilar no demuestra que la API o los recorridos documentados funcionen de extremo a extremo. `build` verifica tipos y genera `dist/`; `preview` sirve esa compilación localmente, no es un servidor de producción.

## Estructura

- `src/main.tsx`: entrada React; `src/App.tsx`: raíz sin interfaz de producto.
- `src/styles.css`: entrada Tailwind; `vite.config.ts` y `tsconfig.json`: configuración mínima.
- [AGENTS.md](AGENTS.md): reglas obligatorias para agentes.
- [Índice de contexto](docs/agent-context/INDEX.md): cómo consultar el backend canónico.
- [Manual de diseño para agentes](docs/design/agent-design-manual.md): base visual aprobada, colores confirmados y decisiones pendientes.
- [Usuarios](docs/agent-context/modules/usuarios/module-summary.md): recorridos documentados e inventario real de capacidades.
- [Plantilla de spec frontend](docs/specs/TEMPLATE.md): experiencia de interfaz y trazabilidad, no lógica de negocio duplicada.

## Backend y límites

`[RUTA_LOCAL_DEL_BACKEND]` representa `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`. El índice explica los enlaces locales y cómo adaptarlos en otra máquina. No se copian las fuentes del producto a este repositorio.

Para integrar más adelante habrá que acordar origen SPA, transporte de sesión y destinos de los enlaces de correo. No hay variables `VITE_*`, secretos ni configuración API ficticia en esta base. Las credenciales SMTP y del ADMIN inicial pertenecen al backend y nunca al navegador.

Esta iteración excluye Académico, Tareas, Evolución y Seguimiento. No contempla login de estudiantes. Documentar una capacidad backend no aprueba su inclusión en el piloto ni implementa su interfaz.

## Flujo SDD con Spec-Kit

Spec-Kit 1.0.13 está inicializado para OpenCode con scripts Bash. La configuración y las plantillas están en `.specify/`; los diez comandos locales están en `.opencode/commands/`. No requiere dependencias npm adicionales. Si los comandos no aparecen, volver a abrir el proyecto en OpenCode desde el worktree correspondiente.

Orden de trabajo:

1. `/speckit.constitution`: definir y revisar los principios del frontend respetando `AGENTS.md` y las fuentes backend. **La constitución generada por la inicialización sigue siendo una plantilla sin completar**, no una política aprobada.
2. `/speckit.specify <feature>`: especificar la experiencia de interfaz, citando contexto, spec/contrato y código backend comprobado. Los artefactos se crearán bajo `specs/`; esa carpeta todavía no contiene features.
3. `/speckit.clarify` si quedan ambigüedades; después `/speckit.plan` y `/speckit.tasks`.
4. `/speckit.analyze` para revisar consistencia antes de `/speckit.implement`, una vez aprobado el alcance correspondiente.

`docs/agent-context/` conserva contexto y recorridos candidatos; `docs/specs/TEMPLATE.md` es una guía de trazabilidad frontend, no reemplaza las plantillas de Spec-Kit ni implica que ya existan specs ejecutadas. No iniciar una feature desde los ejemplos genéricos de las plantillas sin consultar primero `AGENTS.md`. La inicialización no define decisiones de producto, no crea pantallas ni implementa autenticación.
