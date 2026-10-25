# Índice de contexto del frontend

## Fuente canónica y ruta local

`[RUTA_LOCAL_DEL_BACKEND]` = `/home/santino/Universidad/TrabajoCampo/Kudlab-backend` en este entorno. [Abrir RUTA_LOCAL_DEL_BACKEND][RUTA_LOCAL_DEL_BACKEND]. No es una variable del navegador ni una dependencia npm.

Los enlaces backend de esta documentación apuntan a esa ruta absoluta, no a un supuesto directorio hermano del worktree. Son enlaces de consulta local; GitHub no puede abrir archivos de otra máquina. En otra instalación, resolver `[RUTA_LOCAL_DEL_BACKEND]` y sustituir el prefijo absoluto de los enlaces por el checkout backend correspondiente. Las rutas relativas a esa raíz se conservan en los enlaces. No copiar la documentación canónica para simular portabilidad.

## Orden de lectura

1. [README backend](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/README.md): alcance implementado, requisitos y ejecución.
2. [Índice backend](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/INDEX.md): mapa de módulos y fuentes; desde su tabla seguir módulo → `module-summary.md` → feature pertinente en `features/`.
3. Contexto general: [producto](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/project-context.md), [arquitectura](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/architecture-summary.md), [decisiones](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/decisions.md) y [pendientes](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/unresolved-issues.md). La arquitectura documentada no es inventario de implementación.
4. Para Usuarios: [resumen backend](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/module-summary.md) → descripción de feature → spec/contrato aplicables → rutas, servicios y guardias del código actual. No detenerse en la descripción de contexto.
5. Consultar [el inventario frontend](modules/usuarios/capabilities.md), que registra implementación observada y diferencias, y [el resumen de recorridos UI](modules/usuarios/module-summary.md).

## Specs y código que completan el contexto

- [001: cuentas y roles](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md) y [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/contracts/accounts.openapi.yaml).
- [002: validación y acceso](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/spec.md), [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/contracts/validation.openapi.yaml) y [ámbito propuesto](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/contracts/scope-authorization.md).
- [003: autenticación y recuperación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/spec.md) y [contrato](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/contracts/auth.openapi.yaml).
- [004: refactor sin nuevas capacidades](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/004-refactor-servicios-usuarios/spec.md) y [mapa de interfaces existentes](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/004-refactor-servicios-usuarios/contracts/current-interfaces.md). Usar las rutas nuevas de archivos después del refactor, no referencias antiguas del contexto.
- [Montaje HTTP](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts), [módulo Usuarios](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/), [autenticación](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/) y [configuración](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/config/env.ts).

Las specs registran decisiones posteriores a los resúmenes originales, pero algunas siguen marcadas como borrador/propuesta. Los contratos 001–003 también conservan etiquetas de propuesto/planificado: no se usan como prueba de existencia de rutas. La evidencia de implementación aquí es la lectura del código, no una validación en ejecución.

## Documentación de este repositorio

- [Instrucciones para agentes](../../AGENTS.md).
- [Manual de diseño para agentes](../design/agent-design-manual.md): fuente visual con decisiones confirmadas, propuestas y pendientes; no amplía el alcance de producto.
- [Usuarios: alcance UI](modules/usuarios/module-summary.md) e [inventario/pendientes](modules/usuarios/capabilities.md).
- [Plantilla de futuras specs](../specs/TEMPLATE.md).

No hay specs implementadas de pantallas. No se duplican los documentos de producto del backend ni se amplía alcance a otros módulos.

[RUTA_LOCAL_DEL_BACKEND]: /home/santino/Universidad/TrabajoCampo/Kudlab-backend
