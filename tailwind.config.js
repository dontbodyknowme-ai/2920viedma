/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      /**
       * Paleta de la marca.
       *
       * **Fuente unica.** Antes estos mismos colores estaban tambien
       * hardcodeados en el bloque `@layer utilities` de `src/index.css`, con
       * valores que ya divergian de estos (`wine-900` era `#3d0a16` en CSS y
       * `#3a0a1a` aca; `gold-500`, `#c9a02e` contra `#d4af37`). Como las
       * utilidades del CSS pisan a las de Tailwind, el CSS era el que mandaba y
       * cambiar la paleta no alcanzaba. Ese bloque se elimino.
       *
       * ## La rampa `wine`
       *
       * Los nueve rojos de la paleta, del mas claro al mas oscuro, de mas
       * saturado a casi negro. Es la marca en si: botones, bordes, badges.
       *
       * `wine-50` y `wine-100` no vienen de la paleta: son tintes claros para
       * hovers sobre fondos oscuros.
       *
       * ## La rampa `charcoal`
       *
       * **No es gris.** Son los cinco rojos mas oscuros de la misma familia,
       * para que los fondos tengan temperatura de vino en vez de negro neutro.
       * Con la paleta anterior el fondo era `#0a0a0a`, un gris casi puro que
       * contrastaba con un vino carmin.
       *
       * `charcoal-600` y `charcoal-700` repiten exactamente `wine-800` y
       * `wine-900`. Es correcto: son el mismo color de la paleta, y separarlo
       * en dos familias es una cuestion de semantica (superficie vs. marca),
       * no de matiz.
       */
      colors: {
        wine: {
          50: '#fdf2f4',
          100: '#fbe6e9',
          400: '#ad0021',
          500: '#96092b',
          600: '#7f0d28',
          700: '#7a0b25',
          800: '#6d061e',
          900: '#630a1f',
          950: '#4f0718'
        },
        charcoal: {
          600: '#6d061e',
          700: '#630a1f',
          800: '#4f0718',
          900: '#470615',
          950: '#35030f'
        },

        /**
         * Blanco. `DEFAULT` esta para que `bg-white` y `text-white` sigan
         * funcionando como en Tailwind. `cream` (abajo) es el blanco calido que
         * ya usa el sitio y casi no se distingue de `white-100`; conviven
         * porque `cream` esta en cientos de clases y para el texto largo sobre
         * fondo oscuro el tono calido es menos fatigante que el puro.
         */
        white: {
          DEFAULT: '#ffffff',
          100: '#ffffff',
          200: '#f7f7f7',
          300: '#ebebeb'
        },
        cream: {
          100: '#fdfbf7',
          200: '#f4efe6'
        },

        /**
         * Dorado. No venia de la paleta de la imagen: se mantiene la rampa
         * anterior porque es el acento de la marca y no habia reason para
         * cambiarla. Se agrega `gold-300`, que el codigo ya usaba y no estaba
         * definida.
         */
        gold: {
          300: '#f0d98c',
          400: '#e5c158',
          500: '#d4af37',
          600: '#aa8c2c'
        },

        /**
         * Neutros con temperatura de vino.
         *
         * Tailwind trae un `neutral` gris puro, y el sitio lo usa para bordes y
         * textos secundarios. Contra un fondo vino, un gris frio se ve sucio.
         * Se sobreescriben los pasos que el codigo usa, con el mismo tono pero
         * **mas claros**.
         *
         * ## Por que mas claros y no solo tintados
         *
         * El fondo paso de `#0a0a0a` a `#35030f`. El nuevo es **mas claro**
         * (luminancia relativa 0.009 contra 0.003), asi que el mismo gris deja
         * de alcanzar el contraste que alcanzaba: `neutral-500` paso de 4.4:1
         * sobre el fondo viejo a 3.4:1 sobre el nuevo, por debajo del 4.5:1 que
         * pide WCAG AA para texto normal.
         *
         * Por eso los pasos medios suben en vez de solo recibir el tinte. Los
         * bordes (`700`, `800`, `900`) suben tambien, y eso es a proposito: los
         * bordes se dibujan como `border-neutral-800` sobre cards
         * `bg-charcoal-900`, y con el gris viejo quedaban casi invisibles.
         */
        neutral: {
          200: '#e2d6d9',
          300: '#c6b4ba',
          400: '#ad979e',
          500: '#9b858d',
          600: '#7a6a70',
          700: '#564a50',
          800: '#3d3438',
          900: '#2b2427'
        }
      }
    }
  },
  plugins: []
}