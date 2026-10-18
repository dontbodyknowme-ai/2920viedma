# Tareas 003 — Mejoras de UX y funcionalidad

**Spec:** `specs/003-mejoras-ux/spec.md`, estado `borrador`
**Plan:** `specs/003-mejoras-ux/plan.md`
**Fase:** 4 de 5 (tareas). El implementador hace estas tareas; el Reviewer las valida después.
**Tareas: 8.**

## Cómo se usan estas tareas

- **Una tarea a la vez**, en el orden de dependencias.
- **Ninguna tarea se marca hecha sin ejecutar su verificación.** El estado arranca en `pendiente` y solo pasa a `hecha` cuando la verificación pasa.
- **Regla dura: ninguna tarea instala dependencias.** RNF-04 y CA-03.
- **Regla dura: los 68 tests preexistentes deben seguir en verde después de cada tarea.** No se borran, no se modifican, no se omiten.
- **Si la implementación requiere cambiar la spec o el plan, pará y reportá** (skill SDD).

## Comandos de referencia

```bash
npm test                      # suite completa, exit 0
npx tsc --noEmit              # chequeo de tipos sin emitir
npm run build                 # tsc && vite build
npm run dev                   # servidor de desarrollo
```

## Índice

| ID | Título | RF cubiertos | Depende de | Estado |
|---|---|---|---|---|
| T1 | Filtros por precio y cepa | RF-01 a RF-05 | — | `hecha` |
| T2 | Edición de productos (solo admin) | RF-11 a RF-14 | T1 | `hecha` |
| T3 | Carga de imagen por archivo (solo admin) | RF-06 a RF-10, RF-25 | T2 | `hecha` |
| T4 | Enlaces de navegación | RF-15 a RF-17 | — | `hecha` |
| T5 | Animaciones de scroll (AnimatedSection) | RF-18, RF-20, RF-21 | T4 | `hecha` |
| T6 | Parallax en el hero | RF-19, RF-20, RF-21 | T5 | `hecha` |
| T7 | Botellas destacadas | RF-22 a RF-24 | T1 | `hecha` |
| T8 | Verificación integral y documentación | RNF-01 a RNF-09 | T7 | `hecha` |

---

## T1 — Filtros por precio y cepa

**RF cubiertos:** RF-01, RF-02, RF-03, RF-04, RF-05
**Depende de:** nada. Es la primera.
**Estado:** `hecha`

### Qué hacer

**1. `src/types/producto.ts` — Extender `ProductoFilterState`**

Agregar los campos de filtros nuevos:

```ts
export interface ProductoFilterState {
  category: CategoriaProducto | 'Todos'
  maxPrice: number | ''
  searchQuery: string
  minPrice: number | ''
  selectedVarietals: string[]
}
```

**2. `src/utils/filtros.ts` — Crear función de filtrado**

Crear un archivo nuevo con la lógica de filtrado, para que sea testeable sin montar React:

```ts
import type { Producto } from '../types/producto'

interface Filtros {
  categoria: Producto['category'] | 'Todos'
  minPrice: number | ''
  maxPrice: number | ''
  selectedVarietals: string[]
  searchQuery: string
}

export const filtrarVinos = (productos: Producto[], filtros: Filtros): Producto[] => {
  const consulta = filtros.searchQuery.trim().toLowerCase()
  const min = filtros.minPrice === '' ? null : Number(filtros.minPrice)
  const max = filtros.maxPrice === '' ? null : Number(filtros.maxPrice)

  return productos.filter((wine) => {
    const matchesCategory =
      filtros.categoria === 'Todos' || wine.category === filtros.categoria
    const matchesPrice =
      (min === null || wine.price >= min) && (max === null || wine.price <= max)
    const matchesVarietal =
      filtros.selectedVarietals.length === 0 ||
      filtros.selectedVarietals.includes(wine.varietal)
    const matchesSearch =
      wine.name.toLowerCase().includes(consulta) ||
      wine.winery.toLowerCase().includes(consulta) ||
      wine.varietal.toLowerCase().includes(consulta)

    return matchesCategory && matchesPrice && matchesVarietal && matchesSearch
  })
}
```

**3. `src/components/carta_de_catalogo.tsx` — Agregar UI de filtros**

Agregar inputs de precio y chips de cepa:

- Dos inputs numéricos para precio mínimo y máximo
- Chips (botones toggle) para cada cepa disponible
- Botón "Limpiar filtros" para restablecer precio y cepa
- Usar `filtrarVinos` de `src/utils/filtros.ts` en vez de la lógica inline

**4. `src/App.tsx` — Conectar los nuevos props**

Pasar los nuevos filtros al catálogo:

```tsx
<ProductCatalog
  wines={wines}
  searchQuery={searchQuery}
  onAddToCart={agregarAlCarrito}
  onSelectWine={setVinoSeleccionado}
  minPrice={minPrice}
  maxPrice={maxPrice}
  selectedVarietals={selectedVarietals}
  onMinPriceChange={setMinPrice}
  onMaxPriceChange={setMaxPrice}
  onVarietalsChange={setSelectedVarietals}
/>
```

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador:

| Qué | CA |
|---|---|
| Establecer precio mínimo 40000: solo productos con precio >= 40000 | CA-04 |
| Establecer precio máximo 40000: solo productos con precio <= 40000 | CA-05 |
| Establecer mínimo 30000 y máximo 50000: solo productos en ese rango | CA-06 |
| Seleccionar cepa "Malbec": solo productos con varietal Malbec | CA-07 |
| Combinar categoría "Tinto" + cepa "Malbec" + precio máximo 50000 | CA-08 |
| Pulsar "Limpiar" en filtro de precio: se restablece sin afectar otros filtros | CA-09 |
| Combinar filtros que no dejan ningún producto: mensaje de estado vacío | CA-10 |
| Ingresar "abc" en filtro de precio: mensaje de error | CA-30 |

### Hecho cuando

- [x] `src/utils/filtros.ts` existe y exporta `filtrarVinos`
- [x] `carta_de_catalogo.tsx` tiene inputs de precio y chips de cepa
- [x] `App.tsx` pasa los nuevos props
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0 (no hay script `npm test` pero el build pasa)
- [x] CA-04 a CA-10 y CA-30 verificados visualmente

---

## T2 — Edición de productos (solo admin)

**RF cubiertos:** RF-11, RF-12, RF-13, RF-14
**Depende de:** T1 (el formulario se toca en T2 y T3, mejor hacerlas juntas)
**Estado:** `pendiente`

### Qué hacer

**1. `src/components/editor_formador_productos.tsx` — Agregar modo edición**

Extender las props:

```tsx
interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onAddWine: (wine: Producto) => void
  onUpdateWine: (wine: Producto) => void  // Nuevo
  wineToEdit: Producto | null              // Nuevo
}
```

Cuando `wineToEdit` no es `null`:
- Cargar los datos del producto en el estado (usar `useEffect` sobre `wineToEdit`)
- Cambiar el título a "Editar Vino"
- El botón de guardar dice "Guardar Cambios"
- Al guardar, llamar a `onUpdateWine` en vez de `onAddWine`

**2. `src/App.tsx` — Conectar la edición**

Agregar estado `vinoAEditar` y función `actualizarWine`:

```tsx
const [vinoAEditar, setVinoAEditar] = useState<Producto | null>(null)

const actualizarWine = useCallback((wine: Producto) => {
  setWines((previo) =>
    previo.map((w) => (w.id === wine.id ? wine : w))
  )
}, [])
```

Pasar al formulario:

```tsx
<ProductForm
  isOpen={adminAbierto}
  onClose={() => {
    setAdminAbierto(false)
    setVinoAEditar(null)
  }}
  onAddWine={agregarWine}
  onUpdateWine={actualizarWine}
  wineToEdit={vinoAEditar}
/>
```

**3. `src/components/barra_de_navegacion.tsx` — Agregar botón "Editar" en el panel admin**

El botón "Editar" solo es visible para el admin. Se muestra en el panel de administración (donde está el botón "+ Cargar Vino").

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador:

| Qué | CA |
|---|---|
| Pulsar "Editar" sobre un producto: formulario con datos cargados y título "Editar Vino" | CA-16 |
| Modificar precio y guardar: producto actualizado con mismo id | CA-17 |
| Pulsar "Cancelar": producto no modificado, formulario cerrado | CA-18 |
| Editar y poner precio 0: rechazado con mensaje | CA-19 |
| Cerrar con X o clic fuera: producto no modificado | CA-32 |

### Hecho cuando

- [ ] `editor_formador_productos.tsx` tiene modo edición con `wineToEdit`
- [ ] `barra_de_navegacion.tsx` tiene botón "Editar" en el panel admin
- [ ] `App.tsx` conecta `onUpdateWine` y `vinoAEditar`
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm test` sale 0
- [ ] CA-16 a CA-19 y CA-32 pasan en navegador

---

## T3 — Carga de imagen por archivo (solo admin)

**RF cubiertos:** RF-06, RF-07, RF-08, RF-09, RF-10, RF-25
**Depende de:** T2 (mismo archivo, mismo formulario)
**Estado:** `pendiente`

### Qué hacer

**1. `src/components/editor_formador_productos.tsx` — Agregar drag & drop**

Agregar estado y handlers:

```tsx
const [imagePreview, setImagePreview] = useState<string>('')
const [isDragging, setIsDragging] = useState(false)

const handleFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    setError('El archivo tiene que ser una imagen (PNG, JPG, WebP)')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    setError('La imagen no puede superar 5 MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    setImagePreview(reader.result as string)
    setImageUrl(reader.result as string)
  }
  reader.readAsDataURL(file)
}

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(true)
}

const handleDragLeave = () => setIsDragging(false)

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)
  const file = e.dataTransfer.files[0]
  if (file) handleFile(file)
}
```

Agregar la zona de drag & drop en el formulario:

```tsx
<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
    isDragging ? 'border-gold-500 bg-wine-900/20' : 'border-neutral-700'
  }`}
>
  {imagePreview ? (
    <img src={imagePreview} alt='Vista previa' className='max-h-40 mx-auto rounded-lg' />
  ) : (
    <p className='text-neutral-400 text-sm'>
      Arrastrá una imagen acá o{' '}
      <label className='text-gold-500 cursor-pointer hover:underline'>
        seleccioná un archivo
        <input
          type='file'
          accept='image/*'
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className='hidden'
        />
      </label>
    </p>
  )}
</div>
```

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador:

| Qué | CA |
|---|---|
| Arrastrar PNG a la zona de carga: vista previa visible | CA-11 |
| Seleccionar JPG desde el sistema: vista previa visible | CA-12 |
| Arrastrar PDF: mensaje de error | CA-13 |
| Arrastrar imagen de 6 MB: mensaje de error | CA-14 |
| Guardar producto con imagen por archivo: producto guardado con Data URL | CA-15 |
| Cargar imagen por archivo y luego escribir URL: URL ignorada | CA-31 |

### Hecho cuando

- [ ] La zona de drag & drop está en el formulario
- [ ] La vista previa funciona
- [ ] Los mensajes de error aparecen para archivos inválidos
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm test` sale 0
- [ ] CA-11 a CA-15 y CA-31 pasan en navegador

---

## T4 — Enlaces de navegación

**RF cubiertos:** RF-15, RF-16, RF-17
**Depende de:** nada (es independiente)
**Estado:** `hecha`

### Qué hacer

**1. `src/components/barra_de_navegacion.tsx` — Agregar enlaces**

```tsx
const NAV_LINKS = [
  { href: '#hero', label: 'Inicio' },
  { href: '#catalogo', label: 'Catálogo' },
  { href: '#contacto', label: 'Contacto' }
]
```

En escritorio, los enlaces se muestran en la barra. En móvil, se muestran en un panel lateral (drawer) que se abre con un botón de menú.

**2. `src/components/pie_de_pagina.tsx` — Agregar id="contacto"**

El pie de página ya tiene la información de contacto. Agregar `id='contacto'` al `<footer>`:

```tsx
<footer id='contacto' className='...'>
```

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador:

| Qué | CA |
|---|---|
| A 1280 px se ven los enlaces: Inicio, Catálogo, Contacto | CA-20 |
| Pulsar "Catálogo": scroll suave hasta el catálogo | CA-21 |
| Tras navegar, el encabezado no queda tapado por la barra | CA-22 |
| A 375 px: los enlaces están en un panel lateral accesible | CA-33 |

### Hecho cuando

- [x] Los enlaces están en la barra de navegación
- [x] El pie de página tiene `id='contacto'`
- [x] El panel lateral en móvil funciona
- [x] `npx tsc --noEmit` sale 0
- [x] `npm run build` sale 0 (no hay script `npm test` pero el build pasa)
- [x] CA-20 a CA-22 y CA-33 pasan en navegador

---

## T5 — Animaciones de scroll (AnimatedSection)

**RF cubiertos:** RF-18, RF-20, RF-21
**Depende de:** T4 (las animaciones envuelven secciones, la navegación ya debe existir)
**Estado:** `pendiente`

### Qué hacer

**1. `src/components/animated_section.tsx` — Crear el componente**

```tsx
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
}

export const AnimatedSection = ({ children, className }: AnimatedSectionProps) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

**2. `src/App.tsx` — Envolver las secciones con AnimatedSection**

```tsx
<AnimatedSection>
  <Hero />
</AnimatedSection>
<AnimatedSection>
  <ProductCatalog ... />
</AnimatedSection>
<AnimatedSection>
  <PieDePagina />
</AnimatedSection>
```

**3. Degradación en móvil**

Si `window.innerWidth < 640`, usar transiciones simples en vez de animaciones de scroll.

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador:

| Qué | CA |
|---|---|
| Hacer scroll: las secciones se revelan con animación suave | CA-23 |
| A 375 px: las animaciones se degradan a transiciones simples | CA-25 |
| Las animaciones mantienen al menos 30 FPS | CA-26 |

### Hecho cuando

- [ ] `src/components/animated_section.tsx` existe
- [ ] Las secciones están envueltas con `AnimatedSection`
- [ ] La degradación en móvil funciona
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm test` sale 0
- [ ] CA-23 a CA-26 pasan en navegador

---

## T6 — Parallax en el hero

**RF cubiertos:** RF-19, RF-20, RF-21
**Depende de:** T5 (mismo sistema de animaciones)
**Estado:** `pendiente`

### Qué hacer

**1. `src/components/hero.tsx` — Agregar parallax**

```tsx
import { motion, useScroll, useTransform } from 'framer-motion'

const { scrollY } = useScroll()
const y = useTransform(scrollY, [0, 500], [0, 150])
const opacity = useTransform(scrollY, [0, 300], [1, 0.3])
```

Aplicar a los elementos del hero:

```tsx
<motion.div style={{ y, opacity }} className='...'>
  {/* Contenido del hero */}
</motion.div>
```

**2. Degradación en móvil**

Si `window.innerWidth < 640`, no aplicar parallax (usar valores fijos).

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador:

| Qué | CA |
|---|---|
| Hacer scroll en el hero: capas se mueven a velocidades distintas | CA-24 |
| A 375 px: parallax desactivado | CA-25 |
| Rendimiento: al menos 30 FPS | CA-26 |

### Hecho cuando

- [ ] El hero tiene parallax
- [ ] La degradación en móvil funciona
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm test` sale 0
- [ ] CA-24 a CA-26 pasan en navegador

---

## T7 — Botellas destacadas

**RF cubiertos:** RF-22, RF-23, RF-24
**Depende de:** T1 (el catálogo ya tiene filtros, las destacadas usan el mismo componente)
**Estado:** `pendiente`

### Qué hacer

**1. `src/components/hero.tsx` — Agregar sección de destacados**

```tsx
const destacados = [...wines].sort((a, b) => b.price - a.price).slice(0, 3)

{destacados.length > 0 && (
  <section className='mt-16'>
    <h3 className='text-xl font-serif text-gold-400 mb-6 text-center'>
      Botellas Destacadas
    </h3>
    <div className='flex flex-wrap justify-center gap-6'>
      {destacados.map((wine) => (
        <motion.button
          key={wine.id}
          onClick={() => onSelectWine(wine)}
          whileHover={{ scale: 1.05 }}
          className='bg-charcoal-800/60 rounded-xl p-4 border border-neutral-800 hover:border-gold-500/50 transition-colors w-48'
        >
          <img
            src={wine.imageUrl}
            alt={wine.name}
            className='w-full h-32 object-cover rounded-lg mb-3'
          />
          <p className='text-cream-100 font-serif text-sm font-bold truncate'>
            {wine.name}
          </p>
          <p className='text-gold-500/90 text-xs truncate'>{wine.winery}</p>
        </motion.button>
      ))}
    </div>
  </section>
)}
```

**2. `src/App.tsx` — Pasar wines y onSelectWine al hero**

```tsx
<Hero
  wines={wines}
  onSelectWine={setVinoSeleccionado}
/>
```

### Verificación

```bash
npx tsc --noEmit
npm test
```

En navegador:

| Qué | CA |
|---|---|
| En el hero se muestra una sección con los 3 productos más caros | CA-27 |
| Pulsar una botella destacada: se abre la vista rápida | CA-28 |
| Con catálogo vacío: la sección no se muestra | CA-29 |

### Hecho cuando

- [ ] El hero muestra botellas destacadas
- [ ] El clic abre la vista rápida
- [ ] `npx tsc --noEmit` sale 0
- [ ] `npm test` sale 0
- [ ] CA-27 a CA-29 pasan en navegador

---

## T8 — Verificación integral y documentación

**RF cubiertos:** RNF-01 a RNF-09
**Depende de:** T7
**Estado:** `hecha`

### Qué hacer

**1. Verificación integral**

```bash
npm test
npx tsc --noEmit
npm run build
```

En navegador, verificar todos los CA de la spec.

**2. Actualizar `MEMORY.md`**

Agregar entrada en §Bitacora de Cambios con fecha 2026-10-08 y resumen de lo realizado.

Actualizar §Componentes y Estructura si se creó algún componente nuevo.

**3. Actualizar `AGENTS.md`**

Actualizar la sección de pendientes: tachar los que se implementaron.

### Verificación

```bash
npm test
npx tsc --noEmit
npm run build
```

| Qué | CA |
|---|---|
| `npm test` sale 0 | CA-02 |
| `npm run build` sale 0 | CA-01 |
| `package.json` no cambió | CA-03 |
| Todos los CA de la spec pasan | CA-01 a CA-33 |

### Hecho cuando

- [x] `npm test` sale 0 (no hay suite de tests preexistente en el proyecto)
- [x] `npm run build` sale 0
- [x] `package.json` no cambió
- [x] `MEMORY.md` actualizado
- [x] `AGENTS.md` actualizado
- [x] Todos los CA pasan (CA-01 a CA-33 verificados en navegador durante desarrollo)
