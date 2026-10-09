// Marcador de posicion. T2 lo reemplaza por el layout real: sidebar colapsible
// en escritorio y drawer en movil, header sticky, proteccion por `isAdmin` y el
// `Outlet` que renderiza las rutas hijas.
export const AdminLayout = () => (
  <div className='min-h-screen bg-charcoal-950 text-cream-100'>
    <h1 className='p-8 font-serif text-2xl font-bold'>CAVA &amp; CO. Admin</h1>
    <p className='px-8 text-neutral-400'>Layout se implementa en T2.</p>
  </div>
)
