# Skill Ponytail

Instalada para este proyecto como [`.opencode/skills/ponytail/SKILL.md`](../../.opencode/skills/ponytail/SKILL.md). OpenCode la descubre automáticamente; no requiere plugin, hooks ni dependencias npm. Solo se incorporó la skill principal, no la suite de auditoría/review ni comandos slash de un plugin.

## Uso

- Cargar `ponytail` antes de tareas de código, refactor, revisión o selección de dependencias, o cuando el usuario la solicite. También puede invocarse con `@ponytail`.
- Nivel inicial `full`, predeterminado de la skill: resolver por completo con el menor cambio necesario. Para otro nivel, solicitar en lenguaje natural «usa Ponytail lite/ultra». No se registraron comandos slash ni persistencia de modo mediante hooks.
- Priorizar componentes y patrones propios ya existentes; no reemplazar shadcn, Base UI, Lucide ni los tokens aprobados por controles nativos inconsistentes solo para ahorrar líneas. La aprobación de esa biblioteca no equivale a que esté instalada.
- Nunca recortar validación, manejo de errores, seguridad, accesibilidad o requisitos expresos. No usar minimalismo como permiso para borrar cambios ajenos o ampliar alcance. El manual y las reglas del producto siguen vigentes.
- Si OpenCode no la muestra, comprobar archivo y permisos de skills, y usar `/reload` si hace falta. No afirmar uso si no pudo cargarse.

## Procedencia y actualización

- Fuente original: [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), skill principal `skills/ponytail/SKILL.md`.
- Revisión fijada: [`09c434ab73ca43761c5d8b0c5d341926c2fba710`](https://github.com/DietrichGebert/ponytail/tree/09c434ab73ca43761c5d8b0c5d341926c2fba710).
- Blob Git original de SKILL.md: `d64edd32265ba21cbf5270158f04e97d96925f27`.
- Licencia MIT original incluida en [LICENSE](../../.opencode/skills/ponytail/LICENSE); blob `715d483338cea4365f0d91a27799cf61226d6bcf`.
- Ambos archivos se incorporaron sin modificar su contenido. Las convenciones específicas de Kudlab se mantienen fuera de la copia original.
- La búsqueda `npx -y skills@1.7.4 find ponytail` identificó la fuente original; se revisaron su skill, licencia y guía oficial. Ante fallo DNS de Git por HTTPS, se obtuvieron los archivos de la API GitHub y se verifican sus hashes Git locales. No se ejecutó instalador de plugins ni scripts del proveedor.
- Se conserva versionada solo esta skill mediante una excepción acotada en `.gitignore`; las otras skills locales siguen ignoradas. No hace falta reinstalarla tras clonar esta rama.

Para actualizar, revisar las diferencias y licencia en una revisión concreta del repositorio original, reemplazar solo estos dos archivos y actualizar los hashes/commit de este registro. No actualizar automáticamente a `main` ni copiar el AGENTS.md del proveedor sobre las reglas de Kudlab.

Fuentes de instalación: [Ponytail INSTALL.md](https://github.com/DietrichGebert/ponytail/blob/09c434ab73ca43761c5d8b0c5d341926c2fba710/INSTALL.md) y [skills de OpenCode V2](https://opencode.ai/v2/docs/skills).

## Verificación realizada

OpenCode descubrió `ponytail` y se cargó correctamente mediante la herramienta `skill`. `git hash-object` coincide con los dos blobs originales; `git check-ignore` confirma que solo Ponytail queda versionable y las otras skills siguen ignoradas. Enlaces relativos y `git diff --check` correctos. `npm test` (solo tipos) y `npm run build` correctos; sin cambios de código o manifiestos de aplicación contra `origin/main`. No se probaron plugins, hooks ni comandos slash: no forman parte de esta instalación.
