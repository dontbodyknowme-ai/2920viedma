---
name: sdd
description: Úsala siempre que trabajes con Spec-Driven Development en este proyecto: specs, planes, tareas, implementación o validación.
---

# Spec-Driven Development (SDD)

## Flujo

Constitución → Spec → Clarificación → Aprobación → Plan → Tareas → Implementación → Validación

Los cambios vuelven primero a la spec:

Cambio → Spec → Aprobación → Plan → Tareas → Código

### Reglas

* La spec define QUÉ y POR QUÉ.
* El plan define CÓMO.
* Las tareas dividen el plan en trabajo verificable.
* Nunca implementes algo que no esté en la spec aprobada.
* Nunca inventes requisitos ni decisiones.
* Si falta una decisión que afecta al comportamiento, detente y pregunta.
* La aprobación debe ser explícita del usuario.
* El Planner nunca aprueba una spec por sí mismo.
* Una spec aprobada modificada sustancialmente vuelve a `borrador`.
* Cada RF debe poder rastrearse hasta plan, tarea e implementación.
* No pases a la siguiente fase si la anterior requiere aprobación y aún no la tiene.

## Estados

Solo:

borrador → aprobada → implementada

## Spec

Cada spec vive en:

specs/NNN-nombre/

con:
spec.md
plan.md
task.md


`spec.md` debe definir:

* contexto y objetivo
* historias de usuario
* requisitos funcionales
* requisitos no funcionales
* casos límite
* fuera de alcance
* criterios de finalización
* dudas abiertas

Los RF deben ser verificables y usar EARS cuando corresponda:

RF-x: CUANDO <evento>, EL SISTEMA <respuesta>.
RF-x: SI <condición>, ENTONCES EL SISTEMA <respuesta>.
RF-x: MIENTRAS <estado>, EL SISTEMA <respuesta>.
RF-x: EL SISTEMA <comportamiento permanente>.


No incluir en la spec stack, arquitectura, archivos ni implementación.

## Plan

Solo para specs aprobadas.

Debe definir:

* archivos y responsabilidades
* funciones y lógica
* pseudocódigo
* interfaz
* decisiones técnicas y alternativa descartada
* estrategia de tests
* RF cubiertos

La lógica dependiente de fecha debe recibir `hoy` como parámetro cuando corresponda.

## Tareas

Cada tarea debe:

* estar ordenada por dependencia
* indicar los RF que cubre
* tener `Hecho cuando:` verificable
* ser pequeña y aislable

Máximo recomendado: 10.

## Implementación

Una tarea por vez:

tests → rojo → código → node --test → verificar → marcar tarea


Si la implementación requiere cambiar la spec o el plan, detente y repórtalo.

## Validación

El Reviewer valida cada RF contra:

* spec
* plan
* tarea
* implementación
* tests
* criterios de finalización
* constitución

Nunca inventes resultados ni aceptes un test solo por su nombre.

## Regla final

Ante cualquier conflicto:

Constitución → Spec → Plan → Tarea → Código

No resuelvas silenciosamente un conflicto: repórtalo y pide la decisión necesaria.
