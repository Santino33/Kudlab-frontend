# Setup — 2026-10-26

Base: `39d8a83`, rama `feat/gestionar-usuarios`, worktree `spec-usuarios`.

## T002 — runner y baseline

- Node `v24.18.0`, npm `11.16.0`.
- `npm ci`: correcto, cero vulnerabilidades reportadas.
- `npm test`: correcto; solo comprobación de tipos.
- `npm run test:auth`: 63/63, Fetch simulado, sin llamadas API.
- `npm run build`: correcto sobre la base integrada.
- Se conserva `test:auth`, su suite y el lockfile. Se añade
  `test:usuarios = node --test tests/usuarios/*.test.mjs`.
- `npm run test:usuarios`: 1/1; importa `src/auth/state.ts` con tipos
  borrables, sin TSX/alias ni nueva librería. Tipos correctos tras añadir script/tipado.
- No se modifica `tsconfig.json`: ya admite imports `.ts` y `noEmit`.

## T003 — configuración pública

`.env.example` documenta solo `VITE_API_ORIGIN=http://localhost:3000` y remite
al quickstart para SPA/recuperación; tipado opcional en `src/vite-env.d.ts`.
Todavía no se consume esa variable ni cambia el proxy efectivo: se adaptará
el cliente existente con pruebas en US1. No se modifica backend ni se leen secretos.

## Archivos ignorados

Repositorio Git/worktree comprobado. `.gitignore` conserva Node, dist, build,
logs y entornos con excepción `.env.example`; se añaden temporales y archivos
locales de sistema/editores. `package.json` es privado; no se crea `.npmignore`.
No se detectaron Dockerfile, configuración ESLint/Prettier, Terraform ni Helm:
no se generan ignores para herramientas inexistentes.

## Límites

Sin backend, base de datos, SMTP, cookies reales, validación gráfica o pruebas
de usabilidad en este setup. Los checklists de calidad permanecen intactos.
