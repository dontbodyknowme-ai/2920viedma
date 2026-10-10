import type { DailySale } from '../types/admin'

/**
 * Calculo de la variacion de ventas entre la primera y la segunda mitad de una
 * serie.
 *
 * Vive en `utils/` y no en `dashboard.tsx` por dos razones: es logica pura, sin
 * React ni Recharts adentro, asi que se testea sin montar nada; y si estuviera
 * en la pagina, importar la funcion arrastraria el arbol entero de componentes
 * y la libreria de graficos al archivo de test.
 *
 * **Devuelve `undefined` cuando no se puede calcular**, y no `0`. Un `0%` en la
 * tarjeta significa "no cambio", que es una afirmacion; cuando hay menos de
 * cuatro dias con ventas, la verdad es que no hay dato, y esa distincion se ve
 * en la tarjeta porque no se muestra la tendencia.
 *
 * Los dias sin ventas se descartan antes de comparar. Si no, una semana en la
 * que estuvo caido el sistema contaria como caida de ventas y la primera mitad
 * pareceria artificialmente chica.
 *
 * @param serie - Los dias, en cualquier orden: se usa solo la magnitud de cada uno
 */
export const tendenciaDe = (serie: readonly DailySale[]): number | undefined => {
  const conDatos = serie.filter((dia) => dia.revenue > 0)
  if (conDatos.length < 4) return undefined

  const mitad = Math.floor(conDatos.length / 2)
  const primera = conDatos.slice(0, mitad).reduce((suma, dia) => suma + dia.revenue, 0)
  const segunda = conDatos.slice(mitad).reduce((suma, dia) => suma + dia.revenue, 0)

  // Sin esta guarda, la division daria Infinity o NaN, y los dos se verian en
  // pantalla como si fueran una variacion real.
  if (primera === 0) return undefined

  return ((segunda - primera) / primera) * 100
}
