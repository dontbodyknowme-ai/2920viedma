/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      /**
       * Paleta de la marca (rediseño 2026-10-17).
       *
       * Tema **claro**: fondo marfil, tarjetas blanco, texto carbón, acento verde.
       * Reemplaza al tema oscuro anterior (carbón + vino). Las claves viejas
       * (`wine`, `charcoal`, `cream`, `gold`) se eliminaron a propósito: el código
       * tiene que migrar a estas, no conviven dos paletas.
       *
       * ## `verde` — acento de marca
       * - `500` (#405747, `profundo`): botones principales, enlaces destacados,
       *   identidad. Es el acento primario (antes `wine`).
       * - `salvia` (#75866a): detalles, etiquetas, elementos secundarios. Acento
       *   secundario (antes `gold`).
       *
       * La rampa 50–950 sale del `verde-500` por oscurecido/clarado. El codigo la
       * usa para hovers, badges y bordes, igual que antes usaba la rampa `wine`.
       *
       * ## Superficies
       * - `marfil` (#f7f4ee): fondo general de la página.
       * - `blanco` (#ffffff): tarjetas de productos, formularios, espacios de lectura.
       * - `arena` (#e5d8c5): fondos alternativos y bloques promocionales.
       *
       * ## Texto
       * - `carbon` (#292d2f): textos y títulos.
       * - `neutral`: grises para bordes y texto secundario.
       */
      colors: {
        verde: {
          50: '#f3f6f3',
          100: '#e6ece6',
          200: '#cdd9cd',
          300: '#b4c6b4',
          400: '#93a893',
          500: '#405747',
          600: '#384d3e',
          700: '#2f4234',
          800: '#27362b',
          900: '#1f2a22',
          950: '#16201a',
          salvia: '#75866a',
          profundo: '#405747'
        },
        marfil: '#f7f4ee',
        carbon: '#292d2f',
        arena: '#e5d8c5',
        blanco: '#ffffff',
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
