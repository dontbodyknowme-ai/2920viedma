# Specs del proyecto

Una spec por carpeta, con `spec.md` (qué y por qué), `plan.md` (cómo) y
`task.md` (trabajo verificable). Convención: `NNN-nombre/`.

**Las specs no se borran.** Las cerradas son el registro de las decisiones
(por qué el webhook busca por `external_reference`, por qué hay dos campos de
estado, por qué la cookie sale `SameSite=None`). Borrarlas deja colgadas las
referencias de `AGENTS.md`, `MEMORY.md` y de este índice. La excepción es una
spec **borrador** que el usuario pide borrar explícitamente (pasó con la `012`).

## Índice

| Spec | Estado | Tareas | Nota |
|---|---|---|---|
| `002-app-que-compile` | implementada | 76/77 | 1 tarea sin marcar |
| `003-mejoras-ux` | implementada (parcial) | 18/46 | lo no marcado quedó absorbido por 004-a / 004-c |
| `004-a-backoffice-ui` | implementada | 86/90 | 4 tareas sin marcar |
| `004-b-backend-api` | implementada | 0/80 | checkboxes nunca marcados; backend en producción con 352 tests |
| `004-c-integracion` | implementada | 0/10 | checkboxes nunca marcados; integración en producción |
| `005-deploy` | implementada | 64/67 | corre en Render / Vercel / Neon |
| `006-permisos-rol` | implementada | 54/54 | verificada contra producción (10/10) |
| `009-ventas-mercadopago` | implementada y mergeada | 5/7 | faltan credenciales reales y probar la webhook en producción |
| `010-stock-mercadopago` | no iniciada | 0/3 | descontar stock al aprobar y restaurar al fallar |


## Sobre los estados

Estados válidos (SDD): `borrador` → `aprobada` → `implementada`.

Los conteos salen de los checkboxes de cada `task.md`. Ojo: en `004-b` y
`004-c` los checkboxes **nunca se marcaron** aunque el trabajo está hecho y en
producción; el estado de arriba se apoya en el código y en la suite de tests,
no en esos conteos.

La única spec abierta es `010` (stock). La `012` (pagos con Nave) se borró
por decisión del usuario el 2026-11-20: era borrador. Su implementación se
mergeó después desde `Clon-checkout-mp` (commit `c692977`), pero los docs no
se restauraron. `REVISION-CHECKOUT-012.md` y las entradas de `MEMORY.md` que la
mencionan quedan como registro histórico.
