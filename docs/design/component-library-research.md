# Bibliotecas de componentes para Kudlab

**Estado: investigación y recomendación; ninguna biblioteca elegida o instalada.**

## Criterios

Base observada: React, TypeScript, Tailwind 4 y Vite. Público confirmado: exclusivamente profesores. La necesidad inmediata es resolver formularios, listados/tablas, navegación, diálogos y feedback de los recorridos de Usuarios, no interfaces infantiles. Se interpreta «componentes gráficos» como componentes de interfaz; gráficos estadísticos se evalúan aparte cuando exista una necesidad aprobada.

Se priorizan adaptación al [manual](agent-design-manual.md), soporte de teclado/foco, coherencia para agentes, documentación, mantenimiento y coste de integración. Una biblioteca no garantiza por sí sola accesibilidad ni contraste; sus estilos predeterminados no sustituyen los tokens de Kudlab. La evaluación es documental: no se instalaron paquetes ni se comprobó compatibilidad ejecutando el proyecto.

## Comparación

| Opción | Encaje para Kudlab — valoración del agente | Coste o límite principal |
| --- | --- | --- |
| **shadcn/ui** | Primera recomendación por encaje con Tailwind, guía de Vite y componentes editables. Permite un catálogo local que los agentes puedan leer y reutilizar | Distribuye código para construir tu biblioteca: el equipo mantiene las adaptaciones y revisa cambios upstream. La tabla avanzada es una receta con TanStack Table, no un datagrid completo listo con toda la lógica |
| **Mantine** | Mejor alternativa si se prioriza una suite integrada: controles, overlays, formularios, fechas y notificaciones. Tiene guía de Vite, tema y Styles API; paquetes `@mantine/*` bajo MIT | Añade su propio tema, proveedor y estilos. Puede coexistir con Tailwind, pero requiere delimitar responsabilidades y evitar dos sistemas visuales paralelos. Su componente Table no debe confundirse con un datagrid avanzado |
| **Material UI (MUI)** | Adecuada para herramientas de gestión si se prefiere una suite amplia y convenciones Material. Personalizable y con ecosistema de tablas/fechas | Mayor trabajo para alejarse de la identidad Material y ajustar Kudlab. En MUI X hay opciones Community gratuitas y funciones Pro/Premium con licencia comercial; revisar funciones concretas antes de elegir |
| **React Aria Components** | Buena candidata cuando se priorizan comportamiento accesible e internacionalización con control total del estilo | Sin apariencia de producto predeterminada: exige más trabajo visual/composición. No es mi primera opción para obtener rápidamente componentes ya diseñados |
| **Base UI o Radix Primitives directamente** | Primitivas sin estilos para construir un sistema propio; foco, teclado y composición como base | No aportan por sí solas el acabado gráfico solicitado. Preferible usarlas mediante una capa coherente, en vez de diseñar cada componente desde cero |

## Recomendación propuesta

**shadcn/ui con Base UI como base de interacción y Lucide para iconos**, sujeto a aprobación. shadcn documenta Base UI como predeterminada desde julio de 2026; no asumir que todos los ejemplos actuales usan Radix. Radix sigue soportado. No mezclar APIs o familias de componentes sin una razón documentada.

Esto no significa adoptar un preset sin revisión. En una futura implementación autorizada:

1. Incorporar solo los componentes necesarios para la feature aprobada, no un dashboard de plantilla ni el catálogo entero.
2. Mantener un único catálogo local reutilizable, con variantes limitadas y tokens centrales. Los agentes no deben copiar y volver a estilizar un botón por pantalla.
3. Mapear roles con intención, no por coincidencia de nombres: `secondary` de shadcn no equivale automáticamente al color Secondary de marca. En el manual, la acción secundaria usa Dark 1 sobre blanco, mientras Secondary de marca se usa en hover de la primaria.
4. Configurar explícitamente texto Dark 1 sobre Primary; no conservar texto blanco predeterminado. Revisar también bordes, foco, estados inactivos, altura mínima 44px, tamaños y radios aprobados. No introducir colores semánticos o paletas de charts a través del preset.
5. Añadir Lucide solo como familia única de iconos, con etiquetas accesibles según el manual; no usarlo como sustituto del logo ni de activos de marca.
6. Para tablas simples empezar por Table. Evaluar TanStack Table solo si hay necesidad real de comportamiento adicional; no habilitar filtros, ordenación o acciones masivas que el contrato no respalde. No aplicar ordenación local a una página como si ordenara todo el conjunto del servidor.
7. No elegir ahora biblioteca de charts, editor enriquecido, animaciones o sistema complejo de formularios por anticipación. shadcn tiene guías de integración de formularios, pero eso no obliga a instalar una solución concreta.
8. Antes de instalar, verificar versiones compatibles con React/TypeScript/Tailwind/Vite del repositorio, dependencias transitivas, licencias y el diff que produciría el CLI. No ejecutar ejemplos de inicialización que reemplacen configuración existente sin revisión.

**Alternativa concreta:** escoger Mantine si se prefiere consumir una suite mantenida como paquetes antes que mantener código local de componentes. Sigue siendo necesario adaptar su tema al manual y revisar accesibilidad; no instalar ambas suites para el mismo propósito.

## Fuentes oficiales consultadas

- shadcn/ui: [introducción](https://ui.shadcn.com/docs), [Vite](https://ui.shadcn.com/docs/installation/vite), [temas y tokens](https://ui.shadcn.com/docs/theming), [Data Table](https://ui.shadcn.com/docs/components/base/data-table), [Base UI predeterminada](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default). La introducción se contrastó mediante resultados de búsqueda del sitio oficial tras un error de transporte inicial; las demás páginas se pudieron leer directamente.
- [Base UI: características, soporte React y bundlers](https://base-ui.com/react/overview/about).
- [Mantine: guía, paquetes, personalización y licencia](https://mantine.dev/getting-started).
- MUI: [Material UI](https://mui.com/material-ui/getting-started/) y [licencias MUI X](https://mui.com/x/introduction/licensing/).
- [React Aria](https://react-spectrum.adobe.com/react-aria/): componentes sin estilos, accesibilidad e internacionalización.
- [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction): primitivas accesibles sin estilos.
- [Lucide](https://lucide.dev/guide/): iconos SVG, paquetes oficiales y guía de accesibilidad.

No se compararon tiempos de carga, tamaños de bundle ni resultados de pruebas reales. La recomendación es un juicio de encaje, no un benchmark ni una aprobación de dependencia.
