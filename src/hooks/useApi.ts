import { useCallback, useEffect, useState } from 'react'

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
 */

export interface EstadoApi<T> {
  data: T | undefined
  isLoading: boolean
  error: string | undefined
  /** Vuelve a pedir los datos. */
  refetch: () => void
}

export const useApi = <T,>(url: string): EstadoApi<T> => {
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

    fetch(url)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
        return respuesta.json() as Promise<T>
      })
      .then((json: T) => {
        if (!vigente) return
        setData(json)
      })
      .catch((fallo: Error) => {
        if (!vigente) return
        setError(fallo.message)
      })
      .finally(() => {
        if (vigente) setIsLoading(false)
      })

    return () => {
      vigente = false
    }
  }, [url, recarga])

  return { data, isLoading, error, refetch }
}
