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
- `staff-panel` define superficie; `staff-panel-body` define padding responsive.
  Se puede aplicar a CardContent para sustituir su padding, no anidar ambos cuerpos.
  `staff-form-fields` limita campos a 32rem y `staff-detail-content` lectura a 65ch;
  el exterior puede alcanzar 75rem y las tablas conservan su propio ancho/región.
- `staff-back-link` se aplica solo a navegación de regreso real, preservando href
  y el controlador de navegación. No cambiar Cancel/acciones o ActivityLink globalmente.
- Tokens `action-primary-*` y `navigation-*` no sustituyen `primary`/`brand-hover`
  de marca o Switch. Los estilos oscuros están acotados al sidebar y su Sheet.
