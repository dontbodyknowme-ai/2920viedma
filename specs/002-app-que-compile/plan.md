# Plan 002 — Que la aplicación compile y arranque

**Spec:** `specs/002-app-que-compile/spec.md`, estado `aprobada` (2026-10-06)
**Fase:** 3 de 5 (plan). Este documento define el **CÓMO**. El QUÉ y el POR QUÉ están en la spec.
**Restricción dominante:** no se instala ninguna dependencia (RNF-04). Todo lo que este plan necesita ya está en `node_modules`, **incluidos** `react`, `react-dom` y `jsdom` para los tests del orquestador.
**Tareas: 11.** La novena, **T9**, es la de los tests del orquestador, y va después de la de pie de página por D-18.
**Actualizado** el 2026-10-06 tras el cambio de requisitos que agregó RF-41 a RF-49 y CA-40 a CA-49.

---

## 1. Estrategia de ejecución

### 1.1 La idea central

La app está rota en **tres capas que se arreglan en cascada**: primero la configuración (sin la cual nada se compila), después los imports y el punto de entrada (sin los cuales el chequeo de tipos no pasa), y por último el comportamiento y los componentes nuevos.

El orden no es arbitrario. Cada capa es precondición de la siguiente:

```
capa 1  configuración    tsconfig + vite.config + postcss.config + index.css + index.html
                            │
                            ▼  sin esto, `tsc` imprime su ayuda y `vite build` no transforma JSX
capa 2  estáticos        9 imports rotos + main.jsx→main.tsx + App.jsx→App.tsx esqueleto
                            │
                            ▼  sin esto, el chequeo de tipos falla por módulos inexistentes
capa 3  capa 2b          hero.tsx completo (es TS, no necesita migración)
                            │
                            ▼  sin esto, App.tsx importa un módulo que no exporta nada
══════════════════════ primer build verde ══════════════════════
capa 4  lógica           App.tsx con estado + persistencia + 6 componentes conectados
                            │
                            ▼
capa 5  ajustes          navbar móvil, scroll-mt, trim de búsqueda, validación del form, id único
                            │
                            ▼
capa 6  componentes      vista_rapida_producto + pie_de_pagina
                            │
                            ▼  la suite del orquestador importa App.tsx, que importa estos dos
capa 7  tests             orquestador_carrito + orquestador_persistencia   (T9, por D-18)
capa 8  cierre            documentación + verificación integral
```

### 1.2 Por qué este orden y no otro

**El primer build verde llega en T5.** Es deliberado: las primeras cinco tareas son todas de "que compile", y cada una es verificable con `npm run build`. A partir de T6 el build sigue verde y lo que se agrega es comportamiento, que se verifica en navegador. Así el implementador siempre sabe si rompió la compilación o la funcionalidad.

**Son 11 tareas, agrupadas en 8 capas.** Las capas son la explicación del orden; las tareas son el trabajo. La tarea de tests va en la capa 7, después de los componentes, por D-18.

**Lo que se puede hacer en paralelo, y por qué decoupled.** En principio T2 (imports) y T3 (hero) no se tocan. Pero T3 importa `./herocanvas3d`, y T2 renombra imports en otros archivos. Si un implementador hace las dos en paralelo sobre el mismo archivo se pisan. **Decisión: hay una sola persona implementando, así que "paralelo" significa "sin dependencia lógica", no "simultáneo".** Lo que sí importa es que T2 y T3 no *necesiten* el resultado de T1 para escribirse: solo para verificarse.

**Lo que sí es estrictamente secuencial y por qué:**

- T1 → todo. Sin `tsconfig.json` no hay chequeo de tipos que sirva, y `npm run build` no llega al paso 2.
- T2 → T4. `App.tsx` importa los componentes por rutas corregidas. Si T4 se escribiera antes de T2, el import apuntaría a un nombre inexistente y el error de tipo sería ruido, no información.
- T4 → T5. `App.tsx` (capa 4) consume las props que definan los componentes. Escribir el orquestador antes que los componentes obliga a adivinar firmas.
- T5 → T6. Los ajustes de componentes (capa 5) cambian comportamiento observable de lo que `App.tsx` ya conecta. `App.tsx` debe existir primero para poder verificar que el ajuste no rompe la integración.
- T5 → T7, T8. La vista rápida consume el estado de producto seleccionado que `App.tsx` crea; el pie de página se monta en `App.tsx`.
- **T8 → T9. Es la dependencia que define D-18.** La suite del orquestador importa `App.tsx`, que importa los dos componentes de T7 y T8. Antes de que existan, los tests fallarían por módulos inexistentes y no por lógica.
- T9 → T10 → T11. Documentación y verificación integral van al final por definición.

**Una decisión de riesgo que evita un deadlock.** `editor_formador_productos.tsx` necesita `esPrecioValido` y `esAnioRazonable`, que hoy viven en `test/validadores.ts`. Y §13 dice que importarlos desde `src/` los mete en el bundle. Si T6 (validación) dependiera de mover los validadores, y moverlos rompiera los tests que los importan desde `./validadores`, aparecería un nudo. **Se resuelve en T2**, junto con los imports: mover el archivo es parte de "arreglar dónde vive cada cosa", no de "cambiar comportamiento". T2 deja los 46 tests preexistentes verdes Y deja los validadores accesibles desde `src/`, y **T5** los consume (la validación del formulario quedó en T5, no en T6; T6 es la de ajustes de componentes existentes).

### 1.3 Estrategia de tests

**La suite tiene dos capas, con reglas distintas.**

**Capa 1 — los 46 tests preexistentes, que son invariantes.** Viven en `test/validadores.test.ts` (26 casos, 15 parametrizados) y `test/integridad_datos_producto.test.ts` (20 casos). No se borran, no se modifican, no se omiten. La única modificación admitida es la **ruta** de un import, cuando `test/validadores.ts` se reubica en `src/utils/`. RNF-05 lo declara así de explícito desde el cambio de requisitos del 2026-10-06.

**Capa 2 — los tests nuevos de la lógica de estado del orquestador.** Cubren RF-41 a RF-49, con CA-40 a CA-49. Se escriben en **una sola tarea, la última**, y usan tres piezas que **ya están instaladas**: `createRoot` de `react-dom/client`, `act` de `react`, y el entorno `jsdom` que `vitest.config.ts` ya declara. **No se instala nada.** D-19.

| Momento | Verificación | Qué protege |
|---|---|---|
| Al cierre de **cada** tarea | `npm test` → salida 0, **los 46 preexistentes en verde** | RNF-05, RF-38, CA-11 |
| Después de **T5** (primer build) | `npm run build` → exit 0 | RF-03, CA-01 |
| En **cada** tarea de capa 4 a 6 | `npx tsc --noEmit` → exit 0 | RF-10, RNF-01, CA-01 |
| Al cierre de **T9** (tarea de tests) | `npm test` → salida 0, preexistentes y nuevos en verde | RF-41 a RF-49, CA-40 a CA-49 |
| Al cierre de **T11** (verificación integral) | `npm run build` + `npm run dev` + navegador | RF-01 a RF-40, CA-01 a CA-39 |

**El total de tests y de archivos dejó de estar congelado.** Antes esta sección decía que no se podían agregar tests, y lo justificaba con que RNF-05 fijaba 2 archivos y 46 tests. Eso ya no es cierto: RNF-05 congela **los tests preexistentes**, no el tamaño de la suite. Ver D-18 y §7.1.

**Por qué los tests de estado van al final y no con T5.** `App.tsx` importa la vista rápida y el pie de página, que se escriben en T7 y T8. Si la suite del orquestador corriera en T5, fallaría por módulos inexistentes y no por lógica. **D-18** desarrolla las tres opciones y elige correr al final.

**La lógica de dominio no pierde cobertura al reubicar los validadores.** `esPrecioValido` y `esAnioRazonable` ya tienen 46 tests que los cubren. Cuando T2 mueva `test/validadores.ts` a `src/utils/`, esos tests **siguen vigentes**: el archivo de test pasa a importar de la nueva ubicación. La cobertura se reubica, no se pierde.

**Lo que queda sin cobertura automatizada: la presentación.** Es una frontera de las dependencias, no una omisión. Está enumerada en §7.1 y en §8.1b de la spec.

---

## 2. Mapa de archivos

### 2.1 Archivos a crear

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `tsconfig.json` | Configuración del chequeo de tipos. Cubre `src/`, `test/` y los dos `*.config.ts` de la raíz. | T1 |
| `vite.config.ts` | Transforms JSX/TSX con `@vitejs/plugin-react`, y expone el servidor en la red local. | T1 |
| `postcss.config.js` | Corre Tailwind sobre los `@tailwind` de `src/index.css`. | T1 |
| `src/index.css` | Las tres directivas `@tailwind` más los tokens base del tema oscuro. | T1 |
| `src/components/vista_rapida_producto.tsx` | Modal de detalle: imagen grande, notas de cata, maridaje, control de cierre. **Se crea en T7, pero `App.tsx` ya lo importa desde T5.** | T7 |
| `src/components/pie_de_pagina.tsx` | Horarios, ubicación, redes sociales, aviso +18. **Se crea en T8, pero `App.tsx` ya lo importa desde T5.** | T8 |
| `test/orquestador_carrito.test.ts` | Tests de la lógica de carrito del orquestador: RF-41 a RF-45 y RF-49. | T9 |
| `test/orquestador_persistencia.test.ts` | Tests de persistencia, arranque con datos corruptos y conservación del filtro: RF-46, RF-47, RF-48. | T9 |

**Los dos archivos de test tienen que terminar en `.test.ts` y vivir bajo `test/`.** `vitest.config.ts` recolecta `test/**/*.test.ts` y nada más: un archivo con otra extensión o en otro directorio **no se recolecta**, y la suite pasaría en verde sin correr los tests nuevos. Es un modo de fallo silencioso, y por eso está en la lista de verificación de T9.

**Y no se toca `vitest.config.ts`.** `jsdom` ya está declarado como entorno y `watch: false` ya está, así que la suite del orquestador funciona sin tocar la configuración. D-7.

### 2.2 Archivos a modificar

| Archivo | Qué cambia | Tarea |
|---|---|---|
| `index.html` | Pasa de una línea de texto plano a documento HTML real con `<div id="root">`. | T1 |
| `src/main.jsx` → `src/main.tsx` | Se arregla el `render()` truncado y se migra a TS (D-1). | T2 |
| `src/App.jsx` → `src/App.tsx` | De truncado a orquestador completo. Se migra a TS (D-1). | T4, T5 |
| `src/components/hero.tsx` | Se completa: título, botón "Explorar Cava", botella 3D, degradación móvil. | T3 |
| `src/components/barra_de_navegacion.tsx` | Búsqueda visible en móvil, segunda fila, indicador de dos filas. | T6 |
| `src/components/carta_de_catalogo.tsx` | 1 import corregido, `scroll-mt`, `trim()` en la búsqueda. | T2, T6 |
| `src/components/carta_de_productos.tsx` | 1 import corregido. | T2 |
| `src/components/carrito_de_compras.tsx` | 1 import corregido. | T2 |
| `src/components/editor_formador_productos.tsx` | 1 import corregido, valida precio y cosecha, genera id único. | T2, T5 |
| `test/validadores.ts` → `src/utils/validadores.ts` | Se reubica para que `src/` lo consuma sin meter `test/` en el bundle. | T2 |
| `test/validadores.test.ts` | El import pasa de `./validadores` a `../src/utils/validadores`. **Única modificación permitida** en un test preexistente. | T2 |
| `test/integridad_datos_producto.test.ts` | El import pasa de `./validadores` a `../src/utils/validadores`. **Única modificación permitida** en un test preexistente. | T2 |

**Sobre `test/` sí se toca.** Antes de este cambio, el plan trataba `test/` como intocable. Ahora hay dos tipos de cambio, y RNF-05 los distingue:

| Cambio | Quién lo hace | Regla |
|---|---|---|
| Actualizar la **ruta** de un import de validadores | T2 | Admitido. El contenido del test no se toca. |
| Crear **archivos nuevos** de test del orquestador | T9 | Admitido. Los preexistentes siguen intactos. |
| Modificar el **contenido** de un test preexistente, borrar un caso, o marcarlo como omitido | nadie | **Prohibido.** Es incumplimiento de RNF-05. |

**El orden de `App.tsx` y sus componentes.** `App.tsx` se escribe en **T5** y ya importa `VistaRapidaProducto` y `PieDePagina`, que se crean en **T7** y **T8**. Es intencional y es lo que obliga al orden D-18: la suite del orquestador (T9) tiene que ir **después** de T8, porque antes fallaría por módulos inexistentes. T5 a T8 se verifican en navegador, donde el error aparece claro y en el lugar correcto.

### 2.3 Archivos que NO se tocan

| Archivo | Por qué |
|---|---|
| `src/types/producto.ts` | Ningún RF pide cambiar el contrato de datos. Los tests lo importan. |
| `src/datos/productos.ts` | El catálogo inicial de 2 productos cumple RF-15. Los tests lo importan. |
| `tailwind.config.js` | La paleta ya es la de la constitución (RNF-03). Es configuración, no código de aplicación: puede seguir siendo `.js`. |
| `vitest.config.ts` | D-7: la app y los tests están aislados a propósito. `vitest.config` gana sobre `vite.config`, así que agregar `vite.config.ts` no altera los tests. Y `jsdom` y `watch: false` ya están, así que T9 no necesita tocarlo. |
| `package.json` / `package-lock.json` | RNF-04 y CA-39: ni una dependencia agregada ni quitada. Los tests de T9 usan `react`, `react-dom` y `jsdom`, que ya están. |
| `src/components/herocanvas3d.tsx` | Tipa bien bajo JSX automático (§13). La degradación va en `hero.tsx` (D-15). |
| `npm run lint` | `eslint` no está instalado. Fuera de alcance. |
| `.opencode/`, `.agents/` | Fuera de alcance. |

**`test/` no está en esta lista a propósito, porque sí se toca.** Dos cambios y ninguno más: T2 actualiza la **ruta** de un import de validadores, y T9 crea los dos archivos nuevos. Lo que no se toca es el **contenido** de los tests preexistentes: ningún caso se borra, se modifica o se omite. Ver la tabla de la §2.2 y RNF-05.

---

## 3. Decisiones de implementación

### D-A — Contenido de `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": false,
    "types": ["node", "vite/client"]
  },
  "include": ["src", "test", "vite.config.ts", "vitest.config.ts"]
}
```

| Opción | Decisión | Por qué |
|---|---|---|
| `jsx` | `react-jsx` (runtime automático) | Es lo que hace que `herocanvas3d.tsx` funcione sin `import React`. Los intrínsecos de three (`mesh`, `cylinderGeometry`) resuelven porque `@react-three/fiber@8.18.0` amplía el namespace `JSX` global, que `@types/react@18.3.31` mantiene. **Alternativa descartada:** `react` clásico, que obligaría a importar `React` en los 7 archivos `.tsx`. |
| `skipLibCheck` | `false` | El reviewer corrió `tsc` **sin** `skipLibCheck` y obtuvo exit 0. Ponerlo en `true` escondería errores reales de tipos entre paquetes. |
| `noUnusedLocals` / `noUnusedParameters` | `true` | El reviewer verificó exit 0 con los dos activos. Ayudan a RNF-01 sin costo. |
| `include` | `["src", "test", "vite.config.ts", "vitest.config.ts"]` | Es lo que exige RF-10 y lo que CA-10 verifica: si `test/` quedara fuera, un error de tipo ahí no rompería el build. |
| `allowJs` | **No se usa** | RF-39 exige que no quede `.js` ni `.jsx` de código de aplicación. Con `allowJs: false` por defecto, un `.jsx` olvidado ni siquiera se chequea: se escondería en vez de fallar. Esto **obliga** a migrar los dos archivos de entrada (D-1) en vez de dejar que pasen. |
| `types` | `["node", "vite/client"]` | `vite/client` aporta los tipos de `import.meta.env` y de assets. `node` lo necesitan los `*.config.ts`. Declarar `types` explícito evita que se auto-incluyan paquetes de `@types` que nadie pidió. |

**Consecuencia de `isolatedModules: true`:** obliga a que los tipos se importen con `import type`. Los archivos existentes ya usan `import { Producto } from '../types/producto'` sin la palabra `type`. Con `isolatedModules` eso sigue siendo válido **siempre que el binding solo se use en posición de tipo**, que es el caso de los 6 componentes verificados. No requiere migración.

### D-B — Contenido de `vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  }
})
```

`server.host: true` es lo que hace que el servidor escuche en `0.0.0.0` en vez de solo en loopback, y con eso se cumple RF-05 y se habilita CA-21. Sin esa línea, Vite por defecto solo escucha en `127.0.0.1` y el criterio sería inejecutable.

**Alternativa descartada:** `defineConfig` con bloque `test`. Vitest usa su propia configuración y `vitest.config.ts` gana sobre `vite.config.ts` (D-7), así que un bloque `test` acá sería código muerto que sugiere lo contrario de lo que pasa.

**Alternativa descartada:** `resolve.alias` para acortar imports. No hay ningún import por alias en el código existente, y agregarlo obligaría a reescribir imports que ya funcionan.

### D-C — Contenido de `postcss.config.js`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

**`export default`, no `module.exports`.** `package.json` tiene `"type": "module"`, así que cualquier `.js` de este paquete se interpreta como ESM. Con `module.exports` el archivo ni siquiera carga.

**Alternativa descartada:** `.postcssrc.json`. Tailwind y Vite lo leerían, pero la convención del proyecto para configuración en la raíz es un archivo con nombre (`tailwind.config.js`), y un `.js` con `export default` es más explícito sobre el modo de módulos.

### D-E — Contenido de `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
    background-color: #121212;
  }

  body {
    @apply bg-charcoal-900 text-cream-100 font-sans antialiased;
  }

  h1,
  h2,
  h3 {
    @apply font-serif;
  }
}
```

Las tres directivas `@tailwind` son obligatorias: sin `base` no hay reset, sin `utilities` no hay clases (CA-07).

`scroll-behavior: smooth` en `html` sirve a RF-13: sin él, el salto al catálogo es un corte seco. `background-color: #121212` en `html` evita el destello blanco al cargar (CA-06).

Los `@apply` de `body` y de los `h1..h3` cubren RF-08 y RF-09 **sin** declaraciones `@font-face` ni link externo: `font-sans` y `font-serif` ya resuelven con la pila del sistema (D-4). **No se toca `tailwind.config.js`**: la paleta ya está declarada y los componentes ya la usan.

**Alternativa descartada:** `darkMode`. Verificado: cero componentes usan variantes `dark:` (D-5). El tema es siempre oscuro con utilidades explícitas.

### D-F — Migración de `main.jsx` y `App.jsx` a `.tsx`

**Orden dentro de T2 y T4:** crear el `.tsx` nuevo, borrar el `.jsx` viejo, en ese orden. Al revés, durante un instante hay dos archivos y el `include` de `tsconfig` los chequea a los dos.

`main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const contenedor = document.getElementById('root')

if (!contenedor) {
  throw new Error('No se encontro el punto de montaje #root en index.html')
}

createRoot(contenedor).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

Tres diferencias con el archivo roto, todas deliberadas:

- `document.getElementById('root')` devuelve `HTMLElement | null`, y `createRoot` exige `HTMLElement`. Sin el guard, TypeScript rechaza el `null` con `strict: true`. El error explícito es preferible a un `!` porque si `index.html` se rompe, el mensaje dice cuál es el punto de montaje faltante.
- Se importa `App` sin extensión. `moduleResolution: "bundler"` resuelve `'./App'` a `App.tsx`, y no queda un import que apunte a un `.jsx` que ya no existe.
- `<StrictMode>` envolviendo. Detecta efectos con doble invocación en desarrollo, que es exactamente lo que va a pasar con la sincronización a `localStorage`.

### D-G — `App.tsx`: el orquestador

Es el archivo más grande de la implementación. Su responsabilidad es única: **tener el estado y pasarlo**. Ninguna lógica de negocio vive acá; cada componente sigue siendo dueño de la suya.

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navbar } from './components/barra_de_navegacion'
import { Hero } from './components/hero'
import { ProductCatalog } from './components/carta_de_catalogo'
import { CartDrawer } from './components/carrito_de_compras'
import { ProductForm } from './components/editor_formador_productos'
import { VistaRapidaProducto } from './components/vista_rapida_producto'
import { PieDePagina } from './components/pie_de_pagina'
import { PRODUCTOS_INICIALES } from './datos/producto'
import type { CartItem, Producto } from './types/producto'

const CLAVE_PRODUCTOS = 'vinoteca_wines'
const CLAVE_CARRITO = 'vinoteca_cart'

const leer = <T,>(clave: string): T | null => {
  try {
    const crudo = window.localStorage.getItem(clave)
    return crudo === null ? null : (JSON.parse(crudo) as T)
  } catch {
    return null
  }
}

const guardar = <T,>(clave: string, valor: T): void => {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // RF-34: si el almacenamiento falla, la app sigue usable en memoria.
  }
}

export default function App() {
  const [wines, setWines] = useState<Producto[]>(() => {
    const guardados = leer<Producto[]>(CLAVE_PRODUCTOS)
    return Array.isArray(guardados) && guardados.length > 0 ? guardados : PRODUCTOS_INICIALES
  })
  const [carrito, setCarrito] = useState<CartItem[]>(() => {
    const guardados = leer<CartItem[]>(CLAVE_CARRITO)
    return Array.isArray(guardados) ? guardados : []
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [adminAbierto, setAdminAbierto] = useState(false)
  const [vinoSeleccionado, setVinoSeleccionado] = useState<Producto | null>(null)
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false)

  useEffect(() => guardar(CLAVE_PRODUCTOS, wines), [wines])
  useEffect(() => guardar(CLAVE_CARRITO, carrito), [carrito])

  const unidades = useMemo(
    () => carrito.reduce((total, item) => total + item.quantity, 0),
    [carrito]
  )

  const agregarAlCarrito = useCallback((wine: Producto) => {
    setCarrito((previo) => {
      const existente = previo.find((item) => item.product.id === wine.id)
      if (existente) {
        return previo.map((item) =>
          item.product.id === wine.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...previo, { product: wine, quantity: 1 }]
    })
  }, [])

  const actualizarCantidad = useCallback((wineId: string, delta: number) => {
    setCarrito((previo) =>
      previo
        .map((item) =>
          item.product.id === wineId ? { ...item, quantity: item.quantity + delta } : item
        )
        // RF-23: decrementar en 1 elimina la línea en vez de dejarla en 0.
        .filter((item) => item.quantity > 0)
    )
  }, [])

  const eliminarItem = useCallback((wineId: string) => {
    setCarrito((previo) => previo.filter((item) => item.product.id !== wineId))
  }, [])

  const finalizarPedido = useCallback(() => {
    if (carrito.length === 0) return
    setPedidoConfirmado(true)
    setCarrito([])
    setCarritoAbierto(false)
  }, [carrito.length])

  const agregarWine = useCallback((wine: Producto) => {
    setWinos((previo) => [...previo, wine])
  }, [])

  return (
    <>
      <Navbar
        cartCount={unidades}
        onOpenCart={() => setCarritoAbierto(true)}
        onOpenAdmin={() => setAdminAbierto(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main>
        <Hero />
        <ProductCatalog
          wines={wines}
          searchQuery={searchQuery}
          onAddToCart={agregarAlCarrito}
          onSelectWine={setVinoSeleccionado}
        />
      </main>
      <PieDePagina />
      <CartDrawer
        isOpen={carritoAbierto}
        onClose={() => setCarritoAbierto(false)}
        items={carrito}
        onUpdateQuantity={actualizarCantidad}
        onRemoveItem={eliminarItem}
        onCheckout={finalizarPedido}
      />
      <ProductForm
        isOpen={adminAbierto}
        onClose={() => setAdminAbierto(false)}
        onAddWine={agregarWine}
      />
      {vinoSeleccionado !== null && (
        <VistaRapidaProducto
          wine={vinoSeleccionado}
          onClose={() => setVinoSeleccionado(null)}
        />
      )}
      {pedidoConfirmado && (
        <p role='status'>Pedido confirmado. Gracias por tu compra.</p>
      )}
    </>
  )
}
```

**Cuatro decisiones dentro de este archivo:**

**Estado inicial por función perezosa.** `useState(() => ...)` lee `localStorage` una sola vez, en el primer render. Leer en el cuerpo del `useState` se ejecutaría en cada render.

**Guardas de tipo en la lectura, no validación profunda.** `Array.isArray(guardados) && guardados.length > 0` descarta basura. CE-02 pide arrancar con el catálogo inicial si lo guardado está corrupto, y eso es exactamente lo que hace: si lo guardado no es un array, se usa `PRODUCTOS_INICIALES`. **No se valida cada producto uno por uno** contra `esPrecioValido` ni `esAnioRazonable`, porque RF-34 pide tolerancia a datos no interpretables, no saneamiento de datos válidos. Un array de objetos con la forma de `Producto` se usa tal cual.

**`.filter((item) => item.quantity > 0)` en vez de una rama `if`.** Implementa RF-23 (decrementar en 1 elimina la línea) sin un condicional: si la cantidad llega a 0 o menos, la línea desaparece. Es el patrón funcional que pide la constitución, y con `strict: true` el tipo de `item` se preserva porque solo se cambia `quantity`, que sigue siendo `number`.

**El mensaje de confirmación no es un modal.** RF-27 pide "un mensaje de pedido confirmado", no un panel. Un `<p role='status'>` con estilos inline cumple y no arrastra `AnimatePresence`. **Alternativa descartada:** un modal con `AnimatePresence`, que agregaría animación y foco-trap sin que ningún RF lo pida. §3.2 saca el cobro real; una confirmación de dos segundos es el cierre de compra local que RF-27 describe.

### D-H — `hero.tsx` y el cálculo de los 327 px

Verifiqué el cálculo de D-17 antes de confirmarlo. `barra_de_navegacion.tsx:40` es `max-w-7xl mx-auto px-6`. Tailwind `px-6` son 1.5 rem = **24 px por lado**, o sea 48 px en total. A 375 px: **375 − 48 = 327 px** de caja de contenido. La cifra de D-17 es correcta.

Ahora, ¿entra el buscador en esa caja? La fila actual tiene tres cosas: el logo, el contenedor del buscador (`hidden md:block flex-1 max-w-md mx-8`, línea 47) y el grupo de acciones (`gap-4`, línea 57). En móvil el buscador está oculto, así que la fila real usa logo + botón "+ Cargar Vino" + ícono de carrito.

La fila 1 queda así:

```tsx
<header className='fixed top-0 left-0 right-0 z-50 transition-all duration-300 ...'>
  <div className='max-w-7xl mx-auto px-6 pt-3 md:py-0'>
    <div className='flex items-center justify-between gap-4'>
      <a href='#' className='shrink-0'>...CAVA &amp; CO....</a>
      <div className='flex items-center gap-4 shrink-0'>
        ...boton + Cargar Vino...
        ...icono de carrito...
      </div>
    </div>
    <div className='mt-3 md:mt-0 md:max-w-md md:mx-8'>
      <input ... />
    </div>
  </div>
</header>
```

Cuatro puntos, cada uno con su motivo:

- **El buscador baja a su propia fila** en móvil y sube a la misma fila en `md` en adelante. A 375 px no compite por los 327 px con el logo ni con los botones. En `md` (768 px) hay 720 px de caja, y el buscador con `max-w-md` (448 px) entra cómodo al lado del logo.
- **`shrink-0` en el logo y en el grupo de acciones.** Sin eso, flex los comprime para que el buscador entre, y los textos se cortan. Es el comportamiento por defecto de flexbox que rompe los layouts de navbar.
- **`md:mx-8` en lugar de `mx-8` fijo.** En móvil el buscador ocupa el ancho completo y no necesita margen lateral; en escritorio mantiene el margen original.
- **El header pasa a `pt-3` en móvil con `py-5` solo en `md`.** La barra crece a dos filas, y `scroll-mt` del catálogo (D-I) tiene que compensar la altura real.

**Por qué no se usa CSS puro para esto.** Una alternativa era mantener el input oculto bajo `md` y duplicarlo. Dos inputs con el mismo estado significa dos nodos en el DOM, y CA-29 cuenta los elementos visibles de la barra: un input duplicado y oculto no rompería el conteo, pero sí es la clase de ambigüedad que este plan viene evitando. **Un solo input, una sola fila en escritorio, una segunda fila en móvil.**

### D-I — `scroll-mt` para que la barra no tape el catálogo

RF-13 y CA-31 exigen que el `<h2>Catálogo de Vinos</h2>` quede visible por completo. `carta_de_catalogo.tsx:36` es `<section id='catalogo' className='py-20 px-6 max-w-7xl mx-auto'>`, sin desplazamiento de anclaje, y `barra_de_navegacion.tsx:34` es `fixed`.

```tsx
<section id='catalogo' className='scroll-mt-28 md:scroll-mt-24 py-20 px-6 max-w-7xl mx-auto'>
```

`scroll-mt-28` son 7 rem = 112 px, que es la altura de la barra de dos filas más aire. En `md` la barra vuelve a una fila y el desplazamiento baja a `scroll-mt-24` (96 px). Los valores exactos los ajusta el implementador mirando la barra renderizada; lo que la spec exige es el comportamiento, y CA-31 mide el solapamiento real.

**Alternativa descartada:** `window.scrollTo` con un offset calculado en JavaScript. Requiere leer la altura de la barra en runtime y obliga a actualizar el cálculo en cada resize. `scroll-mt` es declarativo y lo resuelve el navegador.

### D-J — `trim()` en la búsqueda

`carta_de_catalogo.tsx:27-29` pasa los tres campos a minúsculas y los compara con `.includes()`, sin `trim()`. RF-17 y CE-05 exigen que los espacios al inicio y al final no afecten el resultado.

```tsx
const consulta = searchQuery.trim().toLowerCase()
const matchesSearch =
  wine.name.toLowerCase().includes(consulta) ||
  wine.winery.toLowerCase().includes(consulta) ||
  wine.varietal.toLowerCase().includes(consulta)
```

`trim()` una sola vez fuera del predicado, no tres. Normalizar el lado de la consulta es lo que importa: no hay que recortar cada campo del producto, porque un producto con espacio interno sigue encontrándose igual.

### D-K — Validadores: dónde viven

§13 dice que importarlos desde `src/` los mete en el bundle de producción, y propone la mitigación: moverlos a `src/` y que `test/` los importe desde ahí. **Confirmo esa propuesta**, y el razonamiento es que §13 estaba describiendo el caso de `import ... from '../../test/validadores'`, no el de un archivo que vive bajo `src/`.

La resolución es un **tercer lugar**, distinto de los dos que §13 contrasta:

```
test/validadores.ts          →  src/utils/validadores.ts
```

| Criterio | `test/` | `src/` | `src/utils/` (elegido) |
|---|---|---|---|
| La app lo importa | no | sí | **sí** |
| Entra en el bundle | no | sí | **sí** |
| Es código de pruebas | sí | no | **no** |
| La suite lo importa | sí | sí | **sí** |

`src/utils/` cumple las cuatro: es alcanzable desde la app, se empaqueta (que es correcto, porque el formulario lo usa), no arrastra nada de testing, y los tests lo siguen importando. Importar desde `test/` habría creado el acoplamiento que §13 quiere evitar.

**Consecuencia sobre los 46 tests:** los archivos de test no cambian de cantidad ni de nombre, solo su línea de import:

```ts
// test/validadores.test.ts
-import { ... } from './validadores'
+import { ... } from '../src/utils/validadores'

// test/integridad_datos_producto.test.ts
-import { ... } from './validadores'
+import { ... } from '../src/utils/validadores'
```

Los dos archivos siguen en `test/`, `vitest.config.ts` sigue recolectando `test/**/*.test.ts`, y el conteo sigue siendo **2 archivos y 46 tests**. CA-11 no se entera. `test/integridad_datos_producto.test.ts:2-3` ya importa `../src/datos/producto` y `../src/types/producto`, así que un import de `../src/...` desde `test/` ya es un patrón establecido en el repo.

**El nombre del archivo de test queda desalineado con su contenido** (`validadores.test.ts` prueba algo que ya no está al lado). No lo renombro: renombrar `test/validadores.test.ts` es cambiar el nombre de un archivo de test, y el nombre es parte de la línea base que CA-11 verifica.

### D-L — Validación del formulario y generación de id

`editor_formador_productos.tsx` hoy valida con `if (!name || !winery || !price) return` (línea 26), lo que rechaza el precio `0` pero acepta `-100`, y no impose cotas de cosecha (líneas 153-158). RF-28 y RF-29 exigen aplicar las reglas que ya existen en los validadores.

```tsx
import { esPrecioValido, esAnioRazonable } from '../utils/validadores'

const anioEnCurso = new Date().getFullYear()

const errores: string[] = []
if (!name.trim()) errores.push('El nombre es obligatorio')
if (!winery.trim()) errores.push('La bodega es obligatoria')
if (!esPrecioValido(price)) errores.push('El precio tiene que ser mayor que cero')
if (!esAnioRazonable(vintage, anioEnCurso)) {
  errores.push(`La cosecha tiene que ser un número entero entre 1850 y ${anioEnCurso + 1}`)
}

if (errores.length > 0) {
  setError(errores.join('. '))
  return
}
```

Cuatro puntos:

**El límite superior se calcula, no se escribe.** `anioEnCurso + 1` se deriva de `new Date().getFullYear()`, así que el mensaje de error coincide siempre con el rango que el validador está aplicando. Escribir `2027` fijo en el texto haría que en 2027 el mensaje mienta.

**RF-29 exige "explica cuál de esas condiciones no se cumple", en singular.** Acumular los tres errores en un array y joinearlos da el mensaje más útil, y cumple.

**La categoría no se valida.** RF-29 la excluye explícitamente porque el `<select>` tiene valor inicial `'Tinto'` y no puede quedar vacío.

**`guardar` traga el error de cuota llena.** `localStorage.setItem` lanza `QuotaExceededError` cuando el almacenamiento está lleno. RF-34 pide tolerancia a datos no interpretables, y un `catch` con comentario es lo que la cumple sin convertir un error esperado en un `throw` que rompería el efecto.

**`precio` es `number | ''`, y `esPrecioValido` espera `unknown`.** El estado inicial es `useState<number | ''>('')`, y el handler convierte con `setPrice(e.target.value ? Number(e.target.value) : '')`. Con `''`, `esPrecioValido('')` devuelve `false` porque no es `number`, así que el campo vacío se rechaza sin una rama aparte. Esa es la razón de que la firma del validador sea `(valor: unknown)`.

### D-M — Id único sin depender del contexto seguro

`crypto.randomUUID()` (línea 29) solo existe en contexto seguro. `localhost` y `127.0.0.1` **sí** lo son; un host de red local no. CE-10 exige que el guardado no se rompa en ese segundo caso, y CE-15 que no haya dos productos con el mismo id.

```tsx
const generarId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `producto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
```

El chequeo de `typeof` cubre los tres casos: `crypto` ausente, `crypto` presente sin `randomUUID`, y `randomUUID` que lanza por contexto no seguro. `Date.now()` en base 36 da la marca temporal; `Math.random()` agrega entropía. **No usa un contador a nivel de módulo**, porque `StrictMode` invoca los effects dos veces en desarrollo y un contador compartido se desalinearía.

CE-15 dice que ante una colisión el catálogo conserva ambos productos "porque el identificador solo se usa como clave de React". Con `Math.random()` la probabilidad de colisión es despreciable, y si ocurriera, React mostraría un aviso en consola y la app seguiría usable. **El plan no implementa detección de colisiones** porque ningún RF la exige: RF-28 dice "único", y el método de la rama principal (`crypto.randomUUID`) cumple eso por contrato. Anotado como riesgo en §7.

### D-N — `VistaRapidaProducto`: qué muestra y qué no

RF-35 y RF-36 distinguen dos casos: el producto **tiene** notas y maridaje, o **no los tiene**.

```tsx
{wine.tastingNotes !== undefined && (
  <section>
    <h3>Notas de cata</h3>
    <p>{wine.tastingNotes}</p>
  </section>
)}
{wine.foodPairing !== undefined && (
  <section>
    <h3>Maridaje sugerido</h3>
    <p>{wine.foodPairing}</p>
  </section>
)}
```

El chequeo es `!== undefined`, no un truthy check. `Producto.tastingNotes` es `string | undefined` opcional, y un string vacío es un dato presente, no ausente. Usar truthy haría que un `''` se ocultara, que es otra cosa.

RF-37 exige control de cierre **y** fondo oscurecido que cierre, y que el filtro y la búsqueda se conserven. Como el modal no contiene el catálogo, el estado del filtro vive en `App.tsx` y sobrevive al cierre por construcción: cerrar solo hace `setVinoSeleccionado(null)`. **No hay que guardar ni restaurar nada.**

**El nombre del archivo es `vista_rapida_producto.tsx`, no `QuickViewModal.tsx`.** El repo ya tiene el patrón de nombres en español: `barra_de_navegacion.tsx`, `carta_de_catalogo.tsx`, `carrito_de_compras.tsx`, `editor_formador_productos.tsx`, `herocanvas3d.tsx`. Un nombre en inglés sería el único archivo ajeno. La spec §2.4 registra que las tres listas de la documentación no coinciden en nombres; el código real manda, y el código real es español.

**Usa `AnimatePresence`, a diferencia del mensaje de checkout.** La constitución §3 dice "Paneles y modales siempre acompañados de animaciones de entrada/salida (`AnimatePresence`)". Esto es un modal, así que le aplica. RNF-03 lo aclara: "Este RNF no exige animaciones en ningún componente: las obligaciones de animación están en RF y RNF propios", y esta vez la obligación viene de la constitución, que es el nivel superior de precedencia.

### D-P — Cómo se monta y desmonta `App.tsx` en los tests

Es la decisión que faltaba para poder escribir la tarea de tests. Cubre R13 y R14 de §5.

**`act` viene de `react`, y se declara el entorno.** `react-dom/test-utils` está deprecado y emite un error al importarse; `react@18.3.1` exporta `act` (`react/cjs/react.development.js:2702`). Y sin `globalThis.IS_REACT_ACT_ENVIRONMENT = true`, React emite "The current testing environment is not configured to support `act(...)`" (`react-dom.development.js:25292`). CA-40 verifica que ninguno de los dos aparezca.

```ts
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../src/App'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

interface Montaje {
  contenedor: HTMLDivElement
  root: Root
  textoDe: (selector: string) => string
  nodosDe: (selector: string) => HTMLCollectionOf<Element>
  pulsar: (selector: string) => void
}

const montarApp = (): Montaje => {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const root = createRoot(contenedor)

  act(() => {
    root.render(<App />)
  })

  return {
    contenedor,
    root,
    textoDe: (selector) => contenedor.querySelector(selector)?.textContent ?? '',
    nodosDe: (selector) => contenedor.querySelectorAll(selector),
    pulsar: (selector) => {
      const nodo = contenedor.querySelector(selector)
      if (!(nodo instanceof HTMLElement)) {
        throw new Error(`No se encontro un elemento pulsable para ${selector}`)
      }
      act(() => {
        nodo.click()
      })
    }
  }
}
```

Cuatro decisiones, cada una con su motivo:

**Un `<div>` por test, creado y desmontado.** No se usa `document.body.innerHTML = ''` para limpiar, porque eso deja la raíz de React viva apuntando a un nodo que ya no existe. `desmontar()` hace `act(() => root.unmount())` y saca el contenedor del `document`, en ese orden.

**`StrictMode` no se monta en los tests.** El doble montaje de efectos es un comportamiento **de desarrollo**, no de producción: `main.tsx` lo envuelve, pero un test que quiere verificar cuántos efectos corren lo vería duplicado sin que eso signifique nada. Montar `App` directo es el renderizado real en producción y elimina el ruido de la sincronización a `localStorage`, que con `StrictMode` escribiría dos veces por cambio.

**`pulsar` envuelve el `.click()` en `act`.** Un click dispara un evento que React procesa fuera de su propio ciclo. Sin `act`, la actualización de estado ocurre después de que el test terminó su bloque, y el `expect` siguiente lee el DOM viejo. Este es el error más común al testear React sin librería de ayuda, y por eso el helper lo encapsula en vez de dejar que cada test se acuerde.

**`globalThis.IS_REACT_ACT_ENVIRONMENT = true` va a nivel de módulo, una sola vez.** Es una bandera de entorno, no algo por test.

### D-Q — Cómo se limpia `localStorage` entre tests

```ts
beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  // Cada test desmonta su propia raíz en su cleanup.
})
```

**`localStorage.clear()` en `beforeEach`, nunca en `beforeAll`.** En `beforeAll` el primer test que escribe contamina a todos los siguientes, y el fallo se manifiesta como un test que pasa y otro que falla sin relación aparente.

**Dos archivos de test, no uno.** `test/orquestador_carrito.test.ts` (RF-41 a RF-45 y RF-49) y `test/orquestador_persistencia.test.ts` (RF-46, RF-47, RF-48). La razón es que los segundos necesitan **preparar** `localStorage` antes de montar, con datos válidos o corruptos, y mezclar eso con los de carrito haría que el `beforeEach` de un grupo heredara el estado del otro.

**Vitest aísla los archivos en entornos separados por default**, así que un `localStorage.clear()` en un archivo de test no afecta al otro. Eso se aprovecha en vez de pelearse con ello.

**Montar y desmontar por test, no una vez por archivo.** `beforeEach` monta y registra el teardown en `afterEach`. Montar una sola vez y compartir el estado entre tests es la vía más corta a un falso verde: el segundo test hereda las mutaciones del primero.

### D-O — `PieDePagina`: qué incluye

RF-14 exige cuatro bloques: horarios de atención, ubicación, enlaces a redes sociales y aviso legal +18.

Es texto estático, sin estado ni props. Un `footer` semántico con cuatro secciones. **No lleva `AnimatePresence`** porque no es panel ni modal.

Los íconos de redes sociales salen de `lucide-react`, que ya está instalada y que los componentes actuales no usan pero `package.json` declara. **Alternativa descartada:** íconos SVG inline como hace `barra_de_navegacion.tsx:68-81`. Razonar para usar una dependencia ya declarada es mejor que copiar un SVG a mano, y no agrega nada a `package.json` (RNF-04, CA-39).

---

## 4. Trazabilidad RF → tarea

| RF | Texto resumido | Tarea | Verificación |
|---|---|---|---|
| RF-01 | Documento HTML real con `#root` | T1 | CA-03 |
| RF-02 | Un error de tipo rompe el build | T1 | CA-02 |
| RF-03 | `npm run build` sale 0 | T1, T5 | CA-01 |
| RF-04 | `dist/` con artefacto real ≥ 1 kB | T1, T5 | CA-03 |
| RF-05 | Servidor dev accesible desde la red | T1 | CA-05 |
| RF-06 | Se monta sin errores de consola | T5 | CA-06 |
| RF-07 | Todos los imports resuelven | T2 | CA-04 |
| RF-08 | Tema oscuro aplicado | T1 | CA-07 |
| RF-09 | Serif en títulos, sans en cuerpo | T1 | CA-08 |
| RF-10 | El chequeo cubre `src/`, `test/`, configs | T1 | CA-10 |
| RF-11 | Barra con marca, búsqueda, admin, carrito | T6 | CA-29 |
| RF-12 | Hero visible sin scroll, 3D condicionado | T3 | CA-30 |
| RF-13 | "Explorar Cava" no tapa el catálogo | T3, T6 | CA-31 |
| RF-14 | Pie con 4 bloques | T8 | CA-32 |
| RF-15 | Catálogo inicial con 2 productos | T5 | CA-12 |
| RF-16 | Filtro por categoría | T5 | CA-12 |
| RF-17 | Búsqueda con `trim` | T6 | CA-13 |
| RF-18 | Estado vacío del catálogo | T5 | CA-13 |
| RF-19 | Una columna bajo 640 px | T6 | CA-26 |
| RF-20 | Agregar sin duplicar | T5 | CA-14 |
| RF-21 | Contador visible / oculto | T5 | CA-15 |
| RF-22 | Panel del carrito con total | T5 | CA-15 |
| RF-23 | Cantidades, eliminar en 1 | T5 | CA-15 |
| RF-24 | Eliminar línea | T5 | CA-15 |
| RF-25 | Cerrar el carrito | T5 | CA-16 |
| RF-26 | Carrito vacío sin botón finalizar | T5 | CA-15 |
| RF-27 | Finalizar: confirma y vacía | T5 | CA-17 |
| RF-28 | Carga válida, id único | T5 | CA-18 |
| RF-29 | Rechaza y explica | T5 | CA-19, CA-20 |
| RF-30 | Aparece sin recargar | T5 | CA-18 |
| RF-31 | Id único sin contexto seguro | T5 | CA-21 |
| RF-32 | Persiste `vinoteca_wines` | T5 | CA-22 |
| RF-33 | Persiste `vinoteca_cart` | T5 | CA-22 |
| RF-34 | Arranca limpio si está corrupto | T5 | CA-23 |
| RF-35 | Vista rápida con bloques opcionales | T7 | CA-33 |
| RF-36 | Omite bloques ausentes | T7 | CA-34 |
| RF-37 | Cierra y conserva filtro | T7 | CA-35 |
| RF-38 | Los 46 preexistentes no se pierden | T2, T9, T11 | CA-11 |
| RF-39 | `.tsx` sin `.js` en `src/` | T4, T11 | CA-36 |
| RF-40 | Usable en móvil a 375 px | T6 | CA-25, CA-27, CA-28 |
| RNF-01 | Strict, sin `any` | T1, T11 | CA-09 |
| RNF-02 | Comillas simples, sin `;` | T11 | CA-36 |
| RNF-03 | Solo la paleta del tema | T1, T11 | CA-37 |
| RNF-04 | Sin dependencias nuevas | T11 | CA-39 |
| RNF-05 | Aislamiento de la suite y protección de los preexistentes | T2, T9, T11 | CA-11 |
| RNF-06 | Red: imágenes y HDRI | T5, T7 | CA-24 |
| RNF-07 | 30 FPS, 200 ms | T5 | Validación |
| RNF-08 | UTF-8 sin BOM | T11 | Inspección |
| RNF-09 | Degrada bajo 640 px | T3, T6 | CA-28 |
| RNF-10 | Docs sincronizadas | T10 | CA-38 |
| **RF-41** | Agregar no duplica línea | T9 | CA-41 |
| **RF-42** | Incremento actualiza cantidad y total | T9 | CA-42 |
| **RF-43** | Decrementar en 1 elimina la línea | T9 | CA-43 |
| **RF-44** | Eliminar quita la línea y recalcula | T9 | CA-44 |
| **RF-45** | Finalizar vacía el carrito | T9 | CA-45 |
| **RF-46** | Guarda bajo ambas claves y restaura | T9 | CA-46 |
| **RF-47** | Arranque limpio ante datos corruptos | T9 | CA-47 |
| **RF-48** | Filtro y búsqueda sobreviven al modal | T9 | CA-48 |
| **RF-49** | Contador refleja unidades y desaparece | T9 | CA-49 |
| **D-18** | Orden de los tests del orquestador | T9, decisión de §3 | CA-40 a CA-49 |
| **D-19** | `act` de `react` y `IS_REACT_ACT_ENVIRONMENT` | T9, decisión **D-P** | CA-40 |
| **D-20** | Alcance: lógica de estado, no presentación | T9, decisión de §7.1 | CA-40 a CA-49 |

**Las 20 decisiones quedan cubiertas.** D-1 a D-17 están desarrolladas en las secciones de decisión del §3 que las motivan, y cada una se aplica en la tarea correspondiente del §2. D-18, D-19 y D-20, acá.

**Cobertura: los 49 RF tienen al menos una tarea, y los 10 RNF también.** Verificado uno por uno contra el índice de la tabla.

**Reparto de T9, T10 y T11, que es donde se decide si algo quedó sin cubrir:**

| Tarea | Qué verifica | Qué no verifica |
|---|---|---|
| **T9** — tests del orquestador | RF-41 a RF-49, con `npm test` | Nada de presentación |
| **T10** — sincronización documental | RNF-10 | — |
| **T11** — verificación integral | CA-01 a CA-39 en navegador, más CA-09, CA-10, CA-11, CA-36, CA-37 y CA-39 | — |

**T11 no repite la suite del orquestador.** CA-11 se verifica en T11, pero comprobando lo que T11 puede comprobar: que `npm test` sale 0, que los 46 preexistentes están en verde y que los nuevos también. La lógica de cada caso ya la probó T9; T11 confirma el resultado agregado. Si T11 fallara ahí, el bug estaría en T9, no en T11.

---

## 5. Riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **Firewall bloquea el acceso desde la red local.** Ya está registrado como `parcial` en §12.3 de la spec. | CA-21 no ejecutable. RF-31 y CE-10 sin verificar por esa vía. | El plan no puede hacer nada: depende del entorno, no del código. T1 pone `server.host: true` para eliminar la causa controlable. Si el firewall sigue bloqueando, se reporta `no ejecutable` y se busca un rodeo documentado (por ejemplo abrir la app en un dispositivo que sí llegue). |
| R2 | **`allowJs: false` hace que un `.jsx` olvidado quede fuera del chequeo de tipos.** `tsconfig` no lo ve, y el build pasa sin avisar. | Un `.jsx` en `src/` violaría RF-39 sin que `tsc` lo detecte. | CA-36 lo cubre explícitamente: "bajo `src/` no queda ningún archivo `.jsx` ni `.js`". Es una comprobación de sistema de archivos, no de tipos, justamente por esto. |
| R3 | **Mover `test/validadores.ts` rompe algún test.** | CA-11 falla y RNF-05 se viola. | T2 tiene `npm test` como verificación obligatoria. Los imports de los dos archivos de test cambian a `../src/utils/validadores`. Si algo falla, el problema es el path, no la lógica: el archivo se mueve sin cambios de contenido. |
| R4 | **`tsc` con `skipLibCheck: false` falla por un conflicto de tipos entre paquetes.** | `npm run build` no pasa. | El reviewer ya lo corrió sin `skipLibCheck` y obtuvo exit 0. Si aun así falla, el primer paso de T1 es correr `npx tsc --noEmit` **antes** de escribir el resto de la configuración, para saber si el problema es mío o del árbol de dependencias. |
| R5 | **La barra de dos filas empuja el contenido y el `scroll-mt` queda corto.** | CA-31 falla: el `<h2>` sigue tapado. | Los valores exactos de `scroll-mt` se ajustan mirando la barra renderizada, y CA-31 mide el solapamiento real, no el valor de la clase. Es el criterio hecho para poder fallar. |
| R6 | **Colisión de ids.** | CE-15 mal cubierto; React avisa por consola. | Bajo con `crypto.randomUUID`. La rama de respaldo mezcla `Date.now()` y `Math.random()`. No se implementa detección de colisiones porque ningún RF la exige (D-M). |
| R7 | **El mensaje de checkout no se ve o tapa el carrito.** | CA-17 falla. | Se renderiza fuera de `<main>`, después del `CartDrawer`, con `role='status'`. Como el carrito se cierra al finalizar, no compiten. |
| R8 | **`productos` se filtran pero `onSelectWine` no llega a la vista rápida** porque el estado mal cableado. | CA-33 y CA-35 fallan. | `App.tsx` pasa `onSelectWine={setVinoSeleccionado}` directamente, sin envoltorio, así que la firma coincide exactamente con `ProductCatalogProps.onSelectWine`. |
| R9 | **La suite de tests queda fuera del build** porque `include` está mal escrito. | CA-10 falla; un error de tipos en tests pasa desapercibido. | `include: ["src", "test", "vite.config.ts", "vitest.config.ts"]` es explícito, y CA-10 lo verifica metiendo un error de tipo a propósito en un archivo de test. |
| R10 | **El archivo `cava-and-co/` vacío o `dist/` viejo confunde la salida del build.** | Ruido al verificar CA-03. | `dist/` se regenera en cada build y está en `.gitignore`. `cava-and-co/` no lo referencia nadie. |
| **R11** | **`App.tsx` queda sin cobertura automatizada durante T5 a T8.** Es el riesgo que aceptamos al elegir la opción (a) de D-18: la suite del orquestador va al final porque `App.tsx` importa la vista rápida y el pie de página, que no existen hasta T7 y T8. | Una regresión de **lógica** de estado introducida en T5 y no detectada hasta T9. Si T9 encuentra el bug, hay que volver a T5, corregir, y volver a correr T9. | **Es un riesgo aceptado, no un descuido.** La mitigación es de proceso: T5 verifica su lógica **en navegador** con CA-12 a CA-24, que cubren el carrito, la carga de productos y la persistencia uno por uno, en el momento en que esa lógica se escribe. T9 no es la primera línea de defensa, es la segunda. La alternativa que lo evitaría —mockear con `vi.mock`— es peor: una suite verde con la vista rápida inexistente (D-18). |
| **R12** | **Los tests del orquestador fallan por el entorno y no por la lógica.** `act` sin `IS_REACT_ACT_ENVIRONMENT`, o `act` importado del lugar deprecado. | T9 falla con un mensaje que no señala un bug real, y el implementador pierde tiempo persiguiendo un problema del andamiaje. | Las dos condiciones están **escritas en la spec** (§4.1b, D-19) y **verificadas por CA-40**, que exige que ninguno de los dos mensajes aparezca. El fallo aparece en el primer test, no al final. |
| **R13** | **Los tests del orquestador se ensucian entre sí** por compartir `localStorage` y raíces de React sin desmontar. | Un test pasa por el estado que dejó el anterior. Es el modo de fallo más insidioso de una suite con estado global. | D-21 define el montaje, el desmontaje y la limpieza. La clave es que cada test monta **su propio** `<div>` y lo desmonta, y que `localStorage.clear()` va en un `beforeEach`, no en un `beforeAll`. |
| **R14** | **`StrictMode` duplica los efectos** de sincronización a `localStorage` y el test ve dos escrituras. | Ruido, o un conteo de escrituras que no cuadra. | D-21. No hay que hacer nada en el código de la aplicación: los tests montan `App` **sin** `StrictMode`, que es el renderizado real en producción. El doble montaje es un comportamiento de desarrollo, no algo que haya que probar acá. |

---

## 6. Qué NO se toca

| Fuera | Motivo |
|---|---|
| `npm run lint` | `eslint` no está instalado. §3.2. |
| Corrección de `pnpm` → `npm` en `AGENTS.md`, `MEMORY.md`, `docs/CONSTITUCION.md` | §3.2. La sincronización de RNF-10 es otra cosa. |
| El enlace `docs/constitution.md` → `docs/CONSTITUCION.md` | §3.2. |
| Reubicar `src/datos/` a `src/data/` | Rompería los imports de la suite. §3.2. |
| `.gitattributes` | §3.2. |
| `.opencode/`, `.agents/` | §3.2. Decisión del usuario sobre qué versionar. |
| Cualquier commit | §3.2. El coordinador lo maneja con el usuario. |
| Filtro por precio y por cepa | §3.2. Funcionalidad nueva. |
| Subida de imagen por arrastrar archivo | §3.2. |
| Borrar `ProductoFilterState` | §3.2. Código muerto pero su eliminación es de otra spec. |
| Crear `AnimatedSection` | §3.2. No existe y ningún RF lo necesita. |
| Animaciones de scroll y parallax | §3.2. |
| Enlaces de navegación en la barra | §3.2. |
| Edición de productos | §3.2. |
| Capa de datos para API futura | §3.2. |
| `src/types/producto.ts`, `src/datos/productos.ts` | Ningún RF los cambia; los tests los importan. |
| `tailwind.config.js` | La paleta ya es correcta (RNF-03). |
| `vitest.config.ts` | D-7. `jsdom` y `watch: false` ya están, así que los tests del orquestador no necesitan tocar la configuración. |
| `test/validadores.test.ts` y `test/integridad_datos_producto.test.ts` — su **contenido** | RNF-05. Solo se les cambia la ruta de un import, en T2. |
| `package.json` y `package-lock.json` | RNF-04 y CA-39. Los tests del orquestador usan `react`, `react-dom` y `jsdom`, que ya están. |
| Extraer la lógica del orquestador a un reductor puro | El usuario descartó explícitamente esta variante al aprobar el cambio. `App.tsx` conserva su lógica de estado en el componente. Ver el registro de aprobación en la spec. |

---

## 7. Limitaciones de este plan

### 7.1 La frontera de los tests: qué no se puede testear, y por qué

**La presentación no tiene cobertura automatizada, y no va a tenerla.** No es una omisión: es lo que permite el conjunto de dependencias actual. La misma frontera está en §8.1b de la spec, para que no parezca un hueco.

**Las cuatro limitaciones de `jsdom` que la causan, todas verificadas:**

| Limitación | Consecuencia directa |
|---|---|
| **No implementa layout.** `getBoundingClientRect` devuelve ceros y `scrollWidth` es 0. | Ningún criterio de ancho, solapamiento, altura ni scroll horizontal es testeable: CA-25, CA-26, CA-27, CA-28, CA-30, CA-31. |
| **No aplica CSS.** No calcula estilos computados. | Contraste y `font-size` no son testeables: CA-08, CA-30, y la definición de "legible" de §1.1. |
| **No tiene WebGL.** | La escena 3D no se renderiza. El `<Canvas>` de R3F se degrada o falla: CE-07, CE-08. |
| **Su viewport es fijo (1024×768) y no se puede redimensionar.** | Ningún comportamiento responsive es testeable: todos los CA de ancho. |

**Y una quinta, que no es de jsdom:** no hay `@testing-library/*`, y RNF-04 impide instalarlo. Deja fuera las **consultas por rol ARIA y por texto accesible** (`getByRole`, `getByLabelText`), que son las que verificarían accesibilidad real: CA-29, CA-32, CA-33.

**Lo que queda fuera por elección, no por limitación:** las **animaciones** de paneles y modales, porque `AnimatePresence` anima fuera del ciclo de render y en jsdom el test solo vería el estado final. Y la **recarga de página**, porque ningún test puede recargar: la parte de "finalizar pedido no recarga" se verifica en navegador por CA-17, mientras CA-45 verifica la parte que sí es testeable, que el carrito queda vacío y el mensaje aparece.

**Qué sí tiene cobertura automatizada:** la lógica de estado de `App.tsx`, con RF-41 a RF-49 y CA-40 a CA-49, en T9.

**Los dos conjuntos se complementan y ninguno reemplaza al otro.** Un test puede pasar y la app seguir viéndose mal, y está bien: los CA-40 a CA-49 detectan regresiones de **lógica**; los CA-01 a CA-39 verifican **comportamiento observable**.

### 7.2 Las otras limitaciones de este plan

1. **Los valores exactos de `scroll-mt` no están decididos.** D-I da el razonamiento y un orden de magnitud; el número final depende de la altura renderizada de la barra de dos filas. CA-31 mide el comportamiento, no la clase, así que el ajuste no rompe nada.

2. **Los mensajes de error del formulario son texto en español, no i18n.** Ningún RF pide internacionalización, y agregar una librería de traducción violaría RNF-04.

3. **`App.tsx` queda sin cobertura automatizada durante T5 a T8.** Es el riesgo **R11**, aceptado a conciencia por D-18. La mitigación es que T5 verifica su lógica en navegador con CA-12 a CA-24, en el momento en que la escribe.

4. **Este plan no ejecutó nada.** No corrió `npm test`, ni `npm run build`, ni `npm run dev`, ni abrió un navegador. Las verificaciones que se citan como "el reviewer verificó" provienen de la revisión de QA. La fase de validación es la que confirma.

5. **No se ejecutó ninguna prueba de que `act` funcione en este proyecto.** Se verificó **leyendo el código** de `react@18.3.1` que `act` está implementado y hace `flushActQueue`. Si en la práctica resultara que no sirve con `createRoot`, sería un hallazgo de T9 y exigiría revisar D-19. **Es la suposición menos verificada de todo el plan**, y queda anotada acá para que nadie la tome por probada.
