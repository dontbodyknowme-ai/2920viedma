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

### D-G — El refresh se saca **solo** del login, por nombre de ruta

`request()` trata todo `401` como "sesión vencida": refresca y reintenta. Para
`/api/auth/me` está perfecto — es exactamente el caso para el que existe el
refresh por cookie, y es lo que hace que un F5 no tire la sesión. Para
`/api/auth/login` está mal: un `401` ahí **es la respuesta**, no el síntoma. No
hay sesión que renovar; hay una contraseña que no es.

La tentación es la regla general: "no refrescar si no hay `accessToken`". Es
**incorrecta**, y por un motivo concreto: después de un F5 el módulo `api` no
tiene token en memoria, y sin ese refresh la cookie de 7 días no serviría para
nada. La sesión dejaría de sobrevivir a la recarga, que es lo que el refresh
rotativo de la 004-b compró.

Por eso la condición es por **ruta**, no por estado: una lista explícita de
endpoints donde el `401` no se refresca. Hoy tiene un elemento.

**Alternativa descartada:** que el backend conteste `400` en vez de `401` cuando
las credenciales no matchean. Haría el cliente más simple y no tocaría la
lógica del refresh, pero `401` es el status correcto — la petición no está
autorizada — y "noMatches" no es lo que HTTP significa por `401`. Cambiar el
status para acomodar al cliente es cambiar el contrato HTTP por una comodidad
local.

### D-H — El texto legible vive en el gate, no en el backend

Después de D-G, el gate recibe un `ApiError` con `code: 'INVALID_CREDENTIALS'` y
`message: 'INVALID_CREDENTIALS'`: el mismo texto en los dos campos.

El mensaje se traduce en **`admin_gate.tsx`**, no en `app.ts`. Razón: `code` y
`message` cumplen papeles distintos. El `code` es para que el frontend **brinque**
—`if (err.code === 'INVALID_CREDENTIALS')`—, y para eso tiene que ser estable y
legible por una máquina. El `message` es lo que lee una persona, y solo el
frontend sabe quién la está mirando. Poner el texto humano en el backend obliga
a que cada consumidor pase por alto un `message` que ya no es un código, que es
la forma en que un `code` deja de ser confiable.

La traducción es por **`code` conocido, con red de seguridad genérica**: si
llega un código que el gate no conoce —un timeout, un error de red que no es
`Error` de la API, un código nuevo del backend— sale una frase en español, no el
código. La regla es: **una persona nunca lee un identificador en este panel**.

Se exporta como función pura aparte del componente, para poder testear los
c casos sin montar nada.

**Alternativa descartada:** un mapa `code → texto` en `client.ts`. El cliente no
debe saber de pantallas: se usa igual para la tienda pública, donde este texto
no corresponde.

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
| 7 | El `401` del login se reporta como contraseña incorrecta | Aparece al final porque lo encontró T3 y no estaba en el encargo. Es un bug **preexistente**: la 004-b lo introdujo cuando el cliente pasó a refrescar ante todo `401`. Toca el mismo archivo que T6 (`admin_gate.tsx`), así que va después para que los dos commits se lean por separado |

> El orden real de ejecución invirtió 5 al principio, porque es la única tarea
> con una dependencia externa (las contraseñas están en `backend/.env`).

## Riesgos del plan

| | |
|---|---|
| El paso 4 no tiene test de integración | Se cubre con `requireRole` ya testeado en `roles.test`; lo que se agrega es un caso. La **verificación real** es manual contra producción |
| Cambiar el seed rompe la carga de datos de T4/T5 | El seed ya corre en producción y es idempotente. Se corre contra Neon después y se verifica el conteo de usuarios |
| D-G rompe la restauración de sesión tras F5 | La condición es por ruta, no por presencia de token (ver D-G). Un test monta `/api/auth/me` con `401` + refresh `200` y afirma que **sí** restauró; sin ese test, la confusión natural —"los 401 no se refrescan nunca"— pasa inadvertida |
