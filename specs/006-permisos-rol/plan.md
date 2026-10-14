# Plan 006 — Permisos por rol en el panel

## Decisiones

### D-A — La matriz de permisos vive en **una tabla**, no en cinco `if`

El filtro del sidebar se parece a esto:

```ts
const PERMISOS = {
  '/admin':              ['admin'],
  '/admin/catalogo':     ['admin', 'gestor'],
  '/admin/pedidos':      ['admin', 'gestor', 'vendedor'],
  '/admin/clientes':     ['admin', 'gestor'],
  '/admin/configuracion':['admin', 'gestor']
}
```

**Alternativa descartada:** `hasRole('admin') && to !== '/admin'` en cada
enlace. Es la forma en que están hoy las dos cosas que ya usan roles
(`barra_de_navegacion.tsx:101` y `carta_de_catalogo.tsx:55`) y tiene dos
problemas: con cinco secciones y tres roles aparecen cinco condiciones que hay
que leer todas para entender una, y **agregar una sección es acordarse de
tocarla**. Con la tabla, agregar una sección es agregar una fila y el tipo obliga
a que los tres roles estén.

Es el mismo motivo por el que `tsconfig.json` y `docker-compose.yml` declaran
las variables en un bloque y no repetidas por paso: una lista repetida se
desincroniza de la lista real.

### D-B — La tabla declara **qué roles ven qué**, y el backend se deja como está

Los `requireRole` del backend ya son correctos y quedan intactos. La tabla es
la **vista**, no la **defensa**.

Es deliberado que estén en dos lugares distintos y no se "simplifique" el
backend para que lea la tabla: el backend lee la tabla desde una request con un
JWT validado; el frontend la lee desde un contexto de React que puede no
haberse cargado todavía. Meter una en la otra crea una dependencia que rompe
uno de los dos proyectos.

**Consecuencia asumida:** si la tabla se desincroniza del backend, el síntoma es
un `403` visible, no una brecha. Es el fallo que **se ve**, que es el que
preferimos.

### D-C — El redirect se resuelve en `admin_layout.tsx`, no en el sidebar

Cada ruta del panel necesita saber a cuál redirigir cuando el rol no la tiene.
El sidebar solo dibuja enlaces y no sabe dónde está el usuario.

Ponerlo en el layout tiene una ventaja concreta: el layout **ya es el guard**
(`/admin/*` exige sesión), así que el redirect queda junto a la regla que ya
existe en vez de en otro archivo que hay que acordarse de consultar.

**Alternativa descartada:** un `<Navigate>` en cada página. Repite el mismo
cálculo cinco veces y es la forma en que se desincroniza.

### D-D — Las contraseñas del seed salen del entorno, no del archivo

`seed.ts` está commiteado. Una contraseña escrita ahí queda en el repo en texto
plano **y en el historial de git para siempre**, aunque después la borres.

El entorno ya se usa para todo lo sensible (`DATABASE_URL`, `JWT_SECRET`,
`STORAGE_*`), así que esto no es una excepción: es el mismo patrón.

**Alternativa descartada:** guardar el hash en el repo. El seed necesita la
contraseña en claro para hashearla, y un hash en el repo es reproducible para
cualquiera que sepa la contraseña — que es justamente lo que no sabemos.

### D-E — El seed actualiza `passwordHash` **solo** si el usuario no tiene

Cambiar la contraseña de un usuario es una decisión consciente, no un efecto
colateral de volver a correr el seed. `update: {}` para el hash significa que
correr el seed dos veces no rompe el acceso de nadie.

`name` y `role` sí se actualizan: son datos de demostración y el seed es su
fuente de verdad.

### D-F — La sección General de Configuración sigue como está

El usuario la pidió editable y se sacó de esta spec (ver "fuera de alcance" en
`spec.md`). Se puede **añadir sin tocar esta**: el filtro por rol no depende de
qué haya en la página, y el día que exista el módulo `settings` se le asigna el
rol que corresponda sin conflicto.

Lo que **no** se puede es hacerlo a medias: un formulario que guarda y no
persiste es peor que la nota que dice hoy *"no hay backend todavía, editar no
persistiría nada"*, porque promete lo que no cumple.

---

## Orden de implementación

| # | Qué | Por qué en ese orden |
|---|---|---|
| 1 | Tabla de permisos (`src/utils/permisos.ts`) + test | Es la base de todo lo demás. Sin ella, los pasos 2 y 3 no tienen contra qué probar |
| 2 | Filtro del sidebar | Es la mitad visible del problema. Va antes del redirect porque es el más simple y el que más rápido se verifica a ojo |
| 3 | Redirect en el layout | Depende de la tabla y **tiene** su propio test (la URL directa) |
| 4 | Backend: `/api/metrics` → `requireRole('admin')` | Una línea. Se hace después de la interfaz porque sola no se nota; con la interfaz ya filtrada, es lo que hace que el 403 sea coherente |
| 5 | Contraseñas por entorno + no imprimirlas | Lo más delicado (toca secretos). Se hace cuando la parte visible ya está |
| 6 | Email del gate vacío | Trivial, pero al final: es cosmético y no debe quedar tapando algo roto |

## Riesgos del plan

| | |
|---|---|
| El paso 4 no tiene test de integración | Se cubre con `requireRole` ya testeado en `roles.test`; lo que se agrega es un caso. La **verificación real** es manual contra producción |
| Cambiar el seed rompe la carga de datos de T4/T5 | El seed ya corre en producción y es idempotente. Se corre contra Neon después y se verifica el conteo de usuarios |
