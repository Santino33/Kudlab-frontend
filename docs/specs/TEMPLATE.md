# Spec frontend: <feature>

**Estado:** propuesta / aprobada / implementada (indicar evidencia).

## Feature frontend

Objetivo de experiencia, actores, alcance y exclusiones. No copiar las reglas de negocio.

## Feature backend relacionada

- `[RUTA_LOCAL_DEL_BACKEND]/docs/agent-context/modules/<modulo>/module-summary.md`
- `[RUTA_LOCAL_DEL_BACKEND]/docs/agent-context/modules/<modulo>/features/<feature>.md`
- Spec/contrato canónico y secciones de reglas que se reutilizan por referencia.
- Capacidad API comprobada: método/ruta montada, autorización y límites. Distinguir implementado de propuesto.

Resolver `[RUTA_LOCAL_DEL_BACKEND]` según [INDEX](../agent-context/INDEX.md) y añadir enlaces locales efectivos al completar esta plantilla.

## Archivos backend consultados

Lista de enlaces exactos a contexto, specs, contratos, montaje, routers, servicios, validaciones y guardias; commit/fecha y cambios locales relevantes. Indicar si la verificación es estática o se ejecutaron pruebas, con comandos/resultados. Un contrato planificado no demuestra implementación.

## Recorrido de UI

Entrada → pasos del actor → interacción con capacidad existente → confirmación/salida. Indicar qué requiere pantalla, acción, sección o estado transversal. No inventar destinos o datos que no entrega la API.

## Estados y errores

Carga, vacío, envío, éxito confirmado, validación, conflicto, token vencido, sesión vencida, acceso denegado e indisponibilidad según aplique; comportamiento de cancelación y recuperación sin pérdida de datos. Referenciar códigos reales, efectos persistidos y datos que no deben exponerse.

## Criterios de aceptación

- [ ] Recorrido válido y resultado visible verificables.
- [ ] Estados/errores observables y cancelación cubiertos.
- [ ] Sin concesión de permisos por UI ni exposición de datos indebidos.
- [ ] Fuentes y capacidad API verificadas; sin reglas de negocio duplicadas.

## Pendientes y confirmaciones

Discrepancias, contratos faltantes, propuestas de UI y decisiones que requieren preguntar al responsable antes de implementar. Si hay diseño gráfico, comprobar y aplicar las skills pertinentes conforme a AGENTS.md; si faltan, declararlo.
