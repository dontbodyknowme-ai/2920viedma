import { defineConfig } from 'vitest/config'

// Configuracion exclusiva de Vitest.
// Se ubica en `vitest.config.ts` (y no dentro de `vite.config.ts`) a proposito:
// Vite solo auto-carga `vite.config.*`, por lo que este archivo no altera
// en absoluto el pipeline de `vite build` ni el de `vite dev`.
export default defineConfig({
  test: {
    // jsdom habilita los tests de componentes presentes y futuros.
    // Los tests actuales son de datos, pero deja el entorno preparado.
    environment: 'jsdom',

    // Solo se recolectan tests dentro de la carpeta `test/` del proyecto.
    include: ['test/**/*.test.ts'],

    // Exclusion explicita: node_modules ya queda fuera por defecto, pero se
    // declara junto a .opencode y .agents para garantizar que ningun archivo
    // de tooling del agente se interprete como suite de tests.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.opencode/**',
      '**/.agents/**',
      '**/.git/**',
      '**/cypress/**'
    ],

    // Modo no interactivo por defecto: aunque alguien invoque `vitest` sin
    // argumentos, nunca se queda en watch. `npm test` usa `vitest run`.
    watch: false
  }
})