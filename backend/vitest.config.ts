import { defineConfig } from 'vitest/config'

// Configuracion de los tests del backend.
//
// El bloque `css.postcss` vacio no es cosmetico. Sin el, Vite busca el
// `postcss.config.js` **subiendo directorios** desde `backend/`, encuentra el
// del frontend (en la raiz del repo) e intenta cargar Tailwind. En local
// funciona de milagro porque Node resuelve `tailwindcss` desde el
// `node_modules` de la raiz; en CI el job de backend solo hace `npm ci` dentro
// de `backend/`, asi que no existe y el run muere con:
//
//   Failed to load PostCSS config: Cannot find module 'tailwindcss'
//
// Vite solo saltea esa busqueda en el filesystem si `css.postcss` es un objeto
// plano (ver `resolvePostcssConfig` en `vite/dist/node/chunks/*.js`). El
// backend no procesa CSS:_tests_ de logica pura, de auth y de esquemas.
export default defineConfig({
  css: {
    postcss: {
      plugins: []
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**'
    ],
    watch: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ['./tests/setup.ts']
  }
})