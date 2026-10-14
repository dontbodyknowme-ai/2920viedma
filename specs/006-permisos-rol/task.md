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

**Cubre:** RF-01 (backend) · **D-B**

- [ ] `metrics/routes.ts:87`: `requireRole('admin', 'gestor')` → `requireRole('admin')`
- [ ] Un test que cubra el caso `gestor` → `403` en `GET /api/metrics`
- [ ] Los demás `requireRole` **sin tocar**: se verifica con un test que los
      recorre y falla si alguno cambió de rol sin querer

**Nota:** una línea de producción, pero es la única. Verificar a mano contra
producción: entrar como `gestor` y pedir `/api/metrics` tiene que dar `403`.

**Por qué puede ir ahora:** el test cruzado de T1
(`coherencia_permisos.test.ts`) mapea `/admin` a `/api/metrics` y verifica que
la tabla no prometa más de lo que el backend permite. Hoy ese caso **pasa por el
lado que el test no tapa** — el backend todavía acepta al gestor y la tabla
promete menos — o sea que `/admin` no tiene cobertura real. Recién con esta línea
el quinto de los cinco pares queda verificado en los dos sentidos.

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

**Cubre:** RF-06

- [ ] `admin_gate.tsx:20`: el estado inicial del email es `''`
- [ ] El `placeholder` se queda, para que se vea qué formato se espera
- [ ] Test del gate: el campo arranca vacío

**Nota:** se hace antes que T7 y no al final como decía la versión original:
T7 también toca `admin_gate.tsx`, y las dos cosas son cambios distintos que se
leen mejor en commits separados que en uno.

---

## T7 — La contraseña incorrecta se reporta como contraseña incorrecta

**Cubre:** RF-07 · **D-G, D-H**

Bug **preexistente**, encontrado escribiendo los tests de T3. No estaba en el
encargo; entra porque esta spec crea tres cuentas con tres contraseñas
distintas, que es justo cuando más se va a confundir una.

- [ ] `client.ts`: un `401` de `/api/auth/login` **no** intenta refrescar
- [ ] `/api/auth/me` **sí** lo intenta — es lo que hace que la sesión sobreviva
      a un F5, y no se toca
- [ ] El gate traduce `code` conocido a texto en español
- [ ] Un `code` **desconocido** cae en una frase genérica, **no** en el código:
      una persona nunca lee un identificador en este panel
- [ ] Un error de red (`Failed to fetch`) también sale en español, no en inglés
- [ ] La función de traducción es **pura y exportada**, testeable sin montar
- [ ] El backend **no** se toca
- [ ] Test: contraseña incorrecta → el gate dice contraseña incorrecta
- [ ] Test: `/api/auth/me` `401` + refresh `200` → **restaura** la sesión

> El segundo test es el importante. La confusión natural después de D-G es
> "los `401` ya no se refrescan nunca", y sin ese test el error pasa inadvertido:
> el síntoma es que la sesión no sobrevive a la recarga, y en desarrollo local
> se siente como que "a veces funciona".

---

## Al terminar

- [ ] `npm run typecheck`, `npm run lint`, `npm test` en verde
- [ ] `cd backend && npm run typecheck && npm run test` en verde
- [ ] Los once chequeos de `specs/006-permisos-rol/spec.md` sección 7
- [ ] Verificación manual contra producción con los tres roles
- [ ] `AGENTS.md` y `MEMORY.md` actualizados
- [ ] **PR a `main`**, y merge **solo** si lo pide el usuario

---

## Antes de empezar

- [x] Las tres contraseñas puestas en `backend/.env`

> CA-06 de la spec 005 se cierra aparte, con `npm run verificar:ca06`. Vencía
> `2026-10-15 00:02` Argentina y no depende de nada de esta spec: el chequeo va
> contra la imagen de R2, no contra Render.
