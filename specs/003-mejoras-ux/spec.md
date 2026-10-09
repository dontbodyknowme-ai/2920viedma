# Spec 003 — Mejoras de UX y funcionalidad

**Estado:** `aprobada`
**Spec:** `003`
**Creada:** 2026-10-08
**Aprobada por:** el usuario, de forma explícita, el **2026-10-08**
**Gobernada por:** `docs/CONSTITUCION.md`
**Spec previa:** `specs/002-app-que-compile/` (aprobada, 2026-10-06)

---

## 1. Objetivo

La aplicación compila, arranca y es usable de punta a punta (spec 002). Esta spec agrega **mejoras de UX y funcionalidad** que quedaron fuera de alcance de la 002:

1. **Filtros avanzados de catálogo** — por rango de precio y por cepa
2. **Carga de imagen por archivo** — arrastrar y soltar o seleccionar del sistema (solo admin)
3. **Navegación entre secciones** — enlaces en la barra de navegación
4. **Edición de productos** — modificar vinos existentes desde el formulario (solo admin)
5. **Animaciones de scroll** — revelado suave y parallax en el hero
6. **Botellas destacadas** — exhibición mejorada en el hero

### 1.1 Definiciones

- **Cepa/Varietal:** El tipo de uva (Malbec, Cabernet Sauvignon, Chardonnay, etc.). Campo `varietal` del tipo `Wine`.
- **Rango de precio:** Precio mínimo y máximo en pesos argentinos (ARS) para filtrar el catálogo.
- **Drag & Drop:** Interacción de arrastrar un archivo desde el sistema de archivos y soltarlo en una zona de la página.
- **Scroll reveal:** Animación que se activa cuando un elemento entra en el viewport al hacer scroll.
- **Parallax:** Efecto de profundidad donde capas se mueven a velocidades distintas al hacer scroll.
- **Botellas destacadas:** Los 3 vinos más caros del catálogo, exhibidos de forma prominente en el hero.
- **Admin:** Usuario con permisos de administración. En este proyecto, el admin es quien abre el formulario de carga/edición desde el botón "+ Cargar Vino" de la barra de navegación.

---

## 2. Contexto y diagnóstico

### 2.1 Estado actual verificado

| Componente | Estado | Qué falta |
|---|---|---|
| `carta_de_catalogo.tsx` | Filtro por categoría y búsqueda por texto | Filtro por precio y cepa |
| `editor_formador_productos.tsx` | Carga de vinos con imagen por URL | Edición de vinos y carga por archivo |
| `barra_de_navegacion.tsx` | Logo como único enlace | Enlaces a secciones |
| `hero.tsx` | Botella 3D estática | Parallax y scroll reveal |
| `herocanvas3d.tsx` | Botella 3D | Botellas destacadas |

### 2.2 Lo que ya está bien

- **Sistema de tipos completo:** `Wine`, `CartItem`, `WineCategory`, `WineFilterState` en `src/types/vino.ts`
- **Catálogo funcional:** Filtro por categoría y búsqueda con `trim()` y normalización
- **Formulario con validación:** Precio > 0, cosecha entre 1850 y año actual + 1
- **Persistencia:** `localStorage` con `vinoteca_wines` y `vinoteca_cart`
- **68 tests en verde:** 46 preexistentes + 22 del orquestador
- **Animaciones base:** Framer Motion en carrito, modales, hero y tarjetas

---

## 3. Alcance

### 3.1 Dentro de alcance

1. **Filtro por rango de precio** — El usuario puede definir precio mínimo y máximo para filtrar el catálogo
2. **Filtro por cepa** — El usuario puede seleccionar una o más cepas para filtrar el catálogo
3. **Carga de imagen por archivo** — El formulario acepta arrastrar y soltar un archivo de imagen o seleccionarlo del sistema (solo admin)
4. **Edición de productos** — El formulario puede cargar un vino existente, modificarlo y guardar los cambios (solo admin)
5. **Enlaces de navegación** — La barra de navegación tiene enlaces a las secciones principales
6. **Animaciones de scroll** — Las secciones se revelan suavemente al entrar en el viewport
7. **Parallax en el hero** — El hero tiene efecto parallax al hacer scroll
8. **Botellas destacadas** — El hero exhibe los 3 vinos más caros de forma prominente

### 3.2 Fuera de alcance, con justificación

| Fuera de alcance | Por qué |
|---|---|
| **Backend real, API o base de datos** | La constitución §4 lo deja para el futuro. Todo sigue en `localStorage` |
| **Cobro real o pasarela de pago** | RF-27 de la spec 002 ya definió el cierre de compra como local |
| **Sistema de autenticación** | No hay usuarios ni sesiones en el alcance del proyecto |
| **Búsqueda avanzada con operadores** | La búsqueda por texto actual (nombre, bodega, varietal) es suficiente |
| **Filtro por rango de cosecha** | No es un requisito de la constitución ni de AGENTS.md |
| **Modo claro/tema alternativo** | La constitución define tema oscuro fijo (D-5 de spec 002) |
| **Internacionalización** | El proyecto es monolingüe (español) |
| **Tests de presentación** | jsdom no implementa layout ni animaciones (frontera documentada en spec 002 §8.1b) |

---

## 4. Requisitos funcionales

### 4.1 Filtros avanzados de catálogo

- **RF-01** — CUANDO el usuario define un precio mínimo y/o máximo, EL SISTEMA muestra únicamente los vinos cuyo precio está dentro de ese rango
- **RF-02** — CUANDO el usuario selecciona una o más cepas, EL SISTEMA muestra únicamente los vinos cuya cepa coincide con alguna de las seleccionadas
- **RF-03** — CUANDO el usuario combina filtros de categoría, precio, cepa y búsqueda por texto, EL SISTEMA aplica todos los filtros simultáneamente (AND lógico)
- **RF-04** — CUANDO el usuario limpia los filtros de precio o cepa, EL SISTEMA restablece el filtro correspondiente sin afectar los demás
- **RF-05** — SI ningún vino coincide con los filtros combinados, ENTONCES EL SISTEMA muestra el mensaje de estado vacío

### 4.2 Carga de imagen por archivo (solo admin)

- **RF-06** — CUANDO el admin arrastra un archivo de imagen y lo suelta en la zona de carga del formulario, EL SISTEMA muestra una vista previa de la imagen
- **RF-07** — CUANDO el admin selecciona un archivo de imagen desde el sistema de archivos, EL SISTEMA muestra una vista previa de la imagen
- **RF-08** — SI el archivo arrastrado no es una imagen válida (PNG, JPG, WebP), ENTONCES EL SISTEMA muestra un mensaje de error y no carga la imagen
- **RF-09** — SI el archivo supera los 5 MB, ENTONCES EL SISTEMA muestra un mensaje de error y no carga la imagen
- **RF-10** — CUANDO el admin carga un vino con imagen por archivo, EL SISTEMA guarda la imagen como Data URL en el campo `imageUrl` del vino
- **RF-25** — SI el admin carga una imagen por archivo y luego intenta cambiar a URL, ENTONCES EL SISTEMA ignora la URL y mantiene la imagen por archivo

### 4.3 Edición de productos (solo admin)

- **RF-11** — CUANDO el admin activa la acción de editar sobre un vino existente, EL SISTEMA abre el formulario con los datos del vino cargados
- **RF-12** — CUANDO el admin guarda los cambios de un vino editado, EL SISTEMA actualiza el vino en el catálogo manteniendo su identificador original
- **RF-13** — CUANDO el admin edita un vino, EL SISTEMA muestra el formulario con el título "Editar Vino" en lugar de "Cargar Nuevo Vino"
- **RF-14** — SI el admin cancela la edición (con el botón "Cancelar", la X del formulario o haciendo clic fuera), ENTONCES EL SISTEMA no modifica el vino y cierra el formulario

### 4.4 Navegación entre secciones

- **RF-15** — CUANDO la aplicación se monta, EL SISTEMA muestra en la barra de navegación enlaces a las secciones principales: Inicio, Catálogo, Contacto
- **RF-16** — CUANDO el usuario pulsa un enlace de navegación, EL SISTEMA desplaza la vista hasta la sección correspondiente de forma suave
- **RF-17** — CUANDO el usuario navega a una sección, EL SISTEMA asegura que el encabezado de la sección no quede tapado por la barra de navegación fija

### 4.5 Animaciones de scroll

- **RF-18** — CUANDO el usuario hace scroll y una sección entra en el viewport, EL SISTEMA la revela con una animación suave de entrada
- **RF-19** — MIENTRAS el usuario hace scroll, EL SISTEMA aplica un efecto parallax al hero, moviendo capas a velocidades distintas
- **RF-20** — SI el ancho de la ventana es inferior a 640 px, ENTONCES EL SISTEMA degrada las animaciones a transiciones simples
- **RF-21** — MIENTRAS las animaciones de scroll están activas, EL SISTEMA mantiene al menos 30 FPS y no bloquea la interacción del usuario

### 4.6 Botellas destacadas

- **RF-22** — CUANDO la aplicación se monta, EL SISTEMA muestra en el hero una sección de botellas destacadas con los 3 vinos más caros del catálogo
- **RF-23** — CUANDO el usuario pulsa una botella destacada, EL SISTEMA abre la vista rápida de ese vino
- **RF-24** — SI no hay botellas destacadas (catálogo vacío), ENTONCES EL SISTEMA no muestra la sección de destacados

#### Pendiente: el hero quedó cargado (anotado 2026-10-09, NO se toca)

**Motivo del usuario: "el título (nombre de la empresa) tapa la animación 3D, y queda tosco. Quiero volver a la interfaz anterior, sin botellas destacadas."**

Decisión tomada en esa fecha: **anotarlo y dejarlo para después.** No se
modifica el hero hasta que el usuario lo pida.

**Lo que molesta, en concreto.** `src/components/hero.tsx` tiene tres capas
compitiendo por el mismo espacio de un `min-h-screen`:

1. `<HeroCanvas3D />` en `absolute inset-0` — la botella 3D, ocupa todo el hero.
2. El título "CAVA & CO." centrado, con `text-8xl` en pantallas grandes.
3. La fila "Botellas Destacadas" en `absolute bottom-24`, por encima del canvas.

Con las tres, el titulo tapa la animacion 3D y el conjunto se ve apinado. Sin
la fila de destacadas (como estaba antes de esta spec), quedaban dos capas y el
hero respiraba.

**Si se encara, las opciones son:**

- Sacar la fila de destacadas del hero. Contradice **RF-22, RF-23 y RF-24** de
  esta misma seccion, asi que hay que decidir si se borran del RF o se
  reinterpretan.
- Sacar la animacion 3D y dejar el hero tipografico.
- Repartir: 3D a un lado, texto al otro, sin superposición.

**A tener en cuenta cuando se decida:** `Hero` recibe `wines` y `onSelectWine`
solo para esta sección. Si se saca la fila, ambos props quedan sin uso y
`onSelectWine` sigue siendo el camino hacia `VistaRapidaProducto`, que se
perdería desde el hero. No hay ningun test que cubra las destacadas, asi que
quitarlas no rompe la suite, pero si rompe RF-23.

---

## 5. Requisitos no funcionales

- **RNF-01 — Tipado estricto y sin `any`:** Todo el código TypeScript del proyecto se verifica en modo estricto, sin `any` explícito ni implícito
- **RNF-02 — Estilo:** Comillas simples, sin punto y coma al final de las sentencias, preferencia por patrones funcionales
- **RNF-03 — Paleta obligatoria:** Se usan los colores de `tailwind.config.js` y ningún otro
- **RNF-04 — Gestor de paquetes:** El proyecto se gestiona con **npm**. Ninguna tarea de esta spec instala dependencias nuevas ni quita dependencias existentes
- **RNF-05 — Aislamiento de la suite:** La configuración de pruebas existente se mantiene aislada. Los 68 tests preexistentes siguen existiendo y pasando
- **RNF-06 — Rendimiento de animaciones:** Las animaciones de scroll y parallax no bloquean el hilo principal y mantienen al menos 30 FPS
- **RNF-07 — Accesibilidad:** Los controles de filtro, edición y navegación son accesibles por teclado y tienen `aria-label` descriptivos
- **RNF-08 — Degradación en móviles:** Las animaciones complejas se degradan a transiciones simples por debajo de 640 px
- **RNF-09 — Sincronización documental:** Al terminar esta spec, `MEMORY.md` y `AGENTS.md` reflejan el estado real del proyecto

---

## 6. Casos límite

| ID | Situación | Comportador esperado | RF o RNF |
|---|---|---|---|
| CE-01 | Precio mínimo mayor que precio máximo | El sistema muestra un mensaje de error o intercambia los valores automáticamente | RF-01 |
| CE-02 | Precio mínimo o máximo negativo | El sistema rechaza el valor y muestra un mensaje | RF-01 |
| CE-03 | Usuario selecciona todas las cepas y deselecciona todas | El sistema muestra todos los vinos (equivalente a no filtrar por cepa) | RF-02 |
| CE-04 | Archivo arrastrado que no es imagen (PDF, TXT) | El sistema muestra un mensaje de error y no carga el archivo | RF-08 |
| CE-05 | Imagen de más de 5 MB | El sistema muestra un mensaje de error y no carga el archivo | RF-09 |
| CE-06 | Admin edita un vino y cambia el precio a 0 | El sistema rechaza el cambio y muestra el mensaje de validación | RF-12 |
| CE-07 | Usuario navega a una sección que no existe | El sistema no hace nada (enlace roto o sin destino) | RF-16 |
| CE-08 | Usuario hace scroll rápidamente | Las animaciones no se acumulan ni causan lag | RF-21 |
| CE-09 | Catálogo vacío y se muestran botellas destacadas | La sección de destacados no se muestra | RF-24 |
| CE-10 | Admin abre el formulario de edición sin seleccionar un vino | El sistema no abre el formulario o muestra un mensaje | RF-11 |
| CE-11 | Admin carga imagen por archivo y luego cambia a URL | La URL se ignora y se mantiene la imagen por archivo | RF-25 |
| CE-12 | Admin cierra el formulario de edición con la X o clic fuera | Es lo mismo que cancelar: no se modifica el vino | RF-14 |
| CE-13 | Usuario navega a una sección que ya está en la vista | Se hace scroll igualmente (comportamiento natural del ancla) | RF-16 |
| CE-14 | Filtro por cepa con catálogo vacío | Se muestra el mensaje de estado vacío | RF-05 |
| CE-15 | Precio no numérico en el filtro | Se muestra un mensaje de error | RF-01 |

---

## 7. Trazabilidad

| Grupo | RF | Origen |
|---|---|---|
| Filtros avanzados | RF-01 a RF-05 | `carta_de_catalogo.tsx`, `AGENTS.md` §3 |
| Carga de imagen | RF-06 a RF-10, RF-25 | `editor_formador_productos.tsx`, `AGENTS.md` §4 |
| Edición de productos | RF-11 a RF-14 | `editor_formador_productos.tsx`, `AGENTS.md` §4 |
| Navegación | RF-15 a RF-17 | `barra_de_navegacion.tsx`, `AGENTS.md` §1 |
| Animaciones de scroll | RF-18 a RF-21 | `hero.tsx`, `AGENTS.md` §UI/UX |
| Botellas destacadas | RF-22 a RF-24 | `hero.tsx`, `AGENTS.md` §2 |

---

## 8. Criterios de aceptación

### 8.1 Compilación y suite de pruebas

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-01 | El chequeo de tipos pasa | `npm run build` termina con código de salida `0` |
| CA-02 | La suite de pruebas pasa | `npm test` termina con código de salida `0` y los 68 tests preexistentes siguen en verde |
| CA-03 | No se instalaron dependencias | `package.json` y `package-lock.json` no cambiaron respecto a la spec 002 |

### 8.2 Filtros avanzados

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-04 | Filtro por precio mínimo | Establecer precio mínimo en 40000: solo se muestran vinos con precio >= 40000 |
| CA-05 | Filtro por precio máximo | Establecer precio máximo en 40000: solo se muestran vinos con precio <= 40000 |
| CA-06 | Filtro por rango de precio | Establecer mínimo 30000 y máximo 50000: solo se muestran vinos en ese rango |
| CA-07 | Filtro por cepa | Seleccionar "Malbec": solo se muestran vinos con varietal Malbec |
| CA-08 | Filtro combinado | Categoría "Tinto" + cepa "Malbec" + precio máximo 50000: solo vinos que cumplen las tres condiciones |
| CA-09 | Limpiar filtros de precio | Pulsar "Limpiar" en el filtro de precio: el filtro se restablece y los demás filtros se mantienen |
| CA-10 | Estado vacío con filtros | Combinar filtros que no dejan ningún vino: se muestra el mensaje de estado vacío |
| CA-30 | Precio no numérico | Ingresar "abc" en el filtro de precio: se muestra un mensaje de error |

### 8.3 Carga de imagen por archivo (solo admin)

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-11 | Arrastrar y soltar imagen | Arrastrar un archivo PNG a la zona de carga: se muestra la vista previa |
| CA-12 | Seleccionar archivo | Pulsar "Seleccionar archivo" y elegir un JPG: se muestra la vista previa |
| CA-13 | Archivo no válido | Arrastrar un archivo PDF: se muestra un mensaje de error |
| CA-14 | Imagen demasiado grande | Arrastrar una imagen de 6 MB: se muestra un mensaje de error |
| CA-15 | Guardar vino con imagen por archivo | Cargar un vino con imagen por archivo: el vino se guarda con la imagen como Data URL |
| CA-31 | Imagen por archivo → cambiar a URL | Cargar imagen por archivo y luego escribir una URL: la URL se ignora |

### 8.4 Edición de productos (solo admin)

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-16 | Abrir formulario de edición | Pulsar "Editar" sobre un vino: el formulario se abre con los datos cargados y el título "Editar Vino" |
| CA-17 | Guardar cambios de edición | Modificar el precio de un vino y guardar: el vino se actualiza en el catálogo con el mismo id |
| CA-18 | Cancelar edición | Abrir el formulario de edición y pulsar "Cancelar": el vino no se modifica y el formulario se cierra |
| CA-19 | Validación en edición | Editar un vino y poner precio 0: el sistema rechaza el cambio y muestra el mensaje de validación |
| CA-32 | Cerrar edición con X o clic fuera | Abrir el formulario de edición y pulsar la X o hacer clic fuera: el vino no se modifica |

### 8.5 Navegación entre secciones

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-20 | Enlaces visibles en la barra | A 1280 px se ven los enlaces: Inicio, Catálogo, Contacto |
| CA-21 | Navegación suave | Pulsar "Catálogo": la vista se desplaza suavemente hasta la sección de catálogo |
| CA-22 | Encabezado no tapado | Tras navegar a una sección, el encabezado no queda tapado por la barra fija |
| CA-33 | Enlaces en móvil | A 375 px: los enlaces están en un panel lateral accesible |

### 8.6 Animaciones de scroll

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-23 | Scroll reveal en secciones | Hacer scroll: las secciones se revelan con animación suave al entrar en el viewport |
| CA-24 | Parallax en el hero | Hacer scroll en el hero: las capas se mueven a velocidades distintas |
| CA-25 | Degradación en móvil | A 375 px: las animaciones se degradan a transiciones simples |
| CA-26 | Rendimiento | Las animaciones mantienen al menos 30 FPS y no bloquean la interacción |

### 8.7 Botellas destacadas

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-27 | Sección de destacados visible | En el hero se muestra una sección con los 3 vinos más caros |
| CA-28 | Clic en botella destacada | Pulsar una botella destacada: se abre la vista rápida de ese vino |
| CA-29 | Sin destacados no hay sección | Con catálogo vacío: la sección de destacados no se muestra |

---

## 9. Decisiones

| ID | Decisión | Quién | Fecha | Justificación |
|---|---|---|---|---|
| D-01 | **El filtro por precio usa inputs numéricos** (mínimo y máximo) | Planner | 2026-10-08 | Es el patrón más común y accesible. Un slider sería más visual pero más complejo de implementar y menos preciso |
| D-02 | **El filtro por cepa usa chips multi-select** | Planner | 2026-10-08 | Permite seleccionar múltiples cepas simultáneamente, que es el caso de uso natural |
| D-03 | **La imagen por archivo se guarda como Data URL** | Planner | 2026-10-08 | No hay backend, así que la imagen debe persistir en `localStorage`. Data URL es la única forma sin servidor |
| D-04 | **El tamaño máximo de imagen es 5 MB estricto** | Usuario | 2026-10-08 | `localStorage` tiene un límite de ~5 MB por origen. Una imagen de más de 5 MB podría exceder la cuota. El usuario decidió que sea un límite estricto |
| D-05 | **La edición de productos reutiliza el formulario de carga** | Planner | 2026-10-08 | Un solo formulario con dos modos (crear/editar) es más simple que dos formularios separados |
| D-06 | **Las animaciones de scroll usan Framer Motion** | Planner | 2026-10-08 | Ya es la librería de animaciones del proyecto. `useInView` y `useScroll` de Framer Motion resuelven el scroll reveal y el parallax sin dependencias nuevas |
| D-07 | **El componente `AnimatedSection` envuelve las secciones** | Planner | 2026-10-08 | Es el patrón estándar para scroll reveal: un wrapper que anima a sus hijos cuando entran en el viewport |
| D-08 | **Las botellas destacadas son los 3 vinos más caros del catálogo** | Usuario | 2026-10-08 | El usuario eligió esta opción. No hay un sistema de "destacados" en los datos, así que usar los 3 más caros es simple y predecible |
| D-09 | **Los enlaces de navegación usan anclas con scroll suave** | Planner | 2026-10-08 | `scroll-behavior: smooth` ya está en `src/index.css` (spec 002). Los anclas son accesibles y funcionan con el botón atrás del navegador |
| D-10 | **Las animaciones se degradan a transiciones simples por debajo de 640 px** | Usuario | 2026-10-08 | El usuario eligió esta opción. Las transiciones simples mantienen la retroalimentación visual sin el costo del parallax |
| D-11 | **El botón "Editar" solo es visible para el admin** | Usuario | 2026-10-08 | El usuario decidió que solo el admin pueda editar. El botón aparece en el panel de administración, no en cada tarjeta |
| D-12 | **Los enlaces de navegación en móvil se muestran en un panel lateral** | Usuario | 2026-10-08 | El usuario eligió esta opción. Un panel lateral es más simple que un menú hamburguesa y más accessible que una fila debajo del buscador |
| D-13 | **`prefers-reduced-motion` no desactiva las animaciones** | Usuario | 2026-10-08 | El usuario decidió que las animaciones se mantengan igual. Las animaciones de Framer Motion ya son ligeras y no causan problemas de accesibilidad |
| D-14 | **La URL de imagen se ignora si ya se cargó una imagen por archivo** | Usuario | 2026-10-08 | El usuario decidió que la imagen por archivo tenga prioridad sobre la URL |
| D-15 | **Cerrar el formulario de edición con la X o clic fuera es lo mismo que cancelar** | Usuario | 2026-10-08 | El usuario decidió que cualquier forma de cerrar el formulario de edición sin guardar es un cancelamiento |
| D-16 | **El precio no numérico en el filtro muestra un mensaje de error** | Usuario | 2026-10-08 | El usuario decidió que se muestre un mensaje de error en vez de ignorar el valor o convertirlo a 0 |

---

## 10. Dudas abiertas

**No hay dudas abiertas.** Todas las decisiones fueron tomadas por el usuario y están registradas en la sección 9.
