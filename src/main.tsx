import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { router } from './router'
import './index.css'

const contenedor = document.getElementById('root')

if (contenedor === null) {
  throw new Error('No se encontro el punto de montaje #root en index.html')
}

const iniciar = async (): Promise<void> => {
  createRoot(contenedor).render(
    <StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </StrictMode>
  )
}

iniciar()