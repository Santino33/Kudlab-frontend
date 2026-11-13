# Verificación en navegador

Los scripts `*.check.mjs` usan el [driver CDP versionado](vendor/README.md). Requieren Node 24 y Chrome/Edge/Chromium instalado; `CHROME_PATH` permite seleccionar un ejecutable. `KUDLAB_CDP_DRIVER` mantiene compatibilidad con otro driver CDP. No se instalan skills ni dependencias globales.

Prueba del driver (lanza un navegador desechable si está disponible; si no, el caso real se informa como omitido):

```bash
npm run test:browser-driver
```

Para los recorridos de UI, iniciar Vite en una terminal:

```bash
npm run dev -- --host 127.0.0.1 --port 5187 --strictPort
```

En otra terminal, por ejemplo:

```bash
KUDLAB_TEST_ORIGIN=http://127.0.0.1:5187 node tests/browser/invitation-conflict.check.mjs
```

Los scripts declaran sus fixtures y URL al inicio: revisar cada uno antes de ejecutarlo. No equivalen a una prueba de API/PostgreSQL reales. Las capturas se escriben en sus directorios temporales configurados; nunca utilizar datos reales de menores. Los perfiles del driver son desechables, no el perfil personal del navegador. Para aislar el barrido de perfiles, crear un directorio exclusivo y asignarlo a `TASTE_SKILL_TMP`.

`recovery.check.mjs` usa `RECOVERY_PREVIEW_ORIGIN`, no `KUDLAB_TEST_ORIGIN`. `courses.check.mjs` es la excepción de integración real: exige `KUDLAB_COURSES_ORIGIN` y `KUDLAB_COURSES_API` en localhost, más sus cuentas/cursos sintéticos preconfigurados en una base desechable. No ejecutarlo contra una base compartida ni interpretar su guardia de configuración como un fallo del driver.

`tests/browser/*.tsx` son harnesses de desarrollo: se comprueban tipos, pero no se publican en `dist/`. La validación de producción sigue siendo `npm run build` y la verificación de sus cabeceras en el hosting real.

## Inicio y Tu cuenta

`inicio-cuenta.check.mjs` usa `KUDLAB_TEST_ORIGIN`, `KUDLAB_BROWSER_OUTPUT` y el
driver desechable existente. Comprueba ambos roles/siete anchos, tarjeta de solo
lectura/datos largos, accesos alineados y menú global con solo Cerrar sesión.
Incluye teclado/foco/AX/táctil, suspensión, cierre confirmado/ausente/incierto,
reconciliación y retorno por historial con transporte sintético, sin API/BD real.
`KUDLAB_EXPECT_LEGACY=1` verifica la versión transitoria con cierre lateral aún
disponible; por defecto exige su retirada. El harness mantiene sesión mutable y
permite escenarios `close=absent|unconfirmed|network|recover|lost-response|timeout|pending`.
Timeout usa reloj corto solo de test; pending no liquida la petición. No confundir
AX/reflujo con lector, zoom real 400%, BFCache o revocación probada en servidor.

## Tareas digitales: disponibilidad y detalle (feature 07)

`KUDLAB_TEST_ORIGIN=http://127.0.0.1:5387 node tests/browser/task-availability.check.mjs`
usa exclusivamente `tasks-harness.html` y fetch sintético sin fallback a API.
`KUDLAB_BROWSER_OUTPUT` permite elegir la carpeta privada de resultados/capturas;
`TASTE_SKILL_TMP` debe señalar un directorio exclusivo de perfiles desechables.
Incluye la suite DOM anterior, PATCH mutable con revisión, guardado pendiente,
409/reconsulta/nueva intención, error incierto/reconciliación sin replay y respuesta
tardía tras suspensión; además texto, panel, roles y seis anchos con teclado/AX.
`--behavior-only` ejecuta solo la regresión funcional sintética (útil antes del
restyling), sin acreditar geometría ni presentación nueva.
El informe siempre separa las dimensiones globales observadas de la cobertura local:
`--require-dimensions` exige además pista40×24/thumb20 en todas las vistas y objetivo
real44×44. El responsable reasignó explícitamente ese bloque global a feature07;
la pista visual está dentro de la raíz operable Base UI, no sustituye su objetivo.
No llamar CA-01 completo al éxito de un subconjunto de comprobaciones.
`?view=detail&role=admin` abre directamente la ficha sintética para inspección visual.
El check verifica contenido local al200% y declara aparte el desbordamiento del
encabezado global de cuenta a320px; `--require-page-reflow` exige también esa
condición global. Comparar scrollWidth con el ancho solicitado, no solo innerWidth:
un viewport móvil puede ensanchar su área de layout y ocultar el fallo a esa comparación.
No acredita API/BD/Play reales, continuidad por código/acuse, lector ni zoom400 real.
Los harnesses y fixtures no se publican como sitio: el artefacto público es solo dist.

## Base visual compartida

`base-visual.check.mjs` usa `KUDLAB_TEST_ORIGIN` y el driver CDP existente, sin API/BD.
Comprueba seis anchos, estados de acción/campos, reserva de ancho de carga, nombre
accesible en el árbol AX, texto 200%, reflujo a 320 CSS px, colores forzados,
movimiento reducido y navegación desktop/Sheet para ambos roles. Zoom real 400%,
lector y Firefox/Edge necesitan comprobación separada: emular un viewport no los acredita.

Contrato para consumidores (sin lógica de negocio nueva):
- Button admite `loading={pending}` y `loadingLabel` con el texto de carga propio.
  Pasar `loading={false}` también en reposo reserva ambas etiquetas; conservar
  las guardias de envío del formulario. No convertir todo disabled en loading.
  Los consumidores sin loading mantienen children/props y buttonVariants existentes.
- Input sigue nativo; select usa `staff-select`. Conservar aria-invalid,
  aria-describedby, etiquetas, required, ref y autocompletado.
  Para type=file, Input presenta una zona con borde discontinuo y el input nativo
  cubre el objetivo completo: admite clic, teclado y drop nativos, sin subir nada.
  El FileList y el ref siguen siendo nativos; solo se refleja el nombre para mostrarlo.
  Al quitar/confirmar, limpiar input.value y actualizar el estado del consumidor,
  como hace Consentimiento; también se conserva form.reset(). No añadir otro almacén
  de File, validación de tipo/tamaño o envío dentro de la primitiva.
- TableHead/TableCell tienen padding 16px estrecho y 24px desde 640px; TableCaption
  separa el título del borde. Conservar componentes Table en las muestras: HTML
  sin esas primitivas no representa el espaciado real. Overrides de tablas de
  códigos/container queries mantienen su layout específico y deben verificarse.
- `staff-panel` define superficie; `staff-panel-body` define padding responsive.
  Se puede aplicar a CardContent para sustituir su padding, no anidar ambos cuerpos.
  `staff-form-fields` limita campos a 32rem y `staff-detail-content` lectura a 65ch;
  el exterior puede alcanzar 75rem y las tablas conservan su propio ancho/región.
- `staff-back-link` se aplica solo a navegación de regreso real, preservando href
  y el controlador de navegación. No cambiar Cancel/acciones o ActivityLink globalmente.
- Tokens `action-primary-*` y `navigation-*` no sustituyen `primary`/`brand-hover`
  de marca. Switch tiene `switch-active: #1F3B73`, aprobado específicamente, sin
  alterar el estado apagado. Su pista40×24/thumb20 conserva raíz operable44×44
  tras la reasignación autorizada a feature07. Los estilos oscuros están
  acotados al sidebar y su Sheet.
