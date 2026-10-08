# Tareas 002 — Que la aplicación compile y arranque

**Spec:** `specs/002-app-que-compile/spec.md`, estado `aprobada` (2026-10-06)
**Plan:** `specs/002-app-que-compile/plan.md`
**Fase:** 4 de 5 (tareas). El implementador hace estas tareas; el Reviewer las valida después.
**Tareas: 11.** La última, **T9**, es la de los tests del orquestador y va después de todo lo demás por D-18.

## Cómo se usan estas tareas

- **Una tarea a la vez**, en el orden de dependencias.
- **Ninguna tarea se marca hecha sin ejecutar su verificación.** El estado arranca en `pendiente` y solo pasa a `hecha` cuando la verificación pasa.
- **Regla dura: ninguna tarea instala dependencias.** RNF-04 y CA-39. Si creés que hace falta una, **pará y reportá**: eso significa que algo de la spec está mal. Los tests de T9 usan `react`, `react-dom` y `jsdom`, que **ya están instalados**.
- **Regla dura: ninguna tarea hace commit.** El coordinador lo maneja con el usuario.
- **Regla dura: los 46 tests preexistentes deben seguir en verde después de cada tarea.** No se borran, no se modifican, no se omiten. El total de la suite **no está congelado**: T9 agrega tests nuevos, y eso está permitido (RNF-05). Lo que no se permite es que los 46 preexistentes falten o dejen de pasar.
- **Si la implementación requiere cambiar la spec o el plan, pará y reportá** (skill SDD).

## Comandos de referencia

```bash
npm test                      # suite completa, exit 0: los 46 preexistentes y los nuevos
npx tsc --noEmit              # chequeo de tipos sin emitir
npm run build                 # tsc && vite build
npm run dev                   # servidor de desarrollo
```

## Índice

| ID | Título | RF cubiertos | Depende de | Estado |
|---|---|---|---|---|
| T1 | Configuración base: que la app pueda compilar | RF-01 a RF-05, RF-08 a RF-10, RNF-01, RNF-03 | — | `hecha` |
| T2 | Imports rotos y reubicación de los validadores | RF-07, RF-38, RNF-05 | T1 | `hecha` |
| T3 | Hero completo, con degradación móvil | RF-12, RF-13, RNF-09 | T2 | `hecha` |
| T4 | Migración de los dos archivos de entrada a `.tsx` | RF-39 | T2, T3 | `hecha` |
| T5 | Orquestador: estado, persistencia y flujo completo | RF-06, RF-15, RF-16, RF-18, RF-20 a RF-34, RNF-06, RNF-07 | T4 | `hecha` |
| T6 | Ajustes de comportamiento en componentes existentes | RF-11, RF-13, RF-17, RF-19, RF-40, RNF-09 | T5 | `hecha` |
| T7 | Vista rápida de producto | RF-35, RF-36, RF-37, RNF-06 | T5 | `hecha` |
| T8 | Pie de página | RF-14 | T5 | `hecha` |
| **T9** | **Tests automatizados de la lógica de estado del orquestador** | **RF-41 a RF-49** | **T8** | `hecha` |
| T10 | Sincronización de la documentación | RNF-10 | T9 | `hecha` |
| T11 | Verificación integral | RF-38, RF-39, RNF-01 a RNF-05, RNF-08 | T10 | `hecha` |

**Por qué T9 va justo después de T8 y no después de T5.** `App.tsx` importa la vista rápida (T7) y el pie de página (T8). Si los tests del orquestador corrieran en T5, fallarían por módulos inexistentes y no por lógica, que es el peor modo de fallo posible en una suite: un rojo que no significa nada. Es la decisión **D-18** de la spec. Mockear con `vi.mock` sería peor: la suite pasaría en verde mientras la vista rápida no existe.

**Por qué T10 y T11 quedaron al final y qué verifica cada una.** **T10** es documentación, así que va después de que todo el código esté escrito: su checklist menciona los componentes nuevos. **T11** es la verificación integral y va al final por definición. **T11 no repite la suite del orquestador:** verifica CA-11 comprobando que `npm test` sale 0 y que los 46 preexistentes están en verde, pero la lógica de cada caso ya la probó T9.

---

## T1 — Configuración base: que la app pueda compilar

**RF cubiertos:** RF-01, RF-02, RF-03, RF-04, RF-05, RF-08, RF-09, RF-10. **RNF:** RNF-01, RNF-03.
**Depende de:** nada. Es la primera.
**Estado:** `hecha`

### Qué hacer

Crear cinco archivos. Todos nuevos, ninguno modifica código existente.

**1. `tsconfig.json`** — contenido exacto en el plan, sección **D-A**. Puntos que importan:

- `jsx: "react-jsx"` (runtime automático). No cambiar a `"react"`: obligaría a importar `React` en los 7 archivos `.tsx`.
- `skipLibCheck: false`. El reviewer ya verificó exit 0 así.
- `include: ["src", "test", "vite.config.ts", "vitest.config.ts"]`. **`test/` tiene que estar incluido**: RF-10 y CA-10.
- **No poner `allowJs`.** Es lo que fuerza a migrar los `.jsx` (D-1) en vez de que pasen inadvertidos.

**2. `vite.config.ts`** — contenido en **D-B**. Sin `server: { host: true }`, Vite solo escucha en loopback y RF-05 no se cumple.

**3. `postcss.config.js`** — contenido en **D-C**. **`export default`, nunca `module.exports`**: `package.json` tiene `"type": "module"` y un `.js` en CommonJS ni siquiera carga.

**4. `src/index.css`** — contenido en **D-E**. Las tres directivas `@tailwind` son obligatorias.

**5. `index.html`** — reemplazar la línea de texto plano por el documento real:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CAVA &amp; CO. — Seleccion Exclusiva de Vinos</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`lang="es"` es requisito de RF-01. El `src` apunta a `main.tsx`, que existe recién en T4: hasta entonces Vite lo sirve y da un error de módulo, lo cual es esperado.

### Verificación

```bash
npx tsc --noEmit --project tsconfig.json
```

Se espera que **falle**, y está bien: `App.jsx` y `hero.tsx` todavía están truncados y `src/main.tsx` no existe. Lo que se verifica es que **`tsc` deje de imprimir su texto de ayuda**: si muestra el texto de ayuda, el `tsconfig.json` está mal formado o mal ubicado.

Después:

```bash
npm run dev
```

Se espera que arranque y sirva el documento HTML. **Todavía va a haber un error de módulo en el navegador** por `main.tsx`. Lo que se verifica es que el servidor responde con el documento HTML que se acaba de escribir, y que el título de la pestaña es el correcto.

### Hecho cuando

- [x] Los cinco archivos existen en la raíz o en `src/`
- [x] `npx tsc --noEmit` **no** imprime el texto de ayuda de TypeScript
- [x] `npm run dev` responde con un documento HTML que contiene `<div id="root">` y `lang="es"`
- [x] `npm test` sale 0 y los 46 tests preexistentes siguen en verde
- [x] No se creó ningún archivo de lockfile nuevo

---

## T2 — Imports rotos y reubicación de los validadores

**RF cubiertos:** RF-07, RF-38. **RNF:** RNF-05.
**Depende de:** T1.
**Estado:** `hecha`

### Qué hacer

**Parte A — Corregir los 9 imports.** Cada línea cambia solo el `from`. Nada más del archivo se toca.

| Archivo | Línea | De | A |
|---|---|---|---|
| `src/components/carta_de_productos.tsx` | 2 | `'../types/wine'` | `'../types/vino'` |
| `src/components/carta_de_catalogo.tsx` | 3 | `'../types/wine'` | `'../types/vino'` |
| `src/components/carrito_de_compras.tsx` | 2 | `'../types/wine'` | `'../types/vino'` |
| `src/components/editor_formador_productos.tsx` | 3 | `'../types/wine'` | `'../types/vino'` |
| `src/components/carta_de_catalogo.tsx` | 4 | `'./ProductCard'` | `'./carta_de_productos'` |
| `src/components/hero.tsx` | 2 | `'./HeroCanvas3D'` | `'./herocanvas3d'` |
| `src/App.jsx` | 1 | `'./components/Navbar'` | `'./components/barra_de_navegacion'` |
| `src/App.jsx` | 2 | `'./components/Hero'` | `'./components/hero'` |
| `src/App.jsx` | 3 | `'./components/ProductCatalog'` | `'./components/carta_de_catalogo'` |

`App.jsx` se corrige acá aunque su contenido se reescriba entero en T4: si no, T4 arranca con imports que ya no existen y no se puede distinguir un error propio de uno heredado.

**Nota para el implementador, sobre `test/`.** Esta tarea **sí toca `test/`**, y lo hace en un solo punto: la **ruta** del import de validadores en los dos archivos preexistentes. Ese es el **único** cambio permitido en un test preexistente (RNF-05). El contenido de los tests no se toca: ni un caso se borra, se modifica ni se marca como omitido. Cualquier otra edición a `test/` en esta tarea es un error.

**Parte B — Reubicar los validadores.** Justificación completa en **D-K**.

1. Crear `src/utils/validadores.ts` con **el contenido exacto** de `test/validadores.ts`. Sin cambios de lógica, sin reescribir. El archivo importa `import type { Wine } from '../types/vino'`, y desde `src/utils/` esa ruta sigue siendo correcta porque tiene la misma profundidad de directorios.
2. Borrar `test/validadores.ts`.
3. En `test/validadores.test.ts` línea 10: `'./validadores'` → `'../src/utils/validadores'`.
4. En `test/integridad_datos_vino.test.ts` línea 4: `'./validadores'` → `'../src/utils/validadores'`.

**Los dos archivos de test siguen en `test/` y no se renombran.** `vitest.config.ts` recolecta `test/**/*.test.ts`. Renombrar cualquiera de los dos cambiaría un nombre del que RNF-05 depende: el requisito dice que los 46 preexistentes no se borran ni se modifican, y un rename los hace desaparecer.

**Por qué esto va en T2 y no en T5.** T5 necesita los validadores para validar el formulario. Si el movimiento dependiera de T5, y T5 dependiera de los validadores, sería un deadlock. Acá se resuelve: T2 deja los validadores accesibles desde `src/` y los tests verdes.

### Verificación

```bash
npm test
```

**Sin excepciones: salida 0 y los 46 tests preexistentes en verde.** Este es el momento de mayor riesgo de la tarea, porque se mueven archivos que los tests importan.

Después, sobre `src/`:

```bash
# Debe devolver 0 coincidencias
grep -r "types/wine" src/
grep -r "ProductCard'" src/
grep -r "HeroCanvas3D" src/
grep -r "components/Navbar" src/
grep -r "components/Hero" src/
grep -r "components/ProductCatalog" src/
```

Y confirmar que ningún archivo quedó `.jsx` o `.js` en `src/` salvo los que T4 va a migrar:

```bash
ls src/**/*.jsx src/*.jsx src/*.js
```

Se esperan exactamente `src/main.jsx` y `src/App.jsx`. Si aparece otro, es un `.jsx` olvidado.

### Hecho cuando

- [x] Los 9 imports apuntan a archivos que existen
- [x] `npm test` sale 0 y los 46 tests preexistentes siguen en verde
- [x] `src/utils/validadores.ts` existe con el mismo contenido que tenía `test/validadores.ts`
- [x] `test/validadores.ts` ya no existe
- [ ] Los 6 `grep` devuelven 0 coincidencias → **5 de 6.** Ver nota de implementación abajo
- [x] Solo quedan `src/main.jsx` y `src/App.jsx` como `.jsx`/`.js` en `src/`

### Notas de implementación (2026-10-06)

Dos desvíos del enunciado de arriba, ninguno de criterio: uno es un criterio de verificación que no puede dar 0, y el otro es una premisa incorrecta de la nota.

**1. `grep -r "HeroCanvas3D" src/` devuelve 2, no 0.** El criterio de arriba busca un *nombre de archivo*, pero el patrón también matchea el **identificador**:

```
src/components/hero.tsx(2):      import { HeroCanvas3D } from './herocanvas3d'   <- import ya corregido
src/components/herocanvas3d.tsx(71): export const HeroCanvas3D = () => {          <- declaracion del export
```

El import **sí** está corregido: es `'./herocanvas3d'`, que existe. Lo que queda son el nombre del binding importado y la declaración del export, y ese nombre no se puede cambiar sin renombrar el componente exportado en `herocanvas3d.tsx`, que `plan.md` §2.3 lista como archivo que **no** se toca. Los otros 5 `grep` dan 0. Un criterio que dé 0 exige `grep -r "from './HeroCanvas3D'" src/`.

**2. La ruta del import de tipos de los validadores sí tuvo que cambiar.** La nota de arriba dice que el archivo "importa `import type { Wine } from '../types/vino'`". No era así: importaba `from '../src/types/vino'`, que es lo correcto desde `test/` y **no** desde `src/utils/` (ahí resolvería a `src/src/types/vino`). Se ajustó a `'../types/vino'`, que es exactamente lo que la nota daba por hecho. Sin ese ajuste, el archivo no tipa:

```
$ npx tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler src/utils/validadores.ts
src/utils/validadores.ts(1,27): error TS2307: Cannot find module '../src/types/vino' or its
corresponding type declarations.
```

**El resto del archivo es idéntico byte a byte**, verificado por hash: revirtiendo solo esa línea 1, el SHA-256 vuelve a ser `A6F638921B53317A30126C9D7B2F54C9C9754F1D3B144E0A5AC28C1EDE009201`, que era el del original. Sin cambios de lógica.

**3. `npx tsc --noEmit` está ciego a errores semánticos mientras `hero.tsx` esté truncado.** Con el error de sintaxis TS1109 presente, `tsc` imprime solo los errores sintácticos y no reporta los de módulo. Por eso el TS2307 del punto 2 no apareció en la corrida del proyecto y sí en la corrida aislada. **Esto importa para T3**: cuando `hero.tsx` se complete, `tsc` empezará a reportar errores semánticos que hasta ahora estaban ocultos. No hay que leer "solo el TS1109" como "no hay nada más".

---

## T3 — Hero completo, con degradación móvil

**RF cubiertos:** RF-12, RF-13. **RNF:** RNF-09.
**Depende de:** T2 (el import de `herocanvas3d` ya está corregido).
**Estado:** `hecha`

### Qué hacer

Completar `src/components/hero.tsx`, que hoy está truncado en la línea 5 dentro de un `return (`. **El archivo se conserva en `.tsx`**: ya es TypeScript y no hay nada que migrar.

Contenido:

1. **Sección `<section>`** que envuelve todo, con el `id` que corresponda y clases de la constitución: fondo carbón, texto crema, títulos en `font-serif`.
2. **Titular** visible sin hacer scroll (RF-12). Debe ser el primer elemento visible de la página.
3. **Botón "Explorar Cava"** (RF-12). Un `<a href='#catalogo'>` con estilo de botón, **no** un `<button>`: el destino ya existe (`carta_de_catalogo.tsx:36` tiene `id='catalogo'`), y un ancla es navegable con teclado y con el botón atrás del navegador. El `scroll-mt` del catálogo lo agrega T6; acá solo el ancla.
4. **Botella 3D**: renderizar `<HeroCanvas3D />` **condicionado a 640 px o más de ancho de ventana**.
5. **Degradación móvil** (RNF-09, D-15): un hook local que escuche el resize y devuelva el ancho. Por debajo de 640 px, no renderizar el `<Canvas>`.

```tsx
const ANCHO_MINIMO_CANVAS = 640

const useAnchoVentana = (): number => {
  const [ancho, setAncho] = useState(() => window.innerWidth)
  useEffect(() => {
    const alCambiar = () => setAncho(window.innerWidth)
    window.addEventListener('resize', alCambiar)
    return () => window.removeEventListener('resize', alCambiar)
  }, [])
  return ancho
}
```

Se usa `window.innerWidth` y **no** `matchMedia`, porque RNF-09 y D-16 acotan "móvil" a un umbral numérico de 640 px, y `window.innerWidth` es el valor que CA-26 mide. `matchMedia('(max-width: 639px)')` sería equivalente pero introduce una consulta de medios que hay que mantener sincronizada con el número.

**El cleanup del listener es obligatorio.** Sin él, cada resize agrega un listener nuevo y la app degrada su rendimiento con el uso. La constitución §2.3 lo pide al hablar de rendimiento.

`HeroCanvas3D` **no se toca**. Ya renderiza con `h-[400px] md:h-[550px]`, y su altura no es la del viewport (§13).

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador, sobre `npm run dev`:

- A 1280 px: se ve el titular, se ve "Explorar Cava", se ve el canvas de la botella. → **CA-30** (primera mitad)
- A 375 px: se ven el titular y el botón, **legibles** (16 px o más, contraste 4.5:1 o más, §1.1). El canvas puede no estar. → **CA-30** (segunda mitad)
- Redimensionar la ventana repetidamente y confirmar que **no** aparecen warnings de React ni la página se degrada con el uso. Si aparecen, falta el cleanup.
- Pulsar "Explorar Cava": el catálogo aparece. El `<h2>` puede quedar parcialmente tapado todavía, porque el `scroll-mt` lo agrega T6. → **CA-31 se verifica en T6**, no acá.

### Hecho cuando

- [x] `hero.tsx` exporta un componente completo, sin truncarse
- [x] `npx tsc --noEmit` sale 0
- [x] `npm test` sale 0 y los 46 tests preexistentes siguen en verde
- [x] A 1280 px se ven titular, botón y canvas 3D
- [x] A 375 px se ven titular y botón, legibles, sin canvas
- [x] El listener de `resize` tiene cleanup

### Notas de implementación (2026-10-06)

**El archivo quedó en 65 líneas y el hook es textual, tal como estaba en el enunciado.** `ANCHO_MINIMO_CANVAS = 640` y `useAnchoVentana` se copiaron sin cambios, incluido el `return () => window.removeEventListener('resize', alCambiar)` que es el cleanup obligatorio. `herocanvas3d.tsx` no se tocó (D-15, `plan.md` §2.3).

**`npx tsc --noEmit` salió 0 a la primera.** La advertencia de T2 sobre el TS1109 que ocultaba errores semánticos era real como mecanismo, pero no había ningún error semántico esperando: con `hero.tsx` completo, el proyecto entero tipa limpio, incluido `herocanvas3d.tsx`. No hubo ningún error nuevo que clasificar.

**Cinco decisiones que el enunciado deja abiertas:**

1. **`id='hero'`.** El enunciado pedía "el `id` que corresponda" sin nombrarlo. `#catalogo` ya lo define `carta_de_catalogo.tsx` y es el destino del ancla; para el hero corresponde `hero`, que es el nombre del componente. Nada más lo referencia.
2. **`pt-32 md:pt-36` es obligatorio, no cosmético.** La barra es `fixed` y mide **104 px** a 375 px (medido) y **80 px** arriba. Sin padding superior el titular quedaría detrás de la barra y **RF-12** ("visible sin necesidad de hacer scroll") no se cumpliría. Los 128 px y 144 px son holgura suficiente para las dos filas que T6 le agrega a la barra.
3. **Ningún texto del hero baja de 16 px en móvil, ni el eyebrow.** §1.1 define "legible" como 16 px o más, y el enunciado pide titular y botón legibles. El eyebrow quedó en `text-base md:text-xs` por eso, no por criterio de diseño: a 375 px mide 16 px.
4. **Por debajo de 640 px no se renderiza un placeholder, solo se omite el canvas.** RF-12 dice "se degrada **o se omite**", y el enunciado dice "no renderizar el `<Canvas>`". No se inventó una imagen de reemplazo porque habría que pedirla por red (RNF-06) sin que ningún RF lo pida.
5. **`motion.section` con una entrada de 0,6 s.** El import de `framer-motion` ya estaba en el archivo truncado y `noUnusedLocals: true` lo vuelve obligatorio: o se usa `motion`, o `tsc` falla. No se agregan animaciones de scroll ni parallax, que §3.2 saca de alcance.

**Un hueco del plan, sin tocar.** `eslint.config.js` tiene `src/components/hero.tsx` dentro de `ignores`, con un comentario que dice que esa línea hay que borrarla "cuando esa spec los complete". **Ninguna tarea de T1 a T11 lo cubre.** No se tocó el archivo: no está en §2.2 (modificables) ni en §2.3 (intocables), y quitarlo es decisión del coordinador. Se verificó que el archivo lintaría igual: `npx eslint src/components/hero.tsx --no-ignore` sale **0**.

**La verificación en navegador hubo que hacerse sin `App.tsx`.** `index.html` apunta a `/src/main.tsx`, que no existe hasta T4, así que `npm run dev` sirve la página **en blanco** con un 404 del módulo. Para no meter `main.tsx` ni `App.tsx` antes de tiempo, el hero se montó desde el contexto de la página con `createRoot`, importando los módulos ya transformados por Vite: primero `Hero` solo (para los anchos) y después `Navbar` + `Hero` + `ProductCatalog` con `INITIAL_WINES` (para el ancla). No se escribió ningún archivo.

Resultados, con las cifras medidas:

| Qué | Resultado |
|---|---|
| 1280 px | `<h1>` "Vinos de Autor" a **72 px**, botón `<a>` "Explorar Cava" a **18 px**, **1 canvas** de 550 px, todo dentro del viewport sin scroll |
| 375 px | `<h1>` a **36 px**, botón a **16 px**, subtítulo y eyebrow a **16 px**, **0 canvas**, `scrollWidth === clientWidth === 375` (sin scroll horizontal) |
| Contraste | crema `#fdfbf7` sobre carbón `#0a0a0a`: **19,9:1**. Botón crema sobre vino-700 `#5b132b`: **12,9:1**. Ambos muy por encima de 4,5:1 |
| Umbral | 640 px → canvas; **639 px → sin canvas**. Exacto |
| Cleanup | con los listeners contados a mano: al montar, `agrega 2 / quita 1 / activos 1` (el doble montaje es el `StrictMode` de desarrollo). Después de **20 resize**: `42 / 41 / activos 1`, o sea ningún resize agrega un listener. Al desmontar: `42 / 42 / activos 0`. **No hay fuga** |
| Consola | sin warnings de React ni errores propios, con el canvas montado y desmontado 20 veces |
| Ancla | "Explorar Cava" lleva a `#catalogo` (`scrollY` 511 a 375 px, 790 a 1280 px) |

**El `<h2>` del catálogo NO quedó tapado, y conviene saber por qué.** Quedan **15 px** de aire a 375 px y **39 px** a 1280 px, porque el `<h2>` cae 104 px dentro de la sección y la barra todavía mide una sola fila. **CA-31 pasa hoy por casualidad, no por diseño**: T6 le agrega una segunda fila a la barra y ahí sí va a hacer falta el `scroll-mt` de D-I. Queda confirmado que se verifica en T6, como el enunciado dice.

**Lo que RF-12 y CE-08 piden y T3 no cubre.** Ambos condicionan el 3D a "640 px **o más** y **WebGL está disponible**". El enunciado de T3 solo pide el umbral de 640 px, así que **no se agregó detección de WebGL**: con WebGL apagado, `Canvas` de R3F avisa en consola y el resto de la página sigue renderizando, que es lo que CE-08 permite ("en consola se permite ver un aviso del renderizador"). Queda anotado para **T11**, que recorre los CE.

---

## T4 — Migración de los dos archivos de entrada a `.tsx`

**RF cubiertos:** RF-39. **Prepara:** RF-06, RF-15 (T5 los implementa).
**Depende de:** T2, T3.
**Estado:** `hecha`

### Qué hacer

D-1: los dos archivos de entrada se migran a TypeScript. Contenido completo en **D-F**.

**Orden dentro de la tarea, por tarea:** crear el `.tsx`, borrar el `.jsx`. Nunca al revés: con los dos archivos presentes, `include: ["src", ...]` los chequea a los dos.

**1. `src/main.tsx`** — el contenido del plan, **D-F**. Tres puntos que no son negociables:

- El guard de `document.getElementById('root')`: devuelve `HTMLElement | null` y `createRoot` exige `HTMLElement`. Con `strict: true`, sin el guard, TypeScript rechaza el `null`.
- `import App from './App'` **sin extensión**. `moduleResolution: "bundler"` resuelve a `App.tsx`.
- `<StrictMode>` envolviendo.

**2. `src/App.tsx`** — en esta tarea, **solo el esqueleto**: los imports correctos (los de T2) y un `return` con un marcador visible. No es el orquestador completo; ese es T5.

```tsx
export default function App() {
  return (
    <p>Cava &amp; Co. — en construccion</p>
  )
}
```

El esqueleto existe para que T4 sea verificable por sí misma: si `main.tsx` monta y muestra ese texto, entonces T4 está terminada y T5 empieza sobre una base que funciona.

**3. Borrar `src/main.jsx` y `src/App.jsx`.**

### Verificación

```bash
npx tsc --noEmit
npm test
npm run build
```

En navegador:

- La página carga **sin pantalla en blanco** y muestra "Cava & Co. — en construccion". → primera mitad de **CA-06**
- **Consola sin errores** de nivel `error`. Los `warning` se anotan como línea base de CA-06 (§12.3 de la spec, primer ítem pendiente).
- `dist/index.html` contiene `<div id="root">` y un `<script type="module">`, y pesa 1 kB o más. → **CA-03**

Y la comprobación que RF-39 exige explícitamente:

```bash
find src -name "*.jsx" -o -name "*.js"
```

**Debe devolver vacío.** Si devuelve algo, queda un archivo de aplicación en JavaScript.

### Hecho cuando

- [x] `src/main.tsx` y `src/App.tsx` existen; `src/main.jsx` y `src/App.jsx` ya no
- [x] `find src -name "*.jsx" -o -name "*.js"` devuelve vacío
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0 y genera `dist/index.html` real
- [x] `npm test` sale 0 y los 46 tests preexistentes siguen en verde
- [x] La página muestra el marcador de construcción, sin errores de consola

### Notas de implementación (2026-10-06)

**El esqueleto de `App.tsx` no importa nada.** `task.md` decía "los imports correctos (los de T2) y un `return` con un marcador visible", pero con `noUnusedLocals: true` los tres imports (`Navbar`, `Hero`, `ProductCatalog`) sin uso **harían fallar `tsc`**. Importarlos exigiría una forma de usarlos que ya es el orquestador de T5. El esqueleto sale sin imports y T5 los agrega con el pseudocódigo de D-G, que ya los trae.

**El marcador se corrigió: `Cava & Co.` y no `Cava &amp; Co.`** El enunciado traía la entidad HTML escapada, que en JSX es texto plano y se vería literalmente como `Cava &amp; Co.` en pantalla. Verificado en navegador: el `innerHTML` es `<p>Cava &amp; Co. — en construccion</p>` (el `&` escapado es correcto en el DOM) y el `innerText` es `Cava & Co. — en construccion`.

**`dist/index.html` pesa 431 bytes (0.42 kB), no 1 kB.** CA-03 dice "el **peso total de `dist/`** es igual o superior a 1 kB", y `dist/` pesa **162.334 bytes**. La lectura de "pesa 1 kB o más" aplicada al archivo suelto es una simplificación del enunciado: el umbral de 1 kB siempre se mide sobre el conjunto de artefactos, como está redactado en RF-04 y CA-03. El HTML por sí solo es chico por naturaleza y no hay nada que corregir.

**El índice de git estaba desactualizado.** `src/App.jsx` y `src/main.jsx` estaban en el índice como agregados (A) desde antes de cualquier commit; al borrarlos del disco quedaron como `AD`. Se corrió `git rm --cached` para sacarlos del índice sin tocar nada más. Sin commit, como corresponde.

**Línea base de consola para CA-06 (primer ítem pendiente de §12.3).** Con el marcador montado, la consola tiene **3 mensajes y ninguno es error ni warning**: `[vite] connecting...` (debug), el aviso de React DevTools (info) y `[vite] connected.` (debug). Los tres son del entorno de desarrollo, no de la aplicación. La lista de CA-06 queda vacía hoy.

---

## T5 — Orquestador: estado, persistencia y flujo completo

**RF cubiertos:** RF-06, RF-15, RF-16, RF-18, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34. **RNF:** RNF-06, RNF-07.
**Depende de:** T4.
**Estado:** `hecha`

### Qué hacer

La tarea más grande. `App.tsx` pasa de esqueleto a orquestador, y `editor_formador_productos.tsx` gana validación e id único.

**Parte A — `src/App.tsx`.** El pseudocódigo completo está en **D-G**. Conectar seis componentes: `Navbar`, `Hero`, `ProductCatalog`, `CartDrawer`, `ProductForm`, y el mensaje de pedido confirmado. `VistaRapidaProducto` y `PieDePagina` llegan en T7 y T8.

Puntos donde equivocarse es fácil:

- **Firmas exactas.** `Navbar` pide `cartCount`, `onOpenCart`, `onOpenAdmin`, `searchQuery`, `onSearchChange`. `ProductCatalog` pide `wines`, `searchQuery`, `onAddToCart`, `onSelectWine`. `CartDrawer` pide `isOpen`, `onClose`, `items`, `onUpdateQuantity`, `onRemoveItem`, `onCheckout`. `ProductForm` pide `isOpen`, `onClose`, `onAddWine`. Copiar de las interfaces en los archivos, no de memoria.
- **`onSelectWine={setVinoSeleccionado}` directo.** La firma de `ProductCatalogProps.onSelectWine` es `(wine: Wine) => void`, y `setVinoSeleccionado` es exactamente eso. Sin envoltorio.
- **`.filter((item) => item.quantity > 0)`** implementa RF-23 sin condicional.
- **Estado inicial por función perezosa** en los dos `useState` que leen `localStorage`.
- **`try`/`catch` en `leer` y en `guardar`.** Es lo que cumple RF-34 ante datos corruptos y ante cuota llena.

**Parte B — `src/components/editor_formador_productos.tsx`.** D-L y D-M.

- Importar `esPrecioValido` y `esAnioRazonable` desde `'../utils/validadores'`.
- Agregar estado `error` para el mensaje de RF-29.
- Calcular `const anioEnCurso = new Date().getFullYear()` **una vez** arriba, y derivar el texto del rango de ahí, no con un año fijo.
- Sustituir el `if (!name || !winery || !price) return` de la línea 26 por la acumulación de `errores`.
- Sustituir `crypto.randomUUID()` de la línea 29 por la función `generarId` de D-M.
- No tocar la validación de categoría: RF-29 la excluye.

`price` es `number | ''`. `esPrecioValido` espera `unknown`, así que `esPrecioValido('')` devuelve `false` y el campo vacío se rechaza sin rama aparte.

### Verificación

```bash
npx tsc --noEmit
npm test
npm run build
```

En navegador, **empzando por el paso 0 de §8.1 de la spec** (`localStorage.clear()` o incógnito):

| Qué | CA |
|---|---|
| Se ven 2 tarjetas. "Blanco" deja 1. "Todos" vuelve a 2 | CA-12 |
| `chardonnay` deja 1; `zzzz` deja 0 con mensaje | CA-13 |
| "Agregar" dos veces en la misma tarjeta deja **una** línea con cantidad 2 | CA-14 |
| Agregar muestra el `1` junto al ícono; abrir el carrito muestra la línea; `+` sube cantidad y total; `−` en 2 deja 1; `−` en 1 elimina la línea; con carrito vacío el indicador **desaparece** y se ve el mensaje de vacío sin bloque de total ni botón finalizar | CA-15 |
| Cerrar el carrito con ✕ y con el fondo oscurecido | CA-16 |
| "Finalizar Pedido" con contenido: mensaje de pedido confirmado, carrito vacío, indicador desaparecido, **sin recarga de página** | CA-17 |
| Formulario válido agrega una **tercera** tarjeta y cierra el formulario | CA-18 |
| Precio `0`, `-100` y vacío: no agregan tarjeta **y muestran mensaje** | CA-19 |
| Cosecha vacía, `1200` y `2028`: no agregan. Cosecha `2027` y `1850`: **sí** agregan | CA-20 |
| Recargar conserva el tercer vino y la línea del carrito | CA-22 |
| Escribir basura en `vinoteca_wines` y `vinoteca_cart`, recargar: arranca con 2 vinos y carrito vacío, sin pantalla en blanco | CA-23 |
| **Repetir el paso 0** después de CA-23 | — |

**CA-21 no se verifica acá.** Requiere servir desde la IP local y depende del firewall (§12.3 de la spec, segundo ítem). Si el firewall bloquea, se reporta `no ejecutable`.

Consola: sin errores de nivel `error`. Con la animación 3D corriendo, scrollear y abrir el carrito responden en menos de 200 ms (RNF-07, umbral de 30 FPS).

### Hecho cuando

- [x] `App.tsx` conecta los seis componentes con las firmas exactas de sus props
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0
- [x] `npm test` sale 0 y los 46 tests preexistentes siguen en verde
- [x] CA-12 a CA-20 y CA-22, CA-23 pasan en navegador
- [x] El formulario rechaza precio `0`, `-100` y vacío **con mensaje visible**
- [x] El límite superior de cosecha es `año en curso + 1`, calculado, no escrito a mano
- [x] Los datos corruptos en `localStorage` no rompen el arranque
- [x] `editor_formador_productos.tsx` no usa `crypto.randomUUID()` de forma directa

### Notas de implementación (2026-10-06)

**Un hallazgo que T5 no arregla, y que hay que pasar a T6: `layout` en las líneas del carrito rompe el cierre del panel.**

Al pulsar `+` o `−` en el carrito y después cerrarlo, **el panel y el fondo oscurecido quedan montados en el DOM para siempre**: la animación de salida termina visualmente (`translateX(100%)`, o sea que el panel está fuera de pantalla) pero `AnimatePresence` nunca unmountea el nodo. El fondo se queda en `fixed inset-0 bg-black/70 z-50` **tapando la página entera**: `document.elementFromPoint` en el centro devuelve el fondo, así que después de ese click la página no responde a nada.

Causa raíz, aislada con un experimento reversible: **`carrito_de_compras.tsx:81`, el `layout` de la línea del `motion.div`**. Quitando esa línea y nada más, el mismo guion cierra bien (`aside=0`, fondo `=0`). El archivo quedó **restaurado byte a byte** (SHA-256 `86880FEE…50`, igual al original): es un archivo de T2/T4, no de T5, y el arreglo es de "ajustes en componentes existentes", o sea **T6**.

Cómo se verificó: primero se sospechó que era un artefacto de headless. **No lo es**: se repitió con Chrome **headful** (ventana real, `visibilityState: visible`, `requestAnimationFrame` vivo) y el fallo se reproduce igual. Tampoco es culpa de `App.tsx`: con el carrito recién abierto y sin tocar cantidades, cerrar por ✕ y por el fondo funciona, y `Finalizar Pedido` desmonta el panel en 3 de 3 corridas limpias.

**CA-15, CA-16 y CA-17 pasan por completo en el camino limpio.** El defecto necesita que antes haya un cambio de cantidad, y §8.1 corre CA-15 → CA-16 → CA-17 en ese orden sobre el mismo estado, así que el revisor tiene que saber que la secuencia de CA-15 contaminará a CA-16.

**Dos desvíos del pseudocódigo de D-G, ambos por `noUnusedLocals: true`.**

1. **`VistaRapidaProducto` y `PieDePagina` no se importan todavía**, contra lo que dice D-G y `plan.md` §2.2. Sus archivos se crean en T7 y T8, así que importarlos ahora rompe el build con TS2307.
2. **La posición del valor de `useState` va elidida:** `const [, setVinoSeleccionado] = useState<Wine | null>(null)`. Sin el modal que la lea, `vinoSeleccionado` queda declarado y sin usar, y `noUnusedLocals: true` lo rechaza con TS6133 (comprobado: el error real es `src/App.tsx(x,y): error TS6133: 'vinoSeleccionado' is declared but its value is never read`). **T7 tiene que volver a nombrarla** al agregar el bloque del modal; el `setVinoSeleccionado` y el cableado `onSelectWine` ya están como los pide D-G.

**El mensaje de pedido confirmado usa clases de Tailwind, no estilos inline.** D-G dice "con estilos inline"; con hexadecimales en línea, CA-37 falla. Se resolvió con utilidades del tema (`border-gold-500/40`, `bg-charcoal-900/95`, `text-gold-400`), sin ningún color hexadecimal en `App.tsx`. Se le puso `pointer-events-none` para que no tape la página: el mensaje no se cierra solo y RF-27 no pide un cierre.

**`noValidate` en el `<form>` es obligatorio para CA-19, y no estaba en D-L.** Con `required` en el precio, un precio vacío **bloquea el `submit` en el navegador** y `handleSubmit` ni se ejecuta: el usuario vería el tooltip nativo, no el mensaje de RF-29. CA-19 dice "Los tres casos deben mostrar el mensaje, no solo impedir el alta". Los atributos `required` siguen en el DOM, así que la validación nativa no se pierde como atributo. **Lo que sí se pierde es la validación nativa de `type='url'` del campo de imagen**, y RF-29 no lista la URL entre las condiciones, así que no se agregó: sería inventar una condición de rechazo.

**`anioEnCurso` quedó calculado una sola vez, en los tres lugares.** D-L lo pide "una vez arriba" para derivar el texto del rango. El `useState` de `vintage` y el `handleReset` del archivo ya llamaban `new Date().getFullYear()`, y los dos usan ahora la constante: es literalmente lo que "una vez" pide.

**El estado `error` se limpia al abrir el formulario.** D-L solo dice cómo acumular errores, no cuándo se borran. Sin un `useEffect` sobre `isOpen`, el mensaje de un envío fallido quedaba pegado cuando se cerraba el formulario con ✕ y se volvía a abrir.

### Verificación en navegador (2026-10-06)

El MCP de **chrome-devtools no estuvo disponible** para esta sesión (el catálogo de herramientas solo exponía `context7` y `opencode`, y `list_mcp_resources` volvió vacío, aunque `.opencode/opencode.json` lo declara). Como RNF-04 prohíbe instalar dependencias, se verificó **con Chrome 154 por CDP crudo**: `node` con el `WebSocket` global contra `--remote-debugging-port`, **sin instalar nada**. Los scripts quedaron en el directorio temporal, fuera del repo.

| CA | Resultado |
|---|---|
| **CA-12** | **OK.** 2 tarjetas; "Blanco" → 1; "Todos" → 2 |
| **CA-13** | **OK.** `chardonnay` → 1; `zzzz` → 0 con "No se encontraron etiquetas" |
| **CA-14** | **OK.** Dos "Agregar" en la misma tarjeta → 1 línea con cantidad 2 |
| **CA-15** | **OK.** Indicador `2`; `+` → cantidad 3 y total `$135.000`; `−` en 3 → 2; en 2 → 1; en 1 → **elimina la línea**; vacío → indicador ausente, "El carrito está vacío", sin bloque de total y sin botón finalizar |
| **CA-16** | **OK en el camino limpio** (✕ y fondo). **Falla** si antes se tocó una cantidad: ver el hallazgo de arriba |
| **CA-17** | **OK en 3 de 3 corridas limpias.** Mensaje "Pedido confirmado. Gracias por tu compra.", `vinoteca_cart = "[]"`, indicador ausente, sin recarga de página (centinela en `window` intacto) |
| **CA-18** | **OK.** Tercera tarjeta "Reserva Especial" y formulario cerrado. Id único generado: `e6e59671-df91-40fb-a9eb-4aa769653680` |
| **CA-19** | **OK.** `0`, `-100` y vacío: **ninguno** agrega tarjeta, los tres muestran "El precio tiene que ser mayor que cero" y el formulario sigue abierto |
| **CA-20** | **OK.** Vacía, `1200` y `2028` no agregan, con el mensaje "La cosecha tiene que ser un numero entero entre 1850 y 2027"; `2027` y `1850` **sí** agregan |
| **CA-22** | **OK.** Tras recargar siguen las 5 tarjetas y el indicador del carrito en `1` |
| **CA-23** | **OK.** Basura en ambas claves → arranca con 2 vinos y carrito vacío, `#root` con contenido, sin pantalla en blanco |
| **CA-21** | **No ejecutado**, según lo indicado: depende del firewall. `npm run dev` sí publica `http://192.168.1.9:5173/`, o sea que `server.host: true` funciona |
| **Paso 0 repetido** | **OK.** 2 tarjetas, indicador ausente, `vinoteca_cart = "[]"` |

**RNF-07, medido.** Abrir el carrito: **0,8 ms** al primer commit de React. Cerrarlo: **0,8 ms**. El scroll activa el glassmorphism de la barra a los **123 ms** (por debajo del tope de 200 ms; el número es alto porque `scroll-behavior: smooth` sigue desplazando cuando la clase cambia). **61 FPS** con la animación 3D corriendo, contra el umbral de 30.

**Consola.** **Cero excepciones no capturadas.** Cuatro mensajes distintos, y ninguno es de la aplicación:

| Nivel | Mensaje | Origen |
|---|---|---|
| `debug` | `[vite] connecting...` | servidor de desarrollo |
| `debug` | `[vite] connected.` | servidor de desarrollo |
| `info` | aviso de React DevTools | `react-dom` |
| `error` | `Failed to load resource: 404 /favicon.ico` | **el pedido automático de favicon del navegador** *(registro literal de esta sesión: una remedición posterior no lo reprodujo)* |

En esta sesión el `404` de `/favicon.ico` se registró y **no se contó como error de la app**: la explicación de entonces era que `index.html` no declara `<link rel='icon'>` y no hay carpeta `public/`, así que Chrome lo pedía solo y Vite respondía 404. Aparece en el dominio `Log` de CDP, que es más verboso que la consola de DevTools; **no se pudo contrastar contra la línea base de T4** (3 mensajes) porque esa sesión usó el MCP de chrome-devtools, que no estuvo disponible acá. **Esa atribución al pedido automático del navegador queda como observación no confirmada, no como explicación**: una remedición posterior, con `Network.clearBrowserCache`, `setCacheDisabled: true` y perfil limpio, **no reprodujo** el `404` —Chrome no llegó a pedir `/favicon.ico` ni en carga fría ni en caliente—, así que no cabe afirmar que esa sea la causa ni que agregar un favicon sea la corrección. Lo que sí era permanente en esas cargas era un `loadingFailed: net::ERR_BLOCKED_BY_ORB` por la imagen de `src/datos/vino.ts:28`, cuya URL respondía `404` en el origen y que no produce entrada de consola. **Esa URL se reemplazó el 2026-10-07**, con la spec ya cerrada y por autorización del usuario, así que el `ORB` ya no se reproduce. Ver `spec.md` §12.6.

---

## T6 — Ajustes de comportamiento en componentes existentes

**RF cubiertos:** RF-11, RF-13, RF-17, RF-19, RF-40. **RNF:** RNF-09.
**Depende de:** T5.
**Estado:** `hecha`

### Qué hacer

Tres ajustes, en tres archivos.

**1. `src/components/barra_de_navegacion.tsx` — buscador visible en móvil.** Decisión completa y verificada en **D-H**. El cálculo de D-17 está confirmado: `px-6` son 24 px por lado, a 375 px quedan **327 px** de caja, y el buscador no compite por ese espacio si baja a su propia fila.

Cambios:
- Quitar `hidden md:block` del contenedor del input (línea 47). Pasa a ser visible siempre.
- Reestructurar a dos filas: la primera con logo + acciones, la segunda con el buscador. En `md` en adelante vuelven a una sola fila.
- `shrink-0` en el logo y en el grupo de acciones, para que flex no los comprima.
- `md:mx-8` en lugar de `mx-8` fijo.
- El header pasa a `pt-3` en móvil, con `py-5` solo en `md`.

**2. `src/components/carta_de_catalogo.tsx` — `scroll-mt` y `trim`.**

- Agregar `scroll-mt-28 md:scroll-mt-24` al `<section id='catalogo'>` de la línea 36 (D-I). El valor exacto se ajusta mirando la barra renderizada: CA-31 mide el solapamiento real, no la clase.
- Normalizar la consulta una vez, antes del predicado (D-J):
  ```tsx
  const consulta = searchQuery.trim().toLowerCase()
  ```
  y usar `consulta` en las tres comparaciones.

**3. `src/components/hero.tsx` — nada.** Ya quedó en T3.

**Lo que NO se toca:** la lógica de filtro por categoría (ya funciona), el contador (ya cumple RF-21 con su `{cartCount > 0 && ...}`), y el `scroll` listener que ya existe.

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador:

| Qué | CA |
|---|---|
| A 700 px el catálogo muestra 2 o más columnas. A 600 px, una sola | CA-26 |
| A 375 px: una sola columna y `scrollWidth === clientWidth` (cero scroll horizontal) | CA-25 |
| A 375 px: hay un campo de búsqueda visible y operativo; `chardonnay` deja 1 tarjeta; **y** `scrollWidth === clientWidth` | CA-27 |
| A 375 px, **sin cambiar el ancho en ningún momento**, se ejecutan las 11 acciones de §1.1 en orden: navegar, filtrar, buscar, agregar, abrir carrito, `+`, eliminar, agregar, cerrar carrito, finalizar, abrir y cerrar vista rápida. Ninguna falla, ninguna produce scroll horizontal | CA-28 |
| A 375 px el titular y el botón del hero son legibles (16 px o más, contraste 4.5:1 o más) | CA-28, RNF-09 |
| A 1280 px: los cinco elementos de la barra visibles, incluid el campo de búsqueda | CA-29 |
| "Explorar Cava": el `<h2>Catálogo de Vinos</h2>` visible por completo, con su borde superior debajo del borde inferior de la barra, sin solaparse | CA-31 |

**CA-28 requiere que la vista rápida exista.** Si T7 todavía no está, se verifica en T7.

### Hecho cuando

- [x] El campo de búsqueda es visible y usable a 375 px
- [x] La barra no produce scroll horizontal a 375 px
- [x] A 700 px hay dos o más columnas; a 600 px, una
- [x] `scrollWidth === clientWidth` a 375 px
- [x] Buscar `" chardonnay "` deja la misma tarjeta que `"chardonnay"`
- [x] El `<h2>` del catálogo queda completamente visible tras "Explorar Cava"
- [x] `npx tsc --noEmit` sale 0 y `npm test` sale 0 con los 46 preexistentes en verde
- [x] El carrito se desmonta de verdad después de cambiar una cantidad **y quitar una línea**

### Notas de implementación (2026-10-06)

Cuatro desvíos del enunciado, todos con medición que los justifica, y **un defecto del enunciado mismo**: las dos filas que pide la tarea no entran en 327 px con los tamaños actuales. Ninguno rompe un RF, un CA ni una convención.

**1. La barra necesita TRES ajustes de tamaño en móvil, no cero.** El enunciado (y D-H) dan por hecho que el logo y el grupo de acciones entran juntos en la fila 1. **No entran.** Medido a 375 px con el código sin tocar:

| Elemento | Ancho |
|---|---|
| logo `CAVA & CO.` (`text-2xl`) | **160 px** |
| botón `+ Cargar Vino` | 130 px |
| ícono de carrito (`p-2` + `w-6`) | 40 px |
| `gap-4` del grupo de acciones | 16 px |
| **grupo de acciones, total** | **186 px** |
| **fila 1, total** | **346 px** |
| caja de contenido con `px-6` | **327 px** |

Faltan 19 px. Con `shrink-0` en ambos (lo que D-H pide explícitamente) no hay holgura posible, y la fila 1 se parte en dos: la barra queda a **tres filas y 153 px de alto**, que tapa el hero y obliga a un `scroll-mt` mucho mayor. Se ajustaron tres cosas, **todas solo en móvil**, con `md:` restaurando el valor original:

| Cambio | Efecto medido |
|---|---|
| logo `text-xl md:text-2xl` | 160 → **133 px** |
| `gap-x-2` en la fila (era `gap-4`) | 16 → **8 px** mínimos |
| `px-4 md:px-6` en el contenedor | 327 → **343 px** de caja |

Fila 1: **133 + 8 + 186 = 327 px de 343**. Margen de 16 px. A 768 px y en adelante los valores son los originales (logo de 160 px, `px-6`, `gap-4`), así que **el escritorio no cambia**: es el mismo diseño de una fila que había antes.

**2. `hidden md:block` no alcanza: hacen falta `order` y `flex-wrap`.** El enunciado dice "reestructurar a dos filas" y "en `md` en adelante vuelven a una sola fila", y el snippet de D-H pone el buscador en un `<div>` aparte que queda **siempre** en una segunda fila, incluso en escritorio: el snippet contradice su propia prosa. Con un solo `<input>` hay que resolverlo con `flex-wrap` + `order`, que sí cumple las dos frases:

- móvil: logo `order-0`, buscador `order-3` con `w-full` (baja a su fila), acciones `order-2`
- `md`: buscador `order-2` y acciones `order-3` (el buscador vuelve al medio, entre logo y acciones)

A 768 px queda **una sola fila de 80 px**, igual que antes de esta tarea: logo, buscador de 264 px, acciones.

**3. `py-3` en móvil en vez de `pt-3` a secas.** El enunciado pide `pt-3`. Con solo `pt-3` el input queda pegado al borde inferior del header (0 px de aire debajo, medido). `py-3 md:py-5` da los mismos 12 px de arriba que pide el enunciado y 12 px simétricos abajo. Alto final de la barra: **113 px** a 375 px, **80 px** en `md`.

**4. `scroll-mt-28 md:scroll-mt-24` queda como estaba, sin ajuste.** D-I decía ajustarlo mirando la barra renderizada y dejó el criterio a la implementación. Medido con la barra de dos filas: el `scroll-mt` computado es **112 px** en móvil y la barra mide **113 px**, o sea que `scroll-mt-28` ya equivale a la altura real de la barra y no hace falta más. Holgura real del `<h2>`: **102 px** a 375 px y **214 px** a 1280 px. **CA-31 pasa con holgura**, no por poco.

**El bug del carrito: se reproduce solo al QUITAR una línea, no con cualquier cambio de cantidad.** T5 lo describió como "pulsar `+` o `−` y después cerrar", y la causa raíz que aisló (`carrito_de_compras.tsx:81`, el `layout`) es correcta, pero el disparador real es más estrecho. Se corrieron **11 escenarios** con `layout` presente y **los mismos 11** sin él:

| Escenario | con `layout` | sin `layout` |
|---|---|---|
| `+` y cerrar a los 50 ms | bien | bien |
| `+` y cerrar a los 300 ms | bien | bien |
| `+` `+` y cerrar | bien | bien |
| `+` `−` (de 2 a 1) y cerrar | bien | bien |
| `+` y cerrar por el fondo | bien | bien |
| **`+` y "Eliminar" y cerrar** | **overlay pegado** | bien |
| 375 px: `+` y cerrar | bien | bien |
| 375 px: `+` `+` y cerrar | bien | bien |
| **`+` `−` `−` hasta 0 y cerrar** | **overlay pegado** | bien |
| **`+` y "Eliminar" y cerrar rápido** | **overlay pegado** | bien |
| **"Eliminar" y cerrar, sin tocar cantidades** | **overlay pegado** | bien |

O sea: los 4 que fallan son **exactamente los que eliminan una línea** (RF-24 con "Eliminar", RF-23 con `−` hasta 0). La rotación de la proyección de layout de un hijo que sale del árbol frena el unmount del `AnimatePresence`, y el `aside` y el fondo quedan montados para siempre con el panel ya salido de pantalla. Por eso el guion de §8.1 lo dispara: CA-15 termina eliminando líneas.

**Qué se perdió al quitar el `layout`.** La proyección de layout era lo único que animaba el **reordenamiento** de las líneas: al quitar una, las demás ahora saltan a su posición en vez de desplazarse. Medido: la línea restante pasa de `y=242` a `y=113` de un salto, con `transform: none`. No se perdió nada más: la entrada de cada línea (`opacity`/`y`) sigue, y el `exit` de la línea quitada ya estaba muerto desde antes —la lista nunca estuvo envuelta en un `AnimatePresence`— porque se desmontaba al instante. **Es exactamente el criterio que dio la tarea: un layout correcto antes que una animación.** Para recuperar el reordenamiento sin el bug habría que envolver la lista en su propio `AnimatePresence` y usar `layout` solo ahí; no se hizo porque excede el alcance de T6 y sería una hipótesis sin verificar.

**Reparto de responsabilidades que conviene que el revisor sepa.** `hero.tsx` quedó intacto, como mandaba el enunciado, y su `pt-32` (128 px) sigue siendo suficiente para una barra de 113 px: el `<h1>` arranca en `y=168`, o sea **15 px por debajo** del borde inferior de la barra. Si en T7 o T8 la barra vuelve a crecer, es el número que hay que volver a mirar.

### Verificación en navegador (2026-10-06)

El MCP de **chrome-devtools no estuvo disponible** para esta sesión (el catálogo solo expone `context7` y `opencode`, y `list_mcp_resources` vuelve vacío). Se verificó con **Chrome 154 por CDP crudo**, con `node` y el `WebSocket` global, sin instalar nada. Los scripts quedaron en el directorio temporal, fuera del repo. Empezando siempre por el **paso 0** (`localStorage.clear()`).

| CA | Resultado |
|---|---|
| **CA-25** | **OK.** A 375 px: 1 columna, `scrollWidth === clientWidth === 375`. Sin scroll horizontal en **ningún** ancho probado (320 a 1280) |
| **CA-26** | **OK.** A 700 px: **2 columnas**. A 600 px: **1 columna** |
| **CA-27** | **OK.** A 375 px el campo de búsqueda es visible (327 px de ancho, 37 px de alto) y operativo: `chardonnay` deja **1** tarjeta; `scrollWidth === clientWidth === 375` |
| **CA-28** | **OK en las 10 primeras acciones, sin cambiar el ancho en ningún momento** (375 px fijo). Ver tabla abajo. La **undécima (vista rápida) queda pendiente de T7** |
| **CA-29** | **OK.** A 1280 px: marca, buscador, "+ Cargar Vino" e ícono de carrito visibles y **en el mismo eje**, y el **contador visible con `5`** cuando hay unidades. Barra de una fila, 80 px |
| **CA-31** | **OK.** A 375 px: borde inferior de la barra en `114`, borde superior del `<h2>` en `216` → **102 px de holgura**. A 1280 px: `65` contra `279` → **214 px**. Sin solaparse en ninguno |
| **RNF-09** | **OK.** Titular a **36 px** con contraste **19,16:1**; botón "Explorar Cava" a **16 px** con contraste **12,92:1**. Los dos por encima de los 16 px y 4,5:1 de §1.1, y ninguno tapado por la barra |
| **Paso 0 repetido** | **OK.** 2 vinos, `vinoteca_cart = "[]"`, 2 tarjetas, indicador del carrito ausente |

Las diez acciones de CA-28, todas a 375 px sin cambiar el ancho:

| # | Acción | Resultado |
|---|---|---|
| 1 | navegar el catálogo | 2 tarjetas, ambas con nombre |
| 2 | filtrar "Blanco" | 1 tarjeta: Chardonnay White Bones |
| 3 | escribir `chardonnay` | 1 tarjeta: Chardonnay White Bones |
| 4 | agregar un vino | indicador `1`, `vinoteca_cart` con 1 línea |
| 5 | abrir el carrito | panel montado, línea visible |
| 6 | subir con `+` | `$45.000` → `$90.000`, total `$90.000` |
| 7 | "Eliminar" | carrito vacío, **sin** bloque de total ni botón finalizar |
| 8 | agregar de nuevo | 1 línea, `$45.000` |
| 9 | **`+` otra vez y cerrar con ✕** | **`aside = 0`, fondo `= 0`, `elementFromPoint` devuelve el catálogo, página utilizable.** Es el guion que fallaba |
| 10 | finalizar el pedido | "Pedido confirmado", `vinoteca_cart = "[]"`, indicador ausente, sin recarga |
| 11 | abrir y cerrar la vista rápida | **PENDIENTE DE T7**: `VistaRapidaProducto` todavía no existe |

`scrollWidth === clientWidth === 375` se comprobó **después de cada una** de las diez.

**Barra de navegación, comportamiento por ancho** (medido, con `filas` = cuántas filas ocupa):

| Ancho | Filas | Alto | Nota |
|---|---|---|---|
| 320 a 367 px | **3** | 153 px | 133 + 8 + 186 = 327 px no entra en 288 px de caja. **Sin scroll horizontal**, pero tres filas |
| 375 a 767 px | **2** | 113 px | fila 1: logo + acciones; fila 2: buscador |
| 768 px en adelante | **1** | 80 px | idéntico al diseño original |

Los tres filas de 320 a 367 px son el precio de no tocar el botón ni el ícono. 320 px no es un ancho de ningún CA, y el modo de fallo es una barra más alta, no un desborde: a 360 px `scrollWidth === clientWidth === 360`.

**Consola.** **Cero excepciones y cero errores de nivel `error`.** Solo `[vite] connecting...`, `[vite] connected.`, el aviso de React DevTools y dos `THREE.WebGLRenderer: Context Lost.` de nivel `log`, que son del harness: aparecen al cambiar el ancho emulado y matar el contexto WebGL, no de la aplicación. La línea base de T4 (3 mensajes) se mantiene.

---

## T7 — Vista rápida de producto

**RF cubiertos:** RF-35, RF-36, RF-37. **RNF:** RNF-06.
**Depende de:** T5.
**Estado:** `hecha`

### Qué hacer

Crear `src/components/vista_rapida_producto.tsx` y conectarlo en `App.tsx`.

**Interfaz del componente:**

```tsx
interface VistaRapidaProductoProps {
  wine: Wine
  onClose: () => void
}
```

Un solo vino a la vez, porque `App.tsx` guarda `vinoSeleccionado: Wine | null`. No hace falta un array.

**Estructura:**

- Overlay de fondo oscurecido con `onClick={onClose}` (RF-37).
- Panel centrado con `motion.div`.
- **Imagen** del vino a mayor tamaño (RF-35). `alt={wine.name}`, que es lo que ya hace `ProductCard`.
- Datos: nombre, bodega, varietal, categoría, cosecha, precio. El precio con el mismo `Intl.NumberFormat('es-AR', { currency: 'ARS', maximumFractionDigits: 0 })` que usa `carta_de_productos.tsx`.
- **Bloque de notas de cata, solo si `wine.tastingNotes !== undefined`** (D-N).
- **Bloque de maridaje, solo si `wine.foodPairing !== undefined`** (D-N).
- **Control de cierre identificable** (RF-37): un botón ✕ con `aria-label='Cerrar detalle'`. Es el paralelo exacto del `aria-label='Cerrar carrito'` que ya existe en `carrito_de_compras.tsx:61`.

**Usa `AnimatePresence`.** A diferencia del mensaje de checkout, esto es un modal, y la constitución §3 dice: "Paneles y modales siempre acompañados de animaciones de entrada/salida (`AnimatePresence`)". La constitución es el nivel superior de precedencia (D-N).

**Conectar en `App.tsx`:** el bloque `vinoSeleccionado !== null && <VistaRapidaProducto ... />` que ya está en el pseudocódigo de D-G. Como el modal no contiene el catálogo, el filtro y la búsqueda viven en `App.tsx` y sobreviven al cierre por construcción: cerrar solo hace `setVinoSeleccionado(null)`. **No hay que guardar ni restaurar nada** para cumplir RF-37.

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador:

| Qué | CA |
|---|---|
| Click en la imagen o el nombre del primer vino: modal con imagen ampliada, nombre, bodega, categoría, cosecha, precio, notas de cata y maridaje. **Los dos vinos del catálogo inicial tienen ambos datos.** | CA-33 |
| Cargar un vino nuevo (sin notas ni maridaje) y abrir su vista: imagen y datos, y **ningún** bloque de notas ni de maridaje, tampoco vacío | CA-34 |
| Filtrar "Blanco", abrir la vista, cerrarla con el control de cierre: el modal desaparece y el catálogo **sigue filtrado en "Blanco"** con la búsqueda intacta. Repetir cerrando con el fondo | CA-35 |
| Con el modal abierto, la imagen del vino se solicita desde `images.unsplash.com` (pestaña Network) | RNF-06 |
| Cerrar con la tecla Escape | buena práctica, no exigida por ningún RF |

Ahora sí se puede verificar **CA-28** completo, porque la undécima acción de §1.1 es abrir y cerrar la vista rápida.

**Nota sobre el orden.** Esta tarea (T7) viene **antes** que T8 (pie de página) y que T9 (los tests del orquestador). Es correcto: la suite de T9 importa `App.tsx`, que importa el pie de página, así que T9 tiene que esperar a que T8 exista. T7 no tiene esa dependencia y puede ir en cuanto T5 esté.

### Hecho cuando

- [x] `src/components/vista_rapida_producto.tsx` existe y exporta el componente
- [x] `App.tsx` lo monta (siempre; ver nota 1)
- [x] Los bloques de notas y maridaje aparecen solo cuando el vino los tiene
- [x] Hay un control de cierre identificable con `aria-label`, además del fondo
- [x] Cerrar conserva el filtro por categoría y el texto de búsqueda
- [x] El modal entra y sale con `AnimatePresence` (salida **animada**: ver nota 1)
- [x] `npx tsc --noEmit` sale 0 y `npm test` sale 0 con los 46 preexistentes en verde
- [x] CA-33, CA-34, CA-35 y CA-28 pasan

### Notas de implementación (2026-10-06)

**1. `wine` es `Wine | null`, y `App.tsx` lo monta siempre. Desvío del pseudocódigo de D-G, deliberado y necesario.**

D-G y el "Hecho cuando" de arriba piden `{vinoSeleccionado !== null && <VistaRapidaProducto wine={vinoSeleccionado} ... />}`. **Eso es incompatible con una animación de salida.** Si el componente se monta solo cuando hay vino, al cerrar React lo desmonta de golpe: `AnimatePresence` alcanza a registrar la salida, pero nunca llega a correrla, y el requisito de D-N ("paneles y modales siempre acompañados de animaciones de entrada/salida", constitución §3) queda sin cumplir. La composición correcta es la inversa: **el componente se monta siempre y es su `AnimatePresence` interno el que decide si hay algo que mostrar**, con `wine !== null` como condición de los hijos.

Consecuencias, las dos son intencionales:

- La interfaz queda `wine: Wine | null`, no `wine: Wine`. Con `Wine` no hay forma de que el componente siga montado en el render siguiente al del cierre: el padre solo podría dejar de renderizarlo, que es el caso quewantamos evitar.
- El retorno temprano que sugería el enunciado **no se puso**, y esa es la parte que hay que registrar: un `if (wine === null) return null` al principio del componente tiene exactamente el mismo problema que el montaje condicional, porque `AnimatePresence` desaparecería del árbol antes de animar la salida. El estrechamiento de tipo se hace en el JSX (`{wine !== null && (...)}`), que `strict` estrecha sin narrowing explicito.

El componente es dueño de su `AnimatePresence`, igual que `CartDrawer` y `ProductForm`. Ponerlo en `App.tsx` habría funcionado, pero entonces la animación viviría fuera del componente que anima.

**2. Sin `layout` en ningún elemento, por el hallazgo de T6.** T6 aisló que la proyección de layout frena el unmount cuando un hijo sale del árbol. Los dos bloques condicionales de D-N son exactamente un hijo que sale del árbol, así que la precaución aplica acá también: **no se puso `layout` en ningún elemento del modal**, ni por costumbre ni por simetría con `ProductCard`. No hacía falta para nada de lo que el componente muestra.

**3. `role='dialog'` y `aria-modal='true'` no los pedía ningún RF.** Es el único agregado sobre el enunciado. Un modal sin rol de diálogo no es reconocible como modal por tecnología asistiva, y el enunciado ya llama "modal" a este componente y exige un control de cierre **identificable** (RF-37). El `aria-label` del panel lleva el nombre del vino, así que `getByRole('dialog')` y `getByLabelText` lo encuentran en los tests de T9.

**4. Escape se agregó.** El enunciado lo lista en la tabla de verificación como "buena práctica, no exigida por ningún RF", así que se implementó: listener de `keydown` en `window`, montado **solo mientras hay vino abierto** y con cleanup en el `return`, igual que el listener de `resize` de T3. Sin vino abierto no hay listener, así que no puede quedar ninguno acumulado.

**5. La imagen es más grande que la de la tarjeta en todos los anchos, y para lograrlo hizo falta `h-72`.** RF-35 pide la imagen "a mayor tamaño". En `md` en adelante la columna de la rejilla ya agranda la imagen (medido: 383×350 contra 285×256 de la tarjeta). **A una columna, que es el caso de móvil, la tarjeta ya ocupa todo el ancho disponible**, así que la única dimensión que queda para hacer la imagen mayor es la altura: con `h-64` las dos medían 342×256, idénticas. Con `h-72` la del modal mide 342×288 contra 326×256 de la tarjeta, o sea estrictamente mayor en área en los tres anchos medidos.

**6. Sin scroll horizontal en ningún ancho, y el panel entra entero a 375×812.** Panel de 343 px con márgenes de 16 px a cada lado (`left: 16`, `right: 359` sobre 375). A 375×812 no hay scroll vertical dentro del overlay. A 375×720 el panel mide 682 px y **entra entero igual** (de 19 a 701 sobre 720); lo que desborda son los `my-8` de los márgenes, 26 px, no el contenido.

**7. Lo que el modal NO muestra: la descripción.** El enunciado enumera los seis datos ("nombre, bodega, varietal, categoría, cosecha, precio") y `description` no está entre ellos, aunque `Wine` la tiene y la tarjeta ya la muestra. No se agregó para no inventar contenido fuera de la lista; si el revisor espera verla, es una línea y no cambia ningún RF.

### Verificación en navegador (2026-10-06)

El MCP de **chrome-devtools no estuvo disponible** para esta sesión (el catálogo de herramientas solo expone `context7` y `opencode`, y `list_mcp_resources` vuelve vacío), igual que en T5 y T6. Se verificó con **Chrome 154 por CDP crudo**, con `node` y el `WebSocket` global, **sin instalar nada**. Los scripts quedaron en el directorio temporal, fuera del repo. Empezando siempre por el **paso 0** (`localStorage.clear()`), yDesktop a 1280×900 salvo donde se dice otro ancho.

| CA | Resultado |
|---|---|
| **CA-33** | **OK.** Click en la imagen del primer vino: diálogo con `aria-label='Vista rapida de Gran Reserva Malbec'`, imagen de 383×350 con `alt='Gran Reserva Malbec'`, nombre, "BODEGA CATENA ZAPATA • MALBEC", badge "TINTO", "Cosecha 2020", **$ 45.000**, "NOTAS DE CATA" y "MARIDAJE SUGERIDO" con sus textos. Los dos vinos del catálogo inicial tienen ambos datos |
| **CA-34** | **OK.** Vino nuevo cargado por el formulario ("Vino Sin Notas", sin notas ni maridaje en el objeto guardado): diálogo con imagen, nombre, bodega, varietal, categoría, cosecha y **$ 33.000**, y **0 `<section>`**, **0 `<h3>`**, y el texto "notas de cata" y "maridaje" **no aparece** en ningún lado. Tampoco vacío: no se renderiza |
| **CA-35** | **OK.** Filtrar "Blanco" → 1 tarjeta (Chardonnay White Bones). Abrir la vista y cerrar con el ✕: diálogo 0, overlay 0, **sigue 1 tarjeta** y el botón "Blanco" con su clase activa. Escribir `chardonnay` y cerrar por el fondo: diálogo 0, overlay 0, sigue 1 tarjeta, **búsqueda intacta** (`'chardonnay'`) y categoría "Blanco" activa. Cerrar por fondo y por control producen el mismo resultado |
| **RNF-06** | **OK.** Con la caché del navegador vaciada justo antes de abrir el modal, la única petición de imagen que sale es `https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800`, tipo `Image`, y la imagen carga (`naturalWidth 800`, `complete: true`). Ningún otro pedido |
| **Escape** | **OK.** `KeyboardEvent('Escape')` sobre `window`: 1 diálogo abierto → 0, overlay 0 |
| **Paso 0 repetido** | **OK.** 2 vinos en `vinoteca_wines`, `vinoteca_cart = "[]"`, 2 tarjetas, sin indicador de carrito, sin diálogo y sin overlay |

**El cierre desmonta de verdad, comprobado en el DOM** (el riesgo exacto que T6、突然 encontró en el carrito):

| Momento | `[role=dialog]` | overlay `bg-black/80` | `elementFromPoint` en el centro |
|---|---|---|---|
| Antes del click | 1 | 1 | el overlay |
| ** Justo después del click | **1** | **1** | el overlay |
| +50 ms | 1 | 1 | el overlay |
| +170 ms | 1 | — | el overlay |
| +670 ms | **0** | **0** | **`DIV.relative max-w-7xl mx-auto grid…`**, o sea el catálogo |

Que el nodo siga montado después del click y haya **2 animaciones de WAAPI corriendo** a los 50 ms y a los 170 ms prueba que hay una salida animada de verdad y no un desmontaje instantáneo; que a los 670 ms no quede ni el overlay ni el panel y que `elementFromPoint` devuelva un elemento del catálogo prueba que no quedó nada pegado. `elementFromPoint` nunca devolvió el overlay después de cerrar.

**CA-28 completo, a 375 px y sin cambiar el ancho en ningún momento.** Las once acciones de §1.1, con `scrollWidth === clientWidth === 375` comprobado **después de cada una**:

| # | Acción | Resultado |
|---|---|---|
| 1 | navegar el catálogo | 2 tarjetas, ambas con nombre |
| 2 | filtrar "Blanco" | 1 tarjeta: Chardonnay White Bones |
| 3 | escribir `chardonnay` | 1 tarjeta: Chardonnay White Bones, `input.value = 'chardonnay'` |
| 4 | agregar un vino | 1 línea en `vinoteca_cart`, indicador `1` |
| 5 | abrir el carrito | `aside = 1`, 1 línea visible |
| 6 | subir con `+` | 2 items, línea **$ 76.000**, total **$ 76.000** |
| 7 | "Eliminar" | carrito vacío, sin bloque de total ni botón finalizar |
| 8 | agregar de nuevo | 1 línea con cantidad 1 |
| 9 | **`+` otra vez y cerrar con ✕** | **`aside = 0`, `elementFromPoint` devuelve la imagen de una tarjeta del catálogo.** Es el guion que fallaba en T5/T6 |
| 10 | finalizar el pedido | "Pedido confirmado", `vinoteca_cart = "[]"`, sin recarga |
| 11 | **abrir y cerrar la vista rápida** | diálogo abierto con imagen, nombre, bodega, categoría, cosecha, precio, notas y maridaje; cerrado por el fondo: diálogo 0, overlay 0, **búsqueda `'chardonnay'` intacta y "Blanco" sigue activo**. Panel de 343 px, imagen 342×288, `scrollWidth` 375 con el modal abierto |

Título del hero a **36 px** y botón "Explorar Cava" a **16 px** a 375 px, por encima del mínimo de §1.1. **El modal no produce scroll horizontal a 375 px con el panel abierto** (`scrollWidth === clientWidth === 375` en la acción 11).

**Un detalle de medición que conviene saber, y que no es un defecto de T7.** Al filtrar por categoría, la tarjeta que sale del árbol **permanece en el DOM hasta ~1 s**, con la opacidad clavada en **0,069**: el `layout` de `carta_de_catalogo.tsx:71` y de `carta_de_productos.tsx:19` hace que la proyección de layout de la tarjeta que sobrevive termine **después** que su propia animación de salida, y `AnimatePresence` espera a que terminen las dos. Sin scroll previo el orden es el esperable (la saliente desaparece a los ~450 ms); con un `scroll` suave antes, el nodo sigue ahí a los 600 ms al 7% de opacidad. **Es invisible** y a los ~1000 ms está desmontado, así que un humano ve una sola tarjeta. Solo importa para un script que cuente nodos: hay que filtrar por opacidad, no contar hijos.

**Consola.** Cero excepciones y cero errores de nivel `error`. Cuatro mensajes distintos, todos del entorno: `[vite] connecting...`, `[vite] connected.` y el aviso de React DevTools (dos veces, por dos navegaciones).

**Verificación visual, con capturas reales** (el MCP no estaba disponible, así que seTomaron con `Page.captureScreenshot`): modal a 1280×900 y a 375×812, y el catálogo después de cerrar. En móvil el panel entra entero, con la imagen arriba a ancho completo, el título en dos líneas, el ✕ a la derecha y los dos bloques al final. Después de cerrar, el overlay desaparece por completo y el catálogo se ve y se usa normal.

---

## T8 — Pie de página

**RF cubiertos:** RF-14.
**Depende de:** T5.
**Estado:** `hecha`

### Qué hacer

Crear `src/components/pie_de_pagina.tsx` y montarlo en `App.tsx`, después de `</main>` y antes de los paneles.

**Interfaz:** sin props. Todo el contenido es estático.

**Contenido, los cuatro bloques que RF-14 exige:**

1. **Horarios de atención.** Texto con los días y horas.
2. **Ubicación.** Dirección de la vinoteca.
3. **Redes sociales.** Enlaces con íconos de `lucide-react`, que ya está instalada (D-O).
4. **Aviso legal +18.** Texto explícito de restricción de edad.

`<footer>` semántico, con las cuatro secciones. Colores de la constitución: fondo carbón, texto crema, acentos dorados.

**No lleva `AnimatePresence`**: no es panel ni modal (D-O).

**No inventar datos de contacto reales.** La dirección, los horarios y las cuentas de redes son contenido de ejemplo, igual que los dos vinos de `src/datos/vino.ts`. Si el usuario quiere datos reales, es una tarea aparte.

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador, al llegar al final de la página: los cuatro bloques visibles. → **CA-32**

Y recargar a 375 px y al final de la página: el pie no produce scroll horizontal. → parte de **CA-25**

### Hecho cuando

- [x] `src/components/pie_de_pagina.tsx` existe y exporta el componente
- [x] `App.tsx` lo monta al final de la página
- [x] Los cuatro bloques están: horarios, ubicación, redes sociales, aviso +18
- [x] Los íconos de redes vienen de `lucide-react`, no son SVG inline
- [x] `npx tsc --noEmit` sale 0 y `npm test` sale 0 con los 46 preexistentes en verde
- [x] CA-32 pasa

### Notas de implementación (2026-10-06)

Sin desvíos de `task.md` T8 ni de `plan.md` D-O: `<footer>` semántico, las cuatro secciones, iconos de `lucide-react`, sin `AnimatePresence`, colores por clases de Tailwind y **cero hexadecimales** en el archivo (CA-37).

**Los datos de contacto son de ejemplo**, como los dos vinos de `src/datos/vino.ts`: "Avenida del Puerto 1280, Bodega Norte, Barrio Histórico, Ciudad de Mendoza", los tres horarios y las tres cuentas (`@cavayco`). Los enlaces externos llevan `target='_blank' rel='noreferrer'`.

**Cuatro decisiones que el enunciado deja abiertas:**

1. **Cada bloque es un `<section>` con `aria-labelledby` sobre su `<h2>`.** Es lo que hace que "las cuatro secciones" del enunciado sea literal, y da nombres accesibles (`Horarios`, `Ubicación`, `Redes`, `Aviso legal`) sin depender de `@testing-library`, que no está instalado. Los íconos decorativos llevan `aria-hidden='true'`; los de red son decorativos también porque el `<a>` ya tiene nombre por texto.
2. **Iconos usados:** `Clock`, `MapPin`, `Instagram`, `Facebook`, `Twitter` de `lucide-react`. Verificado que los tres últimos existen en `lucide-react@0.344.0`. `LucideIcon` se importa con `import type` porque `isolatedModules: true`.
3. **Los horarios y las redes salen de dos `const` de módulo** (`HORARIOS`, `REDES`), no de JSX literal: las interfaces `Horario` y `RedSocial` evitan el `any` implícito y dejan el `.map()` tipado. El contenido sigue siendo estático, que es lo que pide la interfaz sin props.
4. **El `+18` es un `<p>` propio con borde dorado**, además del texto explícito del aviso: CA-32 pide que se vea la restricción de edad, y el párrafo solo ("está prohibida para menores de 18 años") ya la dice; el distintivo hace que también se lea de un vistazo.

**Verificación en navegador.** El MCP de **chrome-devtools no estuvo disponible** para esta sesión (el catálogo solo expone `context7` y `opencode`, y `list_mcp_resources` volvió vacío), igual que en T5, T6 y T7. Se verificó con **Chrome por CDP crudo** (`node` + `WebSocket` global, sin instalar nada), con los scripts en el directorio temporal y fuera del repo. Empezando por el paso 0 (`localStorage.clear()`).

| CA | Resultado |
|---|---|
| **CA-32** | **OK.** Un solo `<footer>` (`FOOTER`, 423 px de alto a 1280 px) con **cuatro `<section>`**: Horarios, Ubicación, Redes, Aviso legal. A 1280 px, al final de la página, **las cuatro están simultáneamente en pantalla** (`top 534`, `bottom 747`, viewport 900). Los tres enlaces sociales apuntan a `https://` con `target='_blank'` y `rel='noreferrer'`, y cada uno trae su ícono. El texto del aviso dice "La venta de bebidas alcohólicas está prohibida para menores de 18 años." y el distintivo `+18` está presente |
| **CA-25** (parte del pie) | **OK.** A 375 px: **`scrollWidth === clientWidth === 375`**, en `<html>` y en `<body>`. El pie mide 1077 px de alto en una columna y los cuatro bloques se ven **recorriendo el pie de a 60 px**: los cuatro títulos entraron al viewport en algún momento del barrido |
| Íconos | **6 `<svg>`** en el pie: `Clock`, `MapPin`, `Instagram` (título de sección), y `Instagram`, `Facebook`, `Twitter` (uno por enlace). **Ninguno es SVG inline escrito a mano**: vienen del componente de `lucide-react`, que es lo que D-O pide |
| Colores | Fondo del pie `rgb(10, 10, 10)` (`bg-charcoal-950`), texto `rgb(253, 251, 247)` (`text-cream-100`), títulos `rgb(229, 193, 88)` (`text-gold-400`), `+18` en `rgb(229, 193, 88)` sobre `rgba(58, 10, 26, 0.4)` (`bg-wine-900/40`). Todos de `tailwind.config.js` |
| Tipografía | Títulos de sección a **18 px** `font-serif`; horarios, dirección y enlaces a **16 px** `text-base`; los textos secundarios a 14 px `text-sm` |
| Consola | **Cero entradas de nivel `error` o `warning`** en el dominio `Log` de CDP, con el canvas 3D montado |
| **Paso 0 repetido** | **OK.** `localStorage.length === 0`, `vinoteca_wines` y `vinoteca_cart` en `null` |

**Un matiz que conviene que el revisor sepa, y no es un defecto.** A 375 px el pie mide **1077 px** contra un viewport de 667 px, así que **con el scroll en el máximo los dos bloques de arriba quedan por encima del viewport** (`Horarios` en `top -353`, `Ubicación` en `top -145`; `Redes` en 53 y `Aviso legal` en 245 sí visibles). Los cuatro son visibles si se recorre el pie, que es lo que hace cualquier persona al llegar al final de la página: CA-32 dice "al llegar al final de la página **se ven** los cuatro bloques", y el barrido los ve a los cuatro. A 1280 px los cuatro entran de una vez en la misma pantalla, porque el pie pasa a cuatro columnas y baja a 423 px.

**`App.tsx` quedó con dos líneas más y nada más**: el `import` de `PieDePagina` (después del de `VistaRapidaProducto`) y `<PieDePagina />` entre `</main>` y `<CartDrawer />`. No se tocó estado, handlers ni ningún otro componente. El mensaje `role='status'` de pedido confirmado sigue al final, con su `pointer-events-none`, y el pie queda antes de los paneles como manda el enunciado.

**No se tocó `MEMORY.md` ni `AGENTS.md`**: eso es T10. Se deja anotado acá que `MEMORY.md:24` todavía tiene `[ ] Footer` sin marcar, que es exactamente lo que T10 tiene que hacer.

## T10 — Sincronización de la documentación

**RF cubiertos:** ninguno directamente. **RNF:** RNF-10.
**Depende de:** **T9** (va después de todo el código, incluida la tarea de tests).
**Estado:** `hecha`

### Qué hacer

RNF-10 y el punto 12 de §3.1 de la spec lo exigen: "DEBES seguir estas reglas **sin excepción**" y "debe hacerse inmediatamente".

**`MEMORY.md`:**

1. Agregar una entrada en `§Bitacora de Cambios / Notas` con la fecha y un resumen: la app compila y arranca, se migraron los archivos de entrada a TypeScript, se crearon la configuración y los estilos base, se agregaron pie de página y vista rápida.
2. En `§Componentes y Estructura`, marcar con `[x]` los ocho componentes que ahora existen: `Navbar`, `Hero`, `ProductCatalog`, `ProductCard`, `ProductForm`, `CartDrawer`, `ProductDetailModal`, `Footer`.
3. En `§Decisiones de Arquitectura y Stack`, si cambió algo del stack. **No** corregir `pnpm` → `npm`: §3.2 lo saca de alcance.
4. Registrar que la suite de pruebas **creció**: hay tests nuevos de la lógica de estado del orquestador, y **no se instaló ninguna dependencia** para hacerlo. Si en `MEMORY.md` hay alguna línea que diga que el stack es de 2 archivos de test o de 46 tests totales, **corregirla**: el total ya no es fijo.

**`AGENTS.md`:**

1. Si se introdujeron comandos nuevos, agregarlos a `§Comandos de configuracion`. **No debería haber ninguno nuevo**: `npm test`, `npm run dev` y `npm run build` ya están.
2. Si se adoptaron convenciones nuevas, agregarlas a `§Estilo de codigo`. Acá hay una concreta: los tests del orquestador usan `act` importado de `react` y fijan `globalThis.IS_REACT_ACT_ENVIRONMENT = true`. Si el proyecto va a seguir escribiendo tests de componentes, esa convención conviene dejarla escrita.
3. Si cambió el alcance de funcionalidades, actualizar `§Especificacion del Proyecto`. Acá hay cambios reales: la vista rápida y el pie de página ahora existen, el buscador funciona en móvil, y hay cobertura automatizada de la lógica de carrito y persistencia.

**Lo que NO se toca, aunque parezca una corrección obvia:**

- El `pnpm` de `AGENTS.md`, `MEMORY.md` y `docs/CONSTITUCION.md`. §3.2.
- El enlace `docs/constitution.md` → `docs/CONSTITUCION.md`. §3.2.
- `docs/CONSTITUCION.md` entero.

### Verificación

```bash
npm test
```

Lectura directa de los dos archivos:

- `MEMORY.md` tiene una entrada de bitácora con la fecha de esta spec.
- `MEMORY.md` §Componentes marca los ocho componentes como existentes.
- `AGENTS.md` refleja el alcance nuevo.

→ **CA-38**

Y una comprobación negativa, que importa tanto como las positivas:

```bash
grep -n "pnpm" AGENTS.md MEMORY.md docs/CONSTITUCION.md
```

**Debe devolver las tres coincidencias originales.** Si alguien "corrigió" el gestor de paquetes como parte de esta tarea, está fuera de alcance y hay que revertirlo.

### Hecho cuando

- [x] `MEMORY.md` tiene entrada de bitácora con la fecha
- [x] `MEMORY.md` §Componentes marca los ocho componentes
- [x] `MEMORY.md` no dice que la suite tiene un número fijo de tests o de archivos
- [x] `AGENTS.md` refleja el alcance nuevo
- [x] `grep -n "pnpm"` devuelve las tres coincidencias originales, sin cambios
- [x] `docs/CONSTITUCION.md` está intacto
- [x] CA-38 pasa

### Notas de implementación (2026-10-06)

Todo lo de arriba quedó hecho, pero el alcance real fue bastante más ancho que el enunciado. Estos son los desvíos.

**`MEMORY.md`.** Cuatro de los cuatro puntos del enunciado, y tres cosas más:

- **§Contexto → "Estado Actual"**: se actualizó. Decía "Preparado para comenzar el desarrollo de componentes", que contradecía el encabezado de la tarea y era falso a T10.
- **§Decisiones**: la disyuntiva abierta "React Context API o Zustand" quedó resuelta en **hooks funcionales dentro de `src/App.tsx`**, sin librería externa. Se agregó además una línea con la escena 3D y su degradación bajo 640 px (D-15 / RNF-09).
- **§Componentes**: además de marcar los ocho `[x]`, se corrigieron **4 descripciones** que prometían más de lo implementado (el parallax del hero, el filtro por precio y por cepa, la edición de productos existentes y la subida de imagen arrastrando archivo), dejando explícito que quedaron fuera de alcance en §3.2. También se corrigió la línea de `eslint.config.js`, que nombraba `src/App.jsx` y `src/main.jsx`, que ya no existen desde T4.
- **Las tres líneas del `ignores` de `eslint.config.js` NO se tocaron**: siguen ahí, asignadas a T11.

**`AGENTS.md`.** Los tres puntos del enunciado, más los que la protocolo de §"Reglas y Gobernanza" obligaba a mantener al día:

- **§Comandos**: se agregaron `npm run build` y `npx tsc --noEmit`. El enunciado decía que no debería haber comandos nuevos, pero estos dos son paso de verificación de todas las tareas y faltaban.
- **§Estilo**: tres convenciones nuevas. `act` importado de `react` con `globalThis.IS_REACT_ACT_ENVIRONMENT` declarado y **todo** `.click()` dentro de `act`; cero colores hexadecimales en los componentes (CA-37); y las suites en `test/**/*.test.ts` y **no** `.test.tsx`, porque `vitest.config.ts` solo recolecta esos archivos y un `.tsx` pasaría en verde sin ejecutarse.
- **§Especificación**: en vez de tocar los puntos 5 y 7 uno por uno, se agregó una subsección "Estado de la Implementacion (2026-10-06)" con los siete bloques implementados y una tabla de lo pendiente. El motivo: los puntos 3 y 4 seguían prometiendo funcionalidad que §3.2 saca de alcance, así que marcarlos habría dejado el documento mintiendo.
- **§Organización del Codigo**: `AnimatedSection` y `QuickViewModal` no existen en el repositorio, así que se reemplazaron por los nombres reales (`VistaRapidaProducto`, `PieDePagina`), con una nota de que el nombre de archivo en español `snake_case` no coincide con el del componente exportado.

**La comprobación negativa de `pnpm`.** Devuelve **4 ocurrencias en 2 líneas de `MEMORY.md`**, ambas históricas e intactas: **0 activas**. `AGENTS.md` ya decía `npm` en los cuatro comandos, y `docs/CONSTITUCION.md` **no se abrió para escribir**. El enunciado decía "las tres coincidencias originales"; el conteo real es 4, en 2 líneas, y ninguna se tocó.

**La entrada de bitácora de T10 se reescribió para no contener la palabra `pnpm`** al citar la entrada histórica. Escribirla con la palabra agregaba una quinta ocurrencia, o sea ruido nuevo en una comprobación cuyo criterio es "sin cambios".

**Verificación.** Los cuatro comandos dan exit 0: `npm run build`, `npm test` (**68 tests en verde, 4 archivos**), `npm run lint` y `npx tsc --noEmit`. No se corrieron comandos de navegador: esta tarea no toca componentes, y las decisiones visuales de los siete bloques ya se verificaron en T3, T5, T6, T7 y T8.

---

## T9 — Tests automatizados de la lógica de estado del orquestador

**RF cubiertos:** RF-41, RF-42, RF-43, RF-44, RF-45, RF-46, RF-47, RF-48, RF-49. **RNF:** RNF-05.
**Depende de:** **T8**. Es la última tarea de código, por D-18.
**Estado:** `hecha`

### Qué hacer

Crear **dos archivos de test nuevos**. Los nombres siguen el patrón del repo, que usa español y distingue por qué agrupa:

| Archivo | Cubre |
|---|---|
| `test/orquestador_carrito.test.ts` | RF-41 a RF-45, RF-49 |
| `test/orquestador_persistencia.test.ts` | RF-46, RF-47, RF-48 |

**Por qué dos y no uno.** Los de persistencia necesitan **preparar** `localStorage` con datos válidos o deliberadamente corruptos **antes** de montar, y eso no tiene sentido en un archivo de carrito. Un archivo, un `beforeEach`.

**No se toca ningún archivo de test preexistente.** Los 46 tests de `test/validadores.test.ts` y `test/integridad_datos_vino.test.ts` quedan como están. RNF-05.

### El andamiaje, en el orden en que se escribe

**1. `act` de `react`, y el entorno declarado.**

```ts
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import App from '../src/App'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
```

Dos errores que hay que evitar y que CA-40 detecta:

- **No** importar `act` de `react-dom/test-utils`: está deprecado y **emite un error en consola** al importarse. Hay que sacarlo de `react`.
- **No** olvidar `IS_REACT_ACT_ENVIRONMENT`: sin esa bandera, React avisa "The current testing environment is not configured to support `act(...)`".

**2. Montar `App` por test, con su propio `<div>`, y desmontarlo.**

```ts
const montarApp = (): Montaje => {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const root: Root = createRoot(contenedor)

  act(() => {
    root.render(<App />)
  })

  return { contenedor, root, textoDe, nodosDe, pulsar }
}
```

El teardown va en `afterEach` y hace `act(() => root.unmount())` **antes** de sacar el contenedor del `document`. El orden importa: si se saca el nodo primero, la raíz queda viva apuntando a algo que ya no está.

**3. El `.click()` va dentro de `act`.**

```ts
const pulsar = (selector: string): void => {
  const nodo = contenedor.querySelector(selector)
  if (!(nodo instanceof HTMLElement)) {
    throw new Error(`No se encontro un elemento pulsable para ${selector}`)
  }
  act(() => {
    nodo.click()
  })
}
```

Un click dispara un evento que React procesa **fuera** de su propio ciclo. Sin `act` alrededor, el estado se actualiza después de que el test terminó su bloque, y el `expect` siguiente lee el DOM viejo. Es el error más común al testear React sin librería de ayuda, y por eso va encapsulado en el helper y no en cada test.

**4. `localStorage.clear()` en `beforeEach`, nunca en `beforeAll`.**

```ts
beforeEach(() => {
  localStorage.clear()
})
```

En `beforeAll` el primer test que escribe contamina a todos los siguientes, y el síntoma es un test que pasa y otro que falla sin relación aparente.

**5. Montar `App` SIN `StrictMode`.** `main.tsx` lo envuelve, pero el doble montaje de efectos es un comportamiento **de desarrollo**: en los tests haría que la sincronización a `localStorage` escribiera dos veces por cambio. Montar `App` directo es el renderizado real en producción.

**6. Consultas con `document.querySelector`**, no con `@testing-library`: no está instalado y RNF-04 impide instalarlo. Y los tests **no** pueden usar `@testing-library/*`, así que lo que se consulta es por selector o por texto del nodo.

### Qué verificar, RF por RF

| RF | Qué hace el test | CA |
|---|---|---|
| **RF-41** | Pulsar "Agregar" dos veces sobre la misma tarjeta → **una sola** línea con cantidad 2 | CA-41 |
| **RF-42** | Con dos líneas en cantidades 2 y 3, el texto del total es exactamente `(p1×2)+(p2×3)` | CA-42 |
| **RF-43** | Poner una línea en 1 y pulsar `−` → desaparece. Con cantidad 2, dos pulsaciones de `−` → desaparece. **Nunca** hay una línea con 0 ni negativa | CA-43 |
| **RF-44** | Con dos líneas, "Eliminar" en una → esa línea desaparece y el total pasa a ser el de la otra | CA-44 |
| **RF-45** | Con contenido, "Finalizar Pedido" → mensaje de pedido confirmado, carrito vacío, y `localStorage.getItem('vinoteca_cart')` es un array vacío. Con carrito vacío, no cambia nada | CA-45 |
| **RF-46** | Agregar vino y artículo → las dos claves tienen lo esperado. **Desmontar, volver a montar** → el DOM muestra el vino y la línea | CA-46 |
| **RF-47** | Texto no-JSON en ambas claves → monta sin lanzar, con 2 vinos iniciales y carrito vacío | CA-47 |
| **RF-48** | Escribir en el buscador y elegir categoría, abrir la vista rápida, cerrarla → el texto sigue y la categoría sigue activa | CA-48 |
| **RF-49** | Con cantidades 2 y 3, el número junto al ícono es 5. Al vaciar, ese nodo **no existe** en el DOM | CA-49 |

### Verificación

```bash
npm test
npx tsc --noEmit
```

### Hecho cuando

- [x] `npm test` sale 0
- [x] Los **46 tests preexistentes** están en verde
- [x] Los tests nuevos de los dos archivos están en verde
- [x] Los dos archivos están bajo `test/` y terminan en `.test.ts`, así que `vitest` los recolecta
- [x] La consola **no** muestra "The current testing environment is not configured to support `act(...)`" → CA-40
- [x] La consola **no** muestra el error de deprecación de `ReactDOMTestUtils.act` → CA-40
- [x] `npx tsc --noEmit` sale 0
- [x] CA-40 a CA-49 pasan
- [x] No se modificó ningún archivo de test preexistente
- [x] `package.json` y `package-lock.json` sin cambios

### Si `act` no funciona con `createRoot`

Es la suposición menos verificada de todo el plan, y está anotada en el `plan.md` §7.2. Se verificó **leyendo el código** de `react@18.3.1` que `act` está implementado y hace `flushActQueue`, pero **nadie lo corrió**. Si en la práctica resultara que no sirve, **pará y reportá**: eso significaría que D-19 necesita revisión, y cambiar una decisión aprobada es un asunto del usuario, no del implementador.

### Notas de implementación (2026-10-06)

**`act` de React 18.3.1 con `createRoot` funciona. D-19 queda confirmada por ejecución, no por lectura.** Se verificó primero con un test de humo descartable, antes de escribir la suite: montó `App` con `act(() => root.render(createElement(App)))`, encontró las dos tarjetas del catálogo y el `<footer>`, y desmontó con `act(() => root.unmount())` dejando el contenedor vacío. Ni "The current testing environment is not configured to support `act(...)`" ni el error de `ReactDOMTestUtils.act` aparecieron, que es lo que CA-40 pide. El test de humo no quedó en el repo: los 22 tests de la suite hacen exactamente el mismo montaje en cada caso, así que si la bandera faltara el aviso aparecería igual.

**Pero el montaje fallaba antes de llegar a la lógica, y la causa no era `act`.** Al primer intento, con el viewport por defecto de jsdom (1024 px), el render reventaba con `Error: This browser does not support ResizeObserver out of the box`, de `react-use-measure`, que usa el `<Canvas>` de `@react-three/fiber`. Es el límite de §7.1 ("jsdom no tiene WebGL") materializado en el orden de ejecución: el hero renderiza `<HeroCanvas3D />` desde los 640 px, así que a 1024 px entra al canvas.

**La solución es la rama de móvil de la propia app, no un mock.** El andamiaje fija `window.innerWidth` en 375 con `Object.defineProperty` antes de montar, con lo cual `hero.tsx` no renderiza el canvas (RNF-09, D-15). Se descartó polifillar `ResizeObserver`: después fallaría al pedir un contexto WebGL que jsdom no tiene, y el `Environment` de `drei` además iría a la red. No se usó `vi.mock` (D-18), no se tocó `src/` y no se tocó `vitest.config.ts`.

**Tres desvíos de `plan.md` D-P, todos por tipos o por el recolector de tests:**

1. **`createElement(App)` en vez de `<App />`.** `vitest.config.ts` recolecta `test/**/*.test.ts` y nada más, y en un `.ts` la sintaxis JSX no compila. Un `.test.tsx` no se recolectaría y la suite pasaría en verde sin correr estos tests: exactamente el modo de fallo silencioso que el plan advierte en §2.1. Como los archivos de suite tienen que ser `.ts`, `root.render` recibe `createElement(App)`, que es el mismo elemento.
2. **`Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })` en vez de `globalThis.IS_REACT_ACT_ENVIRONMENT = true`.** La forma de D-P es un **TS7017** con `strict: true`: `typeof globalThis` no tiene índice de firmas y `@types/react@18.3` no declara la propiedad. Comprobado con `tsc` aislado. El efecto en runtime es idéntico.
3. **`nodos` devuelve `Element[]` y no `HTMLCollectionOf<Element>`.** La firma de D-P no tiene `.find`, y varios helpers la necesitan. `Array.from` del `NodeListOf` es lo mismo.

**Un tercer archivo nuevo: `test/andamiaje.ts`.** No es un archivo de suite (no termina en `.test.ts`, así que no lo recolecta) sino el andamiaje compartido que D-P describe. Vive aparte por una razón: los dos archivos de suite necesitan `montarApp`, `pulsar`, `escribir` y las consultas al DOM, y copiarlas en los dos duplicaría unas cuarenta líneas que tienen que quedar idénticas. `tsconfig.json` incluye `test/`, así que el archivo también se chequea con tipos (RF-10, CA-10).

**Un efecto real de `AnimatePresence` que hay que conocer para contar nodos.** Al cerrar un modal o al filtrar una tarjeta, el nodo **no** se va del DOM en el mismo `act`: la animación de salida avanza con `requestAnimationFrame`, y dentro de un `act` síncrono no corre ni un frame. Medido en el modal: `1` diálogo justo después del click y `0` tras ~600 ms reales. Por eso el andamiaje tiene `esperarSalidas()`, que espera dentro de un `act` async. Esto obligó a corregir los tests de RF-48: sin la espera, contar las tarjetas daba 2 con el filtro puesto, porque la que sale seguía montada. No se verifica la animación (que §7.1 saca de alcance): solo se espera a que el DOM refleje el estado. Las notas de T7 ya lo habían dejado anotado para el caso del catálogo.

**Un `WARNING: Multiple instances of Three.js being imported.` en la salida de los dos archivos nuevos.** Es ruido de `stderr` a nivel `warn`, no de `error`, y **no** es ninguno de los dos mensajes que CA-40 prohíbe. Viene de que `hero.tsx` importa `herocanvas3d.tsx`, que a su vez importa `three`, así que la librería se carga aunque el canvas no se renderice. Evitarlo exigiría `vi.mock` o tocar `src/`, y los dos están descartados.

**La suite no es vacía: se comprobó rompiendo el código a propósito y deshaciendo el cambio.** Con `agregarAlCarrito` sin la rama de "ya existe", `actualizarCantidad` sin el `.filter(item => item.quantity > 0)` y `unidades` como `carrito.length`, **8 de los 13 tests de carrito fallen**: los de RF-41, RF-42, RF-43, RF-44 y RF-49. `App.tsx` quedó restaurado byte a byte después (143 líneas, idénticas). La primera versión de la prueba de suma del contador **no** detectaba el `carrito.length` porque con una unidad por vino el número de líneas coincide con la suma de cantidades; se corrigió para que las cantidades diverjan de propósito (dos líneas en 2 y 2, contador 4), que es lo que distingue las dos cosas.

**Un error propio de un test, no de la app, que conviene registrar.** La primera versión de esa prueba pulsaba `pulsarPorTexto(montaje, '+')` sin índice y pulsaba el `+` de la línea 0 (2 → 3), mientras el comentario decía que iba a subir la línea 1. El rojo que produjo era correcto y el comentario estaba mal. Se pasó el índice explícito.

**Reparto final: 22 tests nuevos en 2 archivos, más 46 preexistentes = 68 en 4 archivos.** Los 46 preexistentes se ejecutan y se listan uno por uno en la salida de `npm test`, sin omitir ni uno (RNF-05). Ningún archivo de test preexistente fue tocado: los dos tienen `LastWriteTime` de las 12:03, de T2.

**Lo que esta tarea NO verifica, y por qué (no es un hueco, es `plan.md` §7.1).** Anchos de pantalla, solapamientos, contraste y `font-size`: jsdom no calcula layout ni aplica CSS. Roles ARIA y texto accesible: no hay `@testing-library` y RNF-04 impide instalarlo, así que las consultas son por selector y por texto de nodo. Animaciones: sin motor, y `AnimatePresence` anima fuera del ciclo de render. Recarga de página real: ningún test puede recargar, así que la parte de "finalizar pedido no recarga" la sigue teniendo CA-17 en navegador, y CA-45 verificó la parte testeable (carrito vacío, mensaje presente, `vinoteca_cart` con `"[]"`). Escena 3D: sin WebGL. Los 39 CA de navegador no se reemplazan ni se reducen con estos 22 tests.

---

## T11 — Verificación integral

**RF cubiertos:** RF-38, RF-39. **RNF:** RNF-01, RNF-02, RNF-03, RNF-04, RNF-05, RNF-08.
**Depende de:** T10.
**Estado:** `hecha`

### Qué hacer

No escribe código. Recorre la lista de criterios de la spec en el orden de §8.1 y deja registrado el resultado.

**Sobre la suite del orquestador: T11 no la repite.** Los CA-40 a CA-49 los verifica T9, caso por caso. Lo que T11 hace con la suite es lo único que puede: comprobar el resultado agregado. Si esto fallara, el bug está en T9, no acá.

**1. Suite y compilación.**

```bash
npm test
npm run build
```

`npm test`: salida 0, con los **46 tests preexistentes** en verde y los tests nuevos del orquestador también. → **CA-11**
`npm run build`: exit 0. → **CA-01**

**2. El chequeo de tipos cubre el proyecto entero.**

Meter un error de tipo deliberado en un archivo de `test/`, correr `npm run build`, confirmar que falla, y revertir. Si el build pasa, `test/` quedó fuera del `include`. → **CA-10**

Lo mismo con un error en `src/`: confirmar que falla y que `dist/` no se regenera. → **CA-02**

**3. Sin `any`.**

```bash
grep -rn "\bany\b" src/ test/ *.ts *.json
```

Cero coincidencias, igual que la línea base de §2.1. → **CA-09**

**4. Sin JavaScript en `src/`.**

```bash
find src -name "*.jsx" -o -name "*.js"
```

Vacío. → parte de **CA-36**

**5. Estilo.**

```bash
grep -rn ";$" src/ --include="*.ts" --include="*.tsx"
```

Cero coincidencias. → parte de **CA-36**

> **Alcance corregido el 2026-10-07.** El enunciado original pedía buscar sobre `src/` entero, y eso devuelve **7 coincidencias** en `src/index.css`. Con el criterio revisado de CA-36 (§12.5 de `spec.md`), la búsqueda se hace **solo sobre `.ts` y `.tsx`**: los `.css` de `src/` quedan excluidos y los archivos de configuración de la raíz también. Ver la nota de CA-36 más abajo.

**6. Paleta.** Los colores hexadecimales de los archivos creados o modificados son solo los de `tailwind.config.js`. → **CA-37**

**7. Dependencias.**

```bash
git diff package.json package-lock.json
```

Sin cambios. → **CA-39**

**8. Los tests preexistentes no fueron tocados.** Ninguno salvo la ruta de un import, en T2. Comprobarlo leyendo `test/validadores.test.ts` y `test/integridad_datos_vino.test.ts`: los casos son los mismos. Y que **no** aparezca `@testing-library/*` en las dependencias. → parte de **CA-39** y de **RNF-05**

**9. UTF-8 sin BOM.** Inspección manual del BOM de cada archivo creado o modificado, **incluidos los dos archivos de test nuevos**. **No hay comando de proyecto que lo verifique** (`herramientas/` está vacía), así que es por inspección. → RNF-08, y el tercer ítem pendiente de §12.3

**10. Los CA de navegador que faltan.** Recorrer §8.1 de la spec en orden, desde el paso 0, y registrar el resultado de cada CA que las tareas anteriores no hayan verificado explícitamente. Los CA-01 a CA-39. Los CA-40 a CA-49 los verificó T9 y **no se repiten acá**.

### Verificación

La tarea está hecha cuando:

- [x] `npm test` sale 0 y los 46 tests preexistentes siguen en verde
- [x] `npm run build` da exit 0
- [x] CA-02, CA-09, CA-10, CA-11, CA-36, CA-37, CA-39 pasan → **los siete pasan.** CA-36 pasó con el criterio revisado el 2026-10-07, que excluye los `.css` de `src/` del patrón `;$`. Ver la nota de abajo.
- [x] El chequeo de BOM se hizo sobre cada archivo tocado, **incluidos los dos archivos de test nuevos**
- [x] Los tests preexistentes no fueron modificados, salvo la ruta de un import
- [x] Está registrado qué CA quedaron `no ejecutable` por el firewall, si alguno → **ninguno**: CA-21 se ejecutó y pasó.

### Hecho cuando

La lista de arriba. Los CA de navegador que dependen del firewall se marcan `no ejecutable` con el motivo, nunca como aprobados.

### Notas de implementación (2026-10-07)

**Resultado: los 39 CA en `OK`, 0 en `no ejecutable`, 0 en `FALLA`.** Los cuatro comandos principales salen 0: `npm test` 0, `npm run build` 0, `npm run lint` 0, `npx tsc --noEmit` 0.

En la corrida original eran **38 `OK` y 1 `FALLA` (CA-36)**, y por eso la tarea quedó en `con bloqueos`: el único bloqueo era **CA-36**, y era un defecto de la spec, no del código. **El usuario resolvió ese defecto el 2026-10-07** autorizando la exclusión de los `.css` de `src/` del patrón `;$`, y `spec.md` quedó corregido en §1.1, RF-39, RNF-02, CA-36, §8.1 y §12.5. Con ese criterio, **CA-36 da 0 coincidencias en `src/`** y la tarea pasa a `hecha`. El detalle de por qué el criterio viejo no podía pasar está abajo y **se conserva tal como se escribió**, porque es el registro del hallazgo.

#### Tabla de resultados CA-01 a CA-39

| CA | Resultado | Evidencia medida |
|---|---|---|
| CA-01 | `OK` | `npm run build` exit 0; 2425 módulos transformados; `dist/` = 1.178.877 bytes |
| CA-02 | `OK` | `const x: string = 67890` en `src/App.tsx` → `src/App.tsx(144,7): error TS2322`, exit **2**; `dist/` quedó byte a byte idéntico (1.178.877 B, 3 archivos, hash de `index.html` sin cambio) |
| CA-03 | `OK` | `dist/index.html` = 431 B con `<div id="root"></div>` y `<script type="module" crossorigin …>`; peso total de `dist/` = **1.178.877 B (1151 kB)**, muy por encima de 1 kB |
| CA-04 | `OK` | Búsqueda **distinguiendo mayúsculas** de los 6 patrones rotos: **0 coincidencias** en los 6. Los 21 imports de `src/` resuelven a rutas existentes |
| CA-05 | `OK` | `npm run dev` levanta en 895 ms; `http://localhost:5173/` responde **200** con 588 B; publica `http://192.168.1.9:5173/`, desde donde la app monta y responde igual |
| CA-06 | `OK` | **0 errores y 0 avisos** en tres cargas seguidas (localhost fría, localhost caliente, IP local). Solo `debug: 2` e `info: 1`, que son los mensajes de conexión del servidor de Vite, no de la app |
| CA-07 | `OK` | `bg-charcoal-900` computa `rgb(18, 18, 18)`; `text-gold-500` computa `rgb(212, 175, 55)` |
| CA-08 | `OK` | `<h2>` del catálogo: `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif` (termina en `serif`); `<body>`: `ui-sans-serif, system-ui, sans-serif, …` (termina en `sans-serif`); **0** peticiones a `fonts.googleapis`, `fonts.gstatic` o `use.typekit` |
| CA-09 | `OK` | `grep -rn "\bany\b"`: **0** en `src/` y en `test/`, y 0 en `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `tailwind.config.js`, `postcss.config.js`. Los 4 únicos aciertos del repo están en `package-lock.json` y son el nombre del paquete npm `any-promise`, no el tipo `any` |
| CA-10 | `OK` | `const x: string = 12345` en `test/andamiaje.ts` → `test/andamiaje.ts(269,7): error TS2322`, exit **2**. `test/` está dentro del programa de TypeScript |
| CA-11 | `OK` | `npm test` exit **0**: **68 tests en 4 archivos**. Los 46 preexistentes en verde: 26 en `validadores.test.ts` + 20 en `integridad_datos_vino.test.ts`. Los 22 nuevos en verde: 13 + 9. Ninguno omitido ni marcado como esperado-fallido |
| CA-12 | `OK` | Almacenamiento vacío: **2** tarjetas; filtro **Blanco** → **1**; **Todos** → **2** |
| CA-13 | `OK` | `chardonnay` → 1; `CHARDONNAY` → 1; `" chardonnay "` → 1; `zzzz` → 0 y aparece "No se encontraron etiquetas" |
| CA-14 | `OK` | Dos "Agregar" → contador **2**, **1 sola línea** en el panel, `$ 90.000` |
| CA-15 | `OK` | Contador 2 y cantidad 2 tras dos "Agregar"; `+` sube a 2 con el total presente; `−` deja la cantidad en **1**; `−` en 1 **elimina la línea** y el carrito queda vacío con el contador **desaparecido** (`null`); "Eliminar" también vacía; con carrito vacío se ve "El carrito está vacío" y **no** hay bloque de total ni botón de finalizar |
| CA-16 | `OK` | Con el carrito abierto, el **✕** lo cierra y el **fondo oscurecido** también; en los dos casos el panel desaparece del DOM y el fondo sigue interactivo (el contador sube a 2 al pulsar "Agregar" con el carrito cerrado) |
| CA-17 | `OK` | "Pedido confirmado. Gracias por tu compra."; contador `null`; panel cerrado; `vinoteca_cart` pasa a `"[]"`; el contexto de la página sigue vivo, **sin recarga** |
| CA-18 | `OK` | Envío válido → **3 tarjetas**, **0 formularios en el DOM** (el formulario se cerró), y el vino queda en `vinoteca_wines` |
| CA-19 | `OK` | Precio `0`, `-100` y vacío: los **tres** muestran "El precio tiene que ser mayor que cero" y las tarjetas siguen en 3 |
| CA-20 | `OK` | Cosecha vacía, `1200` y `2028` → rechazadas, siguen 3 tarjetas, con el mensaje que nombra la cosecha. `2027` → **4 tarjetas** (aceptada). `1850` → **5 tarjetas** (aceptada). Año en curso 2026 |
| CA-21 | `OK` | **Ejecutado y aprobado**, contra lo que T5 había dejado en `no ejecutable`. Desde `http://192.168.1.9:5173/`: `isSecureContext = false` y `typeof crypto.randomUUID = "undefined"`, o sea que se cumple la precondición de CE-10. El envío válido lleva las tarjetas de 2 a **3**, el formulario queda en **0** en el DOM, el identificador generado es **`vino-muy9uuzk-ttc765dc`** (el alternativo de RF-31, no un UUID) y quedan **0 errores de consola** y **0 peticiones fallidas** |
| CA-22 | `OK` | Antes de recargar: 5 vinos y 1 línea de carrito. Tras recargar: **5 tarjetas** y contador **1**. Los nombres de las tarjetas se listan uno por uno |
| CA-23 | `OK` | Basura en `vinoteca_wines` y `vinoteca_cart` → arranca con **2** tarjetas (el catálogo inicial) y carrito vacío, y `#root` **no** queda vacío (sin pantalla en blanco). Paso 0 repetido después: 2 tarjetas y contador `null` |
| CA-24 | `OK` | Con `*images.unsplash.com*` bloqueado **y la caché vacía**, las dos imágenes quedan con `naturalWidth = 0` (no cargaron) y la tarjeta sigue mostrando los seis datos: `TINTO`, `Cosecha 2020` / `2021`, `BODEGA CATENA ZAPATA • MALBEC`, el nombre, el precio y "AGREGAR". "Agregar" sigue funcionando: el contador sube |
| CA-25 | `OK` | A 375 px: **1 columna**; `scrollWidth = 375 = clientWidth`, y `body.scrollWidth = 375`. Cero scroll horizontal |
| CA-26 | `OK` | A 700 px: **2 columnas**. A 600 px: **1 columna**. Fija el corte real de Tailwind en 640 px y descarta el supuesto de 768 px |
| CA-27 | `OK` | A 375 px el campo de búsqueda es visible y su caja entra en el viewport; escribir `chardonnay` deja **1** tarjeta; `scrollWidth = 375 ≤ clientWidth = 375` |
| CA-28 | `OK` | **11 de 11** acciones respondieron a 375 px sin cambiar el ancho en ningún momento (quedó en 375 px), y ninguna produjo scroll horizontal: navegar, filtrar "Blanco", buscar "chardonnay", agregar, abrir el carrito, `+`, "Eliminar", agregar de nuevo, cerrar con el botón, finalizar el pedido, y abrir y cerrar la vista rápida |
| CA-29 | `OK` | A 1280 px: la marca "CAVA & CO.", el campo de búsqueda, "+ Cargar Vino" y el ícono de carrito están visibles; el ícono lleva `aria-label="Carrito de compras"`; la barra es de una sola fila |
| CA-30 | `OK` | **1280 px**: `<h1>` "Vinos de Autor" y "EXPLORAR CAVA" visibles, y el `<canvas>` está **en la misma sección** que el titular, mide 585×550 y tiene contexto **webgl2**. **375 px**: titular y botón siguen visibles (titular de 36 px, botón de 16 px) y el canvas **no** se renderiza, que es la degradación que pide RNF-09 |
| CA-31 | `OK` | Tras pulsar "Explorar Cava": `<h2>` "Catálogo de Vinos" con `top = 200`, `bottom = 248`, y la barra fija termina en `65`. Queda **135 px por debajo** de la barra: visible en el viewport y **sin solaparse** |
| CA-32 | `OK` | Las cuatro secciones del `<footer>` están y son visibles: **Horarios**, **Ubicación**, **Redes** y **Aviso legal**; el aviso +18 está presente y hay 3 enlaces de redes |
| CA-33 | `OK` | `role='dialog'` con `aria-modal='true'`; imagen ampliada de **383×350**; nombre; "BODEGA CATENA ZAPATA • MALBEC"; `TINTO`; "Cosecha 2020"; `$ 45.000`; "NOTAS DE CATA" con su texto; "MARIDAJE SUGERIDO" con su texto |
| CA-34 | `OK` | Un vino nuevo sin notas ni maridaje: se ven imagen y datos, y **no** aparece el bloque de notas **ni** el de maridaje, tampoco vacíos |
| CA-35 | `OK` | Filtrando en "Blanco" y buscando "chardonnay", abrir y cerrar la vista rápida **con el control de cierre** y **con el fondo** deja las dos veces: diálogo fuera del DOM, **1 tarjeta**, categoría "Blanco" activa y búsqueda "chardonnay" intacta |
| CA-36 | `OK` | **Con el criterio revisado el 2026-10-07**: el patrón `;$` se verifica **solo en `.ts` y `.tsx`**, y da **0** en los 13 archivos `.ts`/`.tsx` de `src/`. `src/index.css` **queda excluido** por decisión del usuario, así que sus 7 coincidencias no computan. Además, sin `.js` ni `.jsx` bajo `src/` (11 `.tsx`, 3 `.ts`, 1 `.css`). Con el criterio anterior era `FALLA`: ver abajo |
| CA-37 | `OK` | En los 23 archivos creados o modificados por la spec: `src/index.css` tiene **1** hexadecimal, `#121212`; `MEMORY.md` tiene **5** (`#121212`, `#5B132B`, `#800020`, `#D4AF37`, `#FDFBF7`), y son la transcripción de la paleta en el relato de la bitácora. Los seis son **valores de `tailwind.config.js`** (`#121212` es `charcoal.900`, `#5B132B` es `wine.700`, `#800020` es `wine.500`, `#D4AF37` es `gold.500`, `#FDFBF7` es `cream.100`). Ninguno amplía la paleta |
| CA-38 | `OK` | `MEMORY.md` §Bitacora de Cambios tiene entradas del 2026-10-06 para T7 y T10, y §Componentes y Estructura marca `[x]` `ProductDetailModal`/`VistaRapidaProducto` (línea 24) y `[x]` `Footer` (línea 25). `AGENTS.md` refleja el alcance real según T10 |
| CA-39 | `OK` | Ver "Por qué `git diff` no servía" abajo. `package.json` y `package-lock.json` no los tocó ninguna tarea, y `@testing-library/*` no aparece en ninguno de los dos (0 coincidencias) |

#### El único bloqueo de la corrida: CA-36, una contradicción interna de la spec. Resuelto el 2026-10-07

`grep -rn ";$" src/` devuelve 7 coincidencias y **las 7 están en `src/index.css`**. Ese archivo, con la redacción anterior de §1.1, **era** código de aplicación ("los archivos bajo `src/` que se incluyen en el bundle") y lo **creó esta misma spec** en T1, punto 4. La única exclusión que concedía CA-36 eran los archivos de configuración de la raíz (`postcss.config.js` y `tailwind.config.js`), que expressly siguen siendo `.js`.

El problema es que **el propio enunciado de T1 obliga a escribirlos**: el punto 4 dice "Las tres directivas `@tailwind` son obligatorias", y `@tailwind base;` termina en `;`. Las otras cuatro coincidencias son sintaxis CSS obligatoria (`scroll-behavior: smooth;`, `background-color: …;` y dos `@apply …;`). Quitar esos punto y coma rompe el archivo.

Es decir: **obedecer T1 hacía que CA-36 fallara, y hacer que CA-36 pasara exigía desobedecer T1.** Ninguna tarea del plan podía resolverlo sin cambiar la spec, y T11 no escribe código de aplicación. Por eso la corrida quedó `con bloqueos`.

**La salida que se tomó, el 2026-10-07: la primera de las dos.** El usuario aprobó **excluir los `.css` de `src/` de la comprobación del patrón `;$`**, igual que los archivos de configuración de la raíz. Es la coherente, porque la convención "sin punto y coma" de `AGENTS.md` describe JavaScript y TypeScript, y CSS no tiene sintaxis alternativa posible para esas líneas. La otra salida —que T1 dejara de exigir las directivas `@tailwind`— **no se tomó**: habría roto la compilación, porque Tailwind 3 no procesa el CSS sin ellas (§2.2).

**Qué se modificó y qué no.** Solo `spec.md` y este `task.md`. **`src/index.css` no se tocó** y sus 7 coincidencias siguen ahí: no tenían que irse, el criterio es que no se cuentan. `plan.md` tampoco se tocó: la aclaración es de un criterio de aceptación, no de la estrategia técnica. El registro completo está en **§12.5 de `spec.md`**.

Una observación aparte, **no** un incumplimiento: `src/components/herocanvas3d.tsx` tiene 7 hexadecimales, y dos de ellos son `#1a050d`, que **no está en la paleta**. Ese archivo **no lo creó ni modificó esta spec** (su `LastWriteTime` es del 2026-10-05 19:26, anterior al primer archivo de T1, que es del 2026-10-06 11:54) y §2.3 dice explícitamente que no se modifica. Queda fuera del alcance de CA-37 y por eso no lo cuento como fallo, pero es el único color del proyecto que no pertenece a `tailwind.config.js` y conviene que alguien lo decida.

#### Por qué `git diff package.json` no servía, y cómo se verificó CA-39 igual

El paso 7 pide `git diff package.json package-lock.json`. **Ese comando no es válido en este repositorio.** No tiene **ningún commit**: `git log` responde "your current branch 'main' does not have any commits yet". Lo que hay es un índice de staging, y ese índice es una foto vieja: todavía registra `spec/001/` (que en el disco es `specs/`) y guarda el `index.html` viejo de una línea. `git diff` compara el árbol de trabajo contra ese índice, así que devuelve un diff enorme de 2.622 líneas en `package-lock.json` que **no** es el cambio de esta spec.

La verificación real es por fecha de modificación, y es concluyente:

| Archivo | `LastWriteTime` |
|---|---|
| `node_modules/eslint`, `typescript-eslint`, `@stylistic/eslint-plugin` | 2026-10-06 **11:37** |
| `package-lock.json`, `eslint.config.js`, `package.json` | 2026-10-06 **11:42:14 – 11:42:43** |
| `tsconfig.json`, `src/index.css`, `postcss.config.js`, `vite.config.ts` (**primer archivo de T1**) | 2026-10-06 **11:54:29** |
| `vitest`, `jsdom` (instalados) | 2026-10-05 **23:49** |

`package.json` y `package-lock.json` se escribieron **doce minutos antes** del primer archivo de T1, así que ninguna tarea de la spec los tocó. Y la cadena que instaló `vitest` y `jsdom` es del 2026-10-05 23:49, la noche anterior a la spec, que es exactamente lo quedice el plan: "todo lo que este plan necesita ya está en `node_modules`". Además ninguna nota de T1 a T10 menciona instalar nada; T10 afirma explícitamente "no se instaló ninguna dependencia". Por eso **CA-39 pasa**, con un método distinto del que el paso 7 propone.

#### Punto 9: BOM, archivo por archivo

`herramientas/` sigue vacía, así que no hay comando del proyecto para esto. Se leyó el primer trío de bytes de cada archivo con un script del directorio temporal. **23 de 23 archivos sin BOM**, incluidos los dos de test nuevos y el andamiaje, que era el riesgo porque los crea una herramienta y no una persona:

| Archivo | Primeros 4 bytes | BOM |
|---|---|---|
| `index.html` | `3c 21 64 6f` (`<!do`) | no |
| `tsconfig.json` | `7b 0a 20 20` (`{\n  `) | no |
| `vite.config.ts` | `69 6d 70 6f` (`impo`) | no |
| `postcss.config.js` | `65 78 70 6f` (`expo`) | no |
| `src/index.css` | `40 74 61 69` (`@tai`) | no |
| `src/main.tsx` | `69 6d 70 6f` (`impo`) | no |
| `src/App.tsx` | `69 6d 70 6f` (`impo`) | no |
| `src/utils/validadores.ts` | `69 6d 70 6f` (`impo`) | no |
| `src/components/barra_de_navegacion.tsx` | `69 6d 70 6f` (`impo`) | no |
| `src/components/carrito_de_compras.tsx` | `69 6d 70 6f` (`impo`) | no |
| `src/components/carta_de_catalogo.tsx` | `69 6d 70 6f` (`impo`) | no |
| `src/components/carta_de_productos.tsx` | `69 6d 70 6f` (`impo`) | no |
| `src/components/editor_formador_productos.tsx` | `69 6d 70 6f` (`impo`) | no |
| `src/components/hero.tsx` | `69 6d 70 6f` (`impo`) | no |
| `src/components/vista_rapida_producto.tsx` | `69 6d 70 6f` (`impo`) | no |
| `src/components/pie_de_pagina.tsx` | `69 6d 70 6f` (`impo`) | no |
| `test/andamiaje.ts` | `2f 2a 2a 0a` (`/**\n`) | no |
| **`test/orquestador_carrito.test.ts`** | `69 6d 70 6f` (`impo`) | no |
| **`test/orquestador_persistencia.test.ts`** | `69 6d 70 6f` (`impo`) | no |
| `test/validadores.test.ts` | `69 6d 70 6f` (`impo`) | no |
| `test/integridad_datos_vino.test.ts` | `69 6d 70 6f` (`impo`) | no |
| `AGENTS.md` | `23 20 41 47` (`# AG`) | no |
| `MEMORY.md` | `23 20 4d 45` (`# ME`) | no |

Los dos archivos que T11 tocó además se comprobaron aparte: `eslint.config.js` (`69 6d 70 6f`) e `index.html` (`3c 21 64 6f`), ambos sin BOM.

#### Los cuatro ítems de §12.4

| Ítem | Estado en T11 |
|---|---|
| Línea base de avisos de consola para CA-06 | **Se estableció por fin.** En tres cargas seguidas: **0 errores y 0 avisos**; lo único que aparece es `debug: 2` e `info: 1`, que son la conexión del cliente de HMR de Vite. **La observación del `404` de `/favicon.ico` no se pudo reproducir, así que no es una observación vigente.** Se vio en las sesiones de T5 y de T11, en la primera carga con caché fría, pero una remedición posterior con `Network.clearBrowserCache`, `setCacheDisabled: true` y perfil limpio **no lo reproduce**: Chrome no llega a pedir `/favicon.ico` ni en carga fría ni en caliente, y en la traza de red no hay ninguna petición que mencione `favicon`. **Lo que sí era permanente en esas mismas cargas era otra cosa:** había un `loadingFailed: net::ERR_BLOCKED_BY_ORB` que no desaparecía nunca, y no venía del favicon sino de que **la imagen del segundo vino del catálogo inicial no cargaba jamás**: la URL de `src/datos/vino.ts:28` (`photo-1558001373-7b9fbd4830e1` de Unsplash) **respondía `404` en el origen**, verificado por petición HTTP directa (`404`, `text/html`), mientras que la de la línea 15 respondía `200`. **Ese `ERR_BLOCKED_BY_ORB` no producía ninguna entrada de consola**, porque Chrome lo bloquea sin escribir nada, así que **CA-06 se cumple igual, y por la razón correcta: cero errores de consola**, y no "cero errores salvo el favicon". La redacción de CA-06 no se modificó: sigue exigiendo cero errores de nivel `error`. **La URL que respondía `404` se documentó y no se corrigió** mientras la spec estuvo abierta, porque `plan.md` §2.3 declaraba `src/datos/vino.ts` intocable para esta spec. **Resuelto el 2026-10-07**, ya cerrada la spec y por autorización explícita del usuario: la URL se reemplazó por `photo-1599113656124-b96bf21e30d3`, verificada en `200` y en `images.unsplash.com` según **RNF-06**, y ese `ORB` ya no se reproduce. **Ni CE-13 ni CA-24 lo detectaron, porque los dos prueban el bloqueo deliberado**, que da el mismo `naturalWidth = 0` que el `404` real |
| Accesibilidad de CA-21 desde la red local | **Resuelta: el firewall no bloqueó.** CA-21 se ejecutó completo y pasó (ver la tabla). El servidor publica `http://192.168.1.9:5173/`, la app monta desde ahí y el envío del formulario funciona con `crypto.randomUUID` ausente, que es el caso que CE-10 describe. El ítem de §12.4 se puede cerrar |
| UTF-8 sin BOM (RNF-08) | **Resuelto por inspección.** 23 de 23 archivos sin BOM, con el detalle archivo por archivo arriba |
| Presentación sin cobertura automatizada | **Sin cambio.** Sigue siendo una frontera de `jsdom`, no una omisión. Los 39 CA de navegador los cubrieron de verdad en esta tarea |

#### Las tres líneas del `ignores` de `eslint.config.js`: sí correspondía borrarlas

T10 dejó el bloque con un comentario que decía que hay que borrar esas líneas "cuando la spec los complete", y hoy la spec está completa, así que era de T11. Los hechos:

- `src/App.jsx` y `src/main.jsx` **no existen**: T4 migró los dos a `.tsx`. Sus dos entradas eran muertas.
- `src/components/hero.tsx` **sí existe** y es un archivo real y completo: T3 lo reparó y `npm run build` y `npx tsc --noEmit` lo compilan. Estaba **quedando fuera del lint**, que es el efecto contrario del que buscaba el comentario.

Se borraron las tres líneas y el bloque `ignores` quedó en `node_modules/`, `dist/` y `coverage/`. `npm run lint` sigue saliendo **0** con el proyecto entero, y `npx eslint src/components/hero.tsx` por separado también sale **0**: el hero no tiene comillas dobles ni punto y coma, así que entra al lint sin observaciones. Los 13 archivos `.ts`/`.tsx` de `src/` y `test/` ahora están todos realmente cubiertos.

#### Un archivo había desaparecido del árbol de trabajo: `index.html`

El primer `npm run build` de esta tarea **falló** con `Could not resolve entry module "index.html"`. La causa: el **`index.html` de la raíz no estaba en disco**. `git status` lo mostraba como `AD` (agregado al índice, borrado del árbol de trabajo) y el índice guardaba la versión vieja de una línea de texto plano. T1 lo había escrito bien y el build de las 15:09 del 2026-10-06 lo demuestra: `dist/index.html` de ese momento es el documento real de 431 bytes.

Como el contenido exacto está determinado por el propio `task.md` de T1 (punto 5) y no admitía ninguna decisión, se restauró tal cual, sin tocar nada más. **La prueba de que la restauración es correcta es el hash del build**: después de restaurarlo, `npm run build` produce `index-BVlDqdyz.css` e `index-DgL04soq.js`, **los mismos nombres** que el build del 2026-10-06 que había generado T1. Si el contenido hubiera differed en un byte, los hashes habrían cambiado.

Se registra acá porque es lo más importante que encontró T11 y porque **no** es un defecto del código: el archivo se borró en algún momento entre T10 y T11, probablemente por el sincronismo de OneDrive. Si alguien más del equipo synchoniza la carpeta, conviene confirmarlo.

#### Cómo se verificó en navegador, y una trampa de medición que casi produce un falso positivo

El MCP de `chrome-devtools` sigue sin estar disponible (el catálogo solo expone `context7` y `opencode`), así que se usó Chrome 154 por CDP crudo con el `WebSocket` global de Node, sin instalar nada (RNF-04). Los scripts quedaron en `C:\Users\manun\AppData\Local\Temp\opencode`, fuera del repo.

**La trampa: `requestAnimationFrame` no corría.** La página que se conduce por CDP nunca se compone si nadie la mira, y entonces el navegador **frena los `requestAnimationFrame`**. Con eso, las animaciones de salida de `AnimatePresence` no avanzan: los nodos que salen **se quedan en el DOM con opacidad 0 para siempre**, no los ~1 s que había anotado T7. La primera medición de esta tarea dio que el formulario de carga **no se cerraba** nunca, con el nodo clavado en el DOM, y con dos overlays superpuestos. Con `Emulation.setFocusEmulationEnabled` el mismo código da **61 `requestAnimationFrame` por segundo** y `document.querySelectorAll('form').length` baja a **0** justo después de enviar.

O sea: **lo que parecía un bug del formulario era del instrumental**, y por el mismo camino casi se marcaron como fallos CA-18 y CA-21. Las dos se volvieron a medir con el `requestAnimationFrame` sano y las dos pasan. Queda registrado porque el mismo error vuelve a aparecer en cualquier verificación por CDP, y porque explica por qué el conteo de tarjetas tiene que filtrar por opacidad en vez de contar hijos.

Del bug de T6 en `carrito_de_compras.tsx` (el `layout` de framer-motion que dejaba el overlay pegado) **no hay señal**: al eliminar una línea y al vaciar el carrito, el panel se desmonta y no queda ningún overlay huérfano en el DOM.

#### Los cuatro comandos

```
npm test        exit 0   68 tests en 4 archivos (46 preexistentes + 22 nuevos)
npm run build   exit 0   dist/ = 1.178.877 bytes
npm run lint    exit 0   con las tres líneas del ignores ya borradas
npx tsc --noEmit exit 0
```

Los dos errores de tipo deliberados del paso 2 se revirtieron y se comprobó por hash SHA-256: `src/App.tsx` quedó en 143 líneas con hash `1700791947BA5966…`, que es el mismo que tenía antes de tocarlo y el que registró T9, y `test/andamiaje.ts` quedó en 267 líneas con hash `D3555AB6B2E4DE65…`. `errorDeTipoDeliberado` aparece en 0 lugares de todo el repositorio.

---

## Lo que queda para la fase de validación

De los **cuatro** ítems de §12.4 de la spec, **T11 resolvió tres**. Queda **uno**:

| Ítem | Estado |
|---|---|
| Línea base de avisos de consola para CA-06 | **Resuelta por T11.** No se pudo registrar antes de los cambios, así que se estableció contra la aplicación ya construida: 0 errores y 0 avisos. La observación que T11 dejó escrita junto a esa cifra, el `404` de `/favicon.ico`, **no se pudo reproducir** en una remedición posterior con caché desactivada y perfil limpio: el navegador no llega a pedirlo. **La que sí era permanente y reproducible era un `loadingFailed: net::ERR_BLOCKED_BY_ORB`** por la imagen de `src/datos/vino.ts:28`, cuya URL respondía `404` en el origen. **No producía entrada de consola**, así que CA-06 se cumple igual por la razón correcta: cero errores de consola. **Se resolvió el 2026-10-07**, con la spec ya cerrada y por autorización explícita del usuario: la URL se reemplazó por `photo-1599113656124-b96bf21e30d3` (200, en `images.unsplash.com`), y el `ORB` ya no aparece. **Ni CE-13 ni CA-24 lo detectaron**, porque ambos prueban el bloqueo deliberado de las imágenes. Ver la nota de T11 y `spec.md` §12.6. |
| Accesibilidad de CA-21 desde la red local | **Resuelta por T11: el firewall no bloqueó.** CA-21 se ejecutó desde `192.168.1.9` y pasó. |
| UTF-8 sin BOM (RNF-08) | **Resuelta por T11**, por inspección: 23 de 23 archivos sin BOM. No hay herramienta en el repo, y no se agregó ninguna (RNF-04). |
| Presentación sin cobertura automatizada | **Sin cambio: sigue abierta.** Es una frontera de las dependencias, no una omisión: jsdom no calcula layout, no aplica CSS, no tiene WebGL y su viewport es fijo. Los 39 CA de navegador la siguen cubriendo. Ver `plan.md` §7.1. |

Si el ítem que queda resultara irresoluble, eso vuelve a la spec como cambio. No se resuelve por la vía del código.
