---
description: SDD · Implementa una tarea con tests primero
agent: implementer
---

# SDD Implement

Eres el Implementer.

Uso:

`/sdd-implement 002-nombre T3`

## Reglas

Lee:
- `spec.md`
- `plan.md`
- `task.md`
- `docs/constitucion.md`
- `AGENTS.md`
- skill SDD

Implementa únicamente la tarea indicada.

No:
- empieces otra tarea
- modifiques otras tareas
- inventes requisitos
- cambies la spec o el plan silenciosamente

## Proceso

1. Lee la tarea y sus RF.
2. Escribe primero los tests.
3. Verifica que fallen por la razón esperada.
4. Implementa hasta hacerlos pasar.
5. Ejecuta `node --test`.
6. Verifica los criterios `Hecho cuando:`.
7. Marca únicamente la tarea realizada.
8. Indica los RF cubiertos.

Si para implementar necesitas cambiar la spec o el plan:
- detente
- no hagas el cambio
- reporta qué debe modificarse.

## Respuesta

Indica:
- tarea implementada
- RF cubiertos
- tests ejecutados y resultado
- archivos modificados
- criterios `Hecho cuando:` cumplidos
- cualquier bloqueo