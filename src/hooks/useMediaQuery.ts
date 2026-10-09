import { useEffect, useState } from 'react'

/**
 * Suscribe un componente a una media query de CSS y devuelve si coincide.
 *
 * Existe porque el layout de admin necesita saber si esta en movil o en
 * escritorio para decidir entre sidebar fija y drawer, y `window.matchMedia` a
 * pelo no re-renderiza cuando el usuario cambia el ancho de la ventana: hay que
 * suscribirse al evento `change`.
 *
 * No se usa `matchMedia` para decidir el umbral del canvas 3D. `hero.tsx` usa
 * `window.innerWidth` porque RNF-09 de la spec 002 acota "movil" a un numero, y
 * `CA-26` mide `innerWidth`. Aca el caso es distinto: no hay criterio numerico
 * que verificar, solo hace falta reaccionar al resize.
 *
 * @param consulta - Media query de CSS, por ejemplo `'(max-width: 767px)'`
 */
export const useMediaQuery = (consulta: string): boolean => {
  const [coincide, setCoincide] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : window.matchMedia(consulta).matches
  )

  useEffect(() => {
    const mediaQueryList = window.matchMedia(consulta)
    const alCambiar = (evento: MediaQueryListEvent) => setCoincide(evento.matches)

    // El valor inicial se relee al montar: entre el render y el efecto, el
    // usuario pudo haber redimensionado la ventana.
    setCoincide(mediaQueryList.matches)
    mediaQueryList.addEventListener('change', alCambiar)

    // El cleanup es obligatorio. Sin el, cada resize acumularia un listener y la
    // app se pondria mas lenta con el uso (constitucion 2.3).
    return () => mediaQueryList.removeEventListener('change', alCambiar)
  }, [consulta])

  return coincide
}

/** Breakpoint del layout admin. Alineado con el `md` de Tailwind, que es 768 px. */
export const CONSULTA_MOVIL = '(max-width: 767px)'

/** Atajo para no repetir la cadena en los tres componentes que la necesitan. */
export const useEsMovil = (): boolean => useMediaQuery(CONSULTA_MOVIL)
