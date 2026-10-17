/**
 * La categoria con la que arranca el formulario de producto.
 *
 * No es una lista: es **una** categoria. Antes el formulario ofrecia un
 * `<select>` con `['Tinto', 'Blanco', 'Rosado', 'Espumante']`, y eso hacia que
 * agregar una categoria fuera editar el codigo. Ahora el campo es un input con
 * `datalist`: lo que hay aca es solo el valor con el que se abre el formulario en
 * blanco, para que el campo no nazca vacio y el guardado no falle por eso.
 *
 * Los cuatro valores de antes son los que hoy usan los datos del repo; cuando el
 * catalogo real entre (spec 010), este valor deberia ser el primero de la lista,
 * no una categoria impuesta.
 */
export const CATEGORIAS_ARRANCAMIENTO = 'Tinto'
