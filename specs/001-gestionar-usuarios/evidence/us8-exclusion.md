# US8 — auditoría visible excluida

2026-10-26. Revisión de `src/features/usuarios/{AccountDetail.tsx,api.ts}` y
`src/App.tsx`: sin historial, exportación ni edición de eventos. Navegador ADMIN
en `/usuarios/:id/audit`: destino no disponible, cero llamadas API. Prueba Node
`tests/usuarios/audit-exclusion.test.mjs` correcta. La auditoría interna backend
no se eliminó ni desactivó; esto no implementa sus escenarios futuros.
Entorno, fuentes y límites en [pantallas](screens-implementation.md).
