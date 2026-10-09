import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './index.css'

const contenedor = document.getElementById('root')

if (contenedor === null) {
  throw new Error('No se encontro el punto de montaje #root en index.html')
}

// Se usa una funcion async y no un await al tope del modulo porque el tsconfig
// del proyecto tiene target ES2020, y el await al tope necesita ES2022.
const iniciar = async (): Promise<void> => {
  // El worker de MSW intercepta las peticiones a /api/* y las responde con los
  // datos de src/mocks/. Solo se registra en desarrollo: en produccion este
  // import dinamico no se resuelve y el chunk de MSW no entra al bundle.
  //
  // Va antes del render y se espera a proposito: si el worker no esta corriendo
  // cuando la app empieza a pedir datos, la primera respuesta seria un 404
  // real en lugar de un dato mock.
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }

  createRoot(contenedor).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
}

iniciar()
