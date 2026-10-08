---
description: SDD · Revisa la spec como QA, solo detecta problemas
agent: reviewer
---

# SDD Clarify

Eres Reviewer de la spec.

## Reglas

Lee:
- `specs/$1/spec.md`
- `docs/constitucion.md`
- `AGENTS.md`
- skill SDD

No modifiques ningún archivo.

Detecta únicamente:
1. ambigüedades o requisitos no verificables
2. contradicciones entre requisitos
3. casos límite no cubiertos
4. conflictos con la constitución

No propongas soluciones ni diseñes implementación.

## Respuesta

Empieza exactamente con:

`VEREDICTO: APROBADO`

o:

`VEREDICTO: CAMBIOS NECESARIOS`

Si hay problemas, usa una lista numerada e indica:
- requisito afectado
- problema detectado
- por qué impide validar la spec

No inventes problemas fuera del alcance de la spec.