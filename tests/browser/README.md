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

`access-layout.check.mjs` usa `KUDLAB_TEST_ORIGIN`: verifica la composición 960/512px,
el umbral 1024px y marca compacta de 160px, variantes públicas, PNG íntegro,
reparto 45/55 y enlace a derecha (r3), encabezado retirado solo en acceso/recuperación,
teclado/AX del ojo, estabilidad de inputs al redimensionar, retirada de secretos y
estados de sesión sin confirmar. Añade texto200, altura corta y emulación de colores
forzados/movimiento reducido. Guarda capturas solo antes de introducir contraseñas;
no acredita gestor real, zoom400 real, BFCache real ni API/SMTP/PostgreSQL.
`invitation-accept.check.mjs` usa `INVITATION_PREVIEW_ORIGIN`.

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
  cambiar sus dimensiones ni el estado apagado. Los estilos oscuros están
  acotados al sidebar y su Sheet.
