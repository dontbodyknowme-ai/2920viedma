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
       * **Negro carbon, neutro.** En un primer pase la paleta convirtio esta
       * rampa en los cinco rojos mas oscuros (fondo de pagina `#35030f`) y el
       * usuario pidio volver al negro carbon en vez de rojo (2026-10-09).
       * Otra vez es gris neutro, como antes de la paleta.
       *
       * Los nueve rojos siguen en `wine`: son el acento (botones, bordes,
       * badges), no la superficie. El fondo de pagina es `charcoal-950`
       * (`#0a0a0a`) y las cards `charcoal-800/900`.
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
          600: '#2e2e2e',
          700: '#262626',
          800: '#1e1e1e',
          900: '#121212',
          950: '#0a0a0a'
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
         * Neutros grises puros.
         *
         * Tailwind trae un `neutral` gris, y el sitio lo usa para textos
         * secundarios y bordes. Se sobreescriben con grises puros **mas
         * claros** que los de Tailwind en los pasos medios y bajos: contra
         * `#0a0a0a`, el `neutral-500` por defecto da 4.4:1, apenas debajo del
         * 4.5:1 que pide WCAG AA para texto normal.
         *
         * En una version previa estos pasos estaban tintados de vino, para que
         * no se vieran sucios sobre el fondo rojo. Vuelto el fondo al negro
         * carbon (a pedido del usuario), el tinte sobra: vuelven a ser neutros.
         */
        neutral: {
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#8f8f8f',
          600: '#6b6b6b',
          700: '#4a4a4a',
          800: '#2e2e2e',
          900: '#1c1c1c'
        }
      }
    }
  },
  plugins: []
}