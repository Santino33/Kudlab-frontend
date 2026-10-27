# Manual de diseño de Kudlab para agentes

**Estado: base visual y elección shadcn/ui + Base UI + Lucide aprobadas; colores semánticos pendientes.**

La [comparación de bibliotecas](component-library-research.md) registra el fundamento de la elección aprobada. El [MCP de shadcn](shadcn-mcp.md) está configurado para consultar componentes; no se han instalado componentes ni dependencias visuales de la aplicación. Una futura instalación requiere una tarea de implementación autorizada.

La aprobación posterior a la revisión de tipografía y espaciado adopta las recomendaciones de las secciones 3–7 como base operativa, incluidos sus valores numéricos y mapeos. Las palabras «propuesta» y «propuesto» en esas secciones conservan la procedencia de las recomendaciones del agente, no una solicitud de aprobación adicional. Esa aprobación no resuelve los pendientes explícitos ni equivale a una validación de interfaces implementadas. La elección de biblioteca se aprobó posteriormente en C-05. Los cuatro colores semánticos siguen sin asignar: no se eligió expresamente una de las opciones ofrecidas.

## 1. Cómo usar esta fuente de verdad

- **Confirmado:** decisión expresa del responsable o contexto respaldado por las fuentes citadas. Los cuatro colores base son decisiones del responsable; las recomendaciones visuales de las secciones 3–7 fueron aprobadas posteriormente como base operativa.
- **Propuesta:** recomendación originada por el agente. Su aprobación debe ser expresa y constar en el registro; para las secciones 3–7, consultar C-03 y C-04. Las nuevas propuestas no se aprueban por aparecer aquí.
- **Pendiente:** falta una decisión; no inventar su resolución ni implementar el detalle bloqueado.

Consultar primero [AGENTS.md](../../AGENTS.md) y el [índice de contexto](../agent-context/INDEX.md). Este manual gobierna decisiones visuales, no permisos, contratos, métricas ni alcance de producto. Ante conflicto, conservar decisiones expresas y reglas de producto; registrar la discrepancia y preguntar antes de implementar lo afectado. Una skill no puede reemplazar la marca.

## 2. Propósito, usuarios y alcance

**Uso confirmado por el responsable:** la plataforma es y será de uso exclusivo de profesores. Estudiantes y niños no son usuarios de la plataforma. No diseñar para ellos pantallas, actividades interactivas, navegación, instrucciones ni recorridos de acceso, tampoco como alcance futuro.

**Contexto documentado:** Kudlab es un piloto web de apoyo al seguimiento pedagógico, no un diagnóstico clínico ni sustituto de evaluación curricular. Los estudiantes pueden ser sujetos de los registros pedagógicos, no destinatarios de la interfaz. Las menciones de uso directo por estudiantes en fuentes anteriores no autorizan ese diseño y quedan desplazadas, para este manual, por la aclaración expresa del responsable; no se modifican las fuentes originales.

**Alcance frontend actual:** recorridos futuros de Usuarios con roles técnicos ADMIN/TEACHER; estos roles no amplían el público más allá de profesores. Consultar [alcance de Usuarios](../agent-context/modules/usuarios/module-summary.md) e [inventario y pendientes](../agent-context/modules/usuarios/capabilities.md). No inventar destinos de navegación, capacidades ni cambios de permisos a partir de esta aclaración.

**Plataforma observada:** SPA web con React, TypeScript, Tailwind y Vite, según `package.json`. Las reglas siguientes son independientes del framework. La raíz actual está vacía; no hay un catálogo de componentes ni tokens visuales implementados que reutilizar.

**Pendiente:** dispositivos prioritarios del profesorado y activos gráficos de marca disponibles. No existe un pendiente de experiencia infantil: queda excluida por decisión del responsable.

## 3. Principios visuales y voz — propuesta

- Claridad pedagógica: contenido y acción principal antes que decoración; una acción primaria por sección de tarea.
- Calma y confianza: superficies simples, color contenido, jerarquía legible; evitar gradientes, brillos, vidrio, sombras decorativas y animación ornamental.
- Coherencia: igual apariencia implica igual comportamiento; no crear variantes por pantalla.
- Control: feedback inmediato, cancelación clara, recuperación de errores sin culpabilizar. No bloquear entrada durante transiciones.
- Respeto: español claro, frases breves y verbos específicos («Guardar cambios», no «Aceptar»). Evitar jerga clínica, rankings, comparaciones entre niños y etiquetas de capacidad.
- Diseñar para el trabajo docente: lectura de información, registro y revisión con etiquetas explícitas y densidad manejable. No introducir lenguaje infantil, gamificación o actividades dirigidas a estudiantes.

## 4. Colores y tokens semánticos

### Bases confirmadas por el responsable

| Base | Valor inalterable | Uso propuesto y posteriormente aprobado |
| --- | --- | --- |
| Primary | `#53C0F3` | `action.primary.background`: fondo de acción principal con texto Dark 1 |
| Secondary | `#4DABD7` | `action.primary.hover.background`: hover con texto Dark 1; no distinguir estado solo por este cambio |
| Dark 1 | `#1C2E57` | `text.default`, `border.control`, `focus.ring`: tinta, borde funcional y foco sobre superficie clara |
| Disabled | `#F2F2F2` | `action.disabled.background`: fondo inactivo; no usar como texto ni como único indicador de inactividad |

### Tokens propuestos o sin resolver

| Token | Valor / estado | Regla |
| --- | --- | --- |
| `surface.default`, `surface.raised` | `#FFFFFF`, **propuesta** neutral técnica, no color de marca confirmado | Fondo y superficies opacas; separar con espacio y borde funcional cuando sea necesario |
| `text.secondary` | Dark 1, **propuesta** | Crear jerarquía por tamaño/peso, sin bajar opacidad del texto |
| `action.secondary` | Dark 1 sobre superficie blanca propuesta, borde Dark 1 | Acción secundaria, sin competir con la primaria |
| `action.pressed` | Primary con borde interior Dark 1, **propuesta** | Feedback de presión sin desplazar contenido; no inventar un nuevo tono |
| `status.error`, `status.warning`, `status.info`, `status.success` | **Pendientes: sin valor asignado** | No alias a Primary; no deducir ni muestrear colores de una imagen |
| `action.destructive` | **Pendiente**, ligado a aprobación de Error | Hasta resolverlo, especificar intención, confirmación y texto; no inventar rojo |

Las etiquetas de Error, Warning, Info y Success de la referencia repiten `#53C0F3` pese a muestras distintas: no son evidencia válida de sus colores. Mientras estén pendientes, el **fallback neutral aprobado en C-06** es feedback con Dark 1 sobre blanco, título y texto explícitos e icono con etiqueta cuando aporte información. No asigna un color semántico ni autoriza rojo destructivo; las acciones se explican mediante texto y confirmación.

### Contraste calculado y combinaciones seguras

Ratios sRGB WCAG, colores sólidos sin opacidad, redondeados a dos decimales. El cálculo no sustituye la aprobación del uso semántico ni valida una interfaz real.

| Combinación (texto / fondo, reversible para el ratio) | Ratio | Resultado |
| --- | --- | --- |
| Dark 1 / Primary | 6.47:1 | AA para texto normal |
| Dark 1 / Secondary | 5.15:1 | AA para texto normal |
| Dark 1 / Disabled | 11.89:1 | AA; no convierte un control inactivo en activo |
| Dark 1 / blanco propuesto | 13.31:1 | AA para texto normal |
| Blanco / Primary | 2.06:1 | No usar para texto ni iconos informativos |
| Blanco / Secondary | 2.59:1 | No usar para texto ni iconos informativos |
| Primary / Secondary | 1.26:1 | No basta para distinguir estados |
| Disabled / blanco | 1.12:1 | No basta como límite funcional |

Primary y Secondary sobre blanco tampoco alcanzan 3:1 para indicadores funcionales. **Propuesta:** delinear botones y controles con Dark 1 cuando su contorno sea necesario; foco Dark 1 con separación visible del control, sobre superficie clara. No usar Primary como texto de enlace en blanco: proponer Dark 1 subrayado. Mantener los valores de marca aunque fallen ciertas combinaciones; cualquier nuevo tono requiere aprobación.

## 5. Tipografía y geometría — propuestas

No hay fuente de marca aprobada. Usar como propuesta una sola familia sans-serif de sistema, sin descargas ni dependencias; no asumir Inter, una fuente comercial o tipografía Apple.

| Rol / token documental | Valor propuesto |
| --- | --- |
| `type.body` / `type.control` | 1rem (16px de referencia), peso 400 / 500, interlineado 1.5 |
| `type.caption` | 0.875rem (14px), interlineado 1.5; solo metadatos, no instrucciones esenciales |
| `type.section` | 1.25rem (20px), peso 600, interlineado 1.3 |
| `type.page` | 1.75rem (28px), peso 600, interlineado 1.25; permitir salto de línea |
| `space.*` | Escala única 4, 8, 12, 16, 24, 32, 48px de referencia; expresarla en unidades relativas |
| `space.field` / `space.group` / `space.section` | 16 / 24 / 32px; etiqueta y ayuda a 4–8px del campo |
| `size.control.min` / `size.icon` | Altura mínima 44px, sin altura rígida; iconos coherentes de 20 o 24px |
| `radius.control` / `radius.panel` | 8 / 12px; evitar múltiples radios o píldoras arbitrarias |
| `border.control` | 1px sólido Dark 1; foco adicional de 2px con separación de 2px |
| `elevation.base` / `elevation.overlay` | Sin sombra en reposo; menú/diálogo con borde y separación opaca. No crear sombras ad hoc |

Texto alineado a la izquierda, línea de lectura de 45–75 caracteres cuando corresponda, sin mayúsculas sostenidas ni tracking decorativo. Jerarquía semántica de títulos sin saltos; tamaño y peso no sustituyen encabezados reales. Respetar tamaño de fuente del usuario.

### Fundamento y procedencia de estas propuestas

Las skills se usaron como referencias de principios, no como un generador ejecutado ni como un sistema de diseño Kudlab ya validado:

| Especificación | Fundamento consultado | Qué propuso el agente |
| --- | --- | --- |
| Fuente de sistema, cuerpo 16px e interlineado 1.5 | `apple-design` recomienda tipografía de sistema, cuerpo de referencia 1rem/1.5 y jerarquía por tamaño, peso e interlineado | Aplicarlo como punto de partida sin fuente de marca aprobada; los roles de 14/20/28px, pesos e interlineados restantes son selección del agente |
| Lectura de 45–75 caracteres y alineación izquierda | `design-taste-frontend` incluye esas pautas de legibilidad | Usarlas en contenido docente, sin trasladar sus tamaños de titulares o composiciones de landing |
| Escala de espacios y separación por grupos | Las skills aportan consistencia, proximidad y jerarquía, pero no fijan la escala exacta de este manual | Base convencional de 4px y selección de pasos 4/8/12/16/24/32/48; separaciones 16/24/32 para campo/grupo/sección. Son propuestas propias, no valores exigidos por las skills |
| Controles de 44px, radios 8/12px, iconos 20/24px y foco 2px con separación 2px | Principios de accesibilidad y consistencia de `ui-ux-pro-max`; foco visible y adaptación al tamaño de texto en las referencias | Medidas concretas elegidas por el agente; 44px es objetivo de comodidad propuesto, no mínimo AA universal. Los radios no proceden de una regla de marca ni de una recomendación numérica validada |
| Superficies simples y ausencia de sombra decorativa | Contención visual de `design-taste-frontend` | Aplicación selectiva a una herramienta docente; no adopción integral de sus reglas, ni de la translucidez sugerida por `apple-design` |

Estas medidas necesitan revisión con contenido docente real en una futura implementación autorizada; no se han validado mediante prototipo, capturas ni pruebas con profesores. Los márgenes y anchos responsive también son propuestas del agente, no evidencia de dispositivos elegidos por el responsable.

Iconografía: **Lucide es la familia aprobada**, todavía no instalada. Mantener trazo y proporciones constantes; no agregar otra familia. Los iconos decorativos se ocultan a tecnologías de asistencia; los controles de solo icono requieren nombre accesible. No usar emojis como controles ni inventar logos/mascota.

## 6. Componentes e interacción — propuestas salvo regla de producto citada

| Patrón | Regla operativa |
| --- | --- |
| Formularios | Etiqueta persistente sin sufijos «(obligatorio)»/«(obligatoria)» (C-07); conservar `required`, validación, ayuda y restricciones antes de enviar. No usar placeholder como etiqueta. Errores junto al campo y resumen al enviar si hay varios; conservar datos no sensibles. Validar tras interacción, no castigar cada tecla. Permitir pegado y gestores de contraseñas |
| Botones | Verbo + objeto, primaria y secundaria distinguibles. Estados base, hover, presión, foco, carga e inactivo especificados. Carga con texto («Guardando…»), sin doble envío ni pérdida del ancho. Explicar cerca por qué una acción está inactiva |
| Navegación | Ubicación y sección actual claras, enlace activo también indicado por forma/texto. Orden estable; enlaces para destinos, botones para acciones. Solo destinos autorizados y existentes; no menús académicos de relleno |
| Tarjetas | Agrupar una unidad real de contenido; título, información y acción explícita. No hacer toda la tarjeta clicable si contiene controles anidados. No convertir cada dato en tarjeta |
| Tablas | Encabezados asociados, título/contexto y unidades. Alinear números; estado con texto. Solo orden, búsqueda, filtros o paginación respaldados por contratos. En móvil conservar relaciones entre datos, no ocultar columnas críticas sin acceso alternativo |
| Diálogos | Solo tarea acotada o acción destructiva significativa. Título, consecuencia y acción específica; cancelar no muta. Foco inicial seguro, contenido de fondo inerte, recorrido de teclado contenido, Escape y botón de cierre cuando sea seguro; devolver foco al disparador |
| Feedback | Distinguir carga, vacío, sin resultados, éxito, validación, conflicto, denegación e indisponibilidad. Vacío no es fallo ni dato cero. Mantener errores accionables visibles; no depender de un toast transitorio |

**Reglas ya documentadas de Usuarios:** no mostrar éxito anticipado para identidad, rol o estado; tras conflicto consultar antes de sobrescribir. Un fallo de entrega puede ocurrir después de persistir: no prometer rollback ni repetir mutaciones a ciegas. No confundir aceptación SMTP con recepción de correo. Consultar los detalles y bloqueos en el inventario, no resolverlos mediante estilo.

Propuesta de movimiento: feedback de presión inmediato; transiciones breves de 150–200ms para color/opacidad, sin saltos de layout, rebotes o esperas artificiales. Respetar movimiento reducido con cambios estáticos o de opacidad. No agregar gestos obligatorios ni bibliotecas de animación.

## 7. Responsive y accesibilidad — recomendaciones propuestas

Objetivo recomendado: **WCAG 2.2 nivel AA**; no equivale a certificación del producto.

- Diseñar primero una columna; añadir columnas solo si el contenido cabe. Propuesta de márgenes 16px en estrecho y 24–32px en amplio; ancho de formulario hasta 32rem y de contenido hasta 75rem, sin forzar ancho mínimo.
- Verificar 320, 390, 768, 1024 y 1440px como anchos de prueba, no como dispositivos confirmados. Mantener orden lógico, acciones y etiquetas al reorganizar. Sin scroll horizontal general; una tabla que realmente lo necesite puede tener una región identificable y operable por teclado.
- Texto con contraste mínimo 4.5:1; grande (24px regular o aproximadamente 18.7px en negrita) 3:1; indicadores y límites funcionales 3:1. Verificar cada estado real, no solo las bases.
- Operación completa por teclado, foco visible y nunca tapado por barras/diálogos; sin trampas salvo contención del diálogo. Proponer enlace para saltar al contenido cuando exista navegación repetida.
- Objetivos de interacción propuestos de al menos 44×44px; nunca bajar del mínimo AA de 24×24px salvo excepciones justificadas de WCAG. No depender de hover, arrastre, color, gesto o sonido como única vía.
- Reflujo a 320 CSS px, zoom de texto 200% y revisión a zoom 400%; sin recortes de etiquetas ni alturas rígidas. Respetar ajustes de espaciado de texto, alto contraste y movimiento reducido.
- Semántica nativa, idioma español, nombres accesibles, ayudas/errores asociados y anuncios de estado no intrusivos. Reservar alertas urgentes para errores que lo ameriten; no mover foco por cada notificación.
- Texto alternativo para imágenes informativas; decoración sin descripción redundante. No incluir datos reales de menores en ejemplos, capturas, logs ni contenido de muestra.
- En apoyo pedagógico, distinguir «sin registro», «no realizado» y fallo técnico sin atribuir dificultades al estudiante. No convertir datos ausentes en cero ni generar interpretaciones clínicas.

## 8. Protocolo para agentes

1. Leer contexto, feature, contrato y pendientes; identificar actor, tarea y estados autorizados. Este manual no habilita funcionalidades futuras.
2. Buscar tokens/componentes existentes antes de crear variantes. Hoy no hay catálogo; no afirmar que un botón o biblioteca ya existe. Cuando se trabaje con componentes shadcn, consultar su MCP según [AGENTS.md](../../AGENTS.md); adoptar Base UI y Lucide, no los estilos predeterminados sin adaptar.
3. Usar los valores confirmados exactamente. Para geometría y patrones comunes, aplicar la base operativa aprobada en C-03/C-04. Para propuestas nuevas o pendientes explícitos, solicitar aprobación antes de utilizarlos como decisiones definitivas.
4. Para falta de marca, alcance o comportamiento: registrar el pendiente, explicar impacto y hacer una pregunta por turno con opciones y recomendación. Esperar respuesta; actualizar este documento tras cada decisión. No inferir colores desde imágenes ni elegir dependencias por gusto.
5. No introducir valores visuales fuera del manual sin una propuesta explícita y trazable. Una excepción debe indicar motivo, alcance y aprobación; no sobrescribe reglas globales silenciosamente.
6. En una futura implementación, revisar teclado, lector de pantalla, foco, zoom, anchos, estados y contraste; capturar evidencia sin datos reales. Reportar lo no probado. Una compilación no valida accesibilidad ni diseño.

### Checklist de revisión futura

- [ ] Alcance y permisos respaldados; sin rutas, métricas o usuarios inventados.
- [ ] Colores base intactos; tokens pendientes sin valores supuestos; propuestas identificadas.
- [ ] Pares de texto, bordes, iconos y foco comprobados en todos los estados.
- [ ] Jerarquía, espaciado y variantes consistentes; sin estilos locales arbitrarios.
- [ ] Formularios, carga, vacío, errores y recuperación cubiertos; éxito solo confirmado.
- [ ] Teclado, foco, nombres accesibles, zoom, reflujo y movimiento reducido revisados.
- [ ] Contenido no clínico, sin rankings ni datos reales de menores.
- [ ] Evidencia y límites registrados; pendientes de producto escalados, no resueltos por suposición.

## 9. Registro de decisiones y pendientes

| ID | Estado | Decisión o pregunta |
| --- | --- | --- |
| C-01 | Confirmado por responsable | Primary `#53C0F3`, Secondary `#4DABD7`, Dark 1 `#1C2E57`, Disabled `#F2F2F2` |
| C-02 | Confirmado por responsable | Uso exclusivo de profesores, presente y futuro; sin interfaces para estudiantes o niños. Prevalece sobre menciones previas de otros públicos, sin redefinir permisos técnicos |
| P-01 | Pendiente de respuesta | Valores de Error, Warning, Info y Success; no confirmados por la imagen |
| C-03 | Aprobado por responsable tras revisión | Voz visual clara, serena y cercana; sans-serif de sistema y superficies blancas. Recomendaciones originadas por el agente, adoptadas como base operativa |
| C-04 | Aprobado por responsable tras revisión | Mapeos semánticos de colores resueltos, geometría, tipografía, patrones, responsive y objetivo WCAG 2.2 AA de las secciones 3–7. No incluye pendientes explícitos ni certifica cumplimiento |
| C-05 | Aprobado por responsable | shadcn/ui + Base UI + Lucide; MCP de shadcn de proyecto para consultar componentes. No autoriza implementar interfaces en esta tarea |
| C-06 | Aprobado por responsable el 2026-10-25 durante planificación de Usuarios | Fallback neutral Dark 1 sobre blanco, título/texto explícitos e icono con etiqueta cuando aporte; sin asignar Error/Warning/Info/Success ni rojo destructivo. Confirmación: «Aprobar fallback (recomendado)». No resuelve P-01 ni certifica accesibilidad |
| C-07 | Confirmado por responsable el 2026-10-26 | Todas las etiquetas del frontend omiten «(obligatorio)» y «(obligatoria)». Es un cambio de texto: se conservan obligatoriedad semántica, validación y asociación etiqueta/control; no cambia contratos backend |
| P-04 | Pendiente | Prioridad de dispositivos del profesorado y activos gráficos de marca; no bloquean documentar Usuarios sin inventarlos |

## 10. Fuentes y límites de evidencia

- [Registro de validaciones](validation.md): documentación, contraste, configuración/conexión MCP, comprobación estática, compilación y límites.
- Revisión documental sobre frontend base `f7a8d19` de `origin/main`: [README](../../README.md), [instrucciones](../../AGENTS.md), [índice](../agent-context/INDEX.md), alcance/inventario de Usuarios, `package.json`, `src/App.tsx` y `src/styles.css`. La constitución de Spec-Kit es una plantilla sin completar, no decisiones de diseño.
- Backend consultado solo para contexto: `docs/agent-context/project-context.md` y `docs/agent-context/decisions.md`, en checkout `cd3c2b485d5b3649310ba1807aac90f0f818d174`. Resolver su ruta mediante el índice frontend. El checkout tiene cambios ajenos; no se modificaron ni se validaron capacidades en ejecución. Los documentos leídos no equivalen a aprobación de todos sus RF.
- Skills cargadas en el entorno inicial: `ui-ux-pro-max` (jerarquía, estados y accesibilidad), `apple-design` (legibilidad, control, feedback y movimiento reducido), `design-taste-frontend` (contención visual y coherencia). Al mover la sesión dejaron de estar disponibles; no se ejecutaron sus scripts ni inspecciones. No se adoptan paletas automáticas, materiales Apple ni reglas de landing como marca Kudlab.
- Referencia técnica: [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Los ratios documentados se calcularon con luminancia relativa sRGB; no hay interfaz implementada o auditada en este trabajo.

## 11. Revisión integral de la interfaz — 2026-10-26

La petición expresa del responsable autoriza rediseñar **el frontend existente**, preservar los colores principales y elegir colores de apoyo. Para esta revisión se adoptan `surface.subtle: #F6F8FB`, `surface.active: #E9EEF5`, `text.secondary: #52627A` y `border.structural: #DCE3ED`, definidos una sola vez en `src/styles.css`. Los controles y el foco mantienen Dark 1; el borde estructural tenue no sustituye el límite funcional de un control. Primary, Secondary, Dark 1 y Disabled conservan sus valores exactos. No se asignan colores de diagnóstico ni se resuelve P-01.

Se mantiene la familia de sistema, geometría 8/12px, superficies opacas, controles de al menos 44px y movimiento reducido. La barra lateral se pliega por debajo de 1024px; las listas de estudiantes y tareas tienen representación móvil sin eliminar campos. Las afirmaciones históricas de raíz vacía o ausencia de componentes no describen el estado actual.

La dirección visual y sus adaptaciones al producto, contraste, recorridos, comprobaciones y límites se registran en [la revisión integral](ui-flow-review.md). La autorización de diseño no amplía contratos, roles ni funcionalidades del backend.
