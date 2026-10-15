# Task 006 — Permisos por rol en el panel

## T1 — Tabla de permisos

**Cubre:** RF-01 · **D-A** — ✅ `29efd07`

- [x] `src/utils/permisos.ts` con la matriz sección → roles
- [x] Las cinco secciones con sus rutas, incluidas en la tabla
- [x] `puedeVer(rol, ruta)` y `primeraVisible(rol)`
- [x] El tipo obliga a que los tres roles estén declarados por sección
- [x] Tests de la tabla: cada rol ve exactamente lo que dice la matriz
- [x] Test explícito de que **gestor no ve Dashboard** (es el cambio pedido)

**Nota:** esta tarea **no cambia comportamiento**. La tabla existe y nadie la
usa todavía. Sirve para poder probar el sidebar y el redirect por separado en
T2 y T3.

---

## T2 — El sidebar se filtra por rol

**Cubre:** RF-01 · **D-A** — ✅ `c52df73`

- [x] `admin_sidebar.tsx` deja de tener la lista fija y lee de la tabla
- [x] Cada enlace se filtra con `puedeVer(user.role, ruta)`
- [x] Con `vendedor` queda **una** sección; con `gestor`, cuatro
- [x] El estado activo de `NavLink` sigue funcionando con menos enlaces
- [x] El sidebar no se rompe con `user === null` durante la carga
- [x] Tests del componente montado con cada uno de los tres roles

**Extra:** el `Record<RutaAdmin, ...>` de iconos hace que agregar una sección a
`permisos.ts` rompa la compilación del sidebar, que es cuando hay que elegir el
icono.

---

## T3 — La URL directa redirige

**Cubre:** RF-02, RF-03 · **D-C** — ✅ `03cfb36`

- [x] `admin_layout.tsx` detecta que el rol no puede ver la ruta actual
- [x] Redirige a `primeraVisible(rol)` en vez de montar la página
- [x] `/admin` con `gestor` → `/admin/catalogo`
- [x] `/admin/catalogo` con `vendedor` → `/admin/pedidos`
- [x] El login manda al destino permitido y no siempre a `/admin`
- [x] Tests de la URL directa con los tres roles, **por URL y no por click**

**Nota:** el `403` del backend **no se toca**. Acá solo se evita mostrar una
pantalla que va a fallar.

**Extra — bug encontrado:** `router.tsx:30` tiene `{ path: '*', element:
<Dashboard /> }` dentro del panel, así que **`/admin/secreto` le daba el
dashboard a un vendedor**: una sección vedada servida por un atajo. Corregido
como parte de `puedeVer`, que no conoce esa ruta y redirige.

**Extra — lo que encontró esta tarea:** el `401` del login. Ver T7.

---

## T4 — El backend saca al gestor de las métricas

**Cubre:** RF-01 (backend) · **D-B** — ✅ `8be193a`

- [x] `metrics/routes.ts`: `requireRole('admin', 'gestor')` → `requireRole('admin')`
- [x] Un test que cubra el caso `gestor` → `403` en `GET /api/metrics`, por la
      app real con `inject` y no por el middleware suelto
- [x] Los demás `requireRole` **sin tocar**: los 13 restantes están fijados en
      una lista escrita a mano que rompe el build si cambian

**Nota:** la verificación contra producción queda pendiente. El código está en
`spec-006`, no en `main`.

**Extra — dos cosas que aparecieron al escribir el test:**

- **La asimetría `PATCH`/`DELETE`**: `PATCH /api/wines/:id` es admin+gestor y
  `DELETE /api/wines/:id` es **solo admin**. El parser viejo aplanaba a la ruta
  y perdía esa distinción. Está anotada en el test para que el próximo que la
  lea no la "arregle".
- **El parser del cruce estaba roto**: emparejaba `'/api/...'` con el
  `requireRole` de a 400 caracteres, y el comentario que escribí en
  `metrics/routes.ts` dejó a `/api/metrics` sin leer. El test seguía verde
  porque los dos lados "coincidían" con el backend ausente del mapa.

---

## T5 — Contraseñas por entorno

**Cubre:** RF-04, RF-05 · **D-D, D-E** — ✅ `60eac64`

- [x] Lectura de `SEED_ADMIN_PASSWORD`, `SEED_GESTOR_PASSWORD`,
      `SEED_VENDEDOR_PASSWORD` del entorno
- [x] Defaults de desarrollo, para que el seed funcione sin ponerlas
- [x] `.env.example` las documenta como secretas
- [x] `seed.ts` usa la variable de entorno, **no una constante con la clave**
- [x] El seed **no imprime contraseñas** (RF-05)
- [x] `git grep` de las tres claves de desarrollo: aparece en `.env.example` y
      en tests, y en **ningún otro lado**
- [x] Test: el seed con usuario existente **no** le cambia el hash

**Desviación de la checklist original:** decía "`env.ts` lee las tres
variables". Se implementó en `seed.ts` con `leerClave()`, no en `env.ts`:
`env.ts` valida el entorno de forma **eager** al importar el servidor, así que
ponerlas ahí las volvería obligatorias para cualquier `npm run dev` y para los
tests. El seed es el único que las necesita y es el único que debe poder
correr sin ellas.

### 5.1 Aplicar contra producción — ✅

- [x] `npm run seed` contra Neon
- [x] Verificar que los tres usuarios existen y con el nombre correcto
- [x] **Probar el login de los tres**, uno por uno, con su contraseña real
- [x] Verificar que re-correr el seed **no** cambia la contraseña de nadie

---

## T6 — El email del gate arranca vacío

**Cubre:** RF-06 — ✅ `f8f34ad`

- [x] El estado inicial del email es `''`
- [x] El `placeholder` se queda, para que se vea qué formato se espera
- [x] Test del gate: el campo arranca vacío
- [x] Test del control: el botón "Entrar" arranca deshabilitado, así que el
      campo vacío no es solo cosmético

**Nota:** va antes que T7 y no al final como decía la versión original: los dos
tocan `admin_gate.tsx` y son cambios distintos que se leen mejor en commits
separados.

---

## T7 — La contraseña incorrecta se reporta como contraseña incorrecta

**Cubre:** RF-07 · **D-G, D-H** — ✅ `5c048e7`

Bug **preexistente**, encontrado escribiendo los tests de T3. No estaba en el
encargo; entra porque esta spec crea tres cuentas con tres contraseñas
distintas, que es justo cuando más se va a confundir una.

- [x] `client.ts`: un `401` de `/api/auth/login` **no** intenta refrescar
- [x] `/api/auth/me` **sí** lo intenta — es lo que hace que la sesión sobreviva
      a un F5, y no se toca
- [x] El gate traduce `code` conocido a texto en español
- [x] Un `code` **desconocido** cae en una frase genérica, **no** en el código:
      una persona nunca lee un identificador en este panel
- [x] Un error de red (`Failed to fetch`) sale en español, y **no** dice "revisa
      la contraseña": ahí el problema no son las credenciales
- [x] La función de traducción es **pura y exportada**, testeable sin montar
- [x] El backend **no** se toca
- [x] Test: contraseña incorrecta → el gate dice contraseña incorrecta
- [x] Test: `/api/auth/me` `401` + refresh `200` → **restaura** la sesión
- [x] Test del otro lado: `401` + refresh `401` → **vuelve** al gate
- [x] Test de control: el `me` del arranque **sí** refresca
- [x] Test de control: el "no refresca" mira las llamadas **después** del login,
      no todas — el `me` del arranque sí refresca, y negar cualquier refresh en
      la página haría el test pasar por el motivo equivocado

> Los dos tests de "vuelve al gate" y "el `me` sí refresca" importan tanto como
> el de "restaura": sin ellos, el primero pasaría también con el refresh roto,
> porque significaría que nunca se intentó.

---

## Al terminar

- [x] `npm run typecheck`, `npm run lint`, `npm test` en verde
- [x] `cd backend && npm run typecheck && npm run test && npm run build` en verde
- [x] Los trece chequeos de `specs/006-permisos-rol/spec.md` sección 7
- [x] `AGENTS.md` y `MEMORY.md` actualizados
- [x] **Mergeado a `main`** y verificado contra producción

### Verificación contra producción

`npm run verificar:roles` (**10/10**) y, en navegador real, el gate.

| | | |
|---|---|---|
| V-01 | `vendedor` ve **una** sección: Pedidos | ✅ navegador, usuario |
| V-02 | `vendedor` en `/admin/catalogo` → `/admin/pedidos` | ✅ navegador, usuario |
| V-03 | `vendedor` → `/api/wines` da `403` | ✅ `verificar:roles` |
| V-04 | `gestor` ve **cuatro** secciones, sin Dashboard | ✅ navegador, usuario |
| V-05 | `gestor` en `/admin` → `/admin/catalogo` | ✅ navegador, usuario |
| V-06 | `gestor` → `/api/metrics` da `403` | ✅ `verificar:roles` |
| V-07 | `admin`: cinco secciones y `/api/metrics` `200` con datos | ✅ `verificar:roles` |
| V-08 | las tres contraseñas funcionan, una por usuario | ✅ `verificar:logins` |
| V-09 | el seed no imprime contraseñas | ✅ |
| V-10 | las tres claves fuera del repo | ⚠️ ver abajo |
| V-11 | tests, typecheck, lint, build en verde | ✅ |
| V-12 | contraseña incorrecta → "contraseña incorrecta" | ✅ navegador, sin necesitar la clave real |
| V-13 | con la cookie puesta, un F5 restaura la sesión | ✅ `verificar:roles` |

160 tests frontend · 165 backend. CI verde en los tres jobs.

### De dónde sale cada verificación, y por qué importa

Los cuatro de interfaz los chequeó **el usuario en su navegador**, no el agente.
El motivo no es falta de permiso: la contraseña está en `backend/.env` y leerla
para escribirla en una llamada de herramienta la pondría en la conversación.

Queda dicho con nombre y apellido porque **un check sin quien lo hizo y cómo es
un check que el próximo asume que automática**. V-12 sí lo verificó el agente, en
navegador, y sin credenciales: se puede probar la cadena completa del login
fallido con una contraseña incorrecta cualquiera, que es justamente el caso que se
arregló.

### El部署 tardó 3 h, y el síntoma fue invisible

El merge fue a las `22:40:39Z`. **Vercel desplegó en minutos y Render no**, así
que durante casi tres horas la mitad de la spec estaba live y la otra no.

Lo que lo hace peligroso: **`/health` daba `200` con `db: connected` todo el
tiempo**, el panel abría, los tres logins entraban, y el catálogo se veía
normal. El único síntoma era un `403` esperado que llegaba `200` — y un `403`
que llega `200` no se nota mirando la aplicación, porque **nada de lo que se ve
en pantalla depende de él**: el frontend nuevo ya no pide `/api/metrics` al
gestor.

Es el gotcha 20 con un matiz nuevo: no hace falta que el build falle. Basta con
que dos plataformas no se desplieguen al mismo tiempo, y la que va atrasada es
**la defensa**, no la interfaz. El script `verificar:roles` existe para eso:
primero afirma la API, que es lo que puede estar viejo sin que se note.

### V-10 no cumple tal como está escrita

El checklist decía *"aparece en `.env.example` y en tests, y en ningún otro
lado"*. La realidad de `git grep admin123`:

```
backend/scripts/seed.ts          <-- el fallback de desarrollo
AGENTS.md, MEMORY.md, docs/DEPLOY.md
scripts/armar-ca06.mjs
backend/tests/**  (5 archivos)
specs/004-a, 004-b, 004-c, 005  (documentación de specs viejas)
```

Ni `.env.example` ni "ningún otro lado" son exactos. Lo que **sí** se cumple,
que es lo que el usuario pidió, es que **las tres contraseñas reales no están
en el repo**. Se verifica estructuralmente en `seed_passwords.test.ts` —`las
tres claves salen de leerClave(), y solo de ahí`— y no con un `grep` de un valor
que el agente no debe ver nunca.

`admin123` es el fallback de desarrollo documentado (`CLAVE_DEV`), no un
secreto: está en el `AGENTS.md` de la 004-b como credencial de prueba, y sin él
el seed no correría en CI. Que aparezca en `seed.ts` es **por diseño** (D-D/D-E),
no una fuga. El checklist estaba mal escrito y queda corregido acá en vez de
marcar la casilla.

---

## Antes de empezar

- [x] Las tres contraseñas puestas en `backend/.env`

> CA-06 de la spec 005 se cierra aparte, con `npm run verificar:ca06`. Vencía
> `2026-10-15 00:02` Argentina y no depende de nada de esta spec: el chequeo va
> contra la imagen de R2, no contra Render.
