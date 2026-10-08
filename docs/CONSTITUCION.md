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
  - **Fondo:** Negro carbon (`#121212` / `bg-charcoal-900` / `bg-charcoal-950`).
  - **Primario:** Borgoña / Vino profundo (`#5B132B` / `#800020`).
  - **Acentos:** Dorado tenue (`#D4AF37` / `text-gold-500`).
  - **Texto:** Crema calido (`#FDFBF7` / `text-cream-100`).
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
- La aplicacion debe compilar sin advertencias ni errores de TypeScript (`pnpm dev`).
- El flujo de compra (agregar al carrito, modificar cantidades, eliminar item y checkout) debe ser 100% funcional sin recargar la pagina.
- El modulo de carga debe agregar nuevos vinos al catalogo en tiempo real con persistencia inmediata.