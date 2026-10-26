# Evidencia backend de autenticación del personal

## Implementación frontend posterior — 2026-10-25

Fuentes exactas de esta sesión y resultados en [validation.md](validation.md).
Backend recontrastado: misma rama/base y cinco hashes de backend-fixes, sin cambios
nuevos ni merge. Tras autorización del responsable se usa backend 3001 y SPA 5173;
main permanece sin correcciones. `src/auth/`, tests Node y harness ya existen.
La evidencia histórica siguiente no sustituye la validación frontend pendiente.

## Revisión actual con ejecución

**Estado posterior a correcciones:** [backend-fixes.md](backend-fixes.md) identifica
la rama `fix/session-cookie-guarantees`, worktree separado, cambios locales exactos
del backend sobre ff46f8a, hashes y resultados. P-01/P-02 se corrigieron con autorización;
suite completa 153/153 y focalizada final 7/7, sin merge automático a main.
El contrato técnico frontend y su plan requieren esa revisión corregida.

La validación posterior solicitada consultó backend limpio en
`ff46f8ab5d65b81ac4f01b865852ca63b1327ec3` y ejecutó pruebas en un worktree aislado.
Ver [backend-validation.md](backend-validation.md) para fuentes actuales exactas,
OpenAPI canónico, comandos, resultados y reproducción de P-01/P-02.
Ahora existen `docs/api/openapi.yaml`, `/docs` y `/openapi.yaml` solo en development/test;
el contrato canónico sí incluye `rememberMe`, que la UI sigue omitiendo por Q3 aprobada.
El catálogo actual contiene también cinco operaciones de estudiantes por profesores,
sin ampliar esta feature frontend. Esta actualización prevalece sobre observaciones
históricas de ausencia de documentación publicada/consumidores y falta de ejecución.

## Registro histórico de specify e investigación inicial

**Fecha:** 2026-10-25. **Tipo:** lectura estática; sin llamadas API ni pruebas ejecutadas.
**Checkout:** `/home/santino/Universidad/TrabajoCampo/Kudlab-backend`.
**Commit:** `cd3c2b485d5b3649310ba1807aac90f0f818d174`.

**Ampliación durante planificación:** [research.md](research.md) registra la inspección
posterior de Better Auth 1.7.7 instalado, con fuentes exactas y dos bloqueos nuevos:
éxito de cierre pese a fallo de borrado capturado y continuidad de cookie no demostrada.
La tabla siguiente conserva la evidencia inicial de specify; donde dice que no se leyó
la dependencia o que el transporte queda pendiente, consultar esa ampliación antes de integrar.
No se afirma cumplimiento de las garantías funcionales solo por leer pruebas existentes.

Cambios locales observados, no modificados: `docs/agent-context/modules/usuarios/module-summary.md`
y `.opencode/commands/speckit.specify.md` modificados; `.opencode/opencode.json` y
`docs/agent-context/modules/usuarios/features/{acceso-estudiante,correo-smtp,documentacion-api-swagger}.md`
sin seguimiento. Se consultó la versión local modificada del resumen; no se atribuye
íntegramente al commit. Los archivos OpenCode y las tres descripciones sin seguimiento
no se usaron como evidencia de autenticación ni se inspeccionó su contenido.

## 1. Rutas y comportamiento implementados observados

| Capacidad | Evidencia actual | Límites de lo demostrado |
| --- | --- | --- |
| POST `/api/auth/sign-in/email` | B16 valida objeto estricto con correo válido, contraseña no vacía y `rememberMe` booleano opcional; B17 impide crear sesión para identidad no activa; B18/B22 exigen cuenta ACTIVA, rol coherente, identidad no bloqueada y correo coherente | Respuesta 200 contiene solo `user` con id/email/name/role en cuerpo, conserva cabeceras Better Auth. No se leyó ni ejecutó internamente el paquete de terceros; transporte elegido para SPA sigue pendiente |
| Errores de login | B16: 400 `INVALID_INPUT` («Solicitud inválida»), 401 `INVALID_CREDENTIALS` («Credenciales inválidas») uniforme para rechazos no exitosos inferiores a 500; fallos capturados/5xx se convierten a 503 `UNAVAILABLE` («Operación no confirmada») | No hay detalle de campo en este 400; no usar validación de alta como validación de login. Uniformidad es del mensaje, no garantía de tiempos idénticos |
| GET `/api/auth/get-session` | B16 consulta sesión persistida, identidad activa y actividad; 200 `user` y `session: { id, expiresAt }`; 401 `UNAUTHENTICATED`, 503 `UNAVAILABLE` | No devuelve `lastAcceptedAt` ni causa específica de invalidez; no se puede calcular inactividad exacta ni distinguir ausencia, vencimiento, revocación o cuenta no elegible |
| POST `/api/auth/sign-out` | B16 comprueba sesión y actividad; 401 si no válida; delega cierre a `auth.handler` reconstruyendo cuerpo vacío requerido por Better Auth. B25/B27 contienen pruebas esperadas de 200 `{success:true}`, invalidez posterior y cierre independiente | La respuesta delegada se devuelve directamente, no se normalizan explícitamente todos sus errores. El `return auth.handler(...)` no tiene `await` en el try: no se presume que el catch local normaliza rechazos asíncronos. B16/B23 muestran fallback global; verificar bordes en integración futura. Pruebas leídas, NO ejecutadas |
| Solicitudes protegidas | B16 monta `requireActive`/`requireAdmin` en cuentas y control activo en solicitudes de rol. B21 exige sesión persistida y relee identidad/cuenta/rol. 401 por falta de sesión o inactividad; 403 por identidad no elegible o rol insuficiente; B23 traduce errores no reconocidos a 503 | Un JWT aislado no satisface el guard. Un 403 no identifica si cambió estado o permiso. No crear pantallas de esos módulos para probar esta feature |
| Inactividad | B19 comprueba 30 minutos, referencia última solicitud aceptada o creación, elimina sesión vencida; B21 registra actividad solo tras respuesta 2xx y nueva comprobación. Consultar sesión no registra actividad | B17 también configura Better Auth `expiresIn:1800`, `updateAge:60`. No prometer que toda sesión sobrevivirá hasta un contador local ni que consultar sesión no pueda afectar metadatos internos; lo que no renueva es el reloj protegido |
| Orígenes/transporte | B16 CORS con credenciales para `SPA_ORIGIN`, admite Authorization y expone `set-auth-token`; B17 usa origen de confianza y plugins bearer/JWT; B24 exige orígenes HTTPS salvo localhost | Configuración de posibilidades, no decisión SPA ni demostración de despliegue, atributos de cookies o almacenamiento seguros |
| Ámbito académico | B21 incluye helper que falla cerrado sin proveedor; B15 declara consumidores pendientes | No demuestra filtrado académico montado y no se usa para introducir Académico en este alcance |

## 2. Decisiones funcionales confirmadas en specs

- **B11 (003)**: FR-001–004, FR-006–008 y FR-012 describen elegibilidad, mensaje
  no enumerador, comprobación vigente, cierre individual y fallo cerrado. FR-005 y
  Assumptions registran confirmación explícita del 2026-10-13: solo solicitud protegida
  aceptada reinicia inactividad; consulta, denegación y uso local no cuentan.
- **B12 (001)**: FR-001, FR-004, FR-007–009 y FR-011–012/Assumptions registran decisiones
  de cuentas del responsable: rol único, activación previa, permisos actuales y retirada
  de acceso. FR-015 es política de establecimiento/cambio, no complejidad exigible al login.
- **B13 (002)**: sigue rotulada borrador funcional. FR-006/008/009 exigen comprobación y
  comunicación segura; no se presenta la matriz académica propuesta como capacidad disponible.
- **B02–B10**: contexto de análisis, diseño y V3; V3 RF-003/004 son propuestas originales,
  no equivalentes a los FR de spec 003. Menciones antiguas a Google/JWT directo/estudiantes
  no prevalecen sobre alcance del responsable ni prueban implementación.

## 3. Propuestas, discrepancias y pendientes

1. **Contrato B14 v0.1.0** se rotula planificado aunque el código observado incluye las
   rutas. Sus esquemas describen cookie y Bearer opaco, sin elegir cliente. Elegir transporte
   y condiciones seguras corresponde al plan, conforme a Q3: A confirmada y antes de integrar.
2. **`rememberMe`**: B16 lo admite opcional, B14 no lo declara y usa
   `additionalProperties:false`. Q3: A confirma omitir control y parámetro, sin valor por defecto.
   Omitirlo tampoco permite prometer una política concreta de persistencia del paquete.
3. **Cierre delegado**: el contrato lista 200/401/503, pero no se ha probado que toda
   respuesta de la dependencia siga ese conjunto/esquema. No inventar errores adicionales
   como contrato aprobado ni modificar backend para resolverlo; revisar antes de integración.
4. **Sin causa específica ni reloj**: B16 no proporciona motivo detallado ni última
   actividad. La UI debe usar mensajes generales y no añadir temporizadores exactos.
5. **Navegación frontend antigua**: `features/autenticacion.md` propone enlace a recuperación
   aunque no hay destino frontend implementado. Q1: A confirma no crear enlace en esta iteración.
6. **Salida autenticada, destino previo, indisponibilidad y cierre incierto**: Q1: A y Q2: A
   confirmadas explícitamente por el responsable en esta conversación; ver requisitos y
   escenarios actualizados en spec. La confirmación no deriva de la existencia del backend.
7. No se ejecutaron pruebas, PostgreSQL, SMTP ni navegador con integración; no hay evidencia
   de disponibilidad operativa, recepción de cookies o piloto listo.

## Archivos backend consultados

Los enlaces son locales absolutos al checkout indicado; no son URLs públicas ni portables.
Los rangos mencionados identifican secciones consultadas, no resultados de ejecución.

- **B01**: [README.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/README.md).
- **B02**: [docs/agent-context/INDEX.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/INDEX.md).
- **B03**: [project-context.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/project-context.md).
- **B04**: [architecture-summary.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/architecture-summary.md).
- **B05**: [decisions.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/decisions.md).
- **B06**: [unresolved-issues.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/unresolved-issues.md).
- **B07**: [Usuarios/module-summary.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/module-summary.md), versión local modificada.
- **B08**: [features/autenticacion.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autenticacion.md).
- **B09**: [features/autorizacion.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/autorizacion.md).
- **B10**: [features/validacion-acceso.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/docs/agent-context/modules/usuarios/features/validacion-acceso.md).
- **B11**: [specs/003-autenticar-usuarios/spec.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/spec.md), documento completo.
- **B12**: [specs/001-gestionar-cuentas-roles/spec.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/spec.md), documento completo.
- **B13**: [specs/002-validar-perfil-acceso/spec.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/spec.md), documento completo.
- **B14**: [003/contracts/auth.openapi.yaml](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/003-autenticar-usuarios/contracts/auth.openapi.yaml), contrato completo, versión 0.1.0 planificada.
- **B15**: [002/contracts/scope-authorization.md](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/contracts/scope-authorization.md).
- **B16**: [src/app.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/app.ts).
- **B17**: [src/auth/auth.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/auth.ts).
- **B18**: [src/auth/active-identity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/active-identity.ts).
- **B19**: [src/auth/session-activity.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-activity.ts).
- **B21**: [src/auth/session-guard.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/auth/session-guard.ts).
- **B22**: [shared/accounts.types.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.types.ts).
- **B23**: [shared/accounts.errors.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/modules/usuarios/shared/accounts.errors.ts).
- **B24**: [src/config/env.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/src/config/env.ts), esquema, sin lectura de secretos.
- **B25**: [tests/contract/authentication.test.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/tests/contract/authentication.test.ts).
- **B26**: [tests/integration/auth-boundaries.test.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/tests/integration/auth-boundaries.test.ts).
- **B27**: [tests/integration/authentication.test.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/tests/integration/authentication.test.ts).
- **B28**: [tests/unit/session-activity.test.ts](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/tests/unit/session-activity.test.ts).
- **B29**: [002/contracts/validation.openapi.yaml](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/002-validar-perfil-acceso/contracts/validation.openapi.yaml), búsqueda de seguridad/401/403/503 y lectura de respuestas 164–193.
- **B30**: [001/contracts/accounts.openapi.yaml](/home/santino/Universidad/TrabajoCampo/Kudlab-backend/specs/001-gestionar-cuentas-roles/contracts/accounts.openapi.yaml), búsqueda de seguridad, transporte y denegaciones, no revisión completa.

## Fuentes frontend y herramientas

- `AGENTS.md`, `README.md`, `docs/agent-context/INDEX.md`, resumen/inventario/autenticación
  de Usuarios, `docs/specs/TEMPLATE.md` y constitución 1.0.0.
- `.specify/init-options.json`: Spec-Kit 1.0.13, numeración secuencial.
- `.specify/scripts/bash/resolve-template.sh spec-template --json`: resolución correcta;
  estructura y orden de secciones de la plantilla resuelta conservados.
- Skills de diseño apple-design, ui-ux-pro-max y design-taste-frontend no están disponibles
  en esta sesión/worktree. No se utilizaron; se documentan requisitos de accesibilidad,
  sin diseño gráfico ni implementación visual. Skill SDD consultada en esta conversación.
- Sin `.specify/extensions.yml`; sin hooks before/after specify que ejecutar.
