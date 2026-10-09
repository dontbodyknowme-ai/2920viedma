# Spec 004 — Back-Office UI (Panel de Administración)

**Estado:** `aprobada`
**Spec:** `004-a`
**Creada:** 2026-10-08
**Aprobada por:** el usuario, de forma explícita, el **2026-10-08**
**Gobernada por:** `docs/CONSTITUCION.md`
**Spec previa:** `specs/003-mejoras-ux/` (aprobada, 2026-10-08)
**Spec siguiente:** `specs/004-b-backend-api/` (`borrador`, requiere aprobación propia)

---

## 1. Objetivo

Construir la **interfaz de administración (Back-Office)** para el equipo de la vinoteca. Esta spec cubre **solo el frontend** con datos mock y MSW (Mock Service Worker). El backend real se hará en una spec posterior (005).

### 1.1 Definiciones

- **Back-Office:** Interfaz privada para gestión interna (admin only)
- **MSW (Mock Service Worker):** Intercepta peticiones `fetch` y devuelve respuestas mock
- **Dashboard:** Pantalla principal con métricas y gráficos
- **DataTable:** Tabla de datos con búsqueda, filtros, paginación, ordenamiento
- **Drawer lateral:** Panel deslizable desde la derecha para detalles
- **Modo Admin:** Flag que habilita acceso a `/admin/*` y muestra botón en navbar

---

## 2. Contexto y diagnóstico

### 2.1 Estado actual verificado (post spec 003)

| Funcionalidad | Estado |
|---|---|
| E-commerce frontend | Completo (catálogo, carrito, checkout, carga/edición vinos) |
| Filtros avanzados | Precio, cepa, categoría, búsqueda texto |
| Animaciones | Scroll reveal, parallax, degradación móvil |
| Persistencia | `localStorage` (`vinoteca_wines`, `vinoteca_cart`) |
| Formulario vinos | Carga + edición + drag & drop imagen |
| Build/Types/Lint | `npm run build` ✅, `npx tsc --noEmit` ✅ |

### 2.2 Lo que falta para Back-Office

- Rutas `/admin/*` protegidas
- Layout admin (sidebar + header + content)
- Dashboard con métricas y gráficos (Recharts)
- 3 DataTables completas (Catálogo, Pedidos, Clientes)
- Drawers de detalle para Pedidos y Clientes
- MSW handlers para API mock
- Datos mock realistas (pedidos, clientes, métricas)

---

## 3. Alcance

### 3.1 Dentro de alcance

1. **Rutas admin protegidas** — `/admin`, `/admin/catalogo`, `/admin/pedidos`, `/admin/clientes`, `/admin/configuracion`
2. **AdminLayout** — Sidebar navegación, header con user menu, drawer móvil
3. **Dashboard** — 4-6 metric cards, gráfico ventas 30 días (Recharts), top productos, actividad reciente
4. **Catálogo Admin** — DataTable con búsqueda, filtros, paginación, edición inline/modal, CRUD completo
5. **Pedidos Admin** — DataTable con filtros por estado/fecha, drawer detalle, timeline estados, acciones
6. **Clientes CRM** — DataTable, drawer detalle con historial, notas, tags
7. **Componentes compartidos** — DataTable wrapper, MetricCard, StatusBadge, OrderTimeline, ConfirmDialog
8. **MSW Mock API** — Handlers REST para wines, orders, customers, metrics
9. **Datos mock** — Pedidos (25), Clientes (15), Métricas (30 días)
10. **Protección rutas** — Flag `isAdmin` + redirect si no autorizado

### 3.2 Fuera de alcance (spec 005+)

| Fuera de alcance | Por qué |
|---|---|
| **Backend real (Express/Node)** | Spec posterior. Esta spec valida UX primero |
| **Base de datos (PostgreSQL/Supabase)** | Requiere infraestructura |
| **Auth real (JWT, Clerk, OAuth)** | Mock flag `isAdmin` suficiente para UI |
| **Subida imágenes a S3/Cloudinary** | Base64/Data URL en mock |
| **Notificaciones push/email** | Backend real |
| **Tests E2E (Playwright/Cypress)** | Frontera de dependencias |
| **Internacionalización (i18n)** | Monolingüe español |

---

## 4. Requisitos funcionales

### 4.1 Acceso y Layout

- **RF-01** — CUANDO el usuario navega a `/admin/*` sin sesión abierta, EL SISTEMA muestra una pantalla que pide la contraseña, y la valida antes de habilitar las rutas protegidas
  - **Desviación aprobada (2026-10-09), implementada en T9.** El enunciado original pedía un botón "Modo Admin" visible en la navbar para todos los visitantes. **Se cambió: no hay ningún botón.** La tienda pública no menciona que exista un panel.
  - **Por qué:** un botón "Modo Admin" le comunica a cualquier visitante que hay una sección restringida y que está a un clic. Además el flag se podía poner en `true` desde la consola, así que no protegía nada y solo daba la impresión de que protegía.
  - **Cómo queda:** se entra escribiendo `/admin`, que pide una contraseña. La sesión vive en `sessionStorage`, así que dura lo que la pestaña.
  - **Lo que sigue siendo mock:** la contraseña se compara en el navegador contra un valor del bundle, y cualquiera que abra la consola puede leerla. No es autenticación. Cuando exista la API de la 004-b se reemplaza por `POST /api/auth/login` con token, y después 2FA.
- **RF-02** — CUANDO el usuario navega a `/admin/*` sin sesión abierta, EL SISTEMA muestra el pedido de contraseña en `/admin`
  - **Desviación aprobada (2026-10-09).** El enunciado pedía redirigir a `/` con un `alert`. Se muestra `AdminGate` en la misma URL en vez de rebotar: quien escribió `/admin` a propósito está pidiendo entrar, y responderle "anda a la tienda" contesta otra cosa. El mensaje de error aparece debajo del campo, no en un `alert`.
- **RF-03** — CUANDO el usuario accede a `/admin`, EL SISTEMA muestra AdminLayout con sidebar, header y contenido del Dashboard
- **RF-04** — CUANDO el ancho es < 768 px, EL SISTEMA muestra sidebar en drawer lateral y header compacto

### 4.2 Dashboard (`/admin`)

- **RF-05** — CUANDO el Dashboard carga, EL SISTEMA muestra 4-6 MetricCards: Ventas hoy, Ventas semana, Ventas mes, Carritos abandonados, Ticket promedio, Conversión
- **RF-06** — CUANDO el Dashboard carga, EL SISTEMA muestra gráfico de líneas "Ventas últimos 30 días" (Recharts)
- **RF-07** — CUANDO el Dashboard carga, EL SISTEMA muestra "Top 5 productos más vendidos" con imagen, nombre, unidades, revenue
- **RF-08** — CUANDO el Dashboard carga, EL SISTEMA muestra "Actividad reciente" (últimos 5 pedidos + nuevos clientes)
- **RF-09** — MIENTRAS los datos cargan, EL SISTEMA muestra skeletons en cards y gráfico

### 4.3 Catálogo Admin (`/admin/catalogo`)

- **RF-10** — CUANDO el usuario accede a Catálogo, EL SISTEMA muestra DataTable con columnas: Imagen, Nombre, Bodega, Cepa, Categoría, Cosecha, Precio, Stock, Estado, Acciones
- **RF-11** — CUANDO el usuario escribe en búsqueda global, EL SISTEMA filtra en todas las columnas visibles
- **RF-12** — CUANDO el usuario selecciona filtros (categoría, cepa, estado), EL SISTEMA aplica filtros combinados (AND)
- **RF-13** — CUANDO el usuario hace click en encabezado de columna, EL SISTEMA ordena asc/desc (toggle)
- **RF-14** — CUANDO el usuario cambia página o items por página, EL SISTEMA actualiza paginación
- **RF-15** — CUANDO el usuario pulsa "Nuevo Vino", EL SISTEMA abre formulario existente (`editor_formador_productos`) en modo creación
- **RF-16** — CUANDO el usuario pulsa "Editar" en una fila, EL SISTEMA abre formulario en modo edición con datos precargados
- **RF-17** — CUANDO el usuario pulsa "Eliminar", EL SISTEMA muestra ConfirmDialog y al confirmar elimina el vino
- **RF-18** — CUANDO el usuario pulsa "Duplicar", EL SISTEMA crea copia con nuevo ID y nombre "Copia de {nombre}"
- **RF-19** — CUANDO el usuario cambia estado (activo/inactivo), EL SISTEMA actualiza sin recargar
- **RF-20** — CUANDO el usuario pulsa "Exportar CSV", EL SISTEMA descarga CSV con datos filtrados actuales
- **RF-21** — CUANDO el usuario pulsa "Importar CSV", EL SISTEMA muestra modal para subir archivo y valida columnas

### 4.4 Pedidos Admin (`/admin/pedidos`)

- **RF-22** — CUANDO el usuario accede a Pedidos, EL SISTEMA muestra DataTable: Nº Pedido, Cliente, Fecha, Total, Estado, Acciones
- **RF-23** — CUANDO el usuario filtra por estado, EL SISTEMA muestra solo pedidos con ese estado (pendiente/preparando/enviado/entregado/cancelado)
- **RF-24** — CUANDO el usuario filtra por rango de fechas, EL SISTEMA muestra pedidos en ese rango
- **RF-25** — CUANDO el usuario pulsa "Ver" en un pedido, EL SISTEMA abre drawer lateral con detalle completo
- **RF-26** — CUANDO el drawer de pedido está abierto, EL SISTEMA muestra: items (imagen, nombre, cantidad, precio), datos cliente, dirección, timeline de estados
- **RF-27** — CUANDO el usuario cambia estado en dropdown, EL SISTEMA actualiza pedido y timeline
- **RF-28** — CUANDO el usuario pulsa "Generar etiqueta", EL SISTEMA muestra toast "Etiqueta generada (mock)"
- **RF-29** — CUANDO el usuario inicia devolución, EL SISTEMA abre modal con motivo y items a devolver

### 4.5 Clientes CRM (`/admin/clientes`)

- **RF-30** — CUANDO el usuario accede a Clientes, EL SISTEMA muestra DataTable: Nombre, Email, Teléfono, Total pedidos, Total gastado, Último pedido, Tags
- **RF-31** — CUANDO el usuario pulsa "Ver" en un cliente, EL SISTEMA abre drawer con: datos contacto, historial pedidos, notas internas, tags
- **RF-32** — CUANDO el usuario agrega nota, EL SISTEMA guarda nota con timestamp y autor
- **RF-33** — CUANDO el usuario agrega/quita tag, EL SISTEMA actualiza tags del cliente
- **RF-34** — CUANDO el usuario exporta selección, EL SISTEMA genera CSV con clientes filtrados

### 4.6 MSW Mock API

- **RF-35** — CUANDO la app hace `GET /api/wines`, EL SISTEMS devuelve lista paginada con filtros aplicados
- **RF-36** — CUANDO la app hace `POST /api/wines`, EL SISTEMA crea vino con ID único y devuelve creado
- **RF-37** — CUANDO la app hace `PATCH /api/wines/:id`, EL SISTEMA actualiza vino y devuelve actualizado
- **RF-38** — CUANDO la app hace `DELETE /api/wines/:id`, EL SISTEMA elimina y devuelve 204
- **RF-39** — CUANDO la app hace `GET /api/orders`, EL SISTEMA devuelve lista paginada con filtros
- **RF-40** — CUANDO la app hace `PATCH /api/orders/:id`, EL SISTEMA actualiza estado y timeline
- **RF-41** — CUANDO la app hace `GET /api/customers`, EL SISTEMA devuelve lista paginada
- **RF-42** — CUANDO la app hace `GET /api/metrics`, EL SISTEMA devuelve datos para Dashboard
- **RF-43** — MIENTRAS MSW procesa, EL SISTEMA simula latencia 300-800ms aleatoria

---

## 5. Requisitos no funcionales

- **RNF-01 — Tipado estricto:** TypeScript strict, sin `any`
- **RNF-02 — Estilo:** Comillas simples, sin punto y coma, patrones funcionales
- **RNF-03 — Paleta:** Solo colores de `tailwind.config.js`
- **RNF-04 — Sin dependencias nuevas no aprobadas:** Solo `recharts`, `@tanstack/react-table`, `msw`, `react-router-dom`, `react-day-picker`, `date-fns` (aprobadas para esta spec). **`papa-parse` queda excluida: devuelve 404 en el registry de este proyecto.** El CSV se implementa a mano en `src/utils/csv.ts`, que es la alternativa que D-12 ya preveia
- **RNF-05 — Performance:** DataTable virtualizada si > 100 rows, lazy load drawers
- **RNF-06 — Accesibilidad:** Tablas con `role="grid"`, `aria-sort`, focus management en drawers
- **RNF-07 — Responsive:** Desktop-first, móvil usable (stack cards, drawer fullscreen)
- **RNF-08 — Sincronización docs:** `MEMORY.md` y `AGENTS.md` actualizados al final
- **RNF-09 — Notificaciones simples:** `alert()` nativo para mensajes de error/éxito (sin librería toast)

---

## 6. Casos límite

| ID | Situación | Comportamiento esperado | RF |
|---|---|---|---|
| CE-01 | Usuario elimina vino con pedidos asociados | Handler DELETE verifica `mockOrders`; si vino está en pedidos, retorna 409 con mensaje "No se puede eliminar: tiene X pedidos asociados" | RF-17 |
| CE-02 | Importar CSV con columnas faltantes | Valida headers requeridos, muestra errores por fila | RF-21 |
| CE-03 | Cambiar estado pedido a "entregado" sin pasar por "enviado" | Permite pero registra salto en timeline | RF-27 |
| CE-04 | Cliente sin email ni teléfono | Permite guardar, muestra warning en fila | RF-31 |
| CE-05 | MSW falla o no está registrado | Fallback a localStorage directo, `alert('Modo offline')` | RF-35-43 |
| CE-06 | Dashboard con 0 ventas | Cards muestran 0, gráfico vacío con mensaje "Sin datos" | RF-05-06 |
| CE-07 | Filtros que no dejan resultados | DataTable muestra estado vacío con "Limpiar filtros" | RF-11-12 |
| CE-08 | Paginación en última página y se eliminan items | Ajusta a página anterior automáticamente | RF-14 |

---

## 7. Trazabilidad

| Grupo | RF | Origen |
|---|---|---|
| Acceso/Layout | RF-01 a RF-04 | Navbar existente + nueva nav admin |
| Dashboard | RF-05 a RF-09 | Requisitos de negocio (métricas clave) |
| Catálogo Admin | RF-10 a RF-21 | Formulario existente + CRUD completo |
| Pedidos Admin | RF-22 a RF-29 | Carrito/pedidos existentes + gestión estados |
| CRM Clientes | RF-30 a RF-34 | Datos de checkout + necesidades negocio |
| MSW Mock API | RF-35 a RF-43 | Arquitectura frontend-first |

---

## 8. Criterios de aceptación

### 8.1 Acceso y Layout

| CA | Criterio | Verificación |
|---|---|---|
| CA-01 | Acceso con contraseña | `/admin` → pantalla de clave → clave correcta → Dashboard |
| CA-01b | **No hay botón de acceso en la tienda** | La navbar pública no contiene ninguna referencia a admin (verificado sobre el HTML renderizado, no solo sobre el código) |
| CA-02 | Rutas protegidas | Las 5 rutas hijas muestran el pedido de clave sin sesión, ninguna renderiza datos |
| CA-03 | Layout responsive | < 768px: sidebar en drawer, header compacto |

### 8.2 Dashboard

| CA | Criterio | Verificación |
|---|---|---|
| CA-04 | MetricCards cargan | 4-6 cards con valores numéricos, iconos, tendencias |
| CA-05 | Gráfico Recharts renderiza | Línea 30 días, tooltips, responsive |
| CA-06 | Top 5 productos | Lista con imagen, nombre, unidades, revenue |
| CA-07 | Actividad reciente | 5 items mixtos (pedidos + clientes) con timestamp |
| CA-08 | Skeletons mientras carga | Cards y gráfico muestran placeholders animados |

### 8.3 Catálogo Admin

| CA | Criterio | Verificación |
|---|---|---|
| CA-09 | DataTable renderiza | Columnas correctas, datos mock visibles |
| CA-10 | Búsqueda global filtra | Escribe "Malbec" → solo filas con Malbec en cualquier columna |
| CA-11 | Filtros combinados | Categoría "Tinto" + Cepa "Malbec" + Estado "Activo" → AND lógico |
| CA-12 | Ordenamiento | Click header → asc, click → desc, click → sin orden |
| CA-13 | Paginación | Cambia página, items por página (10/25/50) |
| CA-14 | Crear vino | "Nuevo Vino" → formulario → guardar → aparece en tabla |
| CA-15 | Editar vino | "Editar" → formulario precargado → guardar → actualiza fila |
| CA-16 | Eliminar vino | "Eliminar" → ConfirmDialog → confirmar → fila desaparece |
| CA-17 | Duplicar vino | "Duplicar" → nuevo vino "Copia de X" en tabla |
| CA-18 | Cambiar estado | Toggle activo/inactivo → actualiza badge sin recargar |
| CA-19 | Exportar CSV | Descarga .csv con datos filtrados actuales |
| CA-20 | Importar CSV | Modal → archivo válido → agrega vinos → tabla actualizada |

### 8.4 Pedidos Admin

| CA | Criterio | Verificación |
|---|---|---|
| CA-21 | DataTable pedidos | Columnas correctas, 25 pedidos mock |
| CA-22 | Filtro estado | Dropdown → solo pedidos con ese estado |
| CA-23 | Filtro fechas | Date range picker → pedidos en rango |
| CA-24 | Drawer detalle | Click "Ver" → drawer abre con items, cliente, dirección, timeline |
| CA-25 | Timeline estados | Visual: puntos conectados, estado actual destacado, timestamps |
| CA-26 | Cambiar estado | Dropdown en drawer → actualiza badge + timeline |
| CA-27 | Generar etiqueta | Toast "Etiqueta generada (mock)" |
| CA-28 | Devolución | Modal → motivo + items → confirmar → estado "devuelto" |

### 8.5 Clientes CRM

| CA | Criterio | Verificación |
|---|---|---|
| CA-29 | DataTable clientes | 15 clientes mock, columnas correctas |
| CA-30 | Drawer cliente | Historial pedidos, notas, tags, datos contacto |
| CA-31 | Agregar nota | Input + guardar → aparece en lista con timestamp |
| CA-32 | Gestionar tags | Input autocomplete → agregar/quitar chips |
| CA-33 | Exportar clientes | CSV con datos filtrados |

### 8.6 MSW y Mocks

| CA | Criterio | Verificación |
|---|---|---|
| CA-34 | MSW intercepta fetch | Network tab muestra requests a `/api/*` sin red real |
| CA-35 | Latencia simulada | Requests tardan 300-800ms (ver en Network) |
| CA-36 | Persistencia sesión | Recargar página → datos mock se mantienen (memoria MSW) |
| CA-37 | Fallback offline | Deshabilitar MSW → app usa localStorage → `alert('Modo offline')` |

### 8.7 Calidad

| CA | Criterio | Verificación |
|---|---|---|
| CA-38 | Build pasa | `npm run build` exit 0 |
| CA-39 | Types pasan | `npx tsc --noEmit` exit 0 |
| CA-40 | Lint pasa | `npm run lint` exit 0 (si configurado) |
| CA-41 | Sin dependencias nuevas no aprobadas | `package.json` solo Recharts, TanStack Table, MSW, PapaParse, React Router, React Day Picker, date-fns agregados |

---

## 9. Decisiones

| ID | Decisión | Justificación |
|---|---|---|
| D-01 | **Solo UI + MSW en esta spec** | Validar UX antes de invertir en backend real |
| D-02 | **Recharts para gráficos** | Ligero, tree-shakeable, compatible Framer Motion |
| D-03 | **TanStack Table v8** | Headless, potente, TypeScript first, virtualización nativa |
| D-04 | **React Router v6** | Estándar, ya compatible con Vite/React |
| D-05 | **Flag `isAdmin` en localStorage** | Mock simple, persiste entre recargas, sin auth real |
| D-06 | **AdminLayout con sidebar colapsible** | Desktop: sidebar fija 280px. Móvil: drawer fullscreen |
| D-07 | **DataTable wrapper genérico** | Reutilizable para 3 tablas (Catálogo, Pedidos, Clientes) |
| D-08 | **Drawers para detalle** | Consistencia con CartDrawer y ProductForm existentes |
| D-09 | **ConfirmDialog reutilizable** | Un componente para todas las confirmaciones (eliminar, estado) |
| D-10 | **StatusBadge semántico** | Colores: verde=activo/entregado, amarillo=pendiente/preparando, rojo=cancelado/devuelto, gris=inactivo |
| D-11 | **MetricCard con tendencia** | Icono + valor + flecha % vs período anterior + label |
| D-12 | **CSV export usa PapaParse o nativo** | PapaParse si disponible, sino `Blob` + `URL.createObjectURL` nativo |
| D-13 | **Mock data realista** | 25 pedidos estados distribuidos, 15 clientes con historial, 30 días ventas |
| D-14 | **`stock` y `activo` se definen en `AdminWine extends Wine`, no en `Wine`** | **CORREGIDA en T1.** Se pedían como campos de `Wine`, pero las dos listas de `src/utils/validadores.ts` cierran ese contrato por los dos lados. `CAMPOS_REQUERIDOS` no puede incluirlos: los fixtures de `test/validadores.test.ts` arman un `Wine` sin ellos, y RNF-05 protege el contenido de esos tests (18 de 26 fallan). `CAMPOS_OPCIONALES` tampoco: `test/integridad_datos_vino.test.ts:201` exige que `esCampoOpcionalValido` rechace `0` y `false`, y `stock: 0` y `activo: false` son valores legítimos. No queda ningún campo libre. La solución coincide además con **RF-06 de la spec 004-b**, que ya define que el endpoint público omite `stock` y `activo`: son datos internos de la operación, no del catálogo. Ver C-1 en `task.md` |
| D-15 | **Estados de pedido fijos** | 5 estados principales + devuelto; no configurables en esta spec |
| D-16 | **Solo flag `isAdmin`** | Sin roles granulares; mock auth suficiente para validar UI |
| D-17 | **Logs de auditoría en timeline/notas** | Timestamp + acción + autor en timeline pedidos y notas clientes; autor hardcoded `"Admin"` (mock sin auth real) |

---

## 10. Dudas abiertas — RESUELTAS (2026-10-08)

| # | Pregunta | Decisión | Justificación |
|---|---|---|---|
| 1 | **¿Gestión de stock en Catálogo Admin?** | **SÍ** — Agregar campo `stock: number` y `activo: boolean` a `Wine` type | Necesario para gestión de inventario realista |
| 2 | **¿Estados de pedido personalizables?** | **FIJOS** — 5 estados: pendiente, preparando, enviado, entregado, cancelado (+ devuelto como sub-estado) | Simplicidad; configurables en spec 005+ |
| 3 | **¿Permisos granulares?** | **SOLO `isAdmin` boolean** | Mock auth suficiente para UI; roles en spec 005+ |
| 4 | **¿Logs de auditoría?** | **SÍ** — En esta spec: timestamp + acción + entidad en timeline de pedidos y notas de clientes | Trazabilidad básica sin backend real |

---

## 11. Próximos pasos

1. Revisar y aprobar esta spec
2. Redactar `plan.md` con archivos, pseudocódigo, decisiones técnicas
3. Redactar `task.md` con 10-12 tareas ordenadas
4. Implementar fase por fase