import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import {
  guardarRespaldo,
  leerRespaldo,
  marcarOffline,
  marcarOnline,
  type NombreRespaldo
} from '../utils/offline'

/**
 * Hook generico de GET contra la API.
 *
 * **No se usa React Query** ni ninguna otra libreria de fetching: no esta
 * instalada y RNF-04 no aprueba agregar otra. Este hook cubre lo que necesitan
 * las cuatro paginas del panel: leer, saber si esta cargando, saber si fallo y
 * volver a pedir.
 *
 * La peticion se dispara cuando cambia la `url`, no cuando cambia cualquier
 * otra cosa. El `useEffect` depende solo de la url y de un contador de
 * recarga, para que un render que cambie otra cosa no vuelva a pegarle al
 * endpoint.
 *
 * ## Respaldo offline (CE-05)
 *
 * Si se pasa `respaldo`, cada respuesta exitosa se guarda en `localStorage`, y
 * si el fetch falla se muestra lo guardado en vez de un error. El panel queda
 * navegable sin servidor, y `estaOffline` queda en `true` para que el aviso
 * permanente marque que esos datos son viejos.
 *
 * **Un respaldo corrupto se descarta y se muestra el error**, no al reves: es
 * preferible un error visible a un `JSON.parse` que rompe el render.
 */

export interface EstadoApi<T> {
  data: T | undefined
  isLoading: boolean
  error: string | undefined
  /** Vuelve a pedir los datos. */
  refetch: () => void
}

export interface OpcionesApi {
  /**
   * Nombre del respaldo en `localStorage`.
   *
   * Se pasa **sin** este parametro en los endpoints que no tienen equivalente
   * guardable: un producto en detalle, o los pedidos de un cliente. Si se pasa, y
   * falla el fetch, se muestra lo guardado la ultima vez que se entro a ese
   * endpoint.
   */
  respaldo?: NombreRespaldo
}

export const useApi = <T,>(url: string, opciones: OpcionesApi = {}): EstadoApi<T> => {
  const { respaldo } = opciones
  const [data, setData] = useState<T | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  // Contador y no un booleano: pedir dos veces seguidas tiene que relanzar las
  // dos, y un booleano que se pone en `true` y se deja asi no distingue.
  const [recarga, setRecarga] = useState(0)

  const refetch = useCallback(() => {
    setRecarga((previo) => previo + 1)
  }, [])

  useEffect(() => {
    // `vigente` evita el estado obsoleto tipico: si la url cambia mientras la
    // peticion anterior sigue en vuelo, la respuesta vieja llega despues y
    // pisa la nueva.
    let vigente = true
    setIsLoading(true)
    setError(undefined)

    // Por `api.get` y no por `fetch(url)`: un fetch con path relativo pegaba
    // al frontend (que responde `index.html`) en vez de al backend, y sin
    // header `Authorization` toda peticionprotected daba 401. `api.get` pone
    // la URL base, manda el token y refresca solo si el token expiro.
    api
      .get<T>(url)
      .then((json: T) => {
        if (!vigente) return
        setData(json)
        setError(undefined)
        if (respaldo !== undefined) guardarRespaldo(respaldo, url, json)
        marcarOnline()
      })
      .catch((fallo: Error) => {
        if (!vigente) return

        // Se intenta el respaldo **de la misma URL** antes de rendirse: sin el,
        // un panel sin servidor queda entero en blanco. Servir otra URL seria
        // mentir: la tabla "Tinto" mostrando la pagina 3 sin filtro.
        const guardado = respaldo === undefined ? undefined : leerRespaldo<T>(respaldo, url)

        if (guardado !== undefined) {
          setData(guardado)
          setError(undefined)
          marcarOffline()
          return
        }

        // Se limpian los datos. Dejarlos seria peor que el error: si cambia el
        // filtro y el fetch falla, la tabla quedaria mostrando las filas del
        // filtro anterior **debajo** del mensaje de error, como si fueran el
        // resultado de la busqueda nueva. Una tabla vacia con un error al lado
        // se lee bien; filas viejas con un error encima, no.
        setData(undefined)
        setError(fallo.message)
      })
      .finally(() => {
        if (vigente) setIsLoading(false)
      })

    return () => {
      vigente = false
    }
  }, [url, recarga, respaldo])

  return { data, isLoading, error, refetch }
}