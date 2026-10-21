import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // `import.meta.dirname` y no `__dirname`: Vite 8 avisa que `__dirname`
      // no va a estar soportado cuando el `configLoader` de Vite pase a ser
      // `native` (que es el plan). `import.meta.dirname` existe desde Node
      // 20.11 y el repo exige Node 22.19, asi que ya se puede usar.
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})