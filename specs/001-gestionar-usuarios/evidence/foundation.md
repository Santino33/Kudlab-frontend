# Base común T005–T011 — 2026-10-26

Base frontend `39d8a83` con cambios locales de esta ejecución. No se ha
implementado todavía listado, alta, edición, recuperación ni acciones de cuenta.

- T005/T006: tests escritos primero; ejecución roja por módulos aún inexistentes.
- T007: tipos de errores de negocio, sin otra Identity/estado de sesión.
- T008: HTTP con origen explícito, Fetch inyectable, include/no-store/redirect:error,
  JSON validado por consumidor y generaciones del controlador existente. Rechaza
  transporte obsoleto/abortado, redirecciones y contenido inesperado; sin replay.
  Un fallo incierto no demuestra rollback. Errores no exponen mensajes/cuerpos brutos.
- T009: resolución finita de destinos; token fuera de recuperación exacta bloqueado;
  no clasificación, canje ni permisos derivados de la URL.
- T010: marco extraído a StaffLayout; colores existentes intactos, clases comunes
  de gestión hasta 75rem, formularios hasta 32rem, acciones responsive.
- T011: App compone destinos y AuthRoot conserva listeners/controlador únicos.
  El contenido autenticado desaparece con el estado, sin snapshot de negocio paralelo.
  Destinos todavía no implementados muestran aviso real, no pantallas ficticias.
  Harness de Usuarios usa App real y solo transporte simulado inyectado.

Verificación: `npm test`, `test:auth` 63/63, `test:usuarios` 15/15,
`npm run build` y `git diff --check` correctos. No hay cobertura funcional TSX
atribuida a Node. Smoke en navegador del harness: entrada directa `/usuarios`
con TEACHER muestra denegación y enlace a sesión, sin datos ni acciones de cuentas.

## Fuentes backend reconsultadas (solo lectura)

Raíz resuelta por `docs/agent-context/INDEX.md`:
`/home/santino/Universidad/TrabajoCampo/Kudlab-backend`, referencia `ff46f8a`
registrada en la preparación. Índice backend → módulo Usuarios → fichas cuentas y
autenticación; pendientes generales `docs/agent-context/unresolved-issues.md`.
Se contrastaron `src/app.ts`, `src/auth/{auth,session-guard,active-identity,session-activity}.ts`,
`src/modules/usuarios/accounts/accounts.routes.ts` y
`src/modules/usuarios/shared/accounts.errors.ts`.

Observado: cuentas requieren guardas active/admin; 401 final puede suceder
después de una operación. Identidad, sesión y cuenta son IDs distintos.
Errores de perfil pueden incluir fields opcionales y el proveedor de cierre
no comparte necesariamente su esquema. Las fichas RF V3 son antecedentes,
no autorizan interfaces fuera de la spec frontend. No se ejecutó backend;
P-01/P-02 de la revisión corregida externa siguen siendo requisito de integración.

## Límites

Sin validación API/cookies/CORS, DOM de gestión aún inexistente, lector de
pantalla, BFCache real, usabilidad ni aceptación gráfica final. La confirmación
de recuperación aún muestra destino no disponible y no procesa tokens.
