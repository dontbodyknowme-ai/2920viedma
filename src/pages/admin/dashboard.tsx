// Marcador de posicion para la pagina de Dashboard. T4 lo reemplaza por la
// version real con MetricCards, grafico de Recharts, top de productos y
// actividad reciente.
//
// Existe desde T1 porque router.tsx necesita que las rutas `/admin/*` apunten a
// un componente real. El `Outlet` que renderiza las rutas hijas vive en
// AdminLayout, que se implementa en T2.
export const Dashboard = () => (
  <section>
    <h2 className='font-serif text-2xl font-bold text-cream-100'>Dashboard</h2>
    <p className='mt-2 text-neutral-400'>Se implementa en T4.</p>
  </section>
)
