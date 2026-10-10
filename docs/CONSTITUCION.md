# CONSTITUTION.md

## 1. Mision y Vision del Proyecto
- **Proposito:** Ofrecer una experiencia e-commerce de alta gama para la venta de vinos premium, priorizando la elegancia visual, el rendimiento y una interaccion fluida.
- **Identidad de Marca:** CAVA & CO. transmite exclusividad, sofisticacion y pasion por la cultura del vino.
- **Audiencia:** Amantes del vino, coleccionistas y clientes que buscan una compra agil y esteticamente atractiva.

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
  - **Rojos (acento):** los 9 de la paleta, `wine` 400→950: `#AD0021`, `#96092B`, `#7F0D28`, `#7A0B25`, `#6D061E`, `#630A1F`, `#4F0718`, `#470615`, `#35030F`. Botones, bordes, badges y estados seleccionados.
  - **Fondo / superficies:** `charcoal` = **negro carbon neutro** (`#2E2E2E`/`#262626`/`#1E1E1E`/`#121212`/`#0A0A0A`). Fondo de pagina `charcoal-950` (`#0A0A0A`), cards `charcoal-800/900` (`#1E1E1E`/`#121212`), `body` en `#121212`. El usuario pidio negro carbon, no rojos oscuros (2026-10-09).
  - **Acentos:** Dorado (`gold`: `#F0D98C`, `#E5C158`, `#D4AF37`, `#AA8C2C`); texto largo sobre oscuro en crema calido (`#FDFBF7`).
  - **Blanco:** rampa `white` (`#ffffff` / 100-300) para `bg-white` y `text-white`.
  - **Neutros:** grises puros, mas claros que los de Tailwind para WCAG AA (> 4.5:1) sobre el negro carbon.
- **Tipografia:**
  - Encabezados y titulos: Tipografia Serif elegante (`font-serif`).
  - Cuerpo de texto y controles: Sans-serif limpia (`font-sans`).
- **Interacciones:**
  - Transiciones suaves en hover (efectos de elevacion, cambio de opacidad y zoom sutil de imagenes).
  - Paneles y modales siempre acompañados de animaciones de entrada/salida (`AnimatePresence` de Framer Motion).

## 4. Arquitectura y Persistencia
- **Gestion de Estado:** Estado local de React con sincronizacion directa en `localStorage` (`vinoteca_wines` y `vinoteca_cart`).
- **Estructura Modular:**
  - Componentes en `src/components/`.
  - Tipos e interfaces en `src/types/`.
  - Datos mock o iniciales en `src/data/`.
- **Evolucion del Backend:** La interfaz debe estar preparada para conectar APIs o bases de datos (ej. Supabase) en el futuro sin reestructurar el componente UI.

## 5. Criterios de Aceptacion y Testing
- La aplicacion debe compilar sin advertencias ni errores de TypeScript (`npm run dev`).
- El flujo de compra (agregar al carrito, modificar cantidades, eliminar item y checkout) debe ser 100% funcional sin recargar la pagina.
- El modulo de carga debe agregar nuevos vinos al catalogo en tiempo real con persistencia inmediata.