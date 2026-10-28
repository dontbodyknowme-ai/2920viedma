# Spec 002 — Que la aplicación compile y arranque

**Estado:** `implementada` (76/77 tareas marcadas; la restante, ver `task.md`)
**Spec:** `002`
**Aprobada por:** el usuario, de forma explícita, el **2026-10-06**
**Historial de estados:**
- 2026-10-06: `borrador`. Creada.
- 2026-10-06: `aprobada` por el usuario, de forma explícita.
- 2026-10-06: vuelve a **`borrador`** por un **cambio de requisitos pedido por el usuario**: agregar tests automatizados del orquestador (`App.tsx`). Una spec aprobada modificada sustancialmente vuelve a `borrador` (skill SDD).
- 2026-10-06: **`aprobada` de nuevo**, por el usuario y **tal cual como estaba**. La aprobación cubre el cambio de requisitos completo: **RNF-05 relajado**, **CA-11 reformulado**, **RF-41 a RF-49**, **CA-40 a CA-49** y las decisiones **D-18, D-19 y D-20**.
- `plan.md` y `task.md` fueron actualizados en la misma fecha para reflejar este cambio.
- 2026-10-07: **aclaración de alcance autorizada por el usuario** en **CA-36**: el patrón `;$` se verifica **solo en archivos `.ts` y `.tsx`**, y los **`.css` de `src/` quedan excluidos**, por el mismo motivo que los archivos de configuración de la raíz. Es una aclaración de alcance de un criterio existente: **no cambia el alcance de la spec, no agrega requisitos y no es una decisión de diseño nueva**, así que **la spec sigue `aprobada`** y **no** se registra una decisión nueva en §9. Registro en **§12.5**. `task.md` se ajustó en la misma fecha.
- 2026-10-07: **segunda aclaración de alcance autorizada por el usuario**, con el mismo criterio que la anterior, sobre lo que el repositorio realmente tiene instalado: la fila de **`npm run lint`** de §3.2 ya no afirma que `eslint` no esté instalado (hoy sí lo está y el comando funciona), y **RNF-04** y **CA-39** pasan a medir **que ninguna tarea de esta spec haya instalado ni desinstalado dependencias** —la atribución— en vez de un estado absoluto del archivo, que un repositorio **sin ningún commit** no puede sostener, con el límite explícito de que la evidencia es de **`LastWriteTime`** y no de `git diff`. El usuario **aceptó el estado actual del repositorio**: no se desinstaló nada. Como la anterior, es una aclaración de alcance y de registro: **no cambia el alcance de la spec, no agrega requisitos y no es una decisión de diseño nueva**, así que **la spec sigue `aprobada`** y **no** se registra una decisión nueva en §9. Registro en **§12.7**.

**Lo que la aprobación NO incluye.** El usuario **descartó** una variante que se le habían planteado: extraer la lógica del orquestador a un **reductor puro** para poder testearla sin montar React. **No se hace.** `App.tsx` conserva su lógica de estado en el componente, y los tests lo montan con `createRoot` y lo ejercitan por el DOM. La consecuencia de haber descartado esa variante es que los tests dependen de que la vista rápida y el pie de página ya existan, y por eso van **al final**, en una tarea propia, según **D-18**.

**Gobernada por:** `docs/CONSTITUCION.md`
**Spec previa:** `spec/001/` (los archivos `spec.md`, `plan.md` y `task.md` existen pero están vacíos)

> **Naturaleza de este documento.**
> Esta spec define **QUÉ** debe ser cierto y **POR QUÉ**. Las menciones a archivos concretos aparecen solo en cuatro lugares acotados: el diagnóstico del estado actual (sección 2, hechos verificados), las restricciones que el propio repositorio ya impone (secciones 9 y 13), las decisiones de alcance y los comandos de verificación (sección 8). La correspondencia entre esos hechos y archivos, funciones o configuración concreta corresponde a `plan.md`.

---

## 1. Objetivo

Hoy la aplicación del proyecto **no se puede compilar ni arrancar**. Esta spec tiene dos objetivos:

1. **Que compile y arranque.** El chequeo de tipos pasa sin errores, el empaquetado de producción genera un artefacto real, el servidor de desarrollo sirve una aplicación que se monta y muestra contenido.
2. **Que sea usable de punta a punta.** El catálogo, los filtros, la búsqueda, el carrito, la carga de productos y la vista rápida de producto funcionan de punta a punta sin recargar la página.

El segundo objetivo excede lo estrictamente necesario para compilar, y es una decisión de alcance explícita: ver **D-2** en la sección 9. Todo lo que no sirva para ninguno de los dos objetivos queda fuera de alcance, enumerado en la sección 3.2.

### 1.1 Definiciones

Se usan estas palabras con este significado exacto en toda la spec, para que dos observadores apliquen el mismo criterio:

- **Arranca**: al abrir la aplicación en el navegador, el punto de montaje deja de estar vacío y hay contenido visible, sin error no controlado en la consola.
- **Escenario normal**: el navegador tiene conexión a internet y WebGL disponible. Es el supuesto de la mayoría de los criterios de aceptación salvo que digan lo contrario.
- **Usable en móvil**: a 375 px de ancho, se puede llegar a **cada** función de la página solo con lo que hay visible en pantalla: navegar el catálogo, filtrar por categoría, **escribir en un campo de búsqueda**, agregar un producto al carrito, abrir el carrito, cambiar cantidades, eliminar, cerrar el carrito, finalizar el pedido, y abrir y cerrar la vista rápida. Ninguna de esas acciones exige escribir en una pantalla más ancha, y ninguna produce scroll horizontal.
- **Ancho de escritorio**: 768 px o más.
- **Franja de tablet**: entre 640 px y 767 px, inclusive.
- **Host de loopback**: `localhost` o `127.0.0.1`, que **sí** son contexto seguro.
- **Host ajeno al de loopback**: cualquier otro host, por ejemplo la IP local de la máquina. **No** es contexto seguro, así que el navegador no expone el generador de identificadores aleatorios.
- **Rango válido de cosecha**: un número **entero** comprendido entre **1850** y **el año en curso más uno**, ambos inclusive. Con el año en curso 2026, el rango va de 1850 a 2027 inclusive. Estos números vienen de `test/validadores.ts:33` y `:35`, y su prueba está en `test/validadores.test.ts:116-126`.
- **Legible**: el `font-size` computado del elemento es de **16 px o más**, y su relación de contraste contra el color de fondo computado es de **4.5:1 o más**. Ambos valores se comprueban en las herramientas de desarrollo del navegador.
- **Código de aplicación**: los archivos **`.ts` y `.tsx`** bajo `src/` que se incluyen en el bundle de la aplicación. **No** son código de aplicación los archivos de configuración de la raíz del proyecto (`tailwind.config.js`, `postcss.config.js`, `vite.config.ts`, `vitest.config.ts`), que pueden seguir siendo `.js` o `.ts`; **tampoco los archivos `.css` de `src/`** (§12.5), porque la convención de "sin punto y coma al final de las sentencias" describe JavaScript y TypeScript, y en CSS esas líneas no tienen sintaxis alternativa; y tampoco los archivos bajo `test/`.

---

## 2. Contexto y diagnóstico verificado

Estado real del repositorio al momento de redactar esta spec, verificado leyendo cada archivo.

### 2.1 Identidad del proyecto

| Dato | Valor verificado |
|---|---|
| Nombre del paquete | `cava-and-co` |
| Gestor de paquetes | **npm** (existe `package-lock.json`; no hay `pnpm-lock.yaml`) |
| Tipo de módulo del paquete | `"type": "module"` |
| Scripts | `dev` = `vite`, `build` = `tsc && vite build`, `test` = `vitest run`, `lint` = `eslint . --max-warnings 0` |
| Stack declarado en `package.json` | React 18.2, Vite 5.4, TypeScript 5.2, Tailwind 3.4, Framer Motion 11, three 0.162, `@react-three/fiber` 8, `@react-three/drei` 9, `lucide-react` |
| Stack instalado en `node_modules` | Vite 5.4.21, TypeScript **5.9.3**, `@vitejs/plugin-react` 4.7.0, Tailwind 3.4.19, `@types/react` 18.3.31, `@types/three` 0.162.0, `@react-three/fiber` **8.18.0**, `@react-three/drei` **9.122.0**, `three-stdlib` 2.36.1 |
| Estado de git | Rama `main`, `HEAD` sin ningún commit todavía. **Nada está versionado**: en particular `specs/`, `test/` y `vitest.config.ts` están sin trackear |
| Línea base de estilo | Los `.ts` y `.tsx` de `src/` tienen **0** apariciones de `any` y **0** puntos y comas. `test/` tiene 0 apariciones de `any` y 5 puntos y comas |

> La diferencia entre la versión declarada (`typescript ^5.2.2`) y la instalada (5.9.3) importa: es la que realmente va a verificar el código.

> **Corrección fechada el 2026-10-07, sobre la fila de `Scripts` y sobre las dependencias.** Esta tabla describe **scripts**, y por sí sola no dice si la herramienta que un script invoca está instalada. Al redactarse la spec, el script `lint` **ya existía** pero **`eslint` no estaba instalado**, que es lo que §3.2 afirmaba. Según el registro de `MEMORY.md` del 2026-10-06, la instalación del linter también **reescribió ese script**: se le quitaron los flags `--ext ts,tsx` y `--report-unused-disable-directives`, que son obsoletos bajo flat config. Hoy, a la fecha de esta corrección, `eslint` **sí** está instalado y `npm run lint` **funciona**. Ese cambio es **anterior a T1** y lo hizo alguien fuera de esta spec: no hay ninguna tarea de la 002 detrás. Lo mismo con `test`: el script existía, y `vitest` y `jsdom` **ya estaban instalados** antes de que empezara T1. **Ninguna tarea de esta spec instaló nada.** El detalle de los seis paquetes y el límite de esa evidencia están en **§12.7**.

### 2.2 Lo que está roto

**Archivos de entrada**

| Archivo | Estado verificado |
|---|---|
| `index.html` | Una sola línea de texto plano: `CAVA & CO. - Seleccion Exclusiva de Vinos`. No es HTML: sin `<html>`, sin `<head>`, sin `<div id="root">`, sin `<script>`. |
| `src/main.jsx` | La llamada `render()` está truncada: `ReactDOM.createRoot(…).render(` seguido de argumentos vacíos y una coma colgante. Error de parseo (`Unexpected ","`). |
| `src/App.jsx` | Truncado en la línea 6, termina en `return (`. No exporta nada funcional. |
| `src/components/hero.tsx` | Truncado en la línea 5, termina en `return (`. No exporta nada funcional. |

**Archivos de configuración que no existen**

| Falta | Consecuencia verificada |
|---|---|
| Configuración de TypeScript (`tsconfig.json`) | El paso `tsc` de `npm run build` no tiene contra qué trabajar: imprime su texto de ayuda y el comando no llega a empaquetar. |
| Configuración de Vite (`vite.config.ts`) | No se activa el plugin de React: sin transformación JSX confiable, sin React Fast Refresh en desarrollo, sin alias. |
| Configuración de PostCSS (`postcss.config.js`) | Tailwind 3 no procesa las directivas `@tailwind`: el CSS sale sin utilidades. |
| `src/index.css` | `src/main.jsx` lo importa y el archivo no existe: el módulo falla al resolverse. |

**Importaciones rotas (9 en total)**

`../types/wine` no existe (el archivo real es `src/types/producto.ts`), y varios imports apuntan a nombres de archivo en inglés que no existen en `src/components/`:

| Ubicación | Import actual | Archivo real | Naturaleza de la diferencia |
|---|---|---|---|
| `src/components/carta_de_productos.tsx:2` | `../types/wine` | `../types/producto` | Otro nombre |
| `src/components/carta_de_catalogo.tsx:3` | `../types/wine` | `../types/producto` | Otro nombre |
| `src/components/carrito_de_compras.tsx:2` | `../types/wine` | `../types/producto` | Otro nombre |
| `src/components/editor_formador_productos.tsx:3` | `../types/wine` | `../types/producto` | Otro nombre |
| `src/components/carta_de_catalogo.tsx:4` | `./ProductCard` | `./carta_de_productos` | Otro nombre |
| `src/components/hero.tsx:2` | `./HeroCanvas3D` | `./herocanvas3d` | Otro nombre |
| `src/App.jsx:1` | `./components/Navbar` | `./components/barra_de_navegacion` | Otro nombre |
| `src/App.jsx:2` | `./components/Hero` | `./components/hero` | **Solo mayúsculas y minúsculas** |
| `src/App.jsx:3` | `./components/ProductCatalog` | `./components/carta_de_catalogo` | Otro nombre |

Una importación ya fue corregida previamente en `src/datos/productos.ts:1`.

**Nota de riesgo:** solo `./components/Hero` contra `hero.tsx` es una diferencia de mayúsculas y minúsculas. En Windows el sistema de archivos la resuelve igual, así que la app podría parecer funcionar en esta máquina y fallar en cualquier sistema sensible a mayúsculas. Las otras ocho fallan en todas las plataformas.

### 2.3 Lo que ya está bien, y qué hay que modificar igual

Verificado leyendo cada archivo completo:

- **Seis componentes completos y funcionales**: barra de navegación, carta de catálogo, carta de producto (tarjeta), carrito lateral, formulario de carga y canvas 3D del hero.
- **Tipos y datos completos**: `src/types/producto.ts` exporta cuatro símbolos: `CategoriaProducto`, `Producto`, `CartItem` y `ProductoFilterState`. `src/datos/productos.ts` trae dos productos de ejemplo.
- **Tema de Tailwind completo**: `tailwind.config.js` declara la paleta `wine`, `charcoal`, `gold` y `cream`, que es exactamente la que usan los componentes.
- **Suite de pruebas en verde**: `npm test` corre `vitest run` con `vitest.config.ts` aislado. Hay **46 tests** (26 en `test/validadores.test.ts`, de los cuales 15 son parametrizados, y 20 en `test/integridad_datos_producto.test.ts`). Ninguno depende de `index.html`, de la configuración de Vite ni de los componentes de UI.
- **Validadores de dominio ya escritos y testeados**: `test/validadores.ts` expone `esPrecioValido` (línea 44, exige `valor > 0`) y `esAnioRazonable` (línea 47, exige entero entre 1850 y el año actual más 1), ambos con suite propia que prueba que rechazan `0`, negativos, `NaN`, `Infinity` y años imposibles. Los formularios **no** los aplican todavía.
- **Dependencias instaladas**: no hace falta instalar nada nuevo. RNF-04.

**Pero tres de esos componentes se modifican en esta spec.** No están completos en el sentido de "no hay que tocarlos":

| Componente | Por qué se modifica |
|---|---|
| `carta_de_catalogo.tsx` | Su grilla usa `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, y Tailwind define `sm` en **640 px**. **RF-19** exige una columna por debajo de 640 px, así que se cambia el punto de corte. Además su `<section id='catalogo'>` no tiene desplazamiento de anclaje, y **RF-13** exige que el encabezado del catálogo no quede tapado por la barra fija al navegar hasta él. Su filtro por texto tampoco normaliza espacios, y **RF-17** lo exige. |
| `barra_de_navegacion.tsx` | Envuelve el campo de búsqueda en `hidden md:block` (línea 47). Bajo 768 px no hay ningún input de búsqueda, y la definición de "usable en móvil" (§1.1) lo exige. Además solo renderiza el contador cuando `cartCount > 0` (línea 83), y **RF-21** tiene que describir ese comportamiento real. |
| `editor_formador_productos.tsx` | No aplica `esPrecioValido` ni cotas de año (**RF-28** y **RF-29**), no genera `tastingNotes` ni `foodPairing` (**RF-35** y **RF-36**), y genera el identificador con `crypto.randomUUID()` (**RF-31**, caso **CE-10**). |
| `hero.tsx` | Es el archivo que decide si el efecto 3D se renderiza o se degrada, según el ancho de la ventana. Lo exige **RNF-09**. `herocanvas3d.tsx` no se modifica para esto. |

### 2.4 Huecos funcionales frente a lo que el proyecto ya pide

Tres listas distintas, que **no** coinciden entre sí:

| Fuente | Qué lista |
|---|---|
| `AGENTS.md` §Estructura de la Página, puntos 1 a 7 | 7 áreas de la página: navegación, hero, catálogo, carga, **vista rápida**, carrito, **pie** |
| `AGENTS.md` §Organización del Código | 5 nombres de componente: `ProductCard`, `ProductForm`, `CartDrawer`, **`AnimatedSection`**, `QuickViewModal`. Es otra lista, con nombres en inglés, y **`AnimatedSection` no existe en el repositorio** |
| `MEMORY.md` §Componentes y Estructura, líneas 16 a 23 | 8 componentes: `Navbar`, `Hero`, `ProductCatalog`, `ProductCard`, `ProductForm`, `CartDrawer`, `ProductDetailModal`, `Footer` |

Faltan dos componentes. Las dos listas que nombran componentes de la página coinciden en que faltan:

- **Vista rápida de producto** (`ProductDetailModal` en `MEMORY.md`, `QuickViewModal` en `AGENTS.md`): notas de cata, maridaje e imagen ampliada.
- **Pie de página** (`Footer`): horarios, ubicación, redes sociales y aviso legal +18.

La vista rápida tiene una consecuencia funcional inmediata: `ProductCatalog` y `ProductCard` **exigen** la prop `onSelectWine`, y `ProductCard` la invoca al hacer clic en la imagen y en el nombre. Sin una vista rápida que la consuma, el clic en una tarjeta no produce ningún efecto observable.

`AnimatedSection` no existe y esta spec **no lo crea**. Queda registrado en la sección 3.2.

### 2.5 Contradicciones detectadas en la documentación (no se resuelven acá)

Se reportan, no se corrigen. Todas quedan fuera de alcance salvo la sincronización obligatoria de la sección 3.1.

| Contradicción | Detalle |
|---|---|
| Gestor de paquetes | `docs/CONSTITUCION.md` §5, `AGENTS.md` y `MEMORY.md` dicen `pnpm`. El repositorio es npm: hay `package-lock.json` y no hay `pnpm-lock.yaml`. |
| Ruta de la constitución | `AGENTS.md` enlaza `docs/constitution.md`, pero el archivo real es `docs/CONSTITUCION.md`. En Windows funciona; en Linux el enlace queda roto. |
| Ubicación de los datos | `docs/CONSTITUCION.md` §4 dice que los datos mock van en `src/data/`. Los datos están en `src/datos/`. |
| Versión de TypeScript | `package.json` declara `^5.2.2`; lo instalado es 5.9.3. |
| Componentes listados | Las tres listas de §2.4 no coinciden entre sí y una nombra un componente inexistente. |
| Directorios vacíos | `cava-and-co/` y `herramientas/` existen y están vacíos. |
| Artefacto roto | `dist/index.html` contiene la misma línea de texto plano que el `index.html` de entrada: es el resultado de un build anterior fallido. |
| Herramientas inexistentes | Ninguna herramienta de verificación existe: `herramientas/` está vacía. No hay `buscar-caracteres-raros.js` ni `verificar-layout.js` que se puedan correr. |

---

## 3. Alcance

### 3.1 Dentro de alcance

1. Que el documento de entrada HTML sea un documento HTML real y monte la aplicación.
2. Que el proyecto tenga configuración de TypeScript, de Vite y de PostCSS que permitan compilar.
3. Que la hoja de estilos base exista y aplique el tema oscuro de la constitución.
4. Que el punto de entrada monte la aplicación.
5. Que el componente raíz orqueste el estado (catálogo, carrito, búsqueda, paneles) y persista en almacenamiento local.
6. Que la sección principal (hero) exista completa.
7. Que las 9 importaciones rotas se resuelvan.
8. Que la aplicación funcione de punta a punta: catálogo, filtros, búsqueda, carrito, carga de productos y vista rápida.
9. El pie de página y la vista rápida de producto, los dos componentes que faltan (decisión **D-2**).
10. **Migrar los dos archivos de entrada a `.tsx`** (decisión **D-1**): `src/App.jsx` y `src/main.jsx` dejan de ser JavaScript.
11. **Modificar los cuatro componentes completos que no alcanzan a cumplir los RF** (decisiones **D-10**, **D-11**, **D-12** y **D-15**): `carta_de_catalogo.tsx`, `barra_de_navegacion.tsx`, `editor_formador_productos.tsx` y `hero.tsx`. Lo que cada uno necesita está en §2.3.
12. **Sincronizar `MEMORY.md` y `AGENTS.md` al terminar.** El §Protocolo de Actualización Continua de `AGENTS.md` lo exige "sin excepción" y "de inmediato": registrar el cambio en la bitácora con fecha, marcar los componentes nuevos en la lista de verificación, y actualizar los comandos y el alcance si cambiaron. No es opcional ni queda para una tarea posterior.
13. **Agregar tests automatizados de la lógica de estado del orquestador**, sin instalar dependencias (punto 13 del cambio del 2026-10-06). Un archivo de tests nuevo bajo `test/`, que usa `react`, `react-dom` y `jsdom`, que ya están instalados. Los 46 tests preexistentes no se tocan. Detalle en §4.1b.

### 3.2 Fuera de alcance, con justificación

Nada de esta tabla es necesario para que la aplicación compile o arranque. Se incluye lo que la documentación del proyecto pide y esta spec deja explícitamente afuera, para que la promesa de §1 se cumpla.

| Fuera de alcance | Por qué |
|---|---|
| **`npm run lint`** | **No es necesario para que la aplicación compile ni arranque**, que es el criterio con el que se arma esta tabla, así que esta spec no lo exige. **Corrección del 2026-10-07:** esta fila decía antes que "el script existe pero `eslint` **no está instalado**", y eso **ya era falso**: `eslint`, `typescript-eslint`, `@eslint/js` y `@stylistic/eslint-plugin` **están instalados**, junto con `eslint.config.js`, y `npm run lint` **funciona y sale `0`**. Los cuatro se instalaron y la configuración se creó **antes de que empezara T1**, así que no los instaló ninguna tarea de esta spec. Ver §12.7. Lo que sigue siendo cierto es lo que la fila delimita: **`npm run lint` queda fuera del alcance**, porque ningún RF ni ningún CA de esta spec lo exige, y su resultado no da cumplimiento de ningún criterio. |
| **Corregir `pnpm` a `npm` en `AGENTS.md`, `MEMORY.md` y `docs/CONSTITUCION.md`** | Tarea de documentación separada. La sincronización del punto 12 de §3.1 es otra cosa: esa registra los componentes de esta spec, no reescribe los comandos del proyecto. |
| **Corregir el enlace `docs/constitution.md` a `docs/CONSTITUCION.md`** | Tarea de documentación separada. |
| **Reubicar `src/datos/` a `src/data/`** | Rompería los imports de la suite de pruebas y no aporta a que la app arranque. |
| **`.gitattributes` para CRLF/LF** | Tarea separada. |
| **`.opencode/` y `.agents/` en git** | Es una decisión del usuario sobre qué versionar. Esta spec no las toca. |
| **Cualquier commit de git** | Esta spec no versiona nada. |
| **Filtro por rango de precio y por cepa** | `AGENTS.md` §3 los pide, pero `carta_de_catalogo.tsx` solo implementa filtro por categoría y búsqueda por texto. Agregarlos es funcionalidad nueva, no es hacer que la app compile. |
| **Subida de imagen por arrastrar archivo** | `AGENTS.md` §4 lo pide; `editor_formador_productos.tsx` solo ofrece URL. Es funcionalidad nueva. |
| **Eliminar `ProductoFilterState`** | Es el cuarto tipo exportado de `src/types/producto.ts` (líneas 22 a 26) y **no lo importa ningún archivo** del proyecto: el filtro real es estado local en `carta_de_catalogo.tsx:21`. Es código muerto. No lo borra esta spec porque no aporta a que la app arranque, y borrarlo exige decidir si se reconstruye en una spec futura de filtros. |
| **`AnimatedSection`** | `AGENTS.md` §Organización del Código lo nombra junto a los componentes del proyecto, pero **no existe en el repositorio** y ningún RF lo necesita: las animaciones de revelado al hacer scroll no son necesarias para que la app compile ni para el flujo de compra. Ver la fila siguiente. |
| **Animaciones de revelado al hacer scroll y efecto parallax del hero** | `MEMORY.md` líneas 11 y 17 las pide, y `AGENTS.md` §Requerimientos de UI/UX las pide. Son adornos visuales sobre una página que ya debe ser usable. Requieren el componente `AnimatedSection` que no existe. |
| **Exhibición de botellas destacadas en el hero** | `MEMORY.md:17` la pide. La botella 3D que ya renderiza `herocanvas3d.tsx` cubre el requisito visual de **RF-12**. |
| **Enlaces de navegación en la barra** | `AGENTS.md` §1 los pide ("Logo de la marca, enlaces de navegación, barra de búsqueda e icono de carrito"). `barra_de_navegacion.tsx` **no tiene ninguno**: el único enlace es `<a href='#'>CAVA & CO.</a>` (línea 41). **RF-11** no los exige y no hay ningún requisito que los pida, así que agregar navegación entre secciones es funcionalidad nueva. |
| **Editar productos existentes** | `MEMORY.md:20` describe `ProductForm` como "Modal/Formulario de carga/**edicion** de productos". Esta spec cubre **solo la carga** (**RF-28** a **RF-31**): el formulario actual (`editor_formador_productos.tsx`) no recibe un producto existente ni tiene forma de editarlo, solo de crear. Agregar edición exige decidir si se guarda sobre el mismo registro y cómo se identifica, y no es necesario para que la app compile. |
| **Preparar la interfaz para conectar una API o base de datos en el futuro** | `docs/CONSTITUCION.md` §4 lo pide ("sin reestructurar el componente UI"). Hoy todo el estado vive en el componente raíz, y separarlo en una capa de datos es una tarea de arquitectura posterior, no de arranque. |
| **Cobro real, pasarela de pago, autenticación y backend** | La constitución §4 los deja para el futuro. El cierre de compra de **RF-27** es local. |

---

## 4. Requisitos funcionales

### 4.1 Que la aplicación compile y arranque

- **RF-01** — EL SISTEMA expone, al servirse o empaquetarse, un documento HTML real que declara el idioma español, el título de la marca, un punto de montaje con identificador `root` y la referencia al módulo de entrada de la aplicación.
- **RF-02** — EL SISTEMA hace que un error de tipo en cualquiera de los archivos de código del proyecto haga fallar `npm run build` con código de salida distinto de `0`, sin llegar a generar el artefacto.
- **RF-03** — CUANDO se ejecuta `npm run build` con el proyecto completo, EL SISTEMA termina con código de salida `0`.
- **RF-04** — CUANDO `npm run build` termina correctamente, EL SISTEMA deja en `dist/` un `index.html` con contenido HTML real que referencia al menos un bundle JavaScript, y el peso total de `dist/` es **igual o superior a 1 kB**.
- **RF-05** — CUANDO se ejecuta `npm run dev`, EL SISTEMA inicia un servidor local e informa una URL local que responde con el documento HTML de la aplicación. La URL informada **es accesible desde otros hosts de la red local**, además de desde el loopback, para que el comportamiento con identificadores aleatorios (**CE-10**) se pueda observar. Si el firewall bloquea ese acceso, es una condición del entorno y no un incumplimiento de la aplicación.
- **RF-06** — CUANDO el navegador termina de cargar la aplicación en el escenario normal, EL SISTEMA monta la interfaz dentro del punto de montaje, sin pantalla en blanco y **sin ningún error de nivel `error` en la consola**. Los avisos (`warning`) se admiten, y el criterio de comparación es que la lista de avisos no crezca respecto de la línea base.
- **RF-07** — EL SISTEMA resuelve todas las importaciones entre módulos del proyecto: ninguna apunta a un archivo inexistente, y ninguna depende de que el sistema de archivos distinga mayúsculas de minúsculas.
- **RF-08** — CUANDO la interfaz se monta, EL SISTEMA aplica el tema oscuro de la constitución: fondo negro carbón `#121212` y disponibilidad de las familias de color `wine`, `charcoal`, `gold` y `cream`.
- **RF-09** — EL SISTEMA renderiza los títulos y encabezados con una familia tipográfica serif y el cuerpo del texto con una familia sans-serif, sin depender de recursos de red externos para ello.
- **RF-10** — EL SISTEMA incluye en la verificación de tipos **todos** los archivos TypeScript del proyecto: el código de la aplicación, los archivos de configuración y la carpeta de pruebas. Ningún archivo del proyecto queda fuera del chequeo por configuración.

### 4.1b Cobertura automatizada de la lógica de estado del orquestador

> **Por qué existe esta sección.** Es el cambio del 2026-10-06. El `plan.md` había dejado los ~30 RF de UI sin cobertura automatizada, porque no hay `@testing-library/*` instalado y RNF-04 impide instalarlo. Al verificar el árbol de dependencias se confirmó que **eso no impedía testear la lógica de estado**: `jsdom` ya está instalado, `react@18.3.1` exporta `act`, y tanto `react` como `react-dom` son dependencias existentes. **RNF-04 no se toca** y su contenido sigue siendo cierto. **Actualizado el 2026-10-07:** RNF-04 sí cambió después, pero **solo su forma de verificarse**, no su regla: sigue prohibiendo que una tarea de esta spec instale o desinstale dependencias, y por eso lo que se afirma acá —que `jsdom` y `react` ya estaban— sigue siendo exactamente lo que exige. Ver **§12.7**.
>
> **Alcance: solo la lógica de estado de `App.tsx`.** No se testea la presentación. La razón de la línea divisoria es que la lógica de estado es donde una regresión pasa inadvertida: si `actualizarCantidad` deja una línea en 0, nada en el navegador lo delata hasta que el total sale mal. La presentación ya tiene 39 criterios de aceptación con observación concreta (§8.2 a §8.7), y son esos los que la cubren.
>
> **Restricciones técnicas verificadas el 2026-10-06**, que condicionan cómo se escriben estos tests y quedan como parte del requisito:
>
> - `act` se importa de **`react`**, nunca de `react-dom/test-utils`: este último está deprecado y emite un error en consola al importarse.
> - Hay que fijar `globalThis.IS_REACT_ACT_ENVIRONMENT = true` antes de usar `act`, o React emite el aviso "The current testing environment is not configured to support `act(...)`".
> - El montaje usa `createRoot` de `react-dom/client` sobre un `<div>` creado dentro del propio test, y se desmonta al terminar cada test para no dejar raíces activas.
> - **No hay `@testing-library/*`**, así que las consultas al DOM son con `document.querySelector` y `querySelectorAll`, y los eventos se disparan con `.click()` sobre nodos reales.

- **RF-41** — EL SISTEMA verifica con tests automatizados que **agregar al carrito** un producto ya presente incrementa su cantidad en la misma línea, en lugar de crear una línea duplicada.
- **RF-42** — EL SISTEMA verifica con tests automatizados que **incrementar** la cantidad de una línea actualiza la cantidad y el total, y que el total es la suma de precio por cantidad de todas las líneas.
- **RF-43** — EL SISTEMA verifica con tests automatizados que **decrementar** la cantidad de una línea que está en 1 **elimina esa línea**, y que nunca queda una línea con cantidad 0 o negativa.
- **RF-44** — EL SISTEMA verifica con tests automatizados que **eliminar** una línea la quita del carrito y recalcula el total.
- **RF-45** — EL SISTEMA verifica con tests automatizados que **finalizar pedido** con al menos una línea vacía el carrito y **no recarga la página**, y que finalizar con el carrito vacío no altera el estado.
- **RF-46** — EL SISTEMA verifica con tests automatizados que el catálogo y el carrito se **guardan bajo las claves `vinoteca_wines` y `vinoteca_cart`**, y que al montar de nuevo con esos datos el estado se restaura.
- **RF-47** — EL SISTEMA verifica con tests automatizados que, si lo guardado en esas claves **no se puede interpretar**, al montar de nuevo la aplicación arranca con el catálogo inicial y el carrito vacío, sin lanzar un error.
- **RF-48** — EL SISTEMA verifica con tests automatizados que el **filtro por categoría y el texto de búsqueda sobreviven** a la apertura y al cierre de la vista rápida de producto.
- **RF-49** — EL SISTEMA verifica con tests automatizados que el **contador de unidades** junto al ícono de carrito refleja la suma de cantidades, y que **desaparece** cuando el carrito queda vacío.

### 4.2 Navegación, sección principal y pie

- **RF-11** — CUANDO la aplicación se monta, EL SISTEMA muestra una barra de navegación fija con el nombre de la marca, un campo de búsqueda, un acceso para cargar un producto y el ícono del carrito con su contador.
- **RF-12** — CUANDO la aplicación se monta, EL SISTEMA muestra una sección principal **antes** del catálogo, cuyo título y cuyo botón **"Explorar Cava"** están, en **cualquier** ancho de ventana, visibles sin necesidad de hacer scroll. CUANDO el ancho de la ventana es de **640 px o más** y WebGL está disponible, EL SISTEMA muestra además la botella en 3D. CUANDO el ancho es menor de 640 px o no hay WebGL, la botella en 3D se degrada o se omite según **RNF-09**, y el título y el botón siguen estando visibles y legibles.
- **RF-13** — CUANDO el usuario activa la acción **"Explorar Cava"**, EL SISTEMA desplaza la vista hasta la sección de catálogo de modo que el encabezado del catálogo quede **visible por completo y no tapado** por la barra de navegación fija.
- **RF-14** — CUANDO la aplicación se monta, EL SISTEMA muestra al final de la página un pie con horarios de atención, ubicación, enlaces a redes sociales y el aviso legal de restricción de edad (+18).

### 4.3 Catálogo

- **RF-15** — CUANDO la aplicación se monta sin datos guardados previamente, EL SISTEMA muestra en el catálogo los productos del conjunto de datos inicial del proyecto.
- **RF-16** — CUANDO el usuario selecciona una categoría de producto, EL SISTEMA muestra únicamente los productos de esa categoría. CUANDO selecciona **"Todos"**, EL SISTEMA restablece el conjunto completo.
- **RF-17** — CUANDO el usuario escribe texto en el campo de búsqueda, EL SISTEMA filtra el catálogo por coincidencias en nombre, bodega o varietal, sin distinguir mayúsculas de minúsculas ni espacios al inicio o al final del texto buscado.
- **RF-18** — CUANDO el filtro o la búsqueda no dejan ningún producto, EL SISTEMA muestra un mensaje indicando que no se encontraron etiquetas, en lugar de una grilla vacía.
- **RF-19** — CUANDO el ancho de la ventana es **inferior a 640 px**, EL SISTEMA muestra el catálogo en una sola columna. CUANDO es **igual o superior a 640 px**, EL SISTEMA muestra el catálogo en dos o más columnas.

### 4.4 Carrito

- **RF-20** — CUANDO el usuario activa **"Agregar"** en una tarjeta, EL SISTEMA agrega ese producto al carrito. SI el producto ya estaba en el carrito, EL SISTEMA incrementa su cantidad en lugar de duplicar la línea.
- **RF-21** — MIENTRAS el carrito tenga al menos una unidad, EL SISTEMA muestra junto al ícono de carrito la cantidad total de unidades. CUANDO el carrito queda vacío, EL SISTEMA **oculta** ese indicador por completo: no muestra un `0`.
- **RF-22** — CUANDO el usuario activa el ícono del carrito, EL SISTEMA muestra un panel lateral con la lista de productos agregados, la cantidad de cada uno, el total estimado y la acción de finalizar pedido.
- **RF-23** — CUANDO el usuario incrementa o decrementa la cantidad de un producto, EL SISTEMA actualiza la cantidad y el total. MIENTRAS exista una línea en el carrito, EL SISTEMA mantiene su cantidad en 1 o más. SI la cantidad es 1 y el usuario decrementa, EL SISTEMA elimina la línea.
- **RF-24** — CUANDO el usuario activa **"Eliminar"** sobre una línea, EL SISTEMA quita esa línea del carrito y recalcula el total.
- **RF-25** — CUANDO el usuario activa el botón de cierre o el fondo oscurecido del panel, EL SISTEMA cierra el carrito.
- **RF-26** — CUANDO el carrito está vacío, EL SISTEMA lo indica con un mensaje y no muestra el bloque de total ni la acción de finalizar pedido.
- **RF-27** — CUANDO el usuario activa **"Finalizar Pedido"** y hay al menos una línea en el carrito, EL SISTEMA muestra un mensaje de pedido confirmado y vacía el carrito, sin recargar la página. SI el carrito no tiene ninguna línea, ENTONCES EL SISTEMA no permite finalizar un pedido.

### 4.5 Carga de productos

- **RF-28** — CUANDO el usuario completa y envía el formulario de carga con nombre, bodega, un precio **mayor que cero** y una cosecha **dentro del rango válido** (§1.1), EL SISTEMA asigna al producto un identificador **único**, lo agrega al catálogo, persiste el cambio y cierra el formulario.
- **RF-29** — SI al enviar el formulario falta el nombre, la bodega, o el precio no es un número mayor que cero, o la cosecha no es un número entero dentro del rango válido (§1.1), ENTONCES EL SISTEMA no agrega ningún producto al catálogo y **explica cuál de esas condiciones no se cumple**. La categoría no figura entre estas condiciones porque el selector es un `<select>` con valor inicial `'Tinto'` y el usuario no puede dejarlo vacío: ese estado es inalcanzable.
- **RF-30** — CUANDO el usuario carga un producto, EL SISTEMA lo muestra en el catálogo sin necesidad de recargar la página.
- **RF-31** — CUANDO el entorno no permite generar un identificador aleatorio por medios del navegador, EL SISTEMA genera el identificador del producto nuevo **por otro medio y de forma única**, de modo que el guardado del formulario nunca se interrumpe ni produce dos productos con el mismo identificador.

### 4.6 Persistencia

- **RF-32** — CUANDO el usuario carga o modifica el catálogo, EL SISTEMA lo guarda en el almacenamiento local del navegador bajo la clave `vinoteca_wines`, y al recargar la página lo restaura.
- **RF-33** — CUANDO el usuario modifica el carrito, EL SISTEMA lo guarda en el almacenamiento local del navegador bajo la clave `vinoteca_cart`, y al recargar la página lo restaura.
- **RF-34** — SI no hay datos guardados, o los datos guardados están corruptos o no se pueden interpretar, ENTONCES EL SISTEMA arranca con el catálogo inicial y el carrito vacío, sin mostrar un error al usuario.

### 4.7 Vista rápida de producto

- **RF-35** — CUANDO el usuario hace clic en la imagen o en el nombre de una tarjeta, EL SISTEMA abre una vista ampliada del producto que muestra su imagen a mayor tamaño, y **el bloque de notas de cata solo si el producto las tiene**, y **el bloque de maridaje sugerido solo si el producto lo tiene**.
- **RF-36** — CUANDO el producto abierto en la vista ampliada no tiene notas de cata ni maridaje, EL SISTEMA muestra la imagen y los datos básicos del producto, y **no muestra ninguno de esos dos bloques**, en lugar de mostrarlos vacíos.
- **RF-37** — EL SISTEMA ofrece en la vista ampliada un control de cierre identificable, además del fondo oscurecido, que permite cerrarla. CUANDO el usuario activa cualquiera de los dos, EL SISTEMA la oculta y el catálogo conserva el filtro por categoría y el texto de búsqueda que tenía antes de abrirla.

### 4.8 Regresión

- **RF-38** — CUANDO se ejecuta `npm test`, EL SISTEMA ejecuta la suite completa **sin perder ninguno de los 46 tests preexistentes** y sin fallos. La suite puede tener tests adicionales; lo que no puede es perder los que ya existían.
- **RF-39** — EL SISTEMA escribe el código nuevo y el código modificado en esta spec en **TypeScript estricto**, respetando las convenciones del proyecto: comillas simples, sin punto y coma al final de las sentencias y sin `any`. Además, **ningún archivo de código de aplicación** (§1.1) queda como `.jsx` ni como `.js`: los dos archivos de entrada y los componentes quedan como `.tsx`. Los archivos de configuración de la raíz **no** están sujetos a esto, y los `.css` de `src/` tampoco están sujetos a la convención de estilo, por el motivo de §12.5.

### 4.9 Usabilidad en móvil

- **RF-40** — CUANDO la ventana mide 375 px de ancho, EL SISTEMA permite ejecutar, solo con lo visible en pantalla, **todas** las acciones listadas en la definición de "usable en móvil" de §1.1, y ninguna de ellas produce scroll horizontal.

---

## 5. Requisitos no funcionales

- **RNF-01 — Tipado estricto y sin `any`.** Todo el código TypeScript del proyecto se verifica en modo estricto, sin `any` explícito ni implícito.
  *Línea base declarada:* `\bany\b` aparece **0** veces en `src/` y **0** veces en `test/` hoy.
  *Verificable:* el chequeo de tipos no reporta errores; y la búsqueda del patrón `\bany\b` sobre `src/`, `test/` y los archivos de configuración sigue devolviendo 0 coincidencias. El patrón se busca como palabra completa, porque `<any>` no es sintaxis válida de TypeScript y no puede aparecer.

- **RNF-02 — Estilo.** Comillas simples, sin punto y coma al final de las sentencias, preferencia por patrones funcionales (constitución §2.2 y `AGENTS.md` §Estilo de código).
  *Línea base declarada:* los `.ts` y `.tsx` de `src/` tienen **0** puntos y comas. Los **5** puntos y comas que existen en el proyecto están todos en `test/*.test.ts`: 3 como prefijo de línea (`;[`), 1 dentro de un literal de tipo (`Array<{ campo: keyof Producto; valor: unknown }>`) y 1 dentro de un literal `data:` URI. Ese código de pruebas preexistente **no se modifica** en esta spec. La línea base es de antes de esta spec: `src/index.css`, que esta spec crea, **no** estaba en el repositorio y por eso no está contemplada.
  *Verificable:* en los archivos creados o modificados **que sean `.ts` o `.tsx`**, la búsqueda del patrón `;$` no devuelve ninguna coincidencia, y no aparecen comillas dobles usadas como delimitadores de string. **Los `.css` de `src/` quedan excluidos** de la comprobación del patrón `;$`, por el mismo motivo que los archivos de configuración de la raíz (§12.5).

- **RNF-03 — Paleta obligatoria.** Se usan los colores de `tailwind.config.js` y ningún otro: fondo carbón, borgoña, dorado y crema, según `docs/CONSTITUCION.md` §3.
  *Verificable:* la búsqueda de colores hexadecimales en los archivos creados o modificados devuelve únicamente los valores de la paleta del tema. Este RNF **no** exige animaciones en ningún componente: las obligaciones de animación están en RF y RNF propios.

- **RNF-04 — Gestor de paquetes.** El proyecto se gestiona con **npm**. No se agrega `pnpm-lock.yaml` ni `yarn.lock`. **Ninguna tarea de esta spec instala dependencias nuevas ni quita dependencias existentes.** Lo que la regla prohíbe es una **acción de las tareas de esta spec**, no un estado absoluto del archivo: nadie corrió `npm install` ni `npm uninstall` dentro del alcance de la 002, y lo que hace falta ya estaba.
  *Verificable:*
  - (a) El conjunto de `dependencies` y `devDependencies` de `package.json` es **el mismo que había cuando arrancó T1**, y ninguna tarea de T1 a T11 declara en `task.md` haber instalado o desinstalado un paquete.
  - (b) La evidencia que acompaña a (a) es **de `LastWriteTime`, no de `git diff`**, porque el repositorio **no tiene ningún commit**: `HEAD` está vacío y lo único que hay es un índice de staging que es una foto anterior a todo el proyecto, así que `git diff package.json package-lock.json` devuelve un diff de 2.622 líneas en el lockfile que **no** es el cambio de esta spec. Ver **§12.7**.
  - **Límite explícito de esa evidencia:** las fechas acotan **cuándo** se escribieron los archivos, no **qué** cambió. En este repositorio **la línea base de dependencias de la spec no es demostrable**, y por eso RNF-04 **no declara un número de dependencias** como línea base ni exige "las mismas dependencias que antes de la spec": el repositorio cambió **entre que la spec se redactó y que arrancó T1**. Por eso la formulación verificable es la de (a), y no una comparación contra una foto anterior.
  - *Consecuencia asumida:* si en el futuro alguien agrega un commit, la verificación por `git diff` vuelve a estar disponible y es **más fuerte** que la de `mtime`. Este RNF no se relaja con esa mejora: sigue exigiendo que ninguna tarea de la spec instale nada.

- **RNF-05 — Aislamiento de la suite y protección de los tests preexistentes.** La configuración de pruebas existente se mantiene aislada de la configuración de la aplicación, de modo que agregar la configuración de la aplicación no altere **qué archivos se recolectan como tests**. Y la suite **puede crecer**: agregar tests nuevos es parte del alcance de esta spec.
  *Lo que es invariante:*
  - Los **46 tests preexistentes** siguen existiendo, siguen pasando y **no se modifican**. Son los de `test/validadores.test.ts` (26 casos, 15 parametrizados) y `test/integridad_datos_producto.test.ts` (20 casos).
  - Un archivo de test preexistente que **desaparece**, o cuya cantidad de casos **baja**, es incumplimiento de este requisito.
  - Ningún test preexistente se marca como omitido, condicional o esperado-fallido para que la suite pase.
  *Lo que dejó de estar congelado:* el **número de archivos** de test y el **total** de tests. Ya no son valores fijos, porque RF-41 a RF-49 agregan tests del orquestador.
  *Línea base verificada:* el 2026-10-06 el reviewer corrió `npm test` y obtuvo 2 archivos, 46 passed, salida 0. Es el **punto de partida**, no el techo.
  *Verificable:* `npm test` termina con salida 0, los 46 tests preexistentes aparecen en verde y los tests nuevos también. Que los preexistentes no se hayan tocado se comprueba leyendo `test/validadores.test.ts` y `test/integridad_datos_producto.test.ts`: su contenido es idéntico salvo la **ruta** del import de validadores, cuando `test/validadores.ts` se reubica en `src/utils/`.

- **RNF-06 — Dependencias de red en tiempo de ejecución.** La aplicación hace peticiones de red externa por **al menos** estos tres motivos: las **imágenes** de los productos del catálogo, que se sirven desde `images.unsplash.com` (`src/datos/productos.ts:15` y `:28`); la **imagen por defecto** de los productos nuevos, que también se sirve desde `images.unsplash.com` (`editor_formador_productos.tsx:37-39`); y el **mapa de entorno 3D** del hero, que se descarga desde un CDN externo. **No** hay una lista cerrada: el campo de imagen del formulario es un `<input type='url'>` (`editor_formador_productos.tsx:180`) que acepta cualquier host, así que el usuario puede provocar un cuarto destino que la aplicación no conoce. Estilos y tipografía **no** dependen de la red.
  *Verificable:* en el escenario normal, la pestaña Network muestra peticiones a `images.unsplash.com` y al CDN del mapa de entorno. Si el mapa de entorno falla, la página sigue usable (**CE-07**). Si las imágenes fallan, la página sigue usable y los datos de cada producto siguen visibles (**CE-13**).

- **RNF-07 — Interactividad con la animación activa.** Mientras la botella 3D se anima, el usuario puede seguir desplazando la página e interactuando con el catálogo y el carrito, y la animación sostiene al menos 30 cuadros por segundo medidos en el navegador.
  *Verificable:* con la animación en curso, hacer scroll y abrir el carrito responden en menos de 200 ms desde el evento, y el panel de rendimiento del navegador registra 30 FPS o más de forma sostenida. La constitución §2.3 exige 60 FPS como objetivo; este RNF fija un umbral mínimo comprobable.

- **RNF-08 — Codificación.** Los archivos creados o modificados en esta spec se escriben en **UTF-8 sin BOM**.
  *Verificable:* inspección del BOM de cada archivo tocado.

- **RNF-09 — Degradación en móviles.** Cuando el ancho de la ventana es inferior a 640 px, EL SISTEMA simplifica o desactiva los efectos 3D y las animaciones pesadas del hero, de modo que la página siga cargando y respondiendo según la definición de "usable en móvil" de §1.1.
  *Fundamento y su alcance:* `docs/CONSTITUCION.md` §2.3, línea 18: "En dispositivos moviles, las animaciones complejas o pesadas deben degradarse elegantemente o simplificarse." **Esta spec acota "dispositivos móviles" a "ventana de ancho inferior a 640 px".** Es un recorte deliberado y declarado: la constitución no define el término, y un criterio verificable necesita un umbral numérico. Consecuencia asumida: un teléfono en horizontal, con un ancho cercano a 844 px, **no** degrada. La decisión queda registrada en **D-16**.
  *Verificable:* a 375 px de ancho, el título y el botón del hero son **legibles** según la definición de §1.1, y se cumplen todas las acciones de "usable en móvil" (**RF-40**). El archivo que decide la degradación es `hero.tsx` (**D-15**).

- **RNF-10 — Sincronización documental obligatoria.** Al terminar esta spec, `MEMORY.md` y `AGENTS.md` reflejan el estado real del proyecto: la bitácora registra el cambio con fecha, la lista de componentes marca los nuevos y los modificados, y los comandos y el alcance se actualizan si cambiaron.
  *Fundamento:* `AGENTS.md` §Protocolo de Actualización Continua, que exige seguirlo "sin excepcion" y hacerlo "inmediatamente" tras cada modificación de código.
  *Verificable:* `MEMORY.md` tiene una entrada de bitácora con la fecha de esta spec, y su lista de componentes refleja que existen el pie de página y la vista rápida.

---

## 6. Casos límite

| ID | Situación | Comportamiento esperado | RF o RNF |
|---|---|---|---|
| CE-01 | Almacenamiento local vacío en la primera visita | Arranca con el catálogo inicial y el carrito vacío | RF-32, RF-33, RF-34 |
| CE-02 | Almacenamiento local con JSON corrupto, con tipos inesperados o escrito por otra versión | Arranca con el catálogo inicial y el carrito vacío, sin error visible ni pantalla en blanco | RF-34 |
| CE-03 | Decrementar la cantidad de un producto que está en 1 | La línea se elimina del carrito y el total se recalcula. Nunca queda una línea en 0 | RF-23 |
| CE-04 | Hacer clic varias veces en **"Agregar"** sobre la misma tarjeta | La cantidad de esa línea sube. No se crean líneas duplicadas | RF-20 |
| CE-05 | Buscar con texto que tiene espacios sobrantes al inicio o al final, como `" chardonnay "` | El filtro encuentra el mismo resultado que con `"chardonnay"`, porque el sistema normaliza los espacios del texto buscado antes de comparar | RF-17 |
| CE-06 | Filtrar por una categoría que no tiene productos | Se muestra el mensaje de "no se encontraron etiquetas", no una grilla vacía | RF-18 |
| CE-07 | El mapa de entorno 3D del hero no se puede descargar | El resto de la página (navegación, catálogo, carrito, pie, vista rápida) se renderiza y es usable. Solo el canvas 3D queda sin escena. **En consola se permite ver un aviso o error del cargador de recursos**, y se permite que la carga del mapa quede pendiente indefinidamente | RF-06, RNF-06 |
| CE-08 | El navegador no tiene WebGL disponible | El resto de la página se renderiza y es usable. El hero muestra su titular y su botón **"Explorar Cava"**, ambos legibles según §1.1, y el catálogo se ve con normalidad. El canvas 3D no se renderiza. **En consola se permite ver un aviso del renderizador** | RF-06, RF-12, RNF-09 |
| CE-09 | El formulario se envía sin imagen | El producto se guarda igual, con la imagen por defecto que el formulario ya define | RF-28 |
| CE-10 | La aplicación se sirve por HTTP desde un host que **no** es de loopback, es decir, algo distinto de `localhost` y de `127.0.0.1`. En ese contexto el navegador no expone el generador de identificadores aleatorios, y la llamada usada hoy para crearlos lanza | El formulario **no** se rompe: el sistema genera el identificador del producto nuevo por otro medio, el producto se agrega al catálogo, el formulario se cierra y la lista sigue navegable. **No** queda un error sin capturar ni un formulario abierto en falso | RF-31, RF-28 |
| CE-11 | Ventana de 375 px de ancho | Se cumple la definición de "usable en móvil" de §1.1, el catálogo muestra una sola columna y no hay scroll horizontal | RF-19, RF-40, RNF-09 |
| CE-12 | El usuario borra el campo de cosecha, queda vacío | El formulario no agrega el producto y explica que la cosecha es obligatoria y tiene que estar dentro del rango válido de §1.1 | RF-29 |
| CE-13 | Las imágenes externas no cargan, por falta de red o porque el servicio no responda | El resto de la página es usable y **los datos de cada producto siguen visibles**: nombre, bodega, varietal, categoría, cosecha y precio. **En consola se permite ver un aviso o error del cargador de imágenes** por cada imagen que no carga. No se permite un error que impida agregar un producto al carrito: el flujo de compra sigue funcionando | RF-06, RNF-06 |
| CE-14 | La ventana mide entre 640 px y 767 px inclusive | El catálogo muestra **dos o más** columnas, porque el punto de corte del tema es 640 px | RF-19 |
| CE-15 | Dos productos distintos reciben el mismo identificador, por una colisión del método alternativo de generación | El catálogo los mantiene **ambos**, porque el identificador solo se usa como clave de React y no como clave de persistencia. El sistema detecta la colisión y genera otro identificador para el producto nuevo antes de agregarlo | RF-28, RF-31 |

---

## 7. Trazabilidad

Cada RF debe quedar cubierto por al menos una tarea en `task.md` (a redactar en fase 2, tras la aprobación).

| Grupo | RF | Origen |
|---|---|---|
| Compilar y arrancar | RF-01 a RF-10 | Diagnóstico §2.2, constitución §2.1 |
| Navegación y hero | RF-11 a RF-13 | Componentes existentes, `AGENTS.md` §1 y §2 |
| Pie de página | RF-14 | `AGENTS.md` §7 |
| Catálogo | RF-15 a RF-19 | `carta_de_catalogo.tsx`, `carta_de_productos.tsx`, `AGENTS.md` §3 |
| Carrito | RF-20 a RF-27 | `carrito_de_compras.tsx`, `barra_de_navegacion.tsx`, constitución §5 |
| Carga de productos | RF-28 a RF-31 | `editor_formador_productos.tsx`, validadores de `test/validadores.ts`, constitución §5 |
| Persistencia | RF-32 a RF-34 | `docs/CONSTITUCION.md` §4 |
| Vista rápida | RF-35 a RF-37 | `AGENTS.md` §5 |
| Regresión | RF-38, RF-39 | `AGENTS.md` §Estilo de código y §Protocolo, constitución §2 |
| Usabilidad en móvil | RF-40 | Definición de §1.1, constitución §2.3 línea 18 |
| Cobertura automatizada de la lógica de estado | RF-41 a RF-49 | Cambio pedido por el usuario el 2026-10-06. Frontera de §8.1b |

---

## 8. Criterios de aceptación

Verificables uno por uno, con observación concreta. Los comandos se ejecutan desde la raíz del proyecto. La serie va de **CA-01 a CA-49**, continua y sin huecos. Los CA-40 a CA-49 son los nuevos del cambio del 2026-10-06 y se agregaron **al final**, así que **ningún identificador anterior se renumeró**.

### 8.1 Orden de ejecución

Los criterios se ejecutan **en este orden**, porque varios dependen del estado que deja el anterior. Cada criterio aparece **una sola vez**.

> **Los CA-40 a CA-49 se ejecutan en un paso aparte, y después de todos los demás.** Ver **D-18**: la suite del orquestador importa `App.tsx`, que a su vez importa la vista rápida y el pie de página. Si esos criterios corrieran antes de que existan esos componentes, fallarían por módulos inexistentes y no por lógica, que es la clase de falso positivo más difícil de detectar en una suite.

1. **Paso 0 — reinicio del entorno de prueba.** Vaciar `localStorage` desde la consola del navegador (`localStorage.clear()`) o usar una ventana de incógnito. Los pasos 1 a 3 asumen almacenamiento vacío. Sin este paso, los criterios que esperan el catálogo inicial fallan.
2. **Paso 1 — compilación, arranque y suite de pruebas.** CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-09, CA-10, CA-11.
3. **Paso 2 — catálogo y búsqueda**, sobre el almacenamiento vacío del paso 0. CA-12, CA-13, CA-14.
4. **Paso 3 — carrito y cierre de compra.** CA-15, CA-16, CA-17. Deja el carrito con contenido.
5. **Paso 4 — carga de productos y persistencia.** CA-18, CA-19, CA-20, CA-21, CA-22, CA-23, CA-24.
6. **Paso 5 — responsive y componentes nuevos.** CA-25, CA-26, CA-27, CA-28, CA-29, CA-30, CA-31, CA-32, CA-33, CA-34, CA-35.
7. **Paso 6 — estilo, tipos y documentación.** CA-36, CA-37, CA-38, CA-39. **Ojo con el alcance de CA-36:** el patrón `;$` se busca **solo en `.ts` y `.tsx`**, nunca en los `.css` de `src/` (§12.5). **Ojo con el método de CA-39:** se verifica por `LastWriteTime` y no por `git diff`, porque el repositorio no tiene ningún commit (§12.7).
8. **Paso 7 — suite del orquestador.** CA-40, CA-41, CA-42, CA-43, CA-44, CA-45, CA-46, CA-47, CA-48, CA-49. Se ejecuta **último** y **solo** cuando la vista rápida (CA-33 a CA-35) y el pie de página (CA-32) ya existen. Corre con `npm test`, no con navegador.

**Después de CA-23 hay que repetir el paso 0** antes de seguir, porque ese criterio ensucia el almacenamiento local a propósito.

### 8.1b Qué queda sin cobertura automatizada, y por qué

La cobertura automatizada nueva (RF-41 a RF-49) es **de la lógica de estado**, no de la presentación. Lo que sigue **no tiene test automatizado y no lo va a tener con las dependencias actuales**, porque no hay `@testing-library/*` y RNF-04 impide instalarlo:

| Sin cobertura automatizada | Por qué | Qué lo cubre |
|---|---|---|
| Consultas por **texto accesible** y por **rol ARIA** | `getByRole`, `getByLabelText` y similares son de `@testing-library`. Con `document.querySelector` se puede buscar por texto o clase, pero no por rol calculado, que es lo que verifica la accesibilidad real | CA-29, CA-32, CA-33 |
| **Foco** y navegación por teclado | Requiere simular `Tab` y observar `document.activeElement`, más `user-event`. Es posible a mano, pero frágil y disproportionate para lo que se verifica | Sin criterio: ningún RF exige foco explícitamente |
| **Transiciones y animación** de paneles y modales | `AnimatePresence` anima fuera del ciclo de render de React. En jsdom no hay motor de animación, así que el test solo vería el estado final | CA-16, CA-35 (parcialmente) |
| **Medidas de layout**: `scrollWidth`, alturas, solapamientos | jsdom **no implementa layout**: no calcula tamaños ni posiciones. Un `getBoundingClientRect` devuelve ceros | CA-25, CA-26, CA-27, CA-28, CA-30, CA-31 |
| **Contraste de color** y `font-size` computado | jsdom no aplica CSS ni calcula estilos computados | CA-08, CA-30, CA-28 |
| **WebGL y la escena 3D** | jsdom no tiene WebGL. El `Canvas` de R3F se degrada o falla | CE-07, CE-08 |
| **Comportamiento responsive real** | Depende del viewport, y jsdom tiene uno fijo de 1024×768 | Todos los CA de ancho |
| **Recarga de página** | Un test no puede recargar la página | CA-17 |

**Conclusión explícita: esto no es un hueco, es una frontera.** Los 39 CA de navegador no se reemplazan ni se reducen con los 10 CA nuevos: se complementan. Los CA-40 a CA-49 detectan regresiones de **lógica**; los CA-01 a CA-39 verifican **comportamiento observable**. Un test puede pasar y la app seguir viéndose mal, y está bien: cada uno mira una cosa distinta.

### 8.2 Compilación, arranque y suite de pruebas

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-01 | El chequeo de tipos pasa y el build completo | `npm run build` termina con código de salida `0`. Como el script es `tsc && vite build`, un error de tipos cortaría el comando. Alternativa aislada: `npx tsc --noEmit` termina con `0`. Cubre RF-03. |
| CA-02 | Un error de tipo rompe el build | Introducir temporalmente una asignación inválida de tipo en un archivo de `src/`, correr `npm run build` y confirmar que termina con código distinto de `0` y que `dist/` no se regenera. Revertir el cambio. Cubre RF-02. |
| CA-03 | Se genera un artefacto real | `dist/index.html` existe y contiene `<div id="root">` y una etiqueta `<script type="module" ...>`. El peso total de `dist/` es **igual o superior a 1 kB**. **Contraste con el estado actual:** hoy `dist/index.html` pesa 0.04 kB y contiene una sola línea de texto plano. Cubre RF-01 y RF-04. |
| CA-04 | No quedan importaciones rotas | Una búsqueda de `types/wine`, `./ProductCard`, `./HeroCanvas3D`, `./components/Navbar`, `./components/Hero` y `./components/ProductCatalog` sobre `src/` no devuelve ninguna coincidencia. Cubre RF-07. |
| CA-05 | El servidor de desarrollo levanta y es accesible desde la red local | `npm run dev` imprime una URL local y, al abrirla, responde con el documento HTML de la aplicación. Además, desde **otro** dispositivo de la misma red, o desde la IP local de la máquina, la URL responde igual. Esta segunda mitad es la precondición de **CA-21**. Cubre RF-05. |
| CA-06 | La aplicación se monta sin errores de consola | **En el escenario normal** (§1.1), al abrir la URL de desarrollo: no hay pantalla en blanco y **no hay ningún error de nivel `error` en la consola**. Sobre los **avisos** (`warning`): se admiten, y el cumplimiento de este criterio es que la lista de avisos sea **la misma antes y después** de los cambios de esta spec. Si aparece un aviso nuevo que no existía en la línea base, se reporta como observación en la validación, no como incumplimiento. Los errores tolerados en los escenarios de falla están acotados por **CE-07**, **CE-08** y **CE-13**, y no cuentan como incumplimiento. Cubre RF-06. |
| CA-07 | El tema se aplica | Una utilidad `bg-charcoal-900` presente en la interfaz computa a `rgb(18, 18, 18)`. Una utilidad `text-gold-500` computa a `rgb(212, 175, 55)`. Cubre RF-08. |
| CA-08 | La tipografía es serif en títulos, sans-serif en cuerpo, y sin red | El `font-family` computado de un encabezado (`h2` del catálogo) termina en `serif`. El del elemento `<body>` termina en `sans-serif`. Y en la pestaña **Network**, con la caché vacía, **no hay ninguna petición cuyo dominio contenga `fonts.googleapis`, `fonts.gstatic` ni `use.typekit`**. Cubre RF-09. |
| CA-09 | Sin `any` en el proyecto | La búsqueda del patrón `\bany\b` sobre `src/`, `test/` y los archivos de configuración devuelve 0 coincidencias, igual que la línea base de §2.1. Cubre RNF-01. |
| CA-10 | La verificación de tipos cubre todo el proyecto | Introducir un error de tipo deliberado en un archivo de `test/` y confirmar que `npm run build` falla. Revertir el cambio. Si el build pasa, es porque el archivo de pruebas quedó fuera del programa de TypeScript. Cubre RF-10. |
| CA-11 | **La suite de pruebas pasa entera, con los preexistentes intactos y los nuevos incluidos** | `npm test` termina con **código de salida 0**. Los **46 tests preexistentes** de `test/validadores.test.ts` y `test/integridad_datos_producto.test.ts` aparecen en verde. Los **tests nuevos** del orquestador (RF-41 a RF-49) también aparecen en verde. **El número total de tests y de archivos ya no es un valor fijo**, y no se exige ninguno. Lo que sí es incumplimiento: que los 46 preexistentes no estén todos, que alguno falle, o que alguno esté omitido o marcado como esperado-fallido. Cubre RF-38 y RNF-05. |

### 8.3 Catálogo y búsqueda

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-12 | El catálogo inicial y los filtros por categoría | Con el almacenamiento vacío del paso 0: se ven 2 tarjetas. El filtro **"Blanco"** deja 1. El filtro **"Todos"** vuelve a 2. Cubre RF-15 y RF-16. |
| CA-13 | La búsqueda por texto, incluidos los espacios sobrantes | Escribir `chardonnay` deja 1 tarjeta. Escribir `CHARDONNAY` deja 1 tarjeta. Escribir `" chardonnay "` deja 1 tarjeta, igual que sin espacios. Escribir `zzzz` deja 0 tarjetas y muestra el mensaje de estado vacío. Cubre RF-17, RF-18 y CE-05. |
| CA-14 | Agregar repetido no duplica | Pulsar **"Agregar"** dos veces sobre la misma tarjeta produce **una sola línea** con cantidad 2, no dos líneas. Cubre RF-20 y CE-04. |

### 8.4 Carrito y cierre de compra

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-15 | El carrito funciona | **"Agregar"** en una tarjeta hace aparecer junto al ícono de carrito el número 1. Abrir el carrito muestra la línea. `+` sube la cantidad y el total. `−` en una línea con cantidad 2 la deja en 1. `−` en una línea con cantidad 1 **elimina la línea** y el carrito queda vacío. **"Eliminar"** quita la línea. Con el carrito vacío, el indicador numérico **desaparece** en lugar de mostrar `0`. Con el carrito vacío, se ve el mensaje de carrito vacío y **no** se ve el bloque de total ni el botón de finalizar. Cubre RF-20, RF-21, RF-22, RF-23, RF-24, RF-26 y CE-03. |
| CA-16 | El carrito se cierra de las dos maneras | Con el carrito abierto: pulsar el botón de cierre (**✕**) lo cierra. Volver a abrirlo y pulsar el fondo oscurecido también lo cierra. En los dos casos el panel desaparece por completo y la página de fondo queda interactiva. Cubre RF-25. |
| CA-17 | Finalizar pedido funciona | Con al menos una línea en el carrito, pulsar **"Finalizar Pedido"** muestra un mensaje de pedido confirmado, vacía el carrito y hace desaparecer el indicador numérico del ícono, **sin que la página se recargue**. Con el carrito vacío, el botón **"Finalizar Pedido"** no está visible. Cubre RF-27. |

### 8.5 Carga de productos y persistencia

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-18 | La carga de productos válida funciona | Enviar el formulario con nombre, bodega, precio 45000, cosecha 2020 y categoría válida: aparece una **tercera** tarjeta en el catálogo, el formulario se cierra y la tarjeta persiste. Cubre RF-28 y RF-30. |
| CA-19 | El precio inválido se rechaza **con explicación** | Enviando precio `0`: no se agrega ninguna tarjeta y aparece un mensaje que dice que el precio tiene que ser mayor que cero. Enviando precio `-100`: no se agrega ninguna tarjeta y aparece un mensaje equivalente. Enviando el precio vacío: no se agrega ninguna tarjeta y aparece un mensaje. Los tres casos deben mostrar el mensaje, no solo impedir el alta. Cubre RF-29. |
| CA-20 | La cosecha se valida contra el rango, en los dos límites | Enviando cosecha vacía: no se agrega ninguna tarjeta y aparece un mensaje. Enviando cosecha `1200` (por debajo de 1850): no se agrega ninguna tarjeta. Enviando cosecha `<año actual + 2>`, es decir **2028** con el año en curso 2026: no se agrega ninguna tarjeta. Enviando cosecha **2027** (el límite superior, año actual más uno): **sí** se agrega. Enviando cosecha **1850** (el límite inferior): **sí** se agrega. Cubre RF-29, CE-12 y la definición de §1.1. |
| CA-21 | El guardado funciona fuera de loopback | Con la aplicación servida desde la IP local de la máquina (por ejemplo `http://192.168.0.10:5173`), abrir la aplicación y enviar el formulario con datos válidos: el producto se agrega, el formulario se cierra y no queda ningún error en consola. **Precondición:** CA-05, que exige que el servidor sea accesible desde la red local. Si el firewall de la máquina o de la red bloquea el acceso, el criterio queda como `no ejecutable` y se reporta como tal, sin declararse aprobado ni fallido. Cubre RF-31 y CE-10. |
| CA-22 | La persistencia funciona | Tras el paso 4, recargar la página conserva el tercer producto agregado y la línea que hubiera en el carrito. Cubre RF-32 y RF-33. |
| CA-23 | La persistencia es tolerante a datos corruptos | Escribir basura en `vinoteca_wines` y `vinoteca_cart` desde la consola y recargar: la aplicación arranca con el catálogo inicial de 2 productos y el carrito vacío, sin pantalla en blanco. **Después de este criterio hay que repetir el paso 0.** Cubre RF-34 y CE-02. |
| CA-24 | Las imágenes externas no bloquean la información | Con las peticiones a `images.unsplash.com` bloqueadas desde la pestaña Network, cada tarjeta sigue mostrando nombre, bodega, varietal, categoría, cosecha y precio, y **agregar al carrito sigue funcionando**. Los avisos de consola por imágenes que no cargan están permitidos por CE-13. Cubre RNF-06 y CE-13. |

### 8.6 Responsive y componentes nuevos

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-25 | Responsive en 375 px | A 375 px de ancho: una sola columna de tarjetas y **cero scroll horizontal**, es decir el `scrollWidth` del documento es igual al `clientWidth`. Se verifica la definición completa de "usable en móvil" en **CA-28**. Cubre RF-19 y CE-11. |
| CA-26 | El punto de corte de columnas es 640 px | A **700 px** de ancho el catálogo muestra **dos o más** columnas, no una. A **600 px** muestra una sola columna. Esto fija el comportamiento en la franja de tablet y descarta el supuesto de 768 px. Cubre RF-19 y CE-14. |
| CA-27 | La búsqueda existe en móvil y no desborda | A 375 px de ancho hay un campo de búsqueda visible y operativo: escribir `chardonnay` deja 1 tarjeta. Además, el `scrollWidth` del documento es igual al `clientWidth`, es decir, el campo de búsqueda visible **no** introduce scroll horizontal. Este criterio existe porque **D-11** hace visible un input de texto en una fila que a 375 px tiene unos 327 px de caja de contenido: si la implementación lo deja en línea con el botón **"+ Cargar Vino"** (~110 px) y el ícono de carrito, ese criterio falla. Cubre RF-11 y RF-17. |
| CA-28 | Usabilidad móvil completa | A 375 px de ancho, y **sin** cambiar el ancho de la ventana en ningún momento, ejecutar en este orden: (1) navegar el catálogo; (2) filtrar por **"Blanco"**; (3) escribir `chardonnay` en el campo de búsqueda; (4) agregar un producto al carrito; (5) abrir el carrito; (6) subir la cantidad con `+`; (7) eliminar la línea con **"Eliminar"**; (8) agregar de nuevo; (9) cerrar el carrito con el botón de cierre; (10) finalizar el pedido; (11) abrir la vista rápida y cerrarla. Las once acciones responden, ninguna produce scroll horizontal y ninguna exige salir de los 375 px. Título y botón del hero son legibles según §1.1. Cubre RF-40 y RNF-09. |
| CA-29 | El contenido de la barra de navegación | A 1280 px de ancho se ven los cinco elementos: el nombre de la marca, el campo de búsqueda, el acceso **"+ Cargar Vino"**, el ícono de carrito con su `aria-label`, y el contador cuando hay unidades. Cubre RF-11. |
| CA-30 | El hero, con el ancho fijado | **A 1280 px de ancho**, en la carga inicial y sin hacer scroll, se ven el titular del hero y el botón **"Explorar Cava"**, y el canvas de la botella 3D está presente en la misma sección. **A 375 px**, el titular y el botón siguen visibles y legibles según §1.1, y el canvas puede estar degradado o ausente (RNF-09). El ancho queda fijado porque el comportamiento del 3D depende del ancho. Cubre RF-12 y CE-08. |
| CA-31 | "Explorar Cava" lleva al catálogo sin taparlo | Pulsar **"Explorar Cava"**: el encabezado `<h2>Catálogo de Vinos</h2>` queda visible por completo, con su borde superior por debajo del borde inferior de la barra de navegación fija y sin solaparse con ella. Cubre RF-13. |
| CA-32 | El pie de página tiene los cuatro bloques | Al llegar al final de la página se ven: los horarios de atención, la ubicación, los enlaces a redes sociales, y el aviso legal con la restricción de edad **+18**. Cubre RF-14. |
| CA-33 | La vista rápida muestra lo que el producto tiene | Pulsar la imagen o el nombre del primer producto del catálogo inicial abre una vista con la imagen ampliada, el nombre, la bodega, la categoría, la cosecha, el precio, el bloque de notas de cata y el bloque de maridaje. Este criterio no exige ningún dato más allá de los que **RF-35** y **RF-36** piden. Cubre RF-35. |
| CA-34 | La vista rápida omite bloques que el producto no tiene | Cargar un producto nuevo, que no tiene notas de cata ni maridaje, y abrir su vista rápida: se ven la imagen y los datos del producto, y **no** aparece ningún bloque de notas de cata ni de maridaje, tampoco vacío. Cubre RF-36. |
| CA-35 | La vista rápida se cierra y conserva el estado | Filtrar por **"Blanco"**, abrir la vista rápida de un producto y cerrarla con el control de cierre: la vista desaparece y el catálogo sigue filtrado en **"Blanco"**, con la búsqueda intacta. Cerrarla usando el fondo oscurecido produce el mismo resultado. Cubre RF-37. |

### 8.7 Estilo, tipos y documentación

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-36 | Estilo del código nuevo y migración a TypeScript | En los archivos creados o modificados **de código de aplicación** (§1.1), es decir **los `.ts` y los `.tsx`**: la búsqueda del patrón `;$` no devuelve coincidencias (línea base en `src/`: 0); no hay comillas dobles usadas como delimitadores de string. Además, **bajo `src/` no queda ningún archivo `.jsx` ni `.js`**: solo `.ts` y `.tsx`. Quedan **excluidos** de esta comprobación, por el mismo motivo: (a) los archivos de configuración de la raíz, que pueden seguir siendo `.js` (`postcss.config.js` y `tailwind.config.js`), y (b) **los archivos `.css` de `src/`**, como `src/index.css`, que esta spec crea en T1. Motivo de la exclusión de los `.css`: la convención de "sin punto y coma" de `AGENTS.md` describe JavaScript y TypeScript, y las directivas `@tailwind`, `scroll-behavior`, `background-color` y `@apply` de `src/index.css` **no tienen sintaxis alternativa**: quitarles el punto y coma rompe el archivo. Ver §12.5. Cubre RF-39 y RNF-02. |
| CA-37 | La paleta no se amplía | La búsqueda de colores hexadecimales en los archivos creados o modificados devuelve únicamente los valores de `tailwind.config.js`. Cubre RNF-03. |
| CA-38 | La documentación quedó sincronizada | `MEMORY.md` tiene una entrada en §Bitacora de Cambios con la fecha de esta spec, y su §Componentes y Estructura marca el pie de página y la vista rápida como existentes. `AGENTS.md` refleja cualquier comando o alcance nuevo. Cubre RNF-10. |
| CA-39 | **Ninguna tarea de esta spec agregó ni quitó dependencias** | **Qué se mide:** que el conjunto de `dependencies` y `devDependencies` de `package.json` sea **el mismo que cuando arrancó T1**, y que ninguna nota de `task.md` de T1 a T11 declare haber corrido `npm install` o `npm uninstall`. No se mide "el archivo no cambió nunca", porque eso no es comprobable aquí.<br>**Método y su límite.** `git diff package.json package-lock.json` **no sirve**: el repositorio **no tiene ningún commit** (`git log` responde que la rama `main` no tiene ninguno) y lo único que hay es un índice de staging anterior a todo el proyecto, que todavía registra `spec/001/` y el `index.html` viejo de una línea, así que devuelve un diff de 2.622 líneas en `package-lock.json` que **no** es el cambio de esta spec. Se usa en cambio **`LastWriteTime`**, que es **evidencia de fecha de escritura, no de contenido**, y queda declarado como tal: no permite afirmar que las dependencias sean "exactamente las mismas que antes de la spec", porque **la línea base no es demostrable** — el repositorio cambió entre la redacción de la spec y el arranque de T1. Por eso este criterio **no declara un número de dependencias**.<br>**Evidencia medida.** Los seis paquetes que hoy figuran en `devDependencies` y que esta spec da por preexistentes: `vitest` y `jsdom` (instalados el **2026-10-05 23:49**), y `eslint`, `typescript-eslint`, `@eslint/js` y `@stylistic/eslint-plugin` (instalados el **2026-10-06 11:37**, con `eslint.config.js`). `package.json` y `package-lock.json` se escribieron entre las **11:42:14 y las 11:42:43** del 2026-10-06, y el primer archivo de T1 (`tsconfig.json`) a las **11:54:29** del mismo día: **doce minutos después**, así que ninguna tarea de la spec los tocó.<br>**Qué los necesitaban.** `vitest` y `jsdom` **sí los necesitan** RF-41 a RF-49: `vitest run` es el motor de la suite del orquestador y `jsdom` es su entorno, y sin ellos los CA-40 a CA-49 no corren. **Ninguna tarea de esta spec los instaló**: ya estaban antes de T1. Los otros cuatro (`eslint`, `typescript-eslint`, `@eslint/js`, `@stylistic/eslint-plugin`) **no los exige ningún RF ni ningún CA de esta spec**: no hay un solo criterio que mida el lint, que es exactamente por qué **§3.2** lo deja fuera de alcance.<br>**En particular no aparece `@testing-library/*`**, que es el motivo por el que los tests del orquestador usan `react`, `react-dom` y `jsdom`. Cubre RNF-04. Ver §12.7. |

### 8.8 Tests automatizados de la lógica de estado del orquestador

> Todos estos criterios se verifican con el mismo comando: **`npm test`** (que es `vitest run`). La observación es sobre la salida de la suite, no sobre el navegador.

| # | Criterio | Cómo se verifica |
|---|---|---|
| CA-40 | La suite del orquestador existe y corre en el entorno correcto | Existe un archivo de tests del orquestador bajo `test/`, y `npm test` lo recolecta. Al correrlo, la consola **no** muestra el aviso "The current testing environment is not configured to support `act(...)`": eso confirma que el test fija `globalThis.IS_REACT_ACT_ENVIRONMENT = true` antes de usar `act`. Tampoco aparece el error de deprecación de `ReactDOMTestUtils.act`, lo que confirma que `act` se importa de `react` y no de `react-dom/test-utils`. |
| CA-41 | Agregar dos veces el mismo producto no duplica la línea | Montar la aplicación, agregar el mismo producto al carrito dos veces desde la interfaz, y observar en el DOM que el panel lateral muestra **una sola línea** con cantidad 2, no dos líneas. Cubre RF-41. |
| CA-42 | El total es la suma de precio por cantidad | Con dos líneas en el carrito, cantidades 2 y 3, el texto del total que se muestra en el DOM es exactamente `(precio1 × 2) + (precio2 × 3)`. Cubre RF-42. |
| CA-43 | Decrementar en 1 elimina la línea y nunca deja 0 | Poner una línea en cantidad 1, pulsar `−`, y observar que la línea desaparece del panel. Repetir con una línea en cantidad 2 y pulsar `−` dos veces: la segunda pulsación la elimina. **En ningún momento** el DOM muestra una línea con cantidad 0 ni con cantidad negativa. Cubre RF-43. |
| CA-44 | Eliminar quita la línea y recalcula el total | Con dos líneas, pulsar **"Eliminar"** sobre una: esa línea desaparece del panel y el total del DOM pasa a ser el de la línea restante. Cubre RF-44. |
| CA-45 | Finalizar pedido vacía el carrito sin recargar | Con al menos una línea, pulsar **"Finalizar Pedido"**: en el DOM queda el mensaje de pedido confirmado, el panel lateral ya no lista ninguna línea, y `localStorage.getItem('vinoteca_cart')` pasa a ser un array vacío. El test **no** puede recargar la página, así que la parte de "no recarga" se verifica en navegador por **CA-17**. Con el carrito vacío, pulsar finalizar no cambia nada. Cubre RF-45. |
| CA-46 | Las claves de persistencia son las de la constitución | Tras agregar un producto y un artículo al carrito, `localStorage.getItem('vinoteca_wines')` y `localStorage.getItem('vinoteca_cart')` devuelven el catálogo y el carrito serializados. **Desmontar la raíz, limpiar el estado en memoria, volver a montar** y observar que el DOM muestra el producto agregado y la línea del carrito. Cubre RF-46. |
| CA-47 | Un arranque con datos corruptos no lanza | Escribir texto no-JSON en `vinoteca_wines` y `vinoteca_cart`, montar la aplicación, y observar que monta sin lanzar: el catálogo muestra los 2 productos iniciales y el carrito está vacío. Cubre RF-47. |
| CA-48 | El filtro y la búsqueda sobreviven al modal | Escribir un texto en el campo de búsqueda y seleccionar una categoría, abrir la vista rápida desde una tarjeta, cerrarla, y observar que el texto del campo de búsqueda sigue ahí y que la categoría elegida sigue activa. Cubre RF-48. |
| CA-49 | El contador refleja las unidades y desaparece al vaciarse | Con dos líneas de cantidades 2 y 3, el número junto al ícono de carrito es 5. Al eliminar todo, ese nodo **no existe** en el DOM: no se muestra un 0. Cubre RF-49. |

---

## 9. Decisiones

| ID | Decisión | Quién | Fecha | Justificación |
|---|---|---|---|---|
| D-1 | **Los dos archivos de entrada se migran a TypeScript**: `src/App.jsx` y `src/main.jsx` pasan a `.tsx`, en lugar de permanecer en JavaScript con `allowJs` | Usuario | 2026-10-06 | `docs/CONSTITUCION.md` §2.1 dice que todo el código debe estar en TypeScript estricto y prohíbe `any`. `AGENTS.md` §Arquitectura técnica pide React + Vite con TypeScript. Dejar los dos archivos de entrada en JavaScript obligaría a desactivar el chequeo sobre ellos, es decir, exactamente donde se concentra el estado de la aplicación. **Alternativa descartada:** `allowJs: true` con `checkJs: false`. |
| D-2 | **Entran los dos componentes que faltaban: el pie de página y la vista rápida de producto.** Cubre RF-14 y RF-35 a RF-37 | Usuario | 2026-10-06 | Respondió la pregunta abierta P-1 eligiendo la opción B. La vista rápida tiene además una dependencia dura que la motivó: `ProductCatalog` y `ProductCard` exigen la prop `onSelectWine`, y sin una vista rápida que la consuma el clic en una tarjeta no produce ningún efecto observable. **Alternativas descartadas:** solo el pie de página, o ninguno. |
| D-3 | **"Finalizar Pedido" muestra un mensaje de pedido confirmado y vacía el carrito, sin recargar la página.** Con el carrito vacío no se puede finalizar | Usuario | 2026-10-06 | Respondió la pregunta abierta P-2 eligiendo la opción A. La constitución §5 exige que el flujo de compra sea funcional sin recargar, así que recargar queda descartado. No hay backend ni pasarela de pago, así que la confirmación es local. **Alternativas descartadas:** confirmación sin vaciado, o resumen previo. |
| D-4 | No se requiere una fuente web externa: la constitución §3 pide serif para títulos y sans-serif para cuerpo, y eso se resuelve con la pila de fuentes por defecto del tema | Planner | 2026-10-06 | Los componentes ya usan `font-serif` y `font-sans`. Agregar un enlace a un proveedor de fuentes introduce una dependencia de red sin que la constitución la exija, y la verificación sería frágil. **Alternativa descartada:** Google Fonts u otro proveedor externo. |
| D-5 | El tema es siempre oscuro. No se implementa conmutación de tema | Planner | 2026-10-06 | Los componentes no usan ninguna variante `dark:` (verificado: 0 coincidencias en `src/`). El tema oscuro se logra con las utilidades de color explícitas, no con conmutación. La constitución §3 no pide conmutación. |
| D-6 | La configuración de PostCSS debe ser válida bajo `"type": "module"` del `package.json` | Planner | 2026-10-06 | Restricción objetiva del repositorio: los `.js` de este paquete se interpretan como ESM, así que una configuración de PostCSS en CommonJS fallaría al cargarse. |
| D-7 | La configuración de Vite se mantiene separada de la configuración de pruebas | Planner | 2026-10-06 | `vitest.config.ts` ya existe y documenta por qué está aparte. Agregar la configuración de la aplicación no debe cambiar **qué** archivos se recolectan como tests. **Verificado por:** RNF-05 y **CA-11**, que es el criterio que corre `npm test`. Actualizado el 2026-10-06: CA-11 ya no exige un número fijo de archivos ni de tests; exige que los 46 preexistentes sigan en verde y que los nuevos también. |
| D-8 | Los directorios vacíos `cava-and-co/` y `herramientas/` no se tocan | Planner | 2026-10-06 | No inciden en la compilación. Borrarlos o llenarlos es una decisión de organización del proyecto, ajena a esta spec. |
| D-9 | El artefacto roto `dist/index.html` no se limpia a mano | Planner | 2026-10-06 | `.gitignore` contiene `dist/` y el contenido se regenera con `npm run build`. Verificar CA-03 exige que el build lo sobrescriba. |
| D-10 | **RF-19 usa el punto de corte real de 640 px**, y no 768 px | Planner | 2026-10-06 | La grilla de `carta_de_catalogo.tsx:70` usa `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, y Tailwind define `sm` en 640 px. Exigir una columna por debajo de 768 px obligaría a cambiar ese punto de corte sin motivo de diseño. El 768 px que sí usa `herocanvas3d.tsx:73` pertenece a la altura del canvas, no a la grilla. **Consecuencia aceptada:** `carta_de_catalogo.tsx` se modifica, y queda declarado en §2.3 y §3.1. |
| D-11 | **El campo de búsqueda pasa a estar disponible también en móvil** | Planner | 2026-10-06 | `barra_de_navegacion.tsx:47` lo envuelve en `hidden md:block`, así que bajo 768 px no existe ningún campo de búsqueda, y RF-17 exige que el usuario escriba en él. Ocultar la búsqueda en móvil dejaría RF-17 sin forma de verificarse en la mitad de los anchos. **Alternativa descartada:** condicionar RF-11 y RF-17 a 768 px, que deja media función de la página inaccesible en móvil. **Consecuencia aceptada:** `barra_de_navegacion.tsx` se modifica, y queda declarado en §2.3 y §3.1. |
| D-12 | **El formulario valida precio y cosecha con las reglas que el proyecto ya tiene** | Planner | 2026-10-06 | `test/validadores.ts:44` y `:47` ya definen y prueban `esPrecioValido` (mayor que cero) y `esAnioRazonable` (entero entre 1850 y el año actual más 1). El formulario no las aplica. Aplicarlas no requiere dependencias nuevas y evita que un precio negativo llegue al carrito. **Alternativa descartada:** dejarlo como hueco conocido, que es lo que estaba antes y es incompatible con un RF normativo que exige agregar el producto. |
| D-13 | **La numeración de RF es continua y sin huecos, pero se renumera** | Planner | 2026-10-06 | Los RF anteriores se desplazaron al agregar requisitos nuevos (búsqueda en móvil, validaciones, control de cierre). Se prefirió renumerar a dejar números saltados, para que "RF-37" sea una referencia unívoca en el plan y en las tareas. Los códigos anteriores a esta ronda no son referencias válidas. |
| D-14 | **Los identificadores de RF se reasignan; los de la versión anterior ya no son referencias válidas** | Planner | 2026-10-06 | Los RF se desplazaron al agregar requisitos nuevos. El caso que más riesgo de confusión tiene: el RF-27 de la versión anterior ("agregar un producto al catálogo desde el formulario") es ahora **RF-28**, y el RF-27 actual es "Finalizar Pedido", un requisito que antes era RF-26. Quien lea una revisión anterior tiene que volver a esta tabla de trazabilidad de §7. |
| D-15 | **La degradación del 3D en móvil se resuelve en `hero.tsx`** | Planner | 2026-10-06 | `hero.tsx` es el componente que decide si renderiza `HeroCanvas3D`. `herocanvas3d.tsx` no se modifica: no necesita cambios para compilar (§13), y meter lógica de ancho de ventana adentro del canvas mezclaría dos responsabilidades. **Consecuencia aceptada:** `hero.tsx` se modifica, y queda declarado en §2.3 y §3.1. |
| D-16 | **"Dispositivo móvil" se acota a "ventana de ancho inferior a 640 px"** | Planner | 2026-10-06 | `docs/CONSTITUCION.md` §2.3 línea 18 exige degradar en móviles, pero no define "móvil". Un criterio verificable necesita un umbral numérico, así que se usa el mismo breakpoint del tema (D-10). **Consecuencia asumida y declarada:** un teléfono en horizontal, con un ancho cercano a 844 px, no degrada el 3D. Si el usuario quiere un disparador por tipo de dispositivo o por capacidades, hace falta otra decisión. |
| D-17 | **El campo de búsqueda pasa a una segunda fila en móvil, no a la misma fila** | Planner | 2026-10-06 | `barra_de_navegacion.tsx:40` es una fila con `max-w-7xl mx-auto px-6`, que a 375 px deja unos **327 px** de caja de contenido. Hoy esa fila ya tiene el logo, el contenedor del buscador (`flex-1 max-w-md mx-8`, línea 47) y el grupo de acciones con `gap-4` (línea 57). Meter un input visible en esa misma fila junto al botón "+ Cargar Vino" (~110 px) y al ícono de carrito **no entra** y empuja el ancho. Ponerlo en una **segunda fila** deja la caja de contenido intacta y mantiene CA-25 y CA-27 verificables. **Consecuencia asumida:** la barra de navegación pasa a tener dos filas por debajo de 768 px. |
| **D-18** | **Los tests del orquestador se ejecutan al final, después de que existan la vista rápida y el pie de página. No se mockean los componentes faltantes.** | Planner | 2026-10-06 | `App.tsx` importa la vista rápida y el pie de página. Hay tres caminos: (a) correr los tests al final, cuando todos los imports resuelven; (b) mockear con `vi.mock` los componentes que todavía no existen; (c) reordenar el plan para que esos componentes se escriban antes que el orquestador. **Se elige (a).** Contra (b): `vi.mock` está disponible (`vitest@^3.2.4`), pero un mock delata que el componente no está, no que su lógica anda: la suite pasa en verde mientras la vista rápida no existe, que es el peor modo de fallo posible. Contra (c): invertir el plan fuerza que `App.tsx` se escriba contra firmas que todavía no existen, y T5 quedaría verificando stubs. Con (a), los tests fallan de forma ruidosa y exacta si falta un componente. **Consecuencia:** los CA-40 a CA-49 se ejecutan en un paso aparte y último (§8.1). |
| **D-19** | **`act` se importa de `react`, y se fija `globalThis.IS_REACT_ACT_ENVIRONMENT = true`.** | Planner | 2026-10-06 | Verificado en `node_modules`: `react@18.3.1` exporta `act` (`react/cjs/react.development.js:2702`), y `react-dom/test-utils` está deprecado y emite un error al importarse. Y `react-dom/cjs/react-dom.development.js:25292` muestra que, sin la variable global, React emite el aviso "The current testing environment is not configured to support `act(...)`". Ninguna de las dos cosas necesita dependencias nuevas. CA-40 verifica que ninguno de los dos mensajes aparece. |
| **D-20** | **El alcance de los tests nuevos es la lógica de estado, no la presentación.** | Planner | 2026-10-06 | La lógica de estado es donde una regresión pasa inadvertida: si `actualizarCantidad` deja una línea en 0, la UI se sigue viendo bien y el total sale mal. La presentación ya tiene 39 CA con observación concreta. El límite no es arbitrario: jsdom no implementa layout, ni estilos computados, ni WebGL, ni viewport variable, así que casi nada de la presentación es testeable sin `@testing-library/*` y sin motor de animación. La frontera está enumerada en §8.1b, para que quede explícita y no parezca un hueco. |

---

## 10. Dudas abiertas

**No hay dudas abiertas.** Las dos que tenía esta spec fueron resueltas por el usuario el 2026-10-06 (P-1 y P-2), y la tercera (**D-1**) también. Las tres decisiones quedaron registradas en la sección 9.

### P-1 — ¿Entran el pie de página y la vista rápida de producto en esta spec?

**Resuelta.** Respuesta textual del usuario:

> "B. Entran los dos (Recomendado por el planner)"

Queda registrada como **D-2**: entran el pie de página (RF-14) y la vista rápida de producto (RF-35 a RF-37).

### P-2 — ¿Qué debe hacer "Finalizar Pedido"?

**Resuelta.** Respuesta textual del usuario:

> "A. Confirmación y vaciado (Recomendado por el planner)"

Queda registrada como **D-3** y concretada en **RF-27**.

### D-1 — ¿Los dos archivos de entrada se migran a TypeScript?

**Resuelta.** El usuario eligió migrarlos a `.tsx`. Queda registrada como **D-1** y concretada en **RF-39**.

---

## 11. Verificaciones pendientes

El planner no tiene permiso para ejecutar comandos en este proyecto (`bash` y `shell` negados). **Ninguna verificación de esta spec fue ejecutada por el planner.** En particular:

- **CA-01, CA-02, CA-03, CA-04, CA-10 y CA-11** dependen de correr `npm run build` y `npm test`. El planner **no** los ejecutó. La afirmación de que la suite está en verde con 46 tests y 2 archivos proviene de la revisión de QA del reviewer, que sí lo corrió el 2026-10-06. El planner solo verificó por lectura que existen 46 casos y que ninguno depende de los archivos que esta spec modifica.
- **CA-06, CA-08, CA-12 a CA-35** requieren abrir la aplicación en un navegador.
- **CA-02 y CA-10** requieren modificar archivos a propósito para confirmar que el chequeo los alcanza, y luego revertir.
- **CA-06** compara la lista de avisos de consola contra una línea base. **Esa línea base no existe**: nadie la registró, porque nadie pudo abrir la aplicación. El criterio queda con una tolerancia declarada en vez de un umbral, y su valor real se establece en la primera ejecución.
- **CA-21** depende de que el firewall permita el acceso desde la red local. Si no lo permite, queda `no ejecutable` y se reporta así, sin declararse aprobado ni fallido.
- **RNF-08 (UTF-8 sin BOM)** no pudo comprobarse. **No existe ninguna herramienta de verificación en el repositorio**: `herramientas/` está vacía, así que no hay `buscar-caracteres-raros.js` ni `verificar-layout.js` que correr.
- **CE-07, CE-08, CE-10, CE-13 y CE-15** (falla de CDN, WebGL ausente, host fuera de loopback, imágenes bloqueadas, colisión de identificadores) no pudieron reproducirse: el planner no abre navegador ni sirve la aplicación.

Quien ejecute la fase de implementación debe correr, como mínimo:

```bash
npm test
npm run build
npm run dev
```

y contrastar el resultado contra los **49** criterios de aceptación, respetando el orden de §8.1. Los CA-40 a CA-49 van al final, en el paso 7.

> **Nota fechada, 2026-10-07. Esta sección no se reescribe.** Describe lo que el planner podía y no podía verificar **al escribirse la spec**, antes de la implementación, y eso sigue siendo cierto para el planner. **Pero la fase de verificación ya corrió:** T11 ejecutó los cuatro comandos y recorrió los criterios, con los resultados en `task.md` §T11. En concreto, los tres puntos de esta sección que quedaban abiertos entonces —la línea base de avisos de CA-06, el acceso a CA-21 desde la red local y el BOM de RNF-08— **los resolvió T11**, y están con su evidencia en **§12.6**. **Lo único que sigue abierto de todo lo que esta lista menciona es la frontera de cobertura automatizada de la presentación**, en §12.4, que no dependía de que alguien ejecutara nada. Las afirmaciones de arriba se conservan tal cual: son el registro de un momento, no el estado actual.

---

## 12. Registro de correcciones

La revisión de QA pasó tres rondas. Cada hallazgo tiene estado explícito: `resuelto`, `parcial` o `pendiente`. **Ninguna ronda se declara completa mientras haya filas `parcial` o `pendiente`.** Las dos rondas documentadas acá, la 2 y la 3, **no tienen filas `parcial` ni `pendiente` desde el 2026-10-07**, cuando T11 resolvió lo que faltaba de `n12` (§12.1). El único ítem abierto de la spec está en §12.4 y **no es una ronda de QA**: es la frontera de cobertura automatizada de la presentación. Ver §12.6.

### 12.1 Ronda 3 — la más reciente

**Todos los hallazgos de esta ronda están `resueltos`.** El más grave de todos, B1, fue una regresión introducida por la ronda 2, y su causa raíz está registrada en la fila de B1. **`n12` pasó de `parcial` a `resuelto` el 2026-10-07**, cuando T11 estableció la línea base de avisos de consola que a esa fila le faltaba. Ver §12.6.

| Hallazgo | Estado | Dónde se resolvió |
|---|---|---|
| **B1** — RF-38 y RNF-05 sin criterio de aceptación: al renumerar, el `CA-02` viejo (la suite de pruebas) fue reemplazado por "un error de tipo rompe el build" y nadie lo repuso. La cobertura de lo único que hoy funciona había desaparecido | `resuelto` | Se agregó **CA-11**, que corre `npm test` y exige salida 0 con los tests de la suite en verde. **D-7** se reapuntó de `CA-02` a `CA-11`. **RNF-05** pasó a declarar la línea base de forma explícita. **Causa raíz registrada:** la ronda 2 renumeró los CA sin una tabla de equivalencia, y su §12 afirmó cobertura total sin verificarla. Desde entonces, cada sección de §12 lleva estado por fila y §8.1 asigna cada criterio a un paso. **Nota:** el texto original de esa fila exigía "exactamente 2 archivos"; esa exigencia se relajó después, por el cambio de requisitos del 2026-10-06 (§12.3). La parte del hallazgo que importaba —que RF-38 y RNF-05 tuvieran criterio— sigue resuelta. |
| **I1** — 7 referencias cruzadas rotas por la renumeración, todas en §2.3 y §3.2 | `resuelto` | Las 7 corregidas: RF-18→**RF-19**, RF-12→**RF-13**, RF-20→**RF-21**, RF-27/RF-28→**RF-28/RF-29**, RF-33→**RF-35/RF-36**, RF-11→**RF-12**, RF-26→**RF-27**. Además se revisó el documento completo: §6, §7, §9 y §10 no tenían residuo, y §13 tenía dos referencias viejas (`CA-11` y `CA-33`) que también se corrigieron. |
| **I2** — RF-25 (cerrar el carrito) sin criterio | `resuelto` | **CA-16** prueba las dos vías de cierre: el botón de cierre y el fondo oscurecido. |
| **I3** — §8.1 cubría 28 de 34 CA, omitía seis y repetía uno | `resuelto` | §8.1 reescrito: los 39 CA están asignados, cada uno **una sola vez**. La repetición de CA-33 desapareció (ahora es CA-10, en el paso 1). |
| **I4** — 34 CA con dos huecos y un conteo declarado de 36 | `resuelto` | CA renumerados de forma **continua: CA-01 a CA-39, sin huecos**. Conteo corregido en §8 y §11. |
| **I5** — RF-12 contradecía RNF-09 y CE-08; CA-19 sin ancho fijado | `resuelto` | **RF-12** ahora separa lo incondicional (título y botón visibles en cualquier ancho) de lo condicionado (el 3D, solo con 640 px o más y WebGL). **CA-30** fija 1280 px para el canvas y 375 px para la versión degradada. **CE-08** alineado. |
| **I6** — RNF-09 no verificable, y §12 afirmaba que CA-16 y CA-31 lo verificaban | `resuelto` | Se agregó **RF-40** y **CA-28**, que ejecutan las once acciones de §1.1 a 375 px sin cambiar el ancho. "Legible" quedó definido como magnitud en §1.1 (16 px y contraste 4.5:1). RNF-09 ahora declara su recorte de alcance y apunta a **D-16**. |
| **I7** — D-11 no reconocía el compromiso del layout móvil | `resuelto` | **D-17** declara que el campo de búsqueda pasa a una **segunda fila** en móvil, con el cálculo de la caja de 327 px. **CA-27** controla el desbordamiento horizontal además de la búsqueda. **CA-25** remite a §1.1 y a CA-28 dentro del propio criterio. |
| **I8** — "rango válido" sin definir y sin CA del límite superior | `resuelto` | Definido en §1.1 como entero de **1850 a año actual + 1**, con la referencia a las líneas de `test/validadores.ts`. **CA-20** prueba los cuatro casos: vacío, 1200, 2028 (rechaza) y 2027 (acepta). |
| **I9** — §13 daba una justificación falsa y no registraba la consecuencia del empaquetado | `resuelto` | Corregido: §13 ahora dice que la suite **sí** importa desde `src/` (`test/integridad_datos_producto.test.ts:2-3`) y que lo que crearía el ciclo es que `src/` importe de `test/`. Se registró la consecuencia real: importar los validadores desde `src/` los mete en el bundle de producción, con la mitigación (moverlos a `src/` y que `test/` los importe desde ahí). |
| **I10** — §3.2 todavía no era exhaustiva | `resuelto` | Dos filas nuevas: **enlaces de navegación** (los pide `AGENTS.md` §1, no existen en el código, ningún RF los exige) y **edición de productos** (`MEMORY.md:20` dice "carga/edicion", la spec cubre solo carga). |
| **I11** — RF-29 exigía una explicación que un solo CA verificaba, e incluía un estado inalcanzable | `resuelto` | **CA-19** verifica la explicación para precio `0`, `-100` y vacío. La categoría se **sacó** de RF-28 y RF-29, con la razón declarada: el selector es un `<select>` con valor inicial y el usuario no puede dejarlo vacío. |
| **n1** — la columna de §6 seguía titulándose "RF" | `resuelto` | Ahora es "RF o RNF". |
| **n2** — §12 tenía 35 filas y faltaba m4 | `resuelto` | Fila m4 agregada en §12.2. |
| **n3** — anglicismo y frase duplicada en el criterio del chequeo de tipos | `resuelto` | CA-10 reescrito. |
| **n4** — RNF-06 sin nombrar el host, y CA-36 exigía bloquearlo sin nombrarlo | `resuelto` | RNF-06 nombra **`images.unsplash.com`** con las líneas de referencia. CA-24 bloquea ese dominio explícitamente. El encabezado de la spec no restringe menciones de hosts, solo de archivos, así que nombrarlo era lícito. |
| **n5** — "tres motivos, todos conocidos" era una afirmación fuerte | `resuelto` | RNF-06 dice "**al menos** estos tres motivos" y explica que el campo de imagen acepta cualquier host. |
| **n6** — CA-23 exigía más de lo que cualquier RF pide | `resuelto` | CA-33 (antes CA-23) ahora dice que no exige ningún dato más allá de RF-35 y RF-36. |
| **n7** — "los tres lists coinciden" era falso | `resuelto` | Corregido: "las dos listas que nombran componentes de la página". |
| **n8** — RF-13 y §13 medían magnitudes distintas | `resuelto` | §13 ahora nombra el encabezado y el subtítulo concretos, y aclara que el subtítulo queda medio oculto, sin exagerar. |
| **n9** — "código de aplicación" sin definir, en conflicto con `postcss.config.js` | `resuelto` | Definido en §1.1. RF-39 y CA-36 dicen que los archivos de configuración de la raíz quedan **excluidos**. **Actualizado el 2026-10-07:** §1.1 excluye además los **`.css` de `src/`**, con el mismo motivo, y CA-36 dice lo mismo. Ver §12.5. |
| **n10** — CA-29 dependía de una capacidad que ningún RF garantizaba | `resuelto` | **RF-05** ahora exige que la URL sea accesible desde la red local. CA-05 lo verifica. CA-21 declara su precondición y qué hacer si el firewall bloquea. |
| **n11** — CE-13 no acotaba la consola, a diferencia de CE-07 | `resuelto` | CE-13 dice qué se permite ver y qué **no** se permite: un error que impida agregar al carrito. |
| **n12** — CA-06 frágil ante una advertencia benigna, y sin línea base | `resuelto` | CA-06 exige **cero errores** y admite avisos, con el criterio de que la lista de avisos no crezca. La mitad del hallazgo que quedaba abierta era que **esa línea base no existía**: nadie había podido abrir la aplicación. **T11 la estableció el 2026-10-07:** **0 errores y 0 avisos** de la aplicación en tres cargas seguidas. **La observación que se había anotado junto a esa cifra, el `404` de `/favicon.ico`, se vio en las sesiones de T5 y de T11 pero una remedición posterior no lo reprodujo**, así que no es una observación vigente; en su lugar hay un `loadingFailed: net::ERR_BLOCKED_BY_ORB` por la imagen de `src/datos/productos.ts:28`, que **no produce entrada de consola** y por lo tanto deja la línea base en cero errores y cero avisos. **Ese `ORB` ya no se reproduce: la URL que respondía `404` fue reemplazada por el usuario el 2026-10-07.** Ver §12.6. |
| **n13** — §2.3 y §13 no coincidían sobre si `herocanvas3d.tsx` se modifica | `resuelto` | §2.3 agrega `hero.tsx` a la tabla de modificables. **D-15** decide que la degradación se resuelve en `hero.tsx`. §13 ahora califica "no requiere cambios **para compilar**". |
| **n14** — RF-31 no exigía unicidad y no había caso de colisión | `resuelto` | RF-28 y RF-31 exigen identificador **único**. **CE-15** nuevo: la colisión se detecta y se resuelve generando otro identificador. |

### 12.2 Ronda 2 — 36 hallazgos

| Hallazgo | Estado | Dónde se resolvió |
|---|---|---|
| B1 — RF-27 contradecía §3.2 sobre el precio, y cosecha sin cota | `resuelto` | §3.2 ya no exime la cota. RF-28 y RF-29 exigen precio mayor que cero y cosecha en rango. Decisión D-12. |
| B2 — RF-18 usaba 768 px contra el `sm` real de 640 px | `resuelto` | RF-19 usa 640 px. CA-26 mide 700 px y 600 px. Decisión D-10. |
| B3 — en móvil no había campo de búsqueda | `resuelto` | Definición de §1.1, RF-11 y RF-17 incondicionales, CA-27. Decisiones D-11 y D-17. |
| B4 — 7 RF sin criterio de aceptación | `resuelto` | CA-18, CA-19, CA-20, CA-21, CA-29, CA-32, CA-33, CA-34 y CA-35. |
| I1 — CA-06 contradecía CE-07 | `resuelto` | CA-06 condicionado al escenario normal. CE-07, CE-08 y CE-13 acotan la consola. |
| I2 — CA-12 pedía un contador en 0 que no existe | `resuelto` | RF-21 dice que el indicador se oculta. CA-15 lo dice así. |
| I3 — CE-10 contradecía RF-28 | `resuelto` | CE-10 dice qué pasa. RF-31 exige el identificador alternativo. CA-21 lo verifica. |
| I4 — RNF-06 era un hecho falso | `resuelto` | RNF-06 nombra las dependencias reales. CE-13 y CA-24. |
| I5 — CA-08 no era comprobable | `resuelto` | CA-08 da los sufijos de dominio y los `font-family` computados. |
| I6 — criterios dependientes del orden | `resuelto` | §8.1 con paso 0 de reinicio. |
| I7 — CE-05 contradecía el código | `resuelto` | RF-17 y CE-05 exigen normalizar espacios. CA-13 lo verifica. |
| I8 — RNF-03 no verificable y ataba componentes | `resuelto` | RNF-03 se limita a la paleta y declara que no exige animaciones. |
| I9 — constitución §2.3 sin hogar | `resuelto` | RNF-09, RF-40 y CA-28. Decisiones D-15 y D-16. |
| I10 — RNF-07 no verificable | `resuelto` | RNF-07 fija 200 ms y 30 FPS. |
| I11 — faltaba la sincronización documental | `resuelto` | Punto 12 de §3.1, RNF-10 y CA-38. |
| I12 — CE-08 citaba el RF equivocado | `resuelto` | CE-08 apunta a RF-06 y RF-12. |
| m1 — versión de TypeScript | `resuelto` | §2.1 registra 5.9.3 instalado contra `^5.2.2` declarado. |
| m2 — `Navbar` no era diferencia de mayúsculas | `resuelto` | §2.2 distingue "otro nombre" de "solo mayúsculas y minúsculas". |
| m3 — `Canvas` no viene de `drei` | `resuelto` | §13 aclara el origen de cada import. |
| **m4** — no registrado en la ronda 2, aunque quedó resuelto en el fondo | `resuelto` | El texto erróneo que decía que RF-01, RF-02 y RF-37 se ajustarían si D-1 se rechazaba desapareció cuando D-1 pasó a "Resuelta" en §10. La consecuencia mal atribuida no era real: RF-01 habla del documento HTML y RF-02 de que un error de tipo rompa el build, y ninguno depende de la extensión de los archivos de entrada. Solo RF-39, RNF-01 y RNF-02 sí se ven afectados. Se verificó por búsqueda que el texto ya no existe. |
| m5 — `ProductoFilterState` sin mencionar | `resuelto` | §2.3 lo registra; §3.2 declara que queda sin borrar. |
| m6 — RF-33 exigía notas y maridaje sin precondición | `resuelto` | RF-35 condiciona cada bloque a que el producto lo tenga. |
| m7 — faltaba exigir el control de cierre | `resuelto` | RF-37 lo exige. CA-35 lo verifica. |
| m8 — CA para RF-09, RF-23, CE-03 a CE-05, CE-09, CE-10 | `resuelto` | CA-08, CA-13, CA-14, CA-15, CA-19 y CA-21. |
| m9 — RF-02 no era accionable | `resuelto` | RF-02 pasa a ser falsificable: un error de tipo hace fallar el build. CA-02 lo verifica. |
| m10 — umbral de tamaño inconsistente | `resuelto` | RF-04 y CA-03 usan los dos "igual o superior a 1 kB". |
| m11 — el criterio de estilo sin línea base | `resuelto` | CA-36 declara la línea base de `src/`. **Actualizado el 2026-10-07:** la línea base y el alcance se declaran sobre los `.ts` y `.tsx`, y los `.css` de `src/` se excluyen. Ver §12.5. |
| m12 — RNF-01 con método no especificado | `resuelto` | RNF-01 declara la línea base de 0 coincidencias y usa el patrón `\bany\b` como palabra completa. CA-09 lo verifica. |
| m13 — el alcance del chequeo sin fijar | `resuelto` | RF-10 lo exige. CA-10 lo verifica. |
| m14 — confluencia entre `AGENTS.md` y `MEMORY.md` | `resuelto` | §2.4 separa las tres listas y registra que `AnimatedSection` no existe. |
| m15 — §3.2 incompleta | `resuelto` | §3.2 suma `AnimatedSection`, animaciones de scroll y parallax, botellas destacadas, filtro por precio y cepa, subida de archivo, `ProductoFilterState`, enlaces de navegación y edición de productos. |
| m16 — constitución §4 sin hogar | `resuelto` | §3.2 registra la preparación para conectar una API. |
| m17 — §1 prometía un §3.2 exhaustivo y el alcance lo contradecía | `resuelto` | §1 declara los dos objetivos y reconoce que el segundo excede lo necesario para compilar, remitiendo a D-2. |
| m18 — "a pantalla completa" y "se desplaza" no son magnitudes | `resuelto` | RF-12 se reformuló como "visible sin hacer scroll". RF-13 exige que el encabezado quede visible y no tapado. CA-30 y CA-31 lo verifican. |
| m19 — se citaban herramientas inexistentes | `resuelto` | §2.5 y §11 corrigen: `herramientas/` está vacía y no hay `buscar-caracteres-raros.js` ni `verificar-layout.js`. |
| m20 — falta registrar git y los puntos y comas | `resuelto` | §2.1 registra el estado de git y el desglose de los 5 puntos y comas. El conteo del reviewer en la ronda 2 era 4 prefijos de línea; se corrigió a 3, más 1 literal de tipo y 1 literal data URI. |

**Revisadas el 2026-10-07 contra los resultados de T11: ninguna fila de esta ronda queda contradicha.** Dos merecen mención. **m19** sigue siendo cierta: `herramientas/` continúa vacía y **no** se agregó ninguna herramienta, ni para el BOM ni para nada más, así que RNF-04 no se vulneró. **m11** quedó confirmada por medición: con el alcance revisado en §12.5, el patrón `;$` da **0** en los 13 `.ts`/`.tsx` de `src/`, y los `.css` de `src/` quedan fuera de la comprobación.

### 12.3 Cambio de requisitos del 2026-10-06 — tests del orquestador

**Origen:** pedido explícito del usuario, contra una spec que estaba `aprobada`.
**Estado:** `aprobada` el 2026-10-06, tal cual.

**Qué motivations:** el `plan.md` que escribí después de la aprobación llegó a su §7.1 y dijo, textualmente, que no se agregaban tests de UI porque no había `@testing-library/*` y RNF-04 impedía instalarlo, y que los ~30 RF de comportamiento quedaban solo para navegador. El usuario pidió cerrar esa limitación.

**Qué se verificó antes de aceptar el cambio:**

| Hecho | Verificación |
|---|---|
| `jsdom` ya está instalado | `package.json`: `"jsdom": "^30.1.2"` en devDependencies |
| `react@18.3.1` exporta `act` | `node_modules/react/cjs/react.development.js:2702` |
| `act` de `react` implementa el flush de la cola | `react.development.js:2490-2569`: lee el callback, hace `flushActQueue`, y maneja resultados asíncronos |
| `react-dom/test-utils` está deprecado | `react-dom/cjs/react-dom-test-utils.development.js:1736` emite el error que recomienda importar `act` de `react` |
| Sin la variable global, React avisa | `react-dom.development.js:25292-25304`: `isConcurrentActEnvironment` lee `IS_REACT_ACT_ENVIRONMENT` y emite el aviso si falta |
| `vi.mock` estaría disponible | `vitest/dist/index.d.ts:304`. **No se usa.** Ver D-18 |
| **No hace falta ninguna dependencia nueva** | Todo lo anterior son paquetes ya instalados |

**Conclusión: RNF-04 no se toca.** Su contenido sigue siendo cierto y CA-39 ahora además comprueba que no aparezca `@testing-library/*`. **Actualizado el 2026-10-07:** esta conclusión se sostiene, y el cambio de §12.7 no la contradice: lo que se reformuló fue **cómo se mide** la regla, no la regla. Ver §12.7.

**Qué cambió en el documento:**

| Elemento | Antes | Ahora |
|---|---|---|
| RNF-05 | Congelaba 2 archivos y 46 tests. Agregar un test era incumplimiento. | Los **46 preexistentes** son invariantes: no se borran, no se modifican, no se omiten. El **número de archivos y el total dejan de estar congelados**. |
| CA-11 | Exigía 46 passed y exactamente 2 archivos. | Exige salida 0, los 46 preexistentes en verde y los nuevos en verde. Sin número fijo. |
| RF | — | **RF-41 a RF-49**, nueve requisitos nuevos de cobertura automatizada, en la §4.1b. |
| CA | — | **CA-40 a CA-49**, diez criterios nuevos, en la §8.8. |
| §8.1 | — | **Paso 7** para la suite del orquestador, con el razonamiento de D-18. |
| §8.1b | — | Frontera explícita de lo que **no** tiene cobertura automatizada. |
| §3.1 | — | Punto 13: agregar los tests del orquestador. |
| §9 | — | **D-18, D-19, D-20**. |
| D-7 | Decía "comprueba los 2 archivos y los 46 tests". | Actualizado: el criterio verifica que los 46 preexistentes sigan en verde, sin congelar el total. |

**Numeración: nada se renumeró.** Los RF nuevos son RF-41 a RF-49 y los CA nuevos son CA-40 a CA-49, agregados **al final** de sus series. Los identificadores anteriores conservan su número. El motivo es explícito: la ronda 2 de QA suffered una regresión grave (B1, §12.1) porque renumerar sin tabla de equivalencia dejó a RF-38 y RNF-05 sin criterio. Con 49 CA y 49 RF, renumerar habría tenido un costo alto y un riesgo conocido.

**Mapa de equivalencia: no aplica, porque no hubo renumeración.** Es el punto: RF-01 a RF-40 y CA-01 a CA-39 conservan su número y su texto de la versión aprobada. Los únicos identificadores nuevos son **RF-41 a RF-49** y **CA-40 a CA-49**, y están al final de sus series. Quien venga de la versión anterior no tiene que traducir ninguna referencia.

**Tres textos que sí cambiaron, sin cambiar de número:** RNF-05 (relajado), CA-11 (reformulado) y RF-38 (aclarado: "sin perder ninguno de los 46 preexistentes", ya no implica que el total sea 46). Los tres están en la tabla de arriba.

**Lo que sí cambia el conteo:** la serie de CA pasa de 39 a 49, y la de RF de 40 a 49. §8 y §11 ya dicen 49.

**Lo que este cambio NO cierra.** La suite sigue sin cubrir la presentación, por las razones de §8.1b. Eso no es un defecto del cambio: es una frontera de las dependencias disponibles, y ahora está escrita en vez de implícita.

### 12.4 Lo que queda abierto

> **Eran cuatro ítems cuando la spec se aprobó, y ahora queda uno.** Los cuatro se dejaban para la fase de validación y no para la de implementación, y se dejaban visibles a propósito: la aprobación de la spec no los cerraba. **T11, que es esa fase de validación, cerró tres** el 2026-10-07; están en **§12.6**, con su evidencia. **El que queda no se resuelve por la vía del código**: es una frontera de las dependencias disponibles. Si esa frontera llegara a desaparecer, eso vuelve a la spec como cambio.

| Ítem | Estado | Qué falta | Dónde se resuelve | Motivo |
|---|---|---|---|---|
| **Presentación sin cobertura automatizada** | `parcial` | Los 39 CA de navegador siguen siendo la única verificación de presentación, y **no son una verificación completa**: los criterios de ancho, contraste y solapamiento no se pueden verificar en jsdom. Ver §8.1b. | **En ninguna fase: es una frontera.** Lo que sí hizo T11 fue ejecutar los 39 CA de verdad, y confirmó que la frontera sigue siendo la misma. | jsdom no implementa layout, estilos computados, WebGL ni viewport variable; y `@testing-library/*` no se puede instalar (RNF-04). |

### 12.5 Aclaración de alcance del 2026-10-07 — CA-36 y los `.css` de `src/`

**Origen:** el usuario, de forma explícita, al revisar la ejecución de T11.
**Qué es:** una **aclaración de alcance de un criterio existente**. No cambia el alcance de la spec, no agrega requisitos, no agrega casos límite y no es una decisión de diseño nueva, así que **no va a §9** y **la spec sigue `aprobada`**.
**Por qué hacía falta:** T11 encontró que **CA-36 fallaba por una contradicción interna de esta spec**, y la tabla de resultados y el detalle están en `task.md`, sección T11.

**El problema, medido.** `grep -rn ";$" src/` devuelve **7 coincidencias**, y las 7 están en `src/index.css`, que creó esta misma spec en T1 (punto 4). Las tres primeras son las directivas `@tailwind base;`, `@tailwind components;` y `@tailwind utilities;`, que **T1 exige de forma obligatoria**; las otras cuatro son sintaxis CSS obligatoria: `scroll-behavior: smooth;`, `background-color: …;` y dos `@apply …;`. O sea: **obedecer T1 hace que CA-36 falle, y hacer que CA-36 pase exigiría desobedecer T1.** En los 13 archivos `.ts`/`.tsx` de `src/` el patrón da **0**.

**Qué se decidió.** Los **`.css` de `src/` quedan excluidos** de la comprobación del patrón `;$`, **igual que los archivos de configuración de la raíz**, que CA-36 ya excluía. Motivo: la convención "comillas simples, sin punto y coma" de `AGENTS.md` describe JavaScript y TypeScript, y CSS no tiene una sintaxis alternativa posible para esas líneas.

**Qué cambió en el documento, y nada más:**

| Elemento | Antes | Ahora |
|---|---|---|
| §1.1, "Código de aplicación" | Solo excluía los archivos de configuración de la raíz y `test/`. | Excluye además los **`.css` de `src/`**. |
| RF-39 | Los archivos de configuración de la raíz no están sujetos. | Se dice lo mismo de los `.css` de `src/`, remitiendo a §12.5. |
| RNF-02 | Línea base y *verificable* sin distinguir extensión. | Línea base sobre `.ts` y `.tsx`; el *verificable* excluye los `.css`. |
| CA-36 | El patrón `;$` se buscaba en "los archivos creados o modificados", sin filtro de extensión. | Se busca **solo en `.ts` y `.tsx`**; la lista de exclusiones nombra los `.css` de `src/` y su motivo. **La lista de RF y RNF que cubre no cambia: RF-39 y RNF-02.** |
| §8.1, paso 6 | Sin nota. | Advierte que el patrón `;$` no se busca en los `.css`. |
| §12.1, filas `n9` y `m11` | Resueltas contra la redacción anterior. | Actualizadas para que apunten a §12.5. |
| §2.1 y RNF-02, línea base | `src/` tiene 0 puntos y comas. | Los `.ts` y `.tsx` de `src/` tienen 0, y se aclara que la línea base es anterior a la creación de `src/index.css`. |

**Lo que este cambio NO hace.** No agrega un caso límite, no cambia ningún RF, no cambia ningún otro CA, y **no deja nada sin verificar**: tras la aclaración, `grep -rn ";$"` sobre los `.ts` y `.tsx` de `src/` da **0**. El `index.html`, que T11 restauró, no es `.css` y sigue entrando en la comprobación.

### 12.6 Ítems de §12.4 que cerró la verificación integral — T11, 2026-10-07

**Origen:** T11, la tarea de verificación integral, que es justamente la fase de validación a la que §12.4 remetía sus cuatro ítems. La corrida completa, con la evidencia medida de los 39 criterios, está en `task.md` §T11 y en su sección final.
**Qué es:** una actualización del **estado de seguimiento** de tres ítems. No cambia ningún RF, ningún RNF, ningún CA, ningún caso límite ni el alcance de la spec, así que **la spec sigue `aprobada`** y **no va a §9**. A diferencia de §12.5, **no se registra en el §Historial de estados**: ese historial registra cambios de estado de la spec y aclaraciones de alcance, y esto no es ninguna de las dos cosas.

**Resultado agregado de T11.** Los cuatro comandos salieron con código de salida `0`: `npm test` (68 tests en 4 archivos: los 46 preexistentes más los 22 nuevos), `npm run build` (`dist/` = 1.178.877 bytes), `npm run lint` y `npx tsc --noEmit`. De los **CA-01 a CA-39** quedaron **39 `OK`, 0 `no ejecutable` y 0 `FALLA`**. CA-36 pasó con el alcance revisado en §12.5.

**Lo que ese `npm run lint` en `0` significa, y lo que no significa.** El resultado es cierto y **se conserva tal cual**: el comando corrió y salió `0`. Lo que cambió con **§12.7** es su **base**, no su valor. Cuando T11 lo corrió, ya no era un comando que esta spec diera por imposible —la fila correspondiente de §3.2 afirmaba que `eslint` no estaba instalado, y eso ya era falso—: era **un comando que había quedado disponible** antes de que empezara T1. `npm run lint` **sigue fuera del alcance** y **su `0` no da cumplimiento de ningún criterio**, porque ningún RF ni ningún CA de esta spec lo mide. Lo que sí hizo T11 con ese comando fue una comprobación de estado del repositorio, y en esa tarea también quitó las tres líneas muertas del bloque `ignores` de `eslint.config.js`. El registro de lo que pasó en T11 **no se borra ni se reescribe**: esta es solo una aclaración de cómo hay que leer su resultado a la luz del estado corregido del repositorio.

| Ítem de §12.4 | Estado | Qué se comprobó y con qué evidencia |
|---|---|---|
| **Accesibilidad de CA-21 desde la red local** | `resuelto` | **El firewall de Windows no bloqueaba el tráfico TCP: tapaba los paquetes ICMP de diagnóstico**, que es lo que había hecho que T5 dejara este criterio en `no ejecutable`. Con el puerto 5173 abierto, el servidor de desarrollo publicado en **`http://192.168.1.9:5173/`** monta la aplicación y responde igual que desde el loopback, que es lo que exigen **RF-05** y **CA-05**. Desde esa URL se cumple la precondición de **CE-10**: `isSecureContext` es `false` y `typeof crypto.randomUUID` es `undefined`. El envío de datos válidos pasó las tarjetas de 2 a **3**, el formulario bajó a **0** en el DOM, o sea que se cerró, el identificador generado fue **`producto-muy9uuzk-ttc765dc`** —el método alternativo de **RF-31**, no un UUID— y quedaron **0 errores de consola** y **0 peticiones fallidas**. **CA-21 pasó y es ejecutable.** |
| **Verificación de UTF-8 sin BOM (RNF-08)** | `resuelto` | Se leyó el primer trío de bytes de cada archivo creado o modificado: **23 de 23 sin BOM**. Incluye los dos archivos de test nuevos y el andamiaje compartido, que eran el riesgo porque los crea una herramienta y no una persona. **No se agregó ninguna herramienta** al repositorio para hacerlo: `herramientas/` sigue vacía, así que **RNF-04** no se vulneró. El detalle archivo por archivo está en `task.md` §T11. |
| **Línea base de avisos de consola para CA-06** | `resuelto` | No se pudo registrar antes de los cambios, así que se estableció **contra la aplicación ya construida**: **0 errores y 0 avisos** de la aplicación en tres cargas seguidas (localhost con caché fría, localhost caliente e IP local). Lo único que aparece es `debug: 2` e `info: 1`, que son los mensajes de conexión del cliente de HMR de Vite, no de la aplicación. **Con eso, CA-06 pasa de tener una tolerancia declarada a tener un valor medido.** |

**Matiz sobre CA-21, para no exagerar lo verificado.** **CA-05** ofrece las dos vías con un «o»: «desde **otro** dispositivo de la misma red, **o** desde la IP local de la máquina». Se ejecutó la segunda, desde el navegador de la propia máquina y contra su IP local. **La spec no exige un segundo dispositivo físico**, así que por esa vía no queda nada abierto; y T5 había dejado el criterio en `no ejecutable` por un diagnóstico equivocado, no por una limitación real del entorno.

**Una trampa de medición que casi produjo un falso `FALLA`, y que se deja registrada porque reaparece.** Una página conducida por CDP no se compone si nadie la mira, y entonces el navegador **frena los `requestAnimationFrame`**: las animaciones de salida no avanzan y los nodos que salen quedan clavados en el DOM. Con `Emulation.setFocusEmulationEnabled` el mismo código da unos 61 `requestAnimationFrame` por segundo. Con el instrumental sano, **CA-18 y CA-21 se midieron bien**; el detalle está en `task.md` §T11.

**Lo que este cambio NO cierra, y no se presenta como cerrado.** La observación del `404` de `/favicon.ico` que T11 registró al medir CA-06 **no se pudo reproducir, así que no es una observación vigente**. Se observó en las sesiones de T5 y de T11, en la primera carga con caché fría, y una remedición posterior con `Network.clearBrowserCache`, `setCacheDisabled: true` y perfil limpio **no lo reproduce**: Chrome no llega a pedir `/favicon.ico` ni en carga fría ni en caliente, y en la traza de red no hay ninguna petición que mencione `favicon`. El servidor sí responde `404` si se le pregunta directamente, pero **el navegador no lo pregunta**, así que la explicación que T11 le dio —que lo pedía el navegador por no haber `<link rel='icon'>` ni carpeta `public/`— no se sostiene como observación reproducible. **Lo que sí era permanente en esas cargas, y es lo que corresponde registrar, es otro hecho:** en esas mismas cargas había un `loadingFailed: net::ERR_BLOCKED_BY_ORB` que no desaparecía nunca, porque **la imagen del segundo producto del catálogo inicial no cargaba**: la URL de `src/datos/productos.ts:28` (`photo-1558001373-7b9fbd4830e1` de Unsplash) **respondía `404` en el origen**, verificado por petición HTTP directa (`404`, `text/html`), mientras que la de la línea 15 respondía `200`. **Ese `ERR_BLOCKED_BY_ORB` no producía ninguna entrada de consola**, porque Chrome lo bloquea sin escribir nada, así que **CA-06 se cumple igual y por la razón correcta: cero errores y cero avisos en consola**, y no "cero errores salvo el favicon". **La redacción de CA-06 no se modificó**: sigue exigiendo cero errores de nivel `error` en la consola, y eso se cumple. **Esa URL que respondía `404` se documentó y no se corrigió mientras esta spec estuvo abierta**, porque `plan.md` §2.3 declaraba `src/datos/productos.ts` intocable para esta spec. **Resuelto el 2026-10-07, ya con la spec cerrada y por autorización explícita del usuario:** la URL fue reemplazada por `photo-1599113656124-b96bf21e30d3`, verificada en `200` y en el host `images.unsplash.com` que exige **RNF-06**, y el `ERR_BLOCKED_BY_ORB` permanente que se registra acá ya no se reproduce. **El defecto no lo detectaron CE-13 ni CA-24, porque los dos prueban el bloqueo deliberado de `images.unsplash.com`**, que produce el mismo `naturalWidth = 0` que el `404` real, y ninguno de los dos exige que la imagen cargue en el escenario normal: ambos solo comprueban que los datos de cada producto sigan visibles y que agregar al carrito siga funcionando. **Falta un criterio que verifique en el estado sano que la imagen de cada producto carga de verdad (`naturalWidth > 0` y `complete === true`)**; ese hueco del método de prueba se repetirá en cualquier especificación que mida solo la degradación. **Declarar un `<link rel='icon'>` o aportar un `public/favicon.ico` ya no es una decisión pendiente**: la evidencia no lo justifica como arreglo, porque el navegador no pide el favicon. Queda, si el usuario lo quiere, como una opción estética de la página, y no como una tensión abierta con el criterio.

**Qué más cambió en el documento, y nada más:** §12 intro (las rondas documentadas ya no tienen filas abiertas), §12.1 (la intro y la fila `n12`, que pasa de `parcial` a `resuelto`, con la referencia corregida de §12.3 a §12.6), §12.2 (una línea de revisión, sin cambiar ninguna fila), §11 (una nota fechada, sin reescribir sus afirmaciones) y §13 (una nota fechada en la fila del firewall).

### 12.7 Segunda aclaración de alcance del 2026-10-07 — `eslint`, `npm run lint` y la línea base de dependencias

**Origen:** el revisor, en su informe de la implementación, que devolvió **CAMBIOS NECESARIOS** con un único cambio: una contradicción entre lo que la spec afirmaba del estado del repositorio y lo que el repositorio tiene.

**Qué es:** una **aclaración de alcance y de registro**, autorizada por el usuario. **No cambia el alcance de la spec**, no agrega ni elimina ningún requisito, no agrega ningún caso límite y **no es una decisión de diseño nueva**, así que **no va a §9** y **la spec sigue `aprobada`**. Es hermana de **§12.5**, que es el mismo tipo de cambio y el mismo criterio para conservar la aprobación.

**Qué NO es, y conviene decirlo porque es lo que evita la confusión:**
- **No** es una admisión de incumplimiento de RNF-04. El sentido útil de esa regla —que ninguna tarea de la spec instale dependencias— se sostiene.
- **No** autoriza instalar ni desinstalar nada. La decisión del usuario fue **aceptar el estado actual del repositorio y corregir la spec**: no se revierte nada.
- **No** convierte `npm run lint` en un criterio de aceptación.
- **No** declara una línea base de dependencias, porque esa línea base no es demostrable en este repositorio.

**El problema, medido.** La spec afirmaba tres cosas que ya no eran ciertas, y una cuarta que nunca fue comprobable:

| Afirmación de la spec | Dónde | Estado real |
|---|---|---|
| "`eslint` **no está instalado**", y por eso `npm run lint` está fuera de alcance como tarea de arreglo | §3.2 | **Falso.** `eslint`, `typescript-eslint`, `@eslint/js` y `@stylistic/eslint-plugin` están en `devDependencies`, existe `eslint.config.js`, y `npm run lint` sale `0` |
| El script `lint` es el de siempre | §2.1 | El script **se reescribió**: se le quitaron `--ext ts,tsx` y `--report-unused-disable-directives`, obsoletos bajo flat config |
| `test` = `vitest run`, y `jsdom` ya instalado, como parte del estado dado por bueno | §2.1 | **Cierto hoy**, pero la cadena de `npm install` que los instaló es del **2026-10-05 23:49**, **posterior a la redacción de §2.1** |
| "`package.json` y `package-lock.json` sin cambios en dependencias" / "exactamente las mismas dependencias que antes de esta spec" | **RNF-04** y **CA-39** | **No comprobable.** El repositorio **no tiene ningún commit**, así que no hay contra qué comparar |

**Por qué la línea base no es demostrable.** El repositorio no tiene **ningún commit**: `git log` responde que la rama `main` no tiene ninguno. Lo que hay es un índice de staging que es una **foto anterior a todo el proyecto** (todavía registra `spec/001/`, que en disco es `specs/`, y guarda el `index.html` viejo de una línea). `git diff` compara el árbol de trabajo contra ese índice, así que devuelve un diff de **2.622 líneas** en `package-lock.json` que **no** es el cambio de esta spec.

La evidencia que sí sirve es de **`LastWriteTime`**, y es lo que usó T11. **Esta tabla es únicamente de dependencias**: los archivos que aparecen en ella son los que RNF-04 y CA-39 miden, y por eso la lista es de paquetes instalados y de los dos archivos que declaran y fijan las dependencias.

| Paquete o archivo | `LastWriteTime` | Relación con T1 |
|---|---|---|
| `node_modules/vitest`, `node_modules/jsdom` | 2026-10-05 **23:49** | **Antes** de T1 |
| `node_modules/eslint`, `typescript-eslint`, `@eslint/js`, `@stylistic/eslint-plugin` | 2026-10-06 **11:37** | **Antes** de T1 |
| `package.json` | 2026-10-06 **11:42:43** | **12 minutos antes** del primer archivo de T1 |
| `package-lock.json` | 2026-10-06 **11:42:14** | **Antes** del primer archivo de T1 |
| `tsconfig.json`, `src/index.css`, `postcss.config.js`, `vite.config.ts` (**primer archivo de T1**) | 2026-10-06 **11:54:29** | La referencia |

> **`eslint.config.js` no está en esta tabla a propósito, y no porque su fecha sea desconocida.** La tiene, y es la de su **última** modificación: el **2026-10-07 a las 12:37:24**, que es cuando **T11** le quitó las tres líneas muertas del bloque `ignores`. **CA-39 no mide ese archivo** —mide los conjuntos de `dependencies` y `devDependencies` de `package.json`—, así que su fecha no forma parte de la evidencia de dependencias. Y no es lo mismo: un archivo de configuración del linter no declara ni fija ninguna dependencia. Su historia completa está registrada en **§12.6**, que es donde corresponde.

**Qué prueba esa tabla y qué no.** **Prueba** que ninguna tarea de la spec instaló ni desinstaló nada: `package.json` y `package-lock.json` se escribieron doce minutos antes de que existiera el primer archivo de T1, y ninguna nota de T1 a T10 declara haber instalado nada. **No prueba** que las dependencias sean idénticas a las que había cuando se redactó la spec, porque las fechas acotan **cuándo se escribió un archivo**, no **qué cambió dentro de él**, y porque la cadena del 2026-10-05 23:49 es **posterior a la redacción de §2.1**. Por eso **no se declara ningún número de dependencias** como línea base: hacerlo sería inventar una garantía que la evidencia no da. **El alcance de la prueba es exactamente el de la tabla**: los seis paquetes y los dos archivos de dependencias. `eslint.config.js` no participa, y no porque su fecha sea anterior a T1 —no lo es— sino porque no es una dependencia y CA-39 no lo mide.

**Qué necesitaban esos seis paquetes, y por qué la distinción importa.**

| Paquete | ¿Lo exige algún RF o CA de esta spec? | Detalle |
|---|---|---|
| `vitest` | **Sí** | `npm test` es `vitest run`: es el motor de **RF-38**, **RNF-05** y de los tests de **RF-41 a RF-49**, verificados por **CA-11** y **CA-40 a CA-49** |
| `jsdom` | **Sí** | Es el entorno de `vitest.config.ts`, y sin él no corre la suite del orquestador (**RF-41 a RF-49**) |
| `eslint` | **No** | Ningún RF ni ningún CA de esta spec mide el lint |
| `typescript-eslint` | **No** | Ídem |
| `@eslint/js` | **No** | Ídem |
| `@stylistic/eslint-plugin` | **No** | Ídem |

**La consecuencia útil de esa tabla.** Los dos primeros **no los instaló ninguna tarea de esta spec**: ya estaban antes de T1, y RNF-04 y CA-39 lo dicen explícitamente. Los otros cuatro **tampoco los instaló ninguna tarea de esta spec**, y además **no los necesita nadie dentro de esta spec**: existen en el repositorio por trabajo ajeno a la 002, hecho que §3.2 ya reflejaba al dejar el lint fuera de alcance. La diferencia entre los dos grupos no es de dependencia sino de **atribución**: los primeros los exige la suite de esta spec; los segundos, nadie dentro de ella.

**Qué decidió el usuario, y por qué.** **Aceptar el estado actual del repositorio y corregir la spec.** Motivo: el repositorio **funciona** —`npm run lint` sale `0` y T11 lo verificó—, no hay ningún criterio de esta spec roto por ello, y la alternativa de desinstalar los cuatro paquetes habría dejado el proyecto en un estado **peor** que el que había, además de violar el `MEMORY.md` que los registra como parte del stack. **No se revierte nada.** Se conserva el registro: la fila de §3.2 queda con la explicación de por qué el lint está fuera de alcance y con la corrección de la afirmación falsa.

**Qué cambió en el documento, y nada más:**

| Elemento | Antes | Ahora |
|---|---|---|
| §2.1, fila de `Scripts` | `lint` = `eslint …`, con un valor elíptico que no era el real | El valor real (`eslint . --max-warnings 0`) y una nota fechada que separa el estado de la redacción del estado actual, con el motivo por el que el script se reescribió |
| §3.2, fila de **`npm run lint`** | "El script existe pero `eslint` **no está instalado**. Arreglarlo es otra tarea…" | La fila **sigue ahí** y se conserva el motivo de fondo: el lint no es necesario para compilar ni arrancar y ningún RF ni CA lo mide. Se **retira la afirmación falsa** y se registra que `eslint` **sí** quedó instalado y que el comando funciona. **No sale de la tabla.** |
| **RNF-04** | "No se instalan dependencias nuevas. *Verificable:* `package.json` y `package-lock.json` sin cambios en dependencias." | Prohibe **una acción de las tareas de la spec** (no instalan ni desinstalan), no un estado absoluto del archivo. El *verificable* pasa a **la atribución**, con el método (`LastWriteTime`), el motivo por el que `git diff` no sirve (no hay commits) y el **límite explícito**: la línea base no es demostrable y no se declara ningún número |
| **CA-39** | "`package.json` y `package-lock.json` tienen exactamente las mismas dependencias que antes de esta spec. Ni una agregada, ni una quitada." | Mide **que ninguna tarea de la 002 haya agregado ni quitado dependencias**, con la tabla de `LastWriteTime`, el límite de esa evidencia y la tabla de qué paquete necesita la spec. **Conserva** la prohibición de `@testing-library/*` |
| §8.1, paso 6 | Sin nota sobre CA-39 | Advierte que CA-39 se verifica por `LastWriteTime` y no por `git diff`, con la causa |
| §12.6, resultado de T11 | Los cuatro comandos salen `0`, sin matiz | **El resultado se conserva intacto** y se le agrega cómo hay que leerlo: el `0` de `npm run lint` dejó de ser un dato sobre un comando que la spec daba por imposible y pasó a ser el de un comando que quedó disponible **antes de T1**. Sigue fuera de alcance y no cumple ningún criterio |
| **§Historial de estados** | Última línea: la aclaración de CA-36 (§12.5) | Una línea más: esta segunda aclaración, con la misma fórmula, declarando que **la spec sigue `aprobada`** |

**Lo que este cambio NO hace.** **No** toca ningún archivo del proyecto: ni `package.json`, ni `package-lock.json`, ni `eslint.config.js`, ni `src/`, ni `test/`. **`eslint.config.js` tampoco es evidencia de esta aclaración**: su fecha real, el **2026-10-07 12:37:24**, es la de la modificación que le hizo T11, y eso no altera nada de lo que RNF-04 y CA-39 miden. **No** instala ni desinstala nada. **No** cambia ningún RF, ningún caso límite ni ningún CA salvo RNF-04 y CA-39, y en esos dos solo cambia **cómo se mide una regla que ya existía**, no la regla. **No** agrega entradas a §9. **No** declara una línea base de dependencias. **No** borra el registro de lo que midió T11. Y **no** toca, por decisión explícita y porque quedan fuera de esta autorización, las otras dos observaciones del revisor: la ausencia de criterio de aceptación de **CE-15**, y la URL de imagen que respondía `404` en `src/datos/productos.ts:28`. **La segunda ya no queda sin registrar**: la corrección posterior de la evidencia de CA-06 la documenta como observación en las cuatro filas que tratan esa línea base —las dos de `task.md` (la de los ítems de §12.4 en §T11 y la de "Lo que queda para la fase de validación") y las dos de este documento (§12.1, fila `n12`, y §12.6)—, **sin corregir el archivo**, porque `plan.md` §2.3 lo declaraba intocable para esta spec. **Esa segunda observación se cerró el 2026-10-07**, ya con la spec cerrada y por autorización explícita del usuario: la URL se reemplazó y la imagen del segundo producto carga. La lectura de **CA-06** con respecto al favicon sí se corrigió después, en esa misma corrección de la evidencia. **CA-06 no se modifica.**

---

## 14. Qué tiene que actualizar el plan después de la re-aprobación

Estos cinco puntos son los que cambian en `plan.md` y `task.md`. **No se tocaron en esta ronda**, porque la spec tiene que volver a aprobarse primero.

| Documento | Qué cambia |
|---|---|
| `plan.md` §1.3 | Decir que la estrategia de tests ya **no** es solo de regresión: se agrega la suite del orquestador. Y borrar la afirmación "No se agregan tests nuevos", que quedó desactualizada. |
| `plan.md` §7.1 | **Reemplazar** la limitación "No se agregaron tests de UI" por la frontera de §8.1b de esta spec. |
| `plan.md` §2.2 | Agregar el archivo de tests del orquestador a la tabla de archivos a crear, y las modificaciones de import de los dos archivos de test preexistentes. |
| `plan.md` §4 | Agregar una fila por cada RF nuevo, y marcar RF-41 a RF-49 como cubiertos por la tarea de tests. |
| `task.md` | **Una tarea nueva** para los tests del orquestador, colocada **después** de la de pie de página, por D-18. Su índice pasa de 10 a 11 tareas. |
| `task.md` | Reapuntar T10, que hoy exige "46 passed, 2 archivos" en su lista de verificación, a la formulación nueva de CA-11. |

---

## 13. Anexo — restricciones para `plan.md`

Esta sección **no es normativa**. Solo deja registradas las restricciones que el repositorio ya impone, para que `plan.md` no tenga que redescubrirlas. El plan decide el cómo.

| Restricción verificada | Consecuencia para el plan |
|---|---|
| `package.json` tiene `"type": "module"` | Cualquier archivo de configuración con extensión `.js` se interpreta como ESM. La configuración de PostCSS debe exportarse con `export default`, no con `module.exports`. |
| `npm run build` es `tsc && vite build` | El chequeo de tipos es parte del build y no debe emitir archivos al árbol de fuentes. |
| `@types/react@18.3.31` mantiene el namespace `JSX` global, y `@react-three/fiber@8.18.0` lo amplía con los intrínsecos de three (`mesh`, `cylinderGeometry`, `meshPhysicalMaterial`, etc.) | `herocanvas3d.tsx` tipa correctamente bajo JSX automático, siempre que el archivo que lo importa se incluya en la verificación (RF-10). No hacen falta declaraciones `/// <reference>` manuales. |
| `Canvas` y `useFrame` vienen de `@react-three/fiber`; `Float`, `Environment` y `ContactShadows` vienen de `@react-three/drei` | `herocanvas3d.tsx:2` importa `Canvas` del primer paquete y `herocanvas3d.tsx:3` los otros tres del segundo. Ese archivo no necesita cambios para compilar. |
| `Environment preset='city'` descarga un mapa de entorno desde un CDN externo en tiempo de ejecución | Es una de las tres dependencias de red de RNF-06. `@react-three/fiber` ya envuelve el contenido del `Canvas` en un `Suspense` y una `ErrorBoundary` internos, lo que sustenta CE-07: la falla queda acotada al canvas. |
| `herocanvas3d.tsx:73` renderiza `h-[400px] md:h-[550px]` | La altura del canvas 3D no es la altura del viewport. RF-12 se formuló en consecuencia, sin apelar a "a pantalla completa". |
| `barra_de_navegacion.tsx:34` es `fixed`, y `carta_de_catalogo.tsx:36` no tiene desplazamiento de anclaje | Al navegar hasta el catálogo, el encabezado `<h2>Catálogo de Vinos</h2>` (`carta_de_catalogo.tsx:41`) queda tapado por la barra fija. El subtítulo `<p>Nuestra Colección</p>` (línea 38) queda medio oculto. **RF-13 y CA-31** exigen que el `<h2>` quede visible por completo. |
| `barra_de_navegacion.tsx:83` renderiza el contador solo con `cartCount > 0` | El indicador desaparece al vaciarse el carrito. RF-21 y CA-15 lo dicen así, no como "contador en 0". |
| `carta_de_catalogo.tsx:21` mantiene el filtro por categoría como estado local, y su filtro por texto pasa a minúsculas sin normalizar espacios | RF-17 y CE-05 obligan a normalizar espacios. `ProductoFilterState` sigue sin usarse (ver §3.2). |
| `herocanvas3d.tsx` usa `useRef<THREE.Group>(null!)` y `editor_formador_productos.tsx` usa el tipo `React.FormEvent` sin importar `React` | Ambos son válidos bajo TypeScript estricto con el runtime JSX automático. No requieren cambios **para compilar**. La degradación del 3D en móvil se resuelve en `hero.tsx` (D-15), no acá. |
| Los validadores de `test/validadores.ts` están escritos y probados, pero viven **fuera** de la aplicación | El formulario puede aplicar `esPrecioValido` y `esAnioRazonable` sin dependencias nuevas (RF-28, RF-29, D-12). **Pero importarlos desde `src/` los mete en el bundle de producción**: Vite resuelve `src/` como código de aplicación, así que el archivo de validadores acabaría dentro de `dist/`. **Mitigación que el plan debe respetar:** mover los validadores a `src/` (por ejemplo `src/utils/validadores.ts`) y dejar `test/` importándolos desde ahí, en vez de que `src/` importe desde `test/`. Así la suite sigue probando lo mismo y el validador que usa el formulario es código de aplicación legítimo. |
| La suite **sí** importa desde `src/`: `test/integridad_datos_producto.test.ts:2-3` importa `../src/datos/producto` y `../src/types/producto` | Esto no crea un ciclo **hoy**, porque `src/` no importa nada de `test/`. Lo que lo crearía es exactamente lo que hay que evitar: que `src/` pase a importar de `test/`. Ver la fila anterior. |
| `test/` contiene 3 archivos que importan de `../src/types/producto` y `../src/datos/producto` | Reubicar carpetas o cambiar esos módulos rompe la suite. RF-10 y CA-10 incluyen `test/` en el chequeo de tipos, sin mover los archivos. |
| `vitest.config.ts` recolecta solo `test/**/*.test.ts` y excluye `node_modules`, `dist`, `.opencode`, `.agents` y `.git` | La configuración de la aplicación no debe ampliar ni reducir ese conjunto. Un archivo de test nuevo para el orquestador tiene que caer dentro de `test/` y terminar en `.test.ts`, o no se recolecta. |
| `vitest.config.ts` fija `environment: 'jsdom'` y `watch: false` | `jsdom` es el entorno en el que corren los tests del orquestador, y ya estaba instalado: no hay que cambiar la configuración ni instalar nada. `watch: false` hace que `npm test` salga solo, que es lo que CA-40 a CA-49 necesitan. |
| `jsdom` **no implementa layout** | No calcula tamaños ni posiciones: `getBoundingClientRect` devuelve ceros y `scrollWidth` es 0. Por eso ningún criterio de ancho, contraste o solapamiento puede verificarse con la suite. Es la razón de la mitad de §8.1b. |
| `react-dom/cjs/react-dom.development.js:25292` lee `IS_REACT_ACT_ENVIRONMENT` | Sin esa variable global en `true`, `act` emite el aviso "The current testing environment is not configured to support `act(...)`". Hay que fijarla en el test. Ver D-19. |
| El servidor de desarrollo de Vite escucha solo en loopback por defecto | Para observar CE-10 hay que exponerlo en la red local (`--host`). RF-05 y CA-05 lo exigen. Si el firewall bloquea el acceso, CA-21 queda `no ejecutable` y se reporta así. **Medido el 2026-10-07:** en esta máquina **el firewall no bloqueó el tráfico TCP al puerto 5173**; lo que tapaba eran los paquetes ICMP de diagnóstico. El servidor publicó `http://192.168.1.9:5173/` y CA-21 se ejecutó y pasó desde ahí. La fila **no se modifica**: el condicional sigue siendo cierto y la restricción del repositorio sigue siendo la misma. Ver §12.6. |

> Nota: el `MEMORY.md` y el `AGENTS.md` siguen diciendo `pnpm`. Mientras eso no se corrija (fuera de alcance, sección 3.2), **todos los comandos de esta spec usan `npm`**, que es lo que el repositorio efectivamente soporta.
