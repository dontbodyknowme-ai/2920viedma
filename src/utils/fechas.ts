/**
 * Fechas locales del panel.
 *
 * Vive en `utils/` y no en `date_range_picker.tsx` porque la usan dos lados que
 * no se conocen entre si: el componente, que convierte lo que el usuario senala
 * en el calendario, y el filtro del servidor, que tiene que comparar esas
 * fechas contra los `createdAt` de los pedidos.
 *
 * **El error que previene es de zona horaria, y es invisible en UTC.**
 * `createdAt` se guarda en UTC: un pedido hecho el 15 a las 23:30 en Buenos
 * Aires es `2026-01-16T02:30:00.000Z`. Si el filtro comparara el dia UTC, ese
 * pedido caeria fuera de un rango "del 1 al 15" que el usuario acaba de elegir,
 * sin error ni aviso: el admin veria un dia menos del que hay.
 *
 * La conversion usa los getters locales (`getFullYear`, `getMonth`, `getDate`),
 * que son los unicos que devuelven la fecha que el usuario realmente senalo.
 * `toISOString()` haria lo contrario: convertiria a UTC antes de mirar.
 */
export const aIsoLocal = (fecha: Date): string =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate()
  ).padStart(2, '0')}`