# US7 — ascensos excluidos

2026-10-26. Revisión de `src/features/usuarios/{api.ts,dashboard.ts,Workspace.tsx}`,
`src/App.tsx` y `src/auth/AuthRoot.tsx`: sin operación, destino ni control de ascenso.
ADMIN mostró usuarios/invitación; TEACHER identidad/sesión/cierre. Navegador real
en `/ascensos`: destino no disponible, cero llamadas API. Prueba Node
`tests/usuarios/role-request-exclusion.test.mjs` correcta; no sustituye aceptación gráfica.
No se implementó solicitud/decisión de ascenso ni se cambió backend.
Entorno, fuentes y límites en [pantallas](screens-implementation.md).
