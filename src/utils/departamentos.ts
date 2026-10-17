/**
 * Los departamentos de la tienda: el eje con el que se separa el stock.
 *
 * ## Por que una lista fija aca
 *
 * Las pestañas de stock del panel y el desplegable del formulario necesitan
 * **los mismos cuatro valores**, con la misma forma. Si cada uno tuviera su
 * propia copia, el primero en cambiar uno de los dos deja al otro desactualizado
 * —y el sintoma es confuso: el formulario ofrece un departamento que no aparece
 * como pestaña, o al reves—. Es el mismo motivo por el que `permisos.ts` es una
 * tabla y no cinco `if` scattered.
 *
 * ## `valor` vs `etiqueta`
 *
 * `valor` es lo que viaja a la base y lo que viaja en el `?departamento=`. Son
 * los mismos strings que usa el catalogo publico (`carta_de_catalogo.tsx`), y
 * por eso el filtro del panel y el de la tienda cuentan lo mismo.
 *
 * `etiqueta` es lo que se lee. En el panel dice "Stock de bebidas" y no
 * "Bebidas" porque la pestaña **es** el stock de esa cosa, no una seccion de
 * bebidas: leer "Bebidas" arriba de una tabla de stock obliga a un paso de
 * inferencia que no hace falta.
 *
 * ## La lista no es cerrada en la base
 *
 * El campo `departamento` en Prisma es `String`, no enum, por la misma razon que
 * `category`: ampliar un enum de Postgres es una migracion y el admin no puede
 * correr migraciones desde el panel. Agregar un departamento es agregar una
 * linea aca y cargar un producto que lo use — sin tocar el esquema.
 */
export const DEPARTAMENTOS = [
  { valor: 'Bebidas', etiqueta: 'Stock de bebidas' },
  { valor: 'Regalería', etiqueta: 'Stock de regalería' },
  { valor: 'Snacks y chocolates', etiqueta: 'Stock de snacks y chocolates' },
  { valor: 'Comidas', etiqueta: 'Stock de comidas' }
] as const

/** El valor de `departamento` que significa "sin filtro". */
export const SIN_DEPARTAMENTO = ''

/**
 * El nombre de la pestaña que muestra todo.
 *
 * Es un valor de la interfaz, **no** un departamento: no se manda a la base ni
 * se guarda en ningun producto. Por eso vive aca y no en `DEPARTAMENTOS`.
 */
export const PESTAÑA_TODOS = 'Todos'
