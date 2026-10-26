# Implementation Plan: Autenticación del personal

**Branch**: `feat/frontend-authentication` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: `specs/001-autenticacion-personal/spec.md`; Q1–Q3 y opciones A confirmadas.

**Actualización visual autorizada, 2026-10-25:** continuar esta misma feature y sesión,
actualizando únicamente plan/tasks como artefactos SDD, sin regenerar spec, investigación,
modelo o contratos. La implementación funcional procede de `edcf759`; rama visual
`feat/authentication-interface`, worktree `frontend-authentication-ui`. La sección
«Ampliación visual» al final prevalece sobre restricciones históricas de no incorporar
bibliotecas visuales, solo para los componentes/dependencias expresamente autorizados.

**Estado:** núcleo funcional implementado en edcf759; presentación gráfica autorizada
en esta sesión, según ampliación visual al final. No se declara aceptación completa
ni despliegue. Evidencia backend en [backend-fixes.md](backend-fixes.md).
Los bloques originales conservan el diseño funcional que precedió a la implementación;
la ampliación visual explicita qué decisiones técnicas se actualizan, sin regenerarlo.

## Summary

Implementar posteriormente una única superficie de acceso para profesores con rol
técnico ADMIN/TEACHER: correo/contraseña, comprobación inicial/recarga, cierre actual
y manejo transversal de denegaciones. Después del acceso solo identidad propia y
«Cerrar sesión», sin destinos previos, recuperación, dashboard ni módulos adicionales.

Usar React/TypeScript existentes, máquina de estados discriminada, un cliente fetch
pequeño y un coordinador por raíz. Sin router, store externo, SDK auth, cliente HTTP
o dependencias nuevas. Cookies HttpOnly, rutas relativas y mismo origen HTTPS mediante
proxy. El navegador maneja la credencial; JavaScript nunca la lee ni la almacena.

P-01/P-02 se corrigieron en un trabajo backend separado autorizado: el cierre asegura
el borrado persistido antes de confirmar éxito y la consulta/guardas propagan cookies
de renovación. No se reinicia actividad protegida por consultar sesión. Evidencia y
condición de integración de esa rama: [backend-fixes](backend-fixes.md). El checkout
principal backend no se modificó ni se presume actualizado.

## Technical Context

**Language/Version**: TypeScript 7.0.2 y React/React DOM 19.3.1 del lock actual;
Node 24 y npm. Mantener package-lock.

**Primary Dependencies**: Vite 8.3.5, Tailwind/plugin Vite 4.3.3, plugin React 6.1.2;
solo dependencias existentes. Fetch y APIs React/DOM nativas; no añadir suite visual
como parte del plan sin necesidad/elección aprobadas.

**Storage**: estado de acceso efímero en memoria; cookie HttpOnly de sesión persistida
gestionada por navegador. No localStorage/sessionStorage/IndexedDB de contraseñas,
tokens, identidad ni destino previo. Sin JWT y sin parámetro/control rememberMe.

**Testing**: conservar `npm test` como typecheck y añadir, en implementación, el script
`test:auth` para `node --test tests/auth/*.test.mjs`. Node 24 elimina tipos de módulos
`.ts` de lógica pura; usar importaciones `.ts` explícitas y permitirlas en tsconfig
con `allowImportingTsExtensions`, `erasableSyntaxOnly` y `noEmit`. Sin JSX ni import.meta.env
en módulos probados por Node. No confundir tests de lógica con DOM/accesibilidad.
Pruebas de navegador y lector de pantalla según quickstart; si se necesita nueva
infraestructura de automatización DOM, justificarla y pedir aprobación antes de instalar.

**Target Platform**: SPA de navegador; producción bajo un único origen HTTPS con
API detrás de proxy. Desarrollo mediante proxy Vite `/api` a localhost:3000,
SPA_ORIGIN localhost:5173, sin mezclar hostnames ni desactivar validación de origen.

**Project Type**: frontend existente; correcciones backend en worktree separado.

**Performance Goals**: SC-001–007 de spec. Sin nuevos SLA, porcentajes de usabilidad
inventados ni contador de inactividad. Timeout técnico de 15 segundos para una espera,
no garantía de cancelación servidor ni meta de rendimiento del producto.

**Constraints**: solo tres operaciones auth existentes; servidor como autoridad;
sin rutas nuevas, polling de mantenimiento, recuperación, Google, registro, MFA,
datos reales de menores, módulos académicos ni infraestructura productiva implementada.

**Scale/Scope**: una superficie raíz, cuatro recorridos P1, dos roles técnicos y
contrato transversal para futuras features sin implementar esas features aquí.

## Constitution Check

*GATE: comprobación inicial y posterior al diseño.*

| Principio | Antes de investigación | Después de diseño/corrección |
| --- | --- | --- |
| I. Personal y alcance | PASS: spec y aclaraciones | PASS: identidad/cierre mínimos; sin ampliar módulos ni públicos |
| II. Contrato comprobado | PASS para investigar | PASS: OpenAPI actual y montaje contrastados; fixes, pruebas y revisión local identificados |
| III. Seguridad servidor | PASS: no autoridad local | PASS: revocación/renovación corregidas y probadas; integración exige esa revisión backend |
| IV. Accesibilidad y estados | PASS: escenarios definidos | PASS de diseño: semántica/foco/estados documentados; validación visual y asistiva futura |
| V. Mínimo y evidencia | PASS: no paquetes nuevos | PASS: cuatro módulos, tests Node sin dependencias, límites de ejecución explícitos |

Sin excepciones constitucionales ni aclaraciones funcionales pendientes. Los hallazgos
originales y reproducciones fallidas siguen en investigación/validación histórica;
el cierre actual se fundamenta en las correcciones de backend-fixes, no en ignorarlos.

**Condición de integración:** antes de ejecutar pruebas integradas/entregar frontend,
usar la rama backend corregida o su integración revisada. Si se usa main sin fixes,
reaparecen P-01/P-02. Esto es dependencia concreta para tareas, no investigación abierta.
TLS/proxy reales, lector de pantalla y navegador frontend quedan como validaciones de
implementación/despliegue, no resultados obtenidos durante este plan.

## Project Structure

### Documentation (this feature)

```text
specs/001-autenticacion-personal/
├── spec.md
├── sources.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── backend-validation.md      # reproducciones previas a corrección
├── backend-fixes.md           # correcciones, resultados y dependencia backend
├── validation/backend-auth.test.ts # harness histórico, no test frontend
├── data-model.md
├── quickstart.md
└── contracts/
    ├── ui-contract.md
    └── auth-client.md
```

`tasks.md` corresponde al próximo comando; no se genera en este paso.

### Source Code (repository root)

Archivos existentes o previstos para implementación posterior, no creados por este plan:

```text
src/
├── App.tsx                   # monta únicamente AuthRoot
├── main.tsx                  # conserva StrictMode
├── styles.css                # conserva Tailwind; ajustes accesibles futuros
└── auth/
    ├── state.ts              # tipos y transiciones, sin React ni credenciales
    ├── client.ts             # fetch inyectable y normalización por operación
    ├── controller.ts         # exclusión, generaciones, suscripción/reconciliación
    └── AuthRoot.tsx          # formulario, estados y foco accesibles
tests/
├── auth/
│   ├── state.test.mjs
│   ├── client.test.mjs
│   └── controller.test.mjs
└── browser/
    ├── auth-harness.html     # entrada de prueba, solo Vite desarrollo
    ├── auth-harness.tsx      # AuthRoot real con fetch/controles sintéticos
    └── history-target.html   # navegación real de ida/vuelta para bfcache
```

También se prevén cambios mínimos a `package.json` (test:auth), `tsconfig.json`
(importaciones TS eliminables e inclusión de `tests/browser/**/*.tsx` en typecheck),
`vite.config.ts` (proxy local), README y contexto.
No modificar package-lock salvo necesidad justificada; sin nuevas dependencias.

**Structure Decision**: mantener una aplicación y cuatro módulos de feature. El cliente
no usa configuración de entorno: URLs relativas fijas. El controlador se crea por raíz
sin iniciar red en render, expone snapshot/suscripción estables y se conecta con APIs
React existentes (por ejemplo useSyncExternalStore), sin store externo ni contexto global
innecesario. Formulario mantiene contraseña fuera del snapshot y la limpia al terminar
el intento/abandonar el recorrido. Los tests Node no importan AuthRoot ni requieren DOM
simulado. El harness separado sí importa AuthRoot real y se ejecuta en navegador con
React/Vite existentes, sin DOM simulado, dependencias nuevas ni entrypoint de producción.

### Diseño de interacción y coordinación

- Aplicar [data-model](data-model.md) y [UI contract](contracts/ui-contract.md).
  Checking bloquea tanto contenido como login operativo; solo identidad confirmada se muestra.
- Un bloqueo síncrono de operaciones evita doble envío antes de render. Cada resultado
  debe corresponder a generación/operación vigentes. AbortController no revierte servidor.
- Login incierto comprueba sesión antes de otro envío; cierre incierto se recupera
  manualmente consultando primero. No repetir automáticamente mutaciones de negocio.
- Revalidar al recuperar visibilidad sin polling; no prometer sincronización instantánea
  entre pestañas. Atender `pagehide`, `pageshow` incluido persisted y `visibilitychange`:
  suspender retirando identidad del snapshot y DOM de forma síncrona; al volver comprobar
  sin mostrar contenido anterior y deduplicar eventos de la misma activación. No depender
  de remontaje React ni desactivar bfcache con unload/beforeunload. Conservar intención
  de cierre incierto; una denegación antigua no invalida una sesión nueva.
- API del cliente y protección de cookies conforme a [auth-client](contracts/auth-client.md).
  El backend protege acceso; la UI no calcula permisos con rol cacheado.
- No se diseña composición gráfica ni se implementan componentes en este paso. Las skills
  apple-design/ui-ux-pro-max/design-taste-frontend y ponytail no están disponibles en esta
  sesión/worktree; no se utilizaron. Revisar disponibilidad e instrucciones al implementar.

### Verificación y correspondencia con requisitos

| Requisitos / historias | Comprobación prevista |
| --- | --- |
| FR-001–004,009,013 / US1 | cliente: método/cuerpo/errores y whitelist; UI: campos, roles y mensaje uniforme |
| FR-002,010,014 / US2 | estado/controlador: entrada/recarga, invalidación, sin contador ni destino previo |
| FR-005,006 / US1–2 | diez envíos repetidos, promesas fuera de orden, timeout y reconciliación |
| FR-007,015 / US3 | cierre confirmado/incierto, sesión ausente/vigente al reintentar, solo una sesión |
| FR-008–009 / US4 | 401/403/indisponibilidad y generación, sin petición de negocio real ni repetición |
| FR-011 / todas | navegador y lector de pantalla: teclado, etiquetas, foco, autocomplete y anuncios |
| FR-012,016 / todas | cliente/estado: ausencia de secretos, cookie misma procedencia; integración backend corregida |

Los criterios completos de cada historia y SC-001–007 se validan según quickstart;
tests backend no equivalen a frontend implementado ni a piloto listo.

### Pruebas de navegador reproducibles (C1/U1)

El harness bajo `tests/browser/` monta el mismo AuthRoot/controlador/cliente, inyectando
fetch sin red y controles DOM para retener/resolver/rechazar respuestas y emitir
denegaciones tipadas. No expone globals, hooks o endpoints de depuración en la aplicación.
Su receta y resultados esperados se definen en [quickstart](quickstart.md).

Vite desarrollo sirve la página de prueba explícita; no se ubica en public, no se importa
desde src/index y no se añade a entradas del build. Comprobar que dist no contiene
harness, página auxiliar ni controles sintéticos. Es infraestructura de prueba aprobada
para cerrar U1, no una ruta de negocio ni código que deba publicarse.

## Complexity Tracking

Sin violaciones ni excepciones. No hay nueva biblioteca de auth/estado/router/testing.
Un módulo adicional solo se justificaría si reduce duplicación real o cubre una necesidad
aprobada, no para copiar una arquitectura de ejemplo.

## Ampliación visual: shadcn/ui para la autenticación existente

### Autorización y alcance

El responsable autorizó implementar presentación en esta sesión con shadcn, reutilizando
la feature y modificando solo plan/tasks en SDD. Confirmó feedback **neutral** Dark 1
`#1C2E57` sobre blanco, texto e icono explícitos. Esto no asigna colores semánticos ni
cierra P-01 del manual. No se modifica I1 ni el alcance de las cuatro historias.

Dos vistas de una misma raíz, no rutas nuevas: acceso (formulario/comprobación/fallos)
y sesión confirmada (identidad/cierre). Se conservan error, incertidumbre, denegación,
reintentos, suspensión DOM y generaciones. Sin dashboard, recuperación, logo inventado,
imágenes, fuentes externas, datos de menores ni pantallas adicionales.

### Fuentes contrastadas y límites

- Fuente externa solicitada: `/home/santino/Universidad/TrabajoCampo/Kudlab-frontend/docs/design/`:
  `agent-design-manual.md` (SHA256 `9145e9095557d6a83c436b7ed7401cd9bced03ce2cf23dd8b804b408b31b9753`),
  `component-library-research.md` (`16dc3a376ebe5aeae466b1d9db2fbcd53bb29117977bad0406388f166080e52d`),
  `shadcn-mcp.md` (`fe91119377ce81cb06bdbf05ae3bb6a23a8994de50e46f3362b0f54773daac04`) y
  `validation.md` (`e8f578db5849c8dad8e265103b57c0975f8c157ae112c29247b81a91c676f943`).
  Se leyeron versiones locales; no atribuirlas al HEAD f061259 del checkout principal.
  Sus referencias a raíz vacía/constitución plantilla son históricas, desplazadas por
  autenticación implementada y constitución 1.0.0 ratificada de esta rama.
- Manual C-01/C-03/C-04/C-05: valores de marca, geometría, tipografía de sistema,
  responsive, shadcn/ui + Base UI + Lucide aprobados. P-04 (activos/dispositivos) no se
  inventa; anchos son pruebas, no dispositivos institucionales confirmados.
- Skills apple-design/ui-ux-pro-max/design-taste-frontend no disponibles en catálogo,
  worktree o directorio global comprobados. No se utilizaron. MCP shadcn tampoco está
  disponible: búsqueda de herramientas sin resultados. No se modifica configuración
  OpenCode; se consulta el registro HTTP oficial sin fingir uso del MCP.
- Registro oficial consultado: `https://ui.shadcn.com/r/styles/base-nova/`
  `{button,input,label,card,alert}.json`; Base UI Input y metadatos npm de dependencias.
  Se adapta código local manualmente, no se ejecuta init ni se adopta preset intacto.
- Backend recontrastado: índice → Usuarios → autenticación, pendientes de contexto,
  spec 003, OpenAPI actual, montaje `src/app.ts` y `src/auth/` ya consultados en sesión.
  Rama `fix/session-cookie-guarantees`, base ff46f8a y las cinco SHA256 de backend-fixes
  reconfirmadas sin diferencias. No se modifica backend; fixes siguen locales/sin merge.
  El rediseño no introduce llamadas API ni modifica cliente/controlador/estado.

### Decisiones técnicas (sustituyen solo restricciones visuales históricas)

1. Catálogo local pequeño `src/components/ui/{button,input,label,card,alert}.tsx`,
   con procedencia shadcn y sus adaptaciones en comentarios; licencia conservada.
   Button usa Base UI, sin Radix, SDK auth, router ni librerías de formularios.
   Input mantiene acceso al input nativo y refs/autofill/limpieza de contraseña.
2. Dependencias autorizadas revisadas: `@base-ui/react` 1.9.0 (MIT, React 17–19),
   `lucide-react` 1.61.0 (ISC, React 16–19), `class-variance-authority` 0.7.1
   (Apache-2.0), `clsx` 2.1.1 y `tailwind-merge` 3.7.0 (MIT). Sin calendario ni peers
   opcionales date-fns. `package-lock.json` se conserva y actualiza exclusivamente por
   esta necesidad aprobada. El CLI shadcn 4.22.1 no se instala en la app.
3. `components.json` y alias @ de TS/Vite para catálogo, `src/lib/utils.ts` para cn.
   Código puro auth mantiene imports relativos; servidor/proxy a 3001 sin cambiar origen.
4. Una fuente de sistema, 16px/1.5; títulos 28px/600, subtítulos 20px/600 y metadatos
   14px. Espacios 4/8/12/16/24/32/48, controles mínimo 44px, radios 8/12, foco Dark 1
   2px separado 2px, sin sombras. Primaria #53C0F3 con texto Dark 1 y hover #4DABD7;
   inactiva #F2F2F2 con texto Dark 1 y disabled nativo. No opacity para reducir contraste.
5. Tokens centralizados en `src/styles.css`, superficies blancas, texto/bordes/foco
   Dark 1. Sin rojo/verde/amarillo ni estilos destructive por defecto. Secundaria shadcn
   no equivale al color Secondary de marca: outline sobre blanco. Sin dark mode nuevo.
6. Composición de una columna: marca textual, panel de hasta 32rem, formulario agrupado,
   footer de contexto. Identidad como definición semántica, no tabla ni dashboard.
   Todos los mensajes explícitos, iconos Lucide decorativos aria-hidden, sin logo inventado.
7. Se mantienen refs/foco, gestores de contraseñas, pegado, exclusión síncrona, live regions
   y flushSync de pagehide. Componentes visuales no controlan sesión o autorización.

### Gates y comprobación de consistencia antes de editar aplicación

PASS I–III: mismos actores, historias, contratos y estado efímero; no autoridad por rol.
PASS IV de diseño: semántica/foco/responsive/contraste especificados, neutrales autorizados;
no certifica accesibilidad. PASS V: biblioteca aprobada por responsable, cambios limitados
a presentación y registro en estos dos artefactos. No requiere enmienda constitucional.
Revisión acotada de spec/contratos/plan/tasks: se conservan FR-001–016 y SC-001–007,
C1/U1 e I1. No se afirma un nuevo speckit.analyze completo. T026/T033/T034 continúan
abiertas; su aceptación no se infiere de instalar componentes ni de pasar build.

### Validación de la ampliación

T039–T046 en tasks. Comprobar 63 tests existentes, tipos, build, ausencia del harness
en dist y regresión visual con transporte sintético: campos/errores, ingreso pendiente,
identidad, comprobación/reintento, cierre incierto, 401/403, respuestas antiguas y C1 DOM.
Anchos 320/390/768/1024/1440; zoom/texto ampliado, foco, contraste de estados y movimiento
reducido. Registrar resultados reales y límites al final de tasks, sin tocar los informes
anteriores. Lector, bfcache real y HTTPS no se certifican por inspección DOM.

### Resultado de la ampliación visual

T039–T046 ejecutadas; evidencias detalladas al final de tasks.md. Catálogo pequeño
shadcn/Base UI/Lucide integrado y tokens aplicados; se preserva lógica de autenticación.
Se verificaron estados DOM, reflujo con texto ampliado y recorrido básico de teclado
en raíz real; no se certifican las validaciones asistivas/operativas pendientes.
Los informes/spec/contratos anteriores permanecen intactos por instrucción del responsable.
Vista disponible en localhost:5173 y backend de prueba en 3001, sin merge ni commit automático.
