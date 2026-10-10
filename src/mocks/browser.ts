import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Solo se importa desde main.tsx en desarrollo. En produccion este modulo no se
// carga nunca, asi que los handlers no pesan en el bundle.
export const worker = setupWorker(...handlers)
