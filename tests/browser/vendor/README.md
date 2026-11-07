# Driver CDP de pruebas

`cdp.mjs` es la copia sin modificaciones del cliente CDP de `Leonxlnx/taste-skill`, distribuida bajo MIT; véase [LICENSE](LICENSE). Se conserva como recurso de pruebas independiente, no como instrucciones ni skill instalada. Origen: `scripts/lib/cdp.mjs` de la versión utilizada por los recorridos existentes.

No requiere paquetes npm adicionales. Usa WebSocket de Node 22+ y Chrome/Edge/Chromium instalado, o `CHROME_PATH`/`PUPPETEER_EXECUTABLE_PATH`. Los perfiles son desechables y nunca se usa el perfil personal del navegador. Para pruebas aisladas se recomienda `TASTE_SKILL_TMP` apuntando a un directorio exclusivo.

`KUDLAB_CDP_DRIVER` sigue permitiendo un driver alternativo compatible. El valor predeterminado ya está versionado en este repositorio; no requiere skills, configuración global ni otros checkouts.
