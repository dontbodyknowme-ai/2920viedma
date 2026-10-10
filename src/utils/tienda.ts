/**
 * Identidad de la tienda.
 *
 * **Un solo lugar.** El footer ya tenia el email de contacto hardcodeado dentro
 * del `mailto:` y del texto visible, o sea la misma direccion escrita dos veces
 * en el mismo componente. La pagina de Configuracion necesita mostrarla tambien.
 * Con tres copias, el primer cambio de dominio deja alguna desactualizada, y un
 * `mailto:` que no coincide con lo que se ve en pantalla manda el mensaje al
 * lugar equivocado sin avisar.
 *
 * **No se puede editar desde el panel.** Ver `configuracion.tsx`: no hay
 * endpoint de configuracion y la 004-a no define ninguno. Editar estos valores
 * seria un formulario que no guarda nada.
 */
export const TIENDA = {
  nombre: 'Cava & Co',
  email: 'hola@cava-co.com',
  /**
   * Codigo ISO 4217. Se usa en todos los `Intl.NumberFormat` del panel y del
   * export CSV, asi que cambiarlo aca sin cambiar los formateadores dejaria
   * archivos en una moneda y textos en otra.
   */
  moneda: 'ARS',
  /**
   * Zona horaria de la tienda. **No se usa para convertir fechas**: el panel
   * opera en la zona local del navegador, que es lo que el usuario ve en el
   * calendario. Se muestra en Configuracion para que quede claro ante que zona
   * funcionan los dias.
   */
  zonaHoraria: 'America/Argentina/Mendoza'
} as const

/** La zona horaria donde el navegador del usuario opera ahora mismo. */
export const zonaHorariaLocal = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return TIENDA.zonaHoraria
  }
}