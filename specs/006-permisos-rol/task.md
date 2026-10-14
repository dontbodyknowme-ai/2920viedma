# Task 006 — Permisos por rol en el panel

## T1 — Tabla de permisos

**Cubre:** RF-01 · **D-A**

- [ ] `src/utils/permisos.ts` con la matriz sección → roles
- [ ] Las cinco secciones con sus rutas, incluidas en la tabla
- [ ] `puedeVer(rol, ruta)` y `primeraVisible(rol)`
- [ ] El tipo obliga a que los tres roles estén declarados por sección
- [ ] Tests de la tabla: cada rol ve exactamente lo que dice la matriz
- [ ] Test explícito de que **gestor no ve Dashboard** (es el cambio pedido)

**Nota:** esta tarea **no cambia comportamiento**. La tabla existe y nadie la
usa todavía. Sirve para poder probar el sidebar y el redirect por separado en
T2 y T3.

---

## T2 — El sidebar se filtra por rol

**Cubre:** RF-01 · **D-A**

- [ ] `admin_sidebar.tsx` deja de tener la lista fija y lee de la tabla
- [ ] Cada enlace se filtra con `puedeVer(user.role, ruta)`
- [ ] Con `vendedor` queda **una** sección; con `gestor`, cuatro
- [ ] El estado activo de `NavLink` sigue funcionando con menos enlaces
- [ ] El sidebar no se rompe con `user === null` durante la carga
- [ ] Tests del componente montado con cada uno de los tres roles

---

## T3 — La URL directa redirige

**Cubre:** RF-02, RF-03 · **D-C**

- [ ] `admin_layout.tsx` detecta que el rol no puede ver la ruta actual
- [ ] Redirige a `primeraVisible(rol)` en vez de montar la página
- [ ] `/admin` con `gestor` → `/admin/catalogo`
- [ ] `/admin/catalogo` con `vendedor` → `/admin/pedidos`
- [ ] El login manda al destino permitido y no siempre a `/admin`
- [ ] Tests de la URL directa con los tres roles, **por URL y no por click**

**Nota:** el `403` del backend **no se toca**. Acá solo se evita mostrar una
pantalla que va a fallar.

---

## T4 — El backend saca al gestor de las métricas

**Cubre:** RF-01 (backend) · **D-B**

- [ ] `metrics/routes.ts:87`: `requireRole('admin', 'gestor')` → `requireRole('admin')`
- [ ] Un test que cubra el caso `gestor` → `403` en `GET /api/metrics`
- [ ] Los demás `requireRole` **sin tocar**: se verifica con un test que los
      recorre y falla si alguno cambió de rol sin querer

**Nota:** una línea de producción, pero es la única. Verificar a mano contra
producción: entrar como `gestor` y pedir `/api/metrics` tiene que dar `403`.

---

## T5 — Contraseñas por entorno

**Cubre:** RF-04, RF-05 · **D-D, D-E**

- [ ] `env.ts` lee `SEED_ADMIN_PASSWORD`, `SEED_GESTOR_PASSWORD`, `SEED_VENDEDOR_PASSWORD`
- [ ] Defaults de desarrollo, para que el seed funcione sin ponerlas
- [ ] `.env.example` las documenta como secretas
- [ ] `seed.ts` usa la variable de entorno, **no una constante con la clave**
- [ ] El seed **no imprime contraseñas** (RF-05)
- [ ] `git grep` de las tres claves de desarrollo: aparece en `.env.example` y
      en tests, y en **ningún otro lado**
- [ ] Test: el seed con usuario existente **no** le cambia el hash

**Nota:** el usuario ya tiene las tres contraseñas y las pone en
`backend/.env`. **No en el chat.** Sin eso, RF-04 no se puede verificar y
correría con los defaults.

### 5.1 Aplicar contra producción

- [ ] `npm run seed` contra Neon
- [ ] Verificar que los tres usuarios existen y con el nombre correcto
- [ ] **Probar el login de los tres**, uno por uno, con su contraseña real
- [ ] Verificar que re-correr el seed **no** cambia la contraseña de nadie

---

## T6 — El email del gate arranca vacío

**Cubre:** RF-06

- [ ] `admin_gate.tsx:20`: el estado inicial del email es `''`
- [ ] El `placeholder` se queda, para que se vea qué formato se espera
- [ ] Test del gate: el campo arranca vacío

**Nota:** se hace al final porque es cosmético y no debe tapar algo roto de
T2-T4.

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

- [ ] CA-06 de la spec 005 cerrado (`npm run verificar:ca06`). Vence
      `2026-10-15 00:02` Argentina
- [ ] Las tres contraseñas puestas en `backend/.env`

> Si esto arranca ahora y se estira, el reloj de CA-06 se cierra con el árbol a
> medias. Cerrar CA-06 son 30 segundos.
