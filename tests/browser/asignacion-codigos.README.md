# Asignación y códigos: regresión visual acotada

Ejecutar solo contra Vite propio en loopback, con Node 24 y el driver CDP existente:

```bash
KUDLAB_TEST_ORIGIN=http://127.0.0.1:55381 KUDLAB_BROWSER_OUTPUT=/tmp/opencode/front-asignacion-codigos node tests/browser/asignacion-codigos.check.mjs
```

- Harness de desarrollo con componentes y decoders reales, transporte exclusivamente sintético sin fallback de red. No verifica sesión/rol/ámbito en un servidor real.
- `KUDLAB_BACK_ONLY=1` ejecuta únicamente el regreso, su destino y activación por teclado; no representa la suite completa.
- La suite completa cubre tipografía/marker a seis anchos, teclado, proyección/foco, copia y limpieza, respuesta tardía, reconsulta sin generación y confirmación/reintento de cancelación. Reporta resultados y fallos en `results.json`; cualquier fallo conserva salida 1, incluidos los de reflujo. No omitirlos para afirmar cobertura completa.
- Capturas solo con códigos ocultos; no registrar portapapeles ni cuerpos de revelado. No publicar harness, fixtures o la raíz de Vite: `dist/` debe excluirlos.
- Solo Chromium/CDP. Firefox/Edge, lector y zoom real 400% requieren prueba separada; viewport/AX no los sustituyen. API/BD/Play reales necesitan entorno propio y autorización operativa independiente; los scripts antiguos `assignment-codes.check.mjs` y `student-sessions.check.mjs` no son esta prueba mock.
