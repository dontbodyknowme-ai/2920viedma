# CONSTITUTION.md

## 1. Mision y Vision del Proyecto
- **Proposito:** Ofrecer una experiencia e-commerce de alta gama para la venta de productos premium, priorizando la elegancia visual, el rendimiento y una interaccion fluida.
- **Identidad de Marca:** CAVA & CO. transmite exclusividad, sofisticacion y pasion por la cultura del producto.
- **Audiencia:** Amantes del producto, coleccionistas y clientes que buscan una compra agil y esteticamente atractiva.

## 2. Principios Fundamentales de Desarrollo
1. **Calidad de Codigo y Tipado Estricto:**
   - Todo el codigo debe estar escrito en TypeScript estricto (`strict: true`).
   - Prohibido el uso implicito o explicito de `any`.
2. **Estilo Fijo y Consistente:**
   - Comillas simples en strings (`'ejemplo'`).
   - Sin puntos y comas al final de las sentencias (sin `;`).
   - Preferencia absoluta por patrones funcionales y componentes puros de React.
3. **Rendimiento e Interactividad First:**
   - Las animaciones y efectos 3D (Framer Motion / Three.js) deben ser fluidas (60 FPS) y no bloquear el hilo principal.
   - En dispositivos moviles, las animaciones complejas o pesadas deben degradarse elegantemente o simplificarse.

## 3. Guia de Diseño UI / UX
- **Paleta de Colores Obligatoria:**
  - **Fuente unica:** `tailwind.config.js`. Los hex no van en componentes (unicamente `PALETA` en `herocanvas3d.tsx`, porque Three.js no puede leer el config).
  - **Acento verde:** `verde` 400→950 (9 tonos) + `salvia` como acento de marca. Botones, bordes, badges y estados seleccionados.
    **Este bloque estaba desactualizado:** describia la paleta oscura (`wine`, `charcoal`, `gold`, `cream`) que
    quedo obsoleta cuando el diseno paso a la marca `2920`. Los nombres de abajo son los que existen hoy en
    `tailwind.config.js`; el unico lugar donde se allowen hex sueltos es `PALETA` en `herocanvas3d.tsx`.
  - **Fondo / superficies:** `marfil` `#f7f4ee` para el fondo de pagina, `blanco` para cards y superficies.
  - **Acento calido:** `arena` para bloques destacados.
  - **Texto:** `carbon` `#292d2f` para texto largo, `neutral` para texto secundario.
  - **Neutros:** grises de Tailwind, ajustados para WCAG AA (> 4.5:1) sobre `marfil`.
- **Tipografia:**
  - Encabezados y titulos: Tipografia Serif elegante (`font-serif`).
  - Cuerpo de texto y controles: Sans-serif limpia (`font-sans`).
- **Interacciones:**
  - Transiciones suaves en hover (efectos de elevacion, cambio de opacidad y zoom sutil de imagenes).
  - Paneles y modales siempre acompañados de animaciones de entrada/salida (`AnimatePresence` de Framer Motion).

## 4. Arquitectura y Persistencia
- **Gestion de Estado:** Estado local de React con sincronizacion directa en `localStorage` (`vinoteca_wines` y `vinoteca_cart`). El modelo se renombro a "producto" pero **la clave `vinoteca_wines` no**: ya esta en el navegador de quien visito la tienda, y renombrarla los deja sin catalogo guardado.
- **Estructura Modular:**
  - Componentes en `src/components/`.
  - Tipos e interfaces en `src/types/`.
  - Datos mock o iniciales en `src/data/`.
- **Evolucion del Backend:** La interfaz debe estar preparada para conectar APIs o bases de datos (ej. Supabase) en el futuro sin reestructurar el componente UI.

## 5. Criterios de Aceptacion y Testing
- La aplicacion debe compilar sin advertencias ni errores de TypeScript (`npm run dev`).
- El flujo de compra (agregar al carrito, modificar cantidades, eliminar item y checkout) debe ser 100% funcional sin recargar la pagina.
- El modulo de carga debe agregar nuevos productos al catalogo en tiempo real con persistencia inmediata.