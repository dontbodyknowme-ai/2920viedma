import type { Wine } from '../types/vino'

interface Filtros {
  categoria: Wine['category'] | 'Todos los productos'
  minPrice: number | ''
  maxPrice: number | ''
  searchQuery: string
}

export const filtrarVinos = (vinos: Wine[], filtros: Filtros): Wine[] => {
  const consulta = filtros.searchQuery.trim().toLowerCase()
  const min = filtros.minPrice === '' ? null : Number(filtros.minPrice)
  const max = filtros.maxPrice === '' ? null : Number(filtros.maxPrice)

  return vinos.filter((wine) => {
    const matchesCategory =
      filtros.categoria === 'Todos los productos' || wine.category === filtros.categoria
    const matchesPrice =
      (min === null || wine.price >= min) && (max === null || wine.price <= max)
    // La categoría también se busca: el placeholder del buscador y el del navbar
    // prometen "nombre, marca o categoría", y sin esta línea el tercero no
    // encontraba nada. Un texto que promete una búsqueda que no existe es peor
    // que un placeholder más corto.
    const matchesSearch =
      wine.name.toLowerCase().includes(consulta) ||
      wine.winery.toLowerCase().includes(consulta) ||
      wine.varietal.toLowerCase().includes(consulta) ||
      wine.category.toLowerCase().includes(consulta)

    return matchesCategory && matchesPrice && matchesSearch
  })
}