# Plan 003 — Mejoras de UX y funcionalidad

**Spec:** `specs/003-mejoras-ux/spec.md`, estado `borrador`
**Fase:** 3 de 5 (plan). Este documento define el **CÓMO**. El QUÉ y el POR QUÉ están en la spec.
**Restricción dominante:** no se instala ninguna dependencia (RNF-04). Todo lo que este plan necesita ya está en `node_modules`.
**Tareas: 8.**

---

## 1. Estrategia de ejecución

### 1.1 La idea central

Las mejoras se implementan en **cascada de dependencias**: primero los filtros (que no dependen de nada), luego la edición (que reutiliza el formulario), luego la carga de imagen (que es independiente), luego la navegación (que es simple), y por último las animaciones (que son transversales y deben ir al final para no interferir con el desarrollo de las demás).

```
capa 1  filtros       carta_de_catalogo.tsx + tipos
                      │
                      ▼  el formulario ya existe, solo hay que agregar el modo edición
capa 2  edición       editor_formador_productos.tsx (modo editar)
                      │
                      ▼  la carga de imagen es independiente de la edición
capa 3  imagen        editor_formador_productos.tsx (drag & drop)
                      │
                      ▼  la navegación es simple y no depende de nada
capa 4  navegación    barra_de_navegacion.tsx
                      │
                      ▼  las animaciones envuelven componentes existentes
capa 5  animaciones   AnimatedSection + hero.tsx (parallax)
                      │
                      ▼  las destacadas usan el catálogo existente
capa 6  destacadas    hero.tsx (sección de destacados)
                      │
                      ▼
capa 7  cierre        documentación + verificación
```

### 1.2 Orden de tareas

| Tarea | Título | Depende de |
|---|---|---|
| T1 | Filtros por precio y cepa | — |
| T2 | Edición de productos (solo admin) | T1 (el formulario se toca en T2 y T3, mejor hacerlas juntas) |
| T3 | Carga de imagen por archivo (solo admin) | T2 (mismo archivo, mismo formulario) |
| T4 | Enlaces de navegación | — |
| T5 | Animaciones de scroll (AnimatedSection) | T4 (las animaciones envuelven secciones, la navegación ya debe existir) |
| T6 | Parallax en el hero | T5 (mismo sistema de animaciones) |
| T7 | Botellas destacadas | T1 (el catálogo ya tiene filtros, las destacadas usan el mismo componente) |
| T8 | Verificación integral y documentación | T7 |

---

## 2. Mapa de archivos

### 2.1 Archivos a crear

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `src/components/animated_section.tsx` | Wrapper de animación de scroll reveal. Envuelve hijos y los anima cuando entran en el viewport | T5 |
| `src/utils/filtros.ts` | Función de filtrado por precio y cepa, testeable sin montar React | T1 |

### 2.2 Archivos a modificar

| Archivo | Qué cambia | Tarea |
|---|---|---|
| `src/types/producto.ts` | Se extiende `ProductoFilterState` con `minPrice`, `maxPrice`, `selectedVarietals` | T1 |
| `src/components/carta_de_catalogo.tsx` | Se agrega UI y lógica de filtros por precio y cepa | T1 |
| `src/components/editor_formador_productos.tsx` | Se agrega modo edición (prop `wineToEdit`) y carga de imagen por archivo (drag & drop) | T2, T3 |
| `src/components/barra_de_navegacion.tsx` | Se agregan enlaces de navegación a secciones y panel lateral en móvil | T4 |
| `src/components/hero.tsx` | Se agrega parallax y sección de botellas destacadas | T6, T7 |
| `src/App.tsx` | Se conectan los nuevos props y componentes | T1, T2, T4, T5, T6, T7 |

### 2.3 Archivos que NO se tocan

| Archivo | Por qué |
|---|---|
| `src/datos/productos.ts` | Los datos iniciales no cambian |
| `tailwind.config.js` | La paleta ya es la de la constitución |
| `vitest.config.ts` | La configuración de tests no cambia |
| `package.json` / `package-lock.json` | RNF-04: ni una dependencia agregada ni quitada |
| `src/components/herocanvas3d.tsx` | La botella 3D no cambia |
| `src/components/carta_de_productos.tsx` | La tarjeta no cambia (el botón "Editar" va en el panel admin) |
| `src/components/vista_rapida_producto.tsx` | La vista rápida no cambia |
| `src/components/carrito_de_compras.tsx` | El carrito no cambian |
| `src/components/pie_de_pagina.tsx` | El pie de página no cambia |

---

## 3. Decisiones de implementación

### D-A — Filtro por precio: inputs numéricos

```tsx
// En carta_de_catalogo.tsx
const [minPrice, setMinPrice] = useState<number | ''>('')
const [maxPrice, setMaxPrice] = useState<number | ''>('')

// En el filtrado
const matchesPrice =
  (minPrice === '' || wine.price >= Number(minPrice)) &&
  (maxPrice === '' || wine.price <= Number(maxPrice))
```

**Alternativa descartada:** Un slider de doble punto (range slider). Es más visual pero más complejo de implementar, menos preciso, y menos accesible.

### D-B — Filtro por cepa: chips multi-select

```tsx
const [selectedVarietals, setSelectedVarietals] = useState<string[]>([])

// En el filtrado
const matchesVarietal =
  selectedVarietals.length === 0 || selectedVarietals.includes(wine.varietal)
```

Las cepas disponibles se derivan del catálogo: `Array.from(new Set(wines.map((w) => w.varietal)))`.

**Alternativa descartada:** Un `<select>` multiple. Es menos visible y requiere Ctrl+Click para seleccionar múltiples.

### D-C — Carga de imagen por archivo: drag & drop + input file

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
  reader.onload = () => setImagePreview(reader.result as string)
  reader.readAsDataURL(file)
}
```

**Alternativa descartada:** Usar `URL.createObjectURL()`. No persiste en `localStorage`, así que la imagen se perdería al recargar.

### D-D — Edición de productos: mismo formulario con modo edición

```tsx
interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onAddWine: (wine: Producto) => void
  onUpdateWine: (wine: Producto) => void  // Nuevo
  wineToEdit: Producto | null              // Nuevo
}
```

Cuando `wineToEdit` no es `null`, el formulario carga los datos del producto y el botón dice "Guardar Cambios". Al guardar, llama a `onUpdateWine` en vez de `onAddWine`.

**Alternativa descartada:** Un formulario separado para editar. Duplicaría la UI y la validación.

### D-E — Navegación: anclas con scroll suave + panel lateral en móvil

```tsx
const NAV_LINKS = [
  { href: '#hero', label: 'Inicio' },
  { href: '#catalogo', label: 'Catálogo' },
  { href: '#contacto', label: 'Contacto' }
]
```

En móvil, los enlaces se muestran en un panel lateral (drawer) que se abre con un botón de menú.

**Alternativa descartada:** Un menú hamburguesa tradicional. El panel lateral es más accessible y más simple de implementar con Framer Motion.

### D-F — Animaciones de scroll: Framer Motion `useInView`

```tsx
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

export const AnimatedSection = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
```

**Alternativa descartada:** Intersection Observer nativo. Funciona pero requiere más código y no se integra con el sistema de animaciones de Framer Motion.

### D-G — Parallax en el hero: `useScroll` + `useTransform`

```tsx
import { motion, useScroll, useTransform } from 'framer-motion'

const { scrollY } = useScroll()
const y = useTransform(scrollY, [0, 500], [0, 150])
const opacity = useTransform(scrollY, [0, 300], [1, 0.3])
```

**Alternativa descartada:** CSS `background-attachment: fixed`. No funciona en móvil y no permite transformaciones suaves.

### D-H — Botellas destacadas: 3 productos más caros

```tsx
const destacados = [...wines].sort((a, b) => b.price - a.price).slice(0, 3)
```

Se muestran en una sección del hero con un diseño destacado. Al hacer clic, abren la vista rápida.

**Alternativa descartada:** Un sistema de "destacados" en los datos (campo `featured: boolean`). Es más flexible pero requiere modificar los datos iniciales y el tipo `Producto`.

### D-I — Degradación de animaciones en móvil

```tsx
const isMobile = window.innerWidth < 640

if (isMobile) {
  // Usar transiciones simples en vez de animaciones de scroll
}
```

**Alternativa descartada:** Desactivar todas las animaciones en móvil. Las transiciones simples mantienen la retroalimentación visual sin el costo del parallax.

---

## 4. Estrategia de tests

### 4.1 Tests automatizados

Los 68 tests preexistentes no se tocan. Se agrega **1 archivo nuevo** de tests para la lógica de filtros:

| Archivo | Tests | RF cubiertos |
|---|---|---|
| `test/filtros_catalogo.test.ts` | Tests de la lógica de filtrado por precio y cepa | RF-01 a RF-05 |

Los tests de filtros prueban la función de filtrado directamente (sin montar React), porque es lógica pura:

```ts
import { filtrarVinos } from '../src/utils/filtros'

describe('filtrarVinos', () => {
  const productos = [...]

  it('filtra por precio mínimo', () => {
    const resultado = filtrarVinos(productos, { minPrice: 40000 })
    expect(resultado).toHaveLength(1)
  })
})
```

### 4.2 Tests en navegador

Los criterios de aceptación CA-04 a CA-33 se verifican en navegador, igual que en la spec 002.

---

## 5. Trazabilidad RF → tarea

| RF | Tarea | Verificación |
|---|---|---|
| RF-01 a RF-05 | T1 | CA-04 a CA-10, CA-30 |
| RF-06 a RF-10, RF-25 | T3 | CA-11 a CA-15, CA-31 |
| RF-11 a RF-14 | T2 | CA-16 a CA-19, CA-32 |
| RF-15 a RF-17 | T4 | CA-20 a CA-22, CA-33 |
| RF-18 a RF-21 | T5, T6 | CA-23 a CA-26 |
| RF-22 a RF-24 | T7 | CA-27 a CA-29 |

---

## 6. Riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | **El filtro por cepa con muchos productos puede ser lento** | La UI se traba con cientos de productos | El catálogo es pequeño (< 100 productos). Si crece, se puede virtualizar la lista |
| R2 | **La imagen Data URL puede exceder la cuota de `localStorage`** | El producto no se guarda | El límite de 5 MB por imagen y la cuota de `localStorage` son compatibles. Si se excede, el `try/catch` de `guardar` lo maneja |
| R3 | **El parallax puede causar náuseas en algunos usuarios** | Mala experiencia de usuario | Se degrada a transiciones simples en móvil. `prefers-reduced-motion` no desactiva las animaciones (decisión del usuario) |
| R4 | **El modo edición puede confundir al usuario** | El usuario edita sin querer | El formulario de edición tiene un título claro ("Editar Vino") y un botón "Cancelar" visible |
| R5 | **Los enlaces de navegación pueden romper el scroll suave** | La navegación no funciona | Los anclas usan `scroll-behavior: smooth` que ya está en el CSS base |
