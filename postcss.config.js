export default {
  plugins: {
    // **Tailwind v4 no se usa mas como plugin de PostCSS.** El plugin se
    // movio a su propio paquete, `@tailwindcss/postcss`. Con `tailwindcss: {}`
    // aca, PostCSS mete a mano la lib de Tailwind como si fuera un plugin y
    // falla con:
    //
    //   It looks like you're trying to use `tailwindcss` directly as a PostCSS
    //   plugin. The PostCSS plugin has moved to a separate package...
    //
    // `autoprefixer` sigue haciendo falta: Tailwind v4 no vendoriza los
    // prefijos de proveedor.
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
}
