# Spec 006 — Permisos por rol en el panel

**Estado:** spec escrita, **sin implementar**. Esperando aprobación.

**Origen:** el usuario pidió que el **gestor no vea el Dashboard**. Es lo único
que cambia respecto de hoy. El resto del trabajo es hacer que la interfaz
respete los permisos que el backend **ya aplica**.

---

## 1. Lo que el backend ya hace (y un cambio puntual)

### 1.1 Lo que ya está bien — no se toca

`requireRole` está en todos los módulos y hoy responde:

| Módulo | admin | gestor | vendedor |
|---|---|---|---|
| `/api/wines` | ✅ | ✅ | ❌ |
| `/api/wines/import` | ✅ | ✅ | ❌ |
| `/api/upload` | ✅ | ✅ | ❌ |
| `/api/customers` | ✅ | ✅ | ❌ |
| `/api/orders` | ✅ | ✅ | ✅ |

**Ningún cambio de backend hace falta para el vendedor.** Esa parte ya está
correcta y verificada.

### 1.2 El único cambio de backend

```ts
// backend/src/modules/metrics/routes.ts:87
preHandler: requireRole('admin', 'gestor')   →   requireRole('admin')
```

Es la **única** línea de servidor que se toca en toda la spec.

### 1.3 Por qué el vendedor no pierde información al no ver Clientes

`GET /api/orders` incluye `customer: { id, name, email }` **dentro de cada
pedido** (`orders/routes.ts:38`). El vendedor ve el nombre y el email del
cliente en cada pedido, sin poder entrar a `/api/customers`.

Es decir: **no ve menos datos de cada pedido, ve menos módulos.** Un pedido
completo es un pedido completo.

**Alternativa descartada:** darle a `vendedor` lectura en `/api/customers`. Se
descartó porque podría listar, buscar y exportar la base de clientes entera,
que es justo lo que se le niega.

---

## 2. Lo que está roto: la interfaz miente

`admin_sidebar.tsx:35` tiene una lista fija de cinco secciones:

```tsx
const ENLACES: readonly EnlaceAdmin[] = [
  { to: '/admin', label: 'Dashboard', ... },
  { to: '/admin/catalogo', label: 'Catalogo', ... },
  { to: '/admin/pedidos', label: 'Pedidos', ... },
  { to: '/admin/clientes', label: 'Clientes', ... },
  { to: '/admin/configuracion', label: 'Configuracion', ... }
]
```

Hoy un `vendedor` ve las cinco y **puede escribir la URL a mano**:
`/admin/catalogo` monta la página, la tabla pide `/api/wines` y recibe un `403`.

El servidor responde bien; **la interfaz promete una sección que no va a poder
usar y lo descubre rompiéndose, no con un mensaje**.

Es el mismo patrón que el header de usuario, que hasta hace un rato decía
"Administrador" para cualquiera que entrara.

---

## 3. Matriz de permisos (el resultado buscado)

| Sección | admin | gestor | vendedor | Ruta |
|---|---|---|---|---|
| Dashboard | ✅ | **❌** | ❌ | `/admin` |
| Catálogo | ✅ | ✅ | ❌ | `/admin/catalogo` |
| **Pedidos** | ✅ | ✅ | ✅ | `/admin/pedidos` |
| Clientes | ✅ | ✅ | ❌ | `/admin/clientes` |
| Configuración | ✅ | ✅ | ❌ | `/admin/configuracion` |

**Único cambio respecto de hoy:** la fila Dashboard pierde al `gestor`.

---

## 4. Requisitos

### RF-01 — La navegación se filtra por rol

El sidebar muestra solo las secciones que el rol puede usar. La fuente es una
sola tabla de permisos, **no cinco `if` sueltos**: una tabla que los tres roles
comparten y que se puede leer de un vistazo.

### RF-02 — La URL directa a una sección vedada no rompe nada

Escribir `/admin/catalogo` con sesión de `vendedor` **no** muestra una página
rota con un `403` en consola. Redirige a la primera sección que sí puede usar.

Escribe `/admin` con sesión de `gestor` → redirige a `/admin/catalogo`.

**El `403` del servidor no se toca.** Es la defensa real; esto es no romper la
experiencia.

### RF-03 — El primer destino es la primera sección permitida

Al entrar, `gestor` cae en `/admin/catalogo` y `vendedor` en `/admin/pedidos`, no
en `/admin` (Dashboard), que ninguno de los dos puede ver.

### RF-04 — Tres contraseñas, una por usuario

| Usuario | Rol | Contraseña |
|---|---|---|
| `admin@vinoteca.local` | admin | una |
| `gestor@vinoteca.local` | gestor | otra |
| `vendedor@vinoteca.local` | vendedor | otra |

**El seed NO contiene las contraseñas.** Se leen del entorno:

```
SEED_ADMIN_PASSWORD
SEED_GESTOR_PASSWORD
SEED_VENDEDOR_PASSWORD
```

con un default de desarrollo. Razón: `seed.ts` está commiteado, así que una
contraseña escrita ahí **queda en el repo en texto plano y en el historial de
git para siempre**. El entorno ya se usa para todo lo demás
(`DATABASE_URL`, `JWT_SECRET`, `STORAGE_*`), así que no es una excepción.

### RF-05 — El seed no imprime contraseñas

Hoy imprime las tres al terminar. Con tres distintas, ese log es un volcado de
credenciales en la consola de quien lo corre. Pasa a mostrar solo los emails.

### RF-06 — El email del gate empieza vacío

`admin_gate.tsx:20` deja `admin@vinoteca.local` puesto. Con tres personas eso
obliga a cada vendedor a borrarlo a mano. Campo vacío.

### RF-07 — Una contraseña incorrecta se reporta como contraseña incorrecta

Bug encontrado **escribiendo los tests de T3**, no estaba en el encargo. Se
incluye porque esta spec crea las tres cuentas con tres contraseñas distintas: es
justo el escenario en que más se va aEQUIVocar una al entrar, y hoy el panel
responde con un mensaje que no corresponde.

El camino real, de punta a punta:

| | |
|---|---|
| `POST /api/auth/login` con contraseña incorrecta | backend: `401 { code: 'INVALID_CREDENTIALS' }` |
| `client.ts:74` | ve `401` → intenta refrescar el token → falla → `throw new Error('Sesión expirada. Inicie sesión nuevamente.')` |
| lo que ve la persona | **"Sesión expirada. Inicie sesión nuevamente."** |

Es decir: **la contraseña incorrecta se reporta como sesión vencida**. Con tres
usuarios, el que se confunde de contraseña/no de usuario ve un mensaje que lo
manda a buscar el problema en el lugar equivocado — a recargar la página, que es
exactamente lo que la persona ya hizo.

Y el arreglo no es de una línea: si solo se saca el refresh, el gate pasa a
mostrar **`INVALID_CREDENTIALS`**, porque `app.ts:147` manda
`message: error.message` y en `UnauthorizedError('INVALID_CREDENTIALS')` el
`message` **es** el código. El texto legible no existe en ninguna de las dos
capas.

Requisitos:

- Un `401` de `/api/auth/login` **no** dispara el intento de refresh: ahí no hay
  sesión que renovar, hay una contraseña que no es.
- El `401` de `/api/auth/me` **sí** lo dispara. Es el caso donde el refresh por
  cookie es lo único que hace que la sesión sobreviva a un F5, y esta spec no
  lo toca.
- Lo que se ve en pantalla es un texto en español. **Nunca un código**: si el
  backend devuelve un código que el gate no conoce, sale un texto genérico, no
  `CODIGO_DESCONOCIDO`.
- El backend **no** cambia. Los códigos existen para que el frontend branche;
  el texto para una persona va en el frontend, que es el único que sabe quién
  lo lee.

---

## 5. Fuera de alcance (a propósito)


| | Por qué |
|---|---|
| **Configuración editable** | El usuario lo pidió y se saca acá a propósito. Hoy la sección General es **solo lectura** y la propia página lo dice: *"No hay backend de configuración todavía, así que editar estos campos no persistiría nada"*. Hacerla editable exige una **migración** (tabla de configuración), un **módulo backend `settings`** que no existe, y decidir si la tienda pública pasa a leer de ahí. Si edita el nombre y la tienda sigue mostrando el hardcodeado, se crea **el mismo bug de "la interfaz miente"** que esta spec viene a arreglar. Es una spec propia |
| Permisos de escritura por sección (quién edita qué) | Hoy cualquiera con `admin`/`gestor` edita todo en todo. Es decisión de negocio |
| Mensaje de `403` en la interfaz | Hoy el `DataTable` recibe el `403` y renderiza vacío sin decir por qué. Bug propio, va aparte |
| Variables de entorno editables | **No es negociable.** Se leen antes de que la app arranque; un panel que las cambiara rompería el arranque y en producción no habría forma de recuperar la contraseña de la base |
| Acceso por código de correo | Spec siguiente: elimina las tres contraseñas de raíz |
| Cuentas por persona con Google OAuth | Spec 007 |

---

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Esconder el menú da falsa sensación de seguridad | El `requireRole` no se toca. Es la única defensa real y ya funciona |
| Filtrar el sidebar y olvidar el layout | El redirect de RF-02 vive en `admin_layout.tsx`, no en el sidebar. Test que cubre la URL directa |
| Un rol se queda sin ninguna sección | Ninguno: a `vendedor` siempre le queda Pedidos, a `gestor` le quedan cuatro |
| Cambiar `TIENDA` a async rompe todos los `Intl.NumberFormat` | No se toca `TIENDA` en esta spec |
| Sacar el refresh del login rompe la restauración de sesión tras F5 | El cambio es **quirIT el refresh solo en `/api/auth/login`**. `/api/auth/me` lo mantiene, que es donde el refresh por cookie hace su trabajo. Hay un test que lo verifica (V-13), porque la confusión natural es pensar "los 401 no se refrescan nunca" |

---

## 7. Verificación

| | |
|---|---|
| V-01 | como `vendedor`, el sidebar muestra **una** sección: Pedidos |
| V-02 | como `vendedor`, `/admin/catalogo` a mano redirige a `/admin/pedidos` |
| V-03 | como `vendedor`, `/api/wines` sigue dando `403` |
| V-04 | como `gestor`, el sidebar muestra **cuatro** secciones, sin Dashboard |
| V-05 | como `gestor`, `/admin` a mano redirige a `/admin/catalogo` |
| V-06 | como `gestor`, `GET /api/metrics` da `403` |
| V-07 | como `admin`, las cinco secciones y `/api/metrics` `200` |
| V-08 | las tres contraseñas funcionan, una por usuario |
| V-09 | `npm run seed` no imprime contraseñas |
| V-10 | ninguna de las tres aparece en `git grep` |
| V-11 | tests, typecheck, lint, build en verde |
| V-12 | contraseña incorrecta: el gate dice **contraseña incorrecta**, no "sesión expirada" ni `INVALID_CREDENTIALS` |
| V-13 | con la cookie de refresco puesta, un F5 en `/admin` **restaura** la sesión (el `401` de `/api/auth/me` sigue refrescando) |

---

## 8. Para implementar

Hace falta que el usuario ponga en `backend/.env`:

```
SEED_ADMIN_PASSWORD=
SEED_GESTOR_PASSWORD=
SEED_VENDEDOR_PASSWORD=
```

**No en el chat.** Sin eso, RF-04 no se puede verificar y el seed usaría los
defaults de desarrollo.
