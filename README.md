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
- [Usuarios](docs/agent-context/modules/usuarios/module-summary.md): recorridos documentados e inventario real de capacidades.
- [Plantilla de spec frontend](docs/specs/TEMPLATE.md): experiencia de interfaz y trazabilidad, no lógica de negocio duplicada.

## Backend y límites

`[RUTA_LOCAL_DEL_BACKEND]` representa `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`. El índice explica los enlaces locales y cómo adaptarlos en otra máquina. No se copian las fuentes del producto a este repositorio.

Para integrar más adelante habrá que acordar origen SPA, transporte de sesión y destinos de los enlaces de correo. No hay variables `VITE_*`, secretos ni configuración API ficticia en esta base. Las credenciales SMTP y del ADMIN inicial pertenecen al backend y nunca al navegador.

Esta iteración excluye Académico, Tareas, Evolución y Seguimiento. No contempla login de estudiantes. Documentar una capacidad backend no aprueba su inclusión en el piloto ni implementa su interfaz.
