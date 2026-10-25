# Validación del manual y MCP

Validaciones realizadas en el worktree `docs/manual-diseno-agente`, sobre base frontend `f7a8d19` de `origin/main`.

| Validación | Resultado y límite |
| --- | --- |
| Colores base | Se preservan `#53C0F3`, `#4DABD7`, `#1C2E57`, `#F2F2F2`. Ratios calculados mediante luminancia relativa sRGB, documentados en el manual; no auditoría de una UI |
| Coherencia de alcance | Uso exclusivo de profesores registrado en manual y AGENTS; sin propuesta de interfaces infantiles. Fuentes originales no alteradas |
| Enlaces relativos | Comprobación por script de README, AGENTS, índice y documentos de diseño: 34 enlaces existentes antes de añadir este registro. Enlaces externos oficiales consultados durante investigación; no se ejecutó un crawler de todo el repositorio |
| Configuración | `opencode.json` parseado como JSON; `$schema`, `mcp.servers.shadcn` y comando con versión 4.22.1 comprobados |
| MCP real | `opencode mcp list`: conectado. Búsqueda real en `@shadcn` de `button` exitosa, sin generar archivos. Ver [detalle](shadcn-mcp.md) |
| Dependencias existentes | `npm ci`: correcto, 0 vulnerabilidades reportadas por esa ejecución. No se agregaron paquetes al manifiesto o lockfile |
| Comprobación estática | `npm test`: correcto; solo TypeScript, no pruebas de componentes ni integración |
| Compilación | `npm run build`: correcta; no demuestra comportamiento API, diseño ni accesibilidad |
| Diff | `git diff --check`: sin errores. Comparación de `src/`, `package.json`, `package-lock.json`, configuración Vite/TypeScript e `index.html` contra `origin/main`: sin cambios |

No se ejecutaron `shadcn init` o `add`, no existe `components.json` y no se implementaron interfaces. El único archivo de configuración nuevo es el MCP de proyecto solicitado explícitamente después del alcance documental inicial. `node_modules/` y `dist/` son resultados locales ignorados de la validación, no archivos del PR.

No se ejecutaron generadores ni inspectores de las skills de diseño. Su contenido se consultó al principio del trabajo; la procedencia y aprobación de las medidas están registradas en el [manual](agent-design-manual.md).

Pendientes: colores Error/Warning/Info/Success, dispositivos prioritarios y activos gráficos. La elección de biblioteca está aprobada, pero su incorporación y validación visual requieren una tarea de implementación separada.
