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
