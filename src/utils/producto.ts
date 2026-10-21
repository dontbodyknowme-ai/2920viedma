/**
 * Como se rotula un producto cuando no es un vino.
 *
 * ## Que se rompia
 *
 * La tarjeta de la grilla, la vista rapida, el carrito y las botellas
 * destacadas escribian el subtitulo asi:
 *
 * ```tsx
 * {producto.winery} • {producto.varietal}
 * ```
 *
 * Que para un Malbec da "Bodega Catena Zapata • Malbec" y para un **Monster
 * Energy** da **" • "**: el separador solo, con los dos datos en `null`.
 * Y en el badge de la foto, `{producto.vintage}` dejaba un pastillo vacio con
 * la forma de un ano.
 *
 * No es un detalle de maquetacion: **la mitad del catalogo no es vino**. Las
 * gaseosas, las aguas saborizadas, los jugos, las cervezas, los energizantes,
 * los chocolates y las papas no tienen bodega ni anada, y todos ellos se
 * mostraban con la basura de arriba. Un producto con la etiqueta " • " en la
 * grilla se ve como un producto roto.
 *
 * ## La regla
 *
 * Se escribe **lo que hay**, en el orden bodega -> cepa, separado por " • ".
 * Lo que falta no se rellena con un separador: se omite. Y si no hay nada,
 * no se escribe la linea.
 *
 * Ojo con la distincion de `vista_rapida_producto.tsx` (D-N): un **string
 * vacio** es un dato presente, no ausente. Por eso el filtro de abajo descarta
 * los vacios con `trim() === ''` y no solo los `null`.
 */

/** Los dos datos que puede mostrar el subtitulo, y que pueden faltar. */
export interface DatosDeSubtitulo {
  winery: string | null
  varietal: string | null
}

/**
 * El subtitulo de un producto, o `null` si no hay nada que escribir.
 *
 * `null` y no `''`: el que lo usa tiene que **omitir la linea entera**, porque
 * un `<p>` vacio con `mb-2` deja el hueco igual de visible.
 */
export const subtituloProducto = (producto: DatosDeSubtitulo): string | null => {
  const partes = [producto.winery, producto.varietal].filter(
    (parte): parte is string => typeof parte === 'string' && parte.trim() !== ''
  )

  return partes.length > 0 ? partes.join(' • ') : null
}

/**
 * Si el producto tiene anada para mostrar.
 *
 * Un ano es un numero, asi que el chequeo es `!= null` y no un truthy: el `0`
 * no es un ano, pero un numero negativo tampoco, y lo que se quiere descartar
 * es el `null` de "esto no es un vino".
 */
export const tieneAnada = (vintage: number | null | undefined): vintage is number =>
  typeof vintage === 'number' && Number.isFinite(vintage)
