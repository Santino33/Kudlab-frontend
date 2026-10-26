# Implementation Plan: Gestionar usuarios del personal — interfaz funcional y gráfica integrada

**Estado vigente 2026-10-26:** gestión, recuperación y dashboard por rol implementados;
44/57 tareas completadas. [Dashboard aprobado posteriormente](dashboard-amendment.md)
amplía el alcance original sin permisos nuevos. Ver [pantallas y validación parcial](evidence/screens-implementation.md).
66 pruebas auth + 67 Usuarios, tipos/build correctos. P-01/P-02 siguen locales en
backend separado; no usar main sin esas correcciones. T018 y aceptación manual
integral siguen pendientes. Los apartados de preparación siguientes son históricos.

**Feature**: `001-gestionar-usuarios` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Worktree**: `spec-usuarios`, rama `feat/gestionar-usuarios`. Documentos guardados en `72bd7ca`; **main `664cc5c` integrado mediante merge `e45b05d`**, autorizado por el responsable, con único conflicto documental resuelto conservando ambas fuentes. La autenticación, catálogo, estilos y constitución son ahora base real de esta rama. No se ha implementado código nuevo de Usuarios ni aplicado los deltas de transporte previstos.

**Estado**: plan revisado por petición expresa del responsable: la entrega futura debe incluir **interfaz gráfica terminada e integrada con los recorridos reales**, siguiendo `docs/design/` y la autenticación de `main`. No basta un API client, lógica, estilos sueltos, galería de componentes o demo con datos falsos. Los bloqueos Q1–Q3 se mantienen.

## Summary

Extender la aplicación existente en `main`, no construir otra autenticación. Reutilizar `src/auth/{AuthRoot.tsx,client.ts,controller.ts,state.ts}`, sus pruebas/harness, el catálogo `src/components/ui/`, `components.json`, utilidades y tokens/CSS ya adaptados. Añadir la gestión ADMIN y recuperación con **el mismo lenguaje visual**, estados reales, responsive y accesibilidad; mantener un único dueño de sesión y de los eventos de ciclo de página.

Alcance: acceso/cierre y estado mínimo TEACHER, recuperación, listado/detalle/alta docente pendiente, entrega/reemisión, edición, inactivación y reducción de rol. Ascensos, auditoría visible y reactivación siguen diferidos. Invitación y cambio de correo siguen parciales: no implementar sus canjes públicos ni declarar incorporación/cambio completo operativos hasta resolver enlaces distinguibles (Q2-A). No añadir Académico por estar disponible en backend.

La nueva instrucción aprueba seguir **el diseño gráfico de main**. No modifica silenciosamente las decisiones de transporte de esta feature ni hereda las exclusiones particulares de la spec de autenticación (que no incluía recuperación/gestión). Las diferencias se registran en «Compatibilidad con main».

## Technical Context

**Language/Version**: Node `>=24 <25`, npm/lockfile; React/React DOM 19.3.1, TypeScript 7.0.2 estricto, Tailwind/plugin 4.3.3, Vite 8.3.5, plugin React 6.1.2.

**Primary Dependencies**: En main ya están `@base-ui/react` 1.9.0, `lucide-react` 1.61.0, `class-variance-authority` 0.7.1, `clsx` 2.1.1 y `tailwind-merge` 3.7.0. `components.json` usa `base-nova`, aliases `@/` y Lucide. Reutilizar Button/Input/Label/Card/Alert y sus adaptaciones/licencia; añadir solo Table y AlertDialog oficiales necesarios, consultando MCP y comprobando Base UI. No ejecutar `shadcn init`, regenerar catálogo/configuración o instalar Radix/otra suite. Sin router, SDK de autenticación, librería de formularios/caché/estado o TanStack Table por anticipación.

**Storage**: Sesión persistida exclusivamente backend; frontend efímero. Reutilizar Identity y AccessState de `src/auth/state.ts`; nuevos DTO de cuentas no reemplazan esos tipos. Sin credenciales/cuentas en almacenamiento web. Token de recuperación solo en memoria y eliminado al salir, ocultarse o suspender página.

**Testing**: Conservar `npm test` (tipos), `npm run test:auth` y `tests/auth/*.test.mjs` de main. Agregar `test:usuarios` con Node 24 para lógica/HTTP de las extensiones, `.test.mjs` importando `.ts` sin TSX/alias. Reusar harness real `tests/browser/auth-harness.*`; añadir entrada aislada `tests/browser/usuarios-harness.*` solo para estados gráficos de Usuarios usando las vistas reales y transporte sintético, nunca copias de pantalla o controles debug en producción. Navegador, capturas/comparación visual, teclado/lector e integración real son gates distintos de Node/build.

**Target Platform**: Web con rutas finitas y enlaces nativos; sin hash/router genérico. Perfil de esta feature confirmado: SPA `http://localhost:5173`, API `http://localhost:3000`, recuperación `/recuperar-acceso/confirmar`. Producción requiere HTTPS y cookies/topología same-site compatibles, origen autorizado y fallback a index.html, con configuración operativa comprobada, no dominios inventados.

**Project Type**: Extensión de una única aplicación existente. Main ya integrado de forma revisada, sin descartar artefactos; queda revalidar la base si vuelve a cambiar antes de implementar, no repetir la integración ya completada.

**Performance Goals**: Metas de la spec SC-002/003 (<3 min invitar/corregir, <2 min acceso/cierre, nueve de diez sin ayuda) y SC-004 de comprensión. No añadir métricas o dashboards académicos. Interfaz sin saltos innecesarios de layout durante envío; no introducir esperas artificiales o animación ornamental.

**Constraints**: Profesores exclusivamente; servidor autoriza. Sin canjes ambiguos, polling de mantenimiento, contador exacto de inactividad inferido, secretos en logs/`VITE_*`, auto-retry de negocio ni éxito optimista en identidad/estado/rol. Limpiar **snapshot y DOM**, no solo una variable, al suspender; ninguna respuesta antigua repone datos/foco. Preservar autocorrectores/gestores de contraseña, foco, feedback neutral y todos los estados gráficos reales.

**Scale/Scope**: US1–6 habilitadas total/parcialmente; US7/US8 solo verificaciones de exclusión. Inicialmente 20 cuentas/página, filtros existentes, sin búsqueda/orden/acciones masivas. Entrega futura incluye todas las vistas y estados indicados en la matriz gráfica siguiente; preparar lógica o una pantalla de login no cierra el conjunto.

## Constitution Check

La constitución local **1.0.0 ratificada** el 2026-10-25 se incorporó idéntica desde main. La afirmación anterior de «solo plantilla» describía el checkout viejo; no se aplica a esta rama. No se modifica ni ratifica otra constitución. La preparación T001 incorpora/verifica la base y alinea referencias sin borrar artefactos de Usuarios.

| Principio/gate | Aplicación al diseño y comprobación posterior |
| --- | --- |
| I. Público y alcance explícito | Solo profesores, Q1–Q3 preservadas; gráfico integrado no añade nuevos públicos/módulos |
| II. Contrato y trazabilidad | Backend observado `ff46f8a`, fuentes previas en revalidación; revisar discrepancias y dependencia de correcciones declarada por main antes de integrar |
| III. Servidor y secretos | Un controlador, denegaciones generacionales, DOM/snapshot seguros al ocultar/restaurar, sin credenciales persistidas ni bypass UI |
| IV. Experiencia accesible/verificable | Vistas completas y estados reales, foco/lector/teclado, respuestas tardías, envíos y resultados inciertos, comparación gráfica por historia |
| V. Cambio mínimo/evidencia | Reutilizar diseño/código/pruebas de main; no regenerar componentes ni fabricar resultados de integración o usabilidad |
| Base visual aprobada | Manual + componentes/tokens de main; nuevos componentes solo Base UI; fallback neutral confirmado, colores semánticos siguen pendientes |
| Preparación de integración | Revisión corregida externa identificada: cinco hashes coinciden con backend-fixes y diff app/guardias leído. **Pruebas integradas pendientes**: backend main sigue sin esos cambios; no equiparar identificación estática a API en ejecución |
| Alcance de preparación autorizado | Rama, commit documental, merge main, resolución documental, alineación de artefactos y verificaciones. Sin implementación nueva, cambios backend, publicación o despliegue |

El diseño es compatible con los principios revisados. La incorporación real de main y la identificación estática del backend corregido están verificadas; pruebas integradas/gráficas/funcionales de la extensión y aceptación del responsable siguen pendientes. Las skills gráficas no estaban disponibles al revisar el diseño: se usaron manual, código y navegador sin fingir haberlas aplicado; comprobar disponibilidad de nuevo al implementar.

## Fuentes y revisión de la referencia gráfica

Fuentes leídas en `main@664cc5c` mediante Git, sin editar el repositorio original:

- `.specify/memory/constitution.md`, `package.json`, `components.json`, `README.md`, `vite.config.ts`, `src/App.tsx`.
- `src/auth/AuthRoot.tsx`, `client.ts`, `controller.ts`, `state.ts` y `tests/auth/client.test.mjs`.
- `src/styles.css`, `src/components/ui/{button,card,alert,input,label}.tsx`: variantes, tokens, bordes, dimensiones y semántica reales.
- `tests/browser/auth-harness.tsx`, `auth-harness.html`, y `specs/001-autenticacion-personal/{implementation-handoff,validation,sources}.md`, `contracts/ui-contract.md`: procedencia, garantías y límites de aceptación; informes históricos no son instrucciones para cambiar de worktree ni pruebas ejecutadas ahora.
- `docs/design/agent-design-manual.md`, `component-library-research.md`, `shadcn-mcp.md`, `validation.md`. El manual local conserva además C-06 aprobado en esta feature. Las declaraciones antiguas de «sin catálogo instalado» en esos registros no prevalecen sobre el código actual de main.

**Inspección gráfica real:** snapshot aislado y descartable de `664cc5c` en `/tmp/opencode/kudlab-main-664cc5c-review.bJbJUY`, sin merge ni cambios de aplicación. Se ejecutó su harness en puerto 5187 con transporte sintético: cero recursos `/api/`. Vista login observada/capturada en navegador a 1296×986, Card de 512px/32rem, radio 12px, borde Dark 1, sin sombra, fuente system-ui, botón de 44px y padding principal 48px/32px. Se resolvió consulta sintética como ausencia de sesión para mostrar el formulario; no se enviaron credenciales ni correos. Captura temporal de revisión: `/tmp/opencode-browser-LCCDNi/0/screenshot.png`; no es evidencia de implementación de Usuarios ni recurso a importar en producción.

En ese snapshot: `npm ci --no-audit --no-fund`, `npm test`, `npm run test:auth` **63/63** y build correctos. No se ejecutó integración backend, responsive móvil, lector real o bfcache real; los pendientes de main no se dan por cerrados. El puerto de revisión no cambia el perfil aprobado de la feature.

**MCP:** conectado; búsqueda/detalle/ejemplo Table consultados sin instalar. El detalle AlertDialog genérico sigue devolviendo Radix: no adoptarlo; obtener variante oficial Base UI/base-nova y adaptarla al catálogo existente. No usar Data Table/TanStack de la demo, sus filtros, selección o colores.

## Diseño gráfico integrado — referencia obligatoria de implementación

### 1. Invariantes heredadas de la autenticación de main

- Cabecera blanca con «Kudlab» a la izquierda y contexto docente a la derecha, borde inferior Dark 1; pie «Kudlab · Apoyo al seguimiento pedagógico». Sin sidebar, menú académico, hero de marketing ni marca alternativa.
- Texto Dark 1 sobre blanco; una acción primaria Primary con texto Dark 1 y hover Secondary. Acciones secundarias outline ya adaptadas, sin nuevas variantes de demo.
- Formularios en Card opaca de máximo 32rem, encabezado con contexto breve, título 1.75rem/600 y explicación, contenido espaciado y footer cuando aporte contexto. Radios 8px en controles/12px en panel; bordes funcionales sin sombras decorativas.
- Espaciado, tipografía sistema, ayudas y obligatoriedad textual de main. Input/Label/Button/Card/Alert locales se reutilizan; no dibujar versiones nuevas para cada pantalla. Lucide consistente de 20/24px, ocultar decoración a ayudas técnicas.
- Feedback neutral persistente con icono y texto: error, validación, pendiente, conflicto y éxito se distinguen por contenido, no inventando rojo/verde o badges de colores. Mantener los estados de acceso ya diseñados: comprobando, formulario, ingreso/cierre en curso, acceso confirmado, no disponible, cierre no confirmado y denegación.
- Mantener limpieza de contraseña, regiones status/alert, foco al título/resumen/primer campo inválido y botones de reintento explícito; no borrar estos comportamientos al ampliar la composición visual.

### 2. Composición por recorrido — no dejarla a una tarea de «polish»

| Vista integrada | Composición que debe construirse | Estados gráficos obligatorios |
| --- | --- | --- |
| Acceso/estado TEACHER | Seguir AuthRoot de main, no una pantalla alternativa. Mismo header/footer/Card, Input/Label y acción primaria. Añadir enlace real a recuperación en entrada porque esta feature sí la incluye; TEACHER autenticado solo identidad/estado y cierre | Inicial, envío, credenciales/validación, comprobación fallida, acceso confirmado, cierre pendiente/no confirmado, denegación/sesión retirada |
| Listado ADMIN | Mismo marco de marca con contenido ampliado hasta 75rem, título «Usuarios», explicación breve, filtro de estado con etiqueta y «Invitar profesor» como primaria. Table simple: nombre, correo, rol, estado y entrega disponible, enlace textual a detalle; total y paginación explícitos | Carga, vacío, resultados, sin resultados por filtro, acceso denegado, fallo y respuesta obsoleta descartada |
| Alta docente | Card/formulario de la familia del login, nombre/correo con ayuda, rol docente informado sin selector ADMIN/contraseña. Botones «Invitar profesor»/cancelar y advertencia persistente de activación bloqueada | Entrada, errores por campo/resumen, envío, cuenta pendiente con entrega conocida/desconocida, conflicto y resultado incierto |
| Detalle | Encabezado con nombre y retorno al listado; datos como lista de definición legible, no una tarjeta por dato. Separar identidad, correo pendiente si existe e invitación. Acciones explícitas edit/reemitir/inactivar/reducir según estado/permiso, sin iconos ambiguos ni controles diferidos | Carga, datos, no encontrado, denegación, fallo y datos actualizados tras acción |
| Edición | Mismos campos y jerarquía de alta; correo vigente y solicitado claramente etiquetados, borrador no secreto separado. «Guardar cambios» y cancelar, ayuda del bloqueo de confirmación | Entrada, validación, envío, nombre actualizado/correo pendiente, conflicto, entrega fallida/incierta y permiso retirado |
| Recuperación: solicitud | Card de la familia de acceso, correo etiquetado, ayuda neutra, acción «Solicitar recuperación» y retorno real a acceso | Entrada, validación, envío, confirmación neutra sin prometer recepción y no disponible |
| Recuperación: confirmación | Mismo marco/Card; nueva contraseña con ayuda de política vigente y acción explícita, sin datos de cuenta precargados. No consumir token al mostrar | Formulario, validación, envío, éxito con nuevo acceso, sin token/enlace no utilizable, fallo y salida a nueva solicitud |
| Reemisión/inactivación/reducción | AlertDialog Base UI con apariencia del mismo catálogo: superficie opaca, título, cuenta/consecuencia, cancelar y verbo específico de confirmación, foco seguro y fondo inerte | Confirmación, envío sin doble activación, rechazo/conflicto, resultado no confirmado; cancelar no muta. Sin rojo destructivo ni textos de borrado de demo |
| Enlaces bloqueados | Mismo marco y Alert neutral, mensaje de trámite no disponible y salida segura sin identidad ni elección de trámite | Ningún formulario/canje de invitación o correo, incluso por URL directa |

**Entrega de US2 incluye desde el inicio el estado mínimo de entrega después del alta.** No esperar T029/US3 para cumplir US2.3; US3 agrega reemisión y sus confirmaciones, no el primer render de entrega.

### 3. Responsive, foco y estados de interacción

- Base de una columna; 16px de margen estrecho y 24–32px amplio; auth/formularios hasta 32rem y gestión hasta 75rem. No forzar 32rem a una tabla ADMIN ni estirar el login a todo el ancho.
- En estrecho la cabecera/contexto se apilan como en main; toolbars y acciones pasan a varias líneas sin recortar etiquetas. Mantener nombre/correo/rol/estado/entrega accesibles. Si la tabla necesita scroll, confinarlo a una región nombrada operable por teclado; no scroll horizontal general ni ocultar información crítica sin alternativa.
- Cada control muestra base, hover, pressed, foco, disabled y envío según manual; no depender del color para permiso/estado. Carga con texto/icono Lucide y ancho estable, errores/corrección junto al campo y resumen cuando aplique. Sin skeleton/demo o animación añadidos sin necesidad.
- Probar 320/390/768/1024/1440px, zoom de texto 200% y página 400%, movimiento reducido, contraste y lector de pantalla. No usar una captura desktop como prueba responsive completa.
- Todas las vistas protegidas deben retirarse del DOM/snapshot al pagehide/ocultación. Reusar generación/suspend/resume de main para pageshow/visibilitychange, sin remontaje obligatorio, consultas duplicadas o respuesta antigua que reponga datos/foco. Extender ese ciclo a cuentas, borradores y token de recuperación, no solo a identidad.

### 4. Definition of Done gráfica y funcional

Cada historia habilitada termina con su pantalla real, componentes/tokens de main, todos sus estados y responsive, conectada a la API permitida o bloqueada explícitamente según contrato. Adjuntar capturas saneadas de desktop/estrecho y estados relevantes, viewport y pasos para reproducir, más comprobaciones de teclado/foco; comparar login antes/después contra main sin exigir igualdad píxel a píxel que impida añadir contenido aprobado.

El harness facilita estados sintéticos difíciles de provocar, pero **no sustituye la vista integrada ni la prueba con backend aislado**. Fixtures fuera de producción. Después de integrar, recorrer la aplicación completa, corregir diferencias visuales y funcionales y volver a capturar. No cerrar una historia por pasar tests Node ni cerrar la entrega con una galería/diseño separado del producto.

Gate final adicional T056: comparación de la base de autenticación con main y continuidad de gestión/recuperación, más revisión del responsable del resultado gráfico integrado. Si falta navegador, entorno o aprobación, dejar aceptación pendiente explícita, no declararla completada.

## Compatibilidad con main — diferencias que no se copian por accidente

| Aspecto | main observado | Decisión/acción para esta feature |
| --- | --- | --- |
| Cliente y sesión | `createAuthClient`, controlador/AccessState y AuthRoot existentes | Reutilizar y extender; **no** crear otro `Access.tsx`, `session.tsx`, Identity incompatible o provider paralelo |
| Transporte | Rutas relativas, `credentials: same-origin`, sin rememberMe; proxy local 3001 | Esta feature aprobó `credentials: include`, `rememberMe: false` y perfil API 3000. Mantener esa decisión; adaptar cliente/origen de forma explícita con pruebas, conservando no-store/redirect:error/validación y sin cambiar proxy por inferencia. Si se propone unificar con mismo origen de main, requiere confirmación aparte |
| Rutas/cuerpos | Root único y sign-out sin body en el cliente; backend adaptaba `{}` | Extensiones de rutas/recuperación de este plan están aprobadas; body `{}` del contrato de esta feature debe contrastarse y probarse al adaptar, no sustituir código/main sin revisar |
| Integración backend | README/validation declaran correcciones externas P-01/P-02 sin merge en backend main | Backend consultado sigue limpio en `ff46f8a`. No se demostraron arreglos aquí: verificar revisión corregida/equivalente antes de cerrar integración; no editar backend ni dar por integrado un worktree ajeno |
| Aceptación de auth | Código y 63 tests presentes; hay pendientes registrados de accesibilidad, dos perfiles, bfcache real y HTTPS | No heredar una certificación inexistente. Conservar y ampliar tests y evidencia; distinguir observación controlada de navegador real |
| Gobierno | Constitución 1.0.0 ratificada en main | Incorporarla sin enmiendas ni apropiarse de sus ejemplos previos; reemplazar afirmaciones de base vacía como estado actual de implementación |

## Project Structure

### Documentation (this feature)

```text
specs/001-gestionar-usuarios/
├── spec.md
├── plan.md                     # Referencia gráfica, composición y gates actualizados
├── tasks.md                    # 56 tareas; reutilización + entrega gráfica integrada
├── research.md
├── data-model.md
├── quickstart.md
├── fuentes-backend.md
├── revalidacion-plan.md
├── checklists/requirements.md
├── contracts/{ui,api-consumption}.md
└── evidence/                   # Futura evidencia saneada, no resultados fabricados
```

La spec/modelo/contratos conservan alcance, campos y allowlist; se alinearon las afirmaciones de estado actual con la base integrada, constitución y reutilización de auth. Los registros de revisión inicial permanecen como historia explícita. No se reabren Q1–Q3 ni se crean Access/session paralelos.

### Source Code (repository root)

Base real de main y extensiones previstas (estas últimas aún no implementadas):

```text
src/
├── main.tsx
├── App.tsx                         # Composición; no dueño paralelo de sesión
├── styles.css                      # Tokens/auth CSS de main + gestión responsive
├── auth/
│   ├── AuthRoot.tsx                 # Reusar visual/lifecycle; punto mínimo de composición
│   ├── client.ts                    # Adaptar delta de transporte aprobado, no duplicar
│   ├── controller.ts                # Un controlador con generaciones y suspend/resume
│   └── state.ts                     # Identity/AccessState existentes
├── components/
│   ├── ui/{button,input,label,card,alert}.tsx  # Ya existentes; conservar adaptaciones
│   ├── ui/{table,alert-dialog}.tsx            # Solo si se incorporan oficialmente
│   └── StaffLayout.tsx              # Extraer marco de AuthRoot solo lo necesario para compartir
├── lib/
│   ├── utils.ts                     # Existente
│   └── http.ts                      # Consumo de negocio, no segunda autenticación
└── features/usuarios/
    ├── types.ts                     # DTO Account/errores; Identity importada de auth/state
    ├── api.ts                       # Solo cuentas/recuperación permitidas
    ├── navigation.ts                # Rutas finitas y token efímero, sin router genérico
    ├── Recovery.tsx
    ├── Accounts.tsx
    ├── AccountDetail.tsx
    └── AccountForm.tsx
tests/
├── auth/*.test.mjs                  # Existentes, ampliar sin borrar casos de seguridad
├── usuarios/*.test.mjs              # Extensiones nuevas
└── browser/
    ├── auth-harness.{html,tsx}       # Existentes, real AuthRoot con fetch sintético
    └── usuarios-harness.{html,tsx}   # Solo fixture gráfica aislada de vistas reales si hace falta
```

**Structure Decision**: Mantener AuthRoot/controlador como único dueño del ciclo de autenticación. Ampliar un punto mínimo de composición autenticada y, si hace falta, extraer StaffLayout del marco existente para alternar ancho auth/gestión. No desmontar AuthRoot para «mostrar cuentas» y disparar stop/check en bucle; no montar dos controladores ni duplicar listeners de ciclo de página. App decide contenido permitido; las vistas de negocio retiran sus datos y notifican denegaciones con generación de petición, sin reenviar mutaciones. No preservar token/borrador sensible por navegar.

Node conserva imports explícitos `.ts`, `import type` y configuración `allowImportingTsExtensions`/`noEmit` ya presentes en main; no añadir alias/transformación a módulos probados por Node. La nueva estructura solo agrega responsabilidades necesarias y conserva suites/harness existentes.

## Phase 0 — Research y rebase conceptual de la planificación

Investigación previa en [research.md](research.md), actualizada por la revisión de main y docs/design descrita aquí: ya hay autenticación y catálogo instalados, constitución ratificada y manejo de ciclo de página. No tratar esos archivos como trabajo a recrear ni sus informes antiguos como ausencia de código. Las decisiones aprobadas de esta feature y el fallback C-06 permanecen.

## Phase 1 — Diseño gráfico/técnico y contratos

La matriz gráfica de este plan complementa [contracts/ui.md](contracts/ui.md): define composición, componentes reutilizados, ancho y estados por pantalla, responsive y evidencia de entrega. [contracts/api-consumption.md](contracts/api-consumption.md) conserva la allowlist; [data-model.md](data-model.md) los campos/estados de negocio. Reutilizar el estado de acceso más rico de main en lugar de reducirlo al esquema abstracto antiguo.

Antes de implementar revisar nuevamente consistencia de artefactos y corregir referencias históricas según T001. La decisión funcional FR-020 de no repetir mutaciones inciertas ya está en la spec: su mención residual de «revisión del responsable» no autoriza inventar variantes; confirmar si afecta algún detalle nuevo, manteniendo el mínimo de revisión explícita previsto. No se declara resuelto ese hallazgo por una instrucción gráfica.

## Implementation Strategy y verificación

1. Base main preparada sin descartar docs, con constitución, catálogo, tests/auth y harness conservados; revisión backend corregida identificada por hashes. Revalidar antes de integración real si cambia y preparar entorno aislado solo con autorización.
2. Baseline gráfico de auth + catálogo compartido; extender layout sin cambiar lenguaje visual. Adaptar solo deltas de transporte aprobados con pruebas explícitas.
3. US1: reutilizar acceso/cierre, verificar integración/lifecycle y preservar gráfico; incorporar recuperación como enlace real cuando esté implementada, nunca placeholder.
4. US2/US3: lista/detalle/alta gráficas con entrega visible desde US2; luego reemisión. US4 puede adelantarse tras US1 como incremento con mismo diseño.
5. US5/US6: edición y acciones confirmadas, estética compartida y consecuencias/errores reales.
6. Comprobar exclusiones y canjes bloqueados, prueba integrada y revisión visual de todas las pantallas/estados. Ejecutar `npm test`, `npm run test:auth`, `npm run test:usuarios`, build; no sustituir navegador por tipos.
7. Comparar capturas desktop/estrecho, corregir regresiones y solicitar revisión del resultado gráfico integrado. Dejar pendientes honestos si falta entorno/aprobación.

## Complexity Tracking

No nueva autenticación, suite visual, router, design system paralelo, dashboard genérico ni tablas avanzadas. La extracción opcional StaffLayout evita duplicar cabecera/footer sin convertir la app en framework. El harness visual es exclusivo de pruebas y usa componentes reales; no justifica endpoints debug, lógica alternativa de producto o nuevos paquetes. Funcionalidad, gráficos, privacidad, responsive y accesibilidad son una entrega conjunta, no fases opcionales posteriores.

**Registro histórico de la actualización gráfica:** antes de integrar main había 56 tareas pendientes con formato/labels/rutas y enlaces comprobados; las pruebas se habían ejecutado solo en snapshot temporal. Se cerraron su pestaña y servidor propio 5187, sin tocar servicios ajenos.

**Estado tras preparación autorizada:** main ya integrado por `e45b05d`, T001 completada y 55 tareas pendientes. En este worktree real pasaron `npm ci`, tipos, **test:auth 63/63** y build; se verificaron revisión corregida backend por cinco hashes y diff estático, sin ejecutarla ni modificarla. Evidencia y límites en [revalidacion-plan.md](revalidacion-plan.md#preparación-del-worktree-para-desarrollo). Código/configuración de aplicación conserva main; no se implementó Usuarios ni se certificó integración, accesibilidad, bfcache real o piloto. Próxima tarea de implementación: T002.
