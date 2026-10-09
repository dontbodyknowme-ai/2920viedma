import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { AdminLayout } from './components/admin/admin_layout'
import { CatalogoAdmin } from './pages/admin/catalogo'
import { ClientesAdmin } from './pages/admin/clientes'
import { ConfiguracionAdmin } from './pages/admin/configuracion'
import { Dashboard } from './pages/admin/dashboard'
import { PedidosAdmin } from './pages/admin/pedidos'

// La proteccion de las rutas admin NO vive aqui: la hace AdminLayout en T2,
// que es el unico componente que se monta en todas las hijas y por lo tanto el
// unico lugar donde un redirect no esquivaria las rutas hijas.
//
// `catchAll` esta para que una URL desconocida en el admin no quede en blanco.
// Va al inicio publico, no a un 404 propio: la 004-a no define un 404.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'catalogo', element: <CatalogoAdmin /> },
      { path: 'pedidos', element: <PedidosAdmin /> },
      { path: 'clientes', element: <ClientesAdmin /> },
      { path: 'configuracion', element: <ConfiguracionAdmin /> },
      { path: '*', element: <Dashboard /> }
    ]
  }
])
