/**
 * Modo offline del panel: respaldo en `localStorage` de lo ultimo que se
 * recibio del servidor, indexado por URL.
 *
 * ## Que resuelve
 *
 * CE-05: *"Backend falla o no esta disponible → Fallback a localStorage directo,
 * `alert('Modo offline')`*. Sin esto, si el backend no esta activo —un build de
 * produccion sin el servidor, una excepcion en el servidor, estar
 * realmente sin red— todos los `fetch` fallan y el panel queda entero en blanco.
 *
 * ## Por que el respaldo se indexa por URL y no por recurso
 *
 * Las tablas piden URLs distintas segun el filtro y la pagina:
 * `/api/wines?page=1&limit=10&category=Tinto` no es lo mismo que
 * `/api/wines?page=3&limit=10`.
 *
 * **Con una sola clave por recurso, el fallback miente.** Si el admin filtra por
 * "Tinto" y se queda sin red, se le mostra la ultima respuesta guardada, que
 * puede ser la pagina 3 sin filtro, y la tabla ostensibly muestra "Tinto" con
 * datos que no son de Tinto.
 *
 * Indexando por URL, offline sirve **exactamente la misma consulta** que se
 * pidio. Si no hay respaldo para esa URL, se muestra el error.
 *
 * ## La decision que CE-05 no toma
 *
 * CE-05 dice "fallback a localStorage" y nada mas. Un fallback que muestra datos
 * viejos **como si fueran actuales** es peor que un error: el admin puede
 * editar sobre datos que el servidor ya no tiene y no se entera.
 *
 * Por eso hay dos cosas y no una:
 *
 * 1. Los datos se muestran **marcados como desactualizados**: un aviso
 *    permanente en el header del panel. No se puede usar el panel creyendo que
 *    se ve la verdad.
 * 2. El `alert('Modo offline')` de CE-05 se dispara **una vez por paso a
 *    offline**, no en cada `fetch` que falla. Con cinco paginas cargando a la
 *    vez, habria que confirmar cinco veces lo mismo.
 *
 * ## Que no hace
 *
 * **No encola escrituras.** Offline, crear o editar falla con un mensaje
 * explicito y no se guarda en ningun lado. Encolar escrituras para mandarlas
 * cuando vuelva la red es otro problema, con conflictos —el servidor pudo
 * cambiar en el medio— que hay que decidir.
 *
 * **El respaldo vive en `localStorage`, no en `sessionStorage`.** Si no, offline
 * seria indistinguible de "todavia no cargo nada" y el fallback no serviria
 * para nada.
 */

/** Los recursos que tienen respaldo. */
export const RESPALDOS = ['vinos', 'clientes', 'pedidos', 'metricas'] as const

export type NombreRespaldo = (typeof RESPALDOS)[number]

const PREFIJO = 'admin_respaldo_'
const clave = (nombre: NombreRespaldo): string => `${PREFIJO}${nombre}`

/**
 * Cuantos respaldos se guardan por recurso.
 *
 * Sin tope, un admin que recorre filtros y paginas durante dias llenaria el
 * `localStorage`. 40 es de sobra para las combinaciones que se usan a mano y
 * mantiene el storage en decenas de KB.
 */
const MAXIMO_POR_RECURSO = 40

interface Entrada {
  /** Timestamp de cuando se guardo, para descartar las mas viejas. */
  t: number
  /** La respuesta. */
  d: unknown
}

type Mapa = Record<string, Entrada>

const leerMapa = (nombre: NombreRespaldo): Mapa => {
  try {
    const crudo = localStorage.getItem(clave(nombre))
    if (crudo === null) return {}
    const parsed = JSON.parse(crudo) as unknown
    // Un respaldo de otra version, o corrupto, se descarta entero.
    return typeof parsed === 'object' && parsed !== null ? (parsed as Mapa) : {}
  } catch {
    return {}
  }
}

const escribirMapa = (nombre: NombreRespaldo, mapa: Mapa): void => {
  try {
    localStorage.setItem(clave(nombre), JSON.stringify(mapa))
  } catch {
    // Sin espacio, o modo privado que lo bloquea. El panel sigue funcionando:
    // lo unico que se pierde es poder caerse sin red.
  }
}

/**
 * Descarta las entradas mas viejas y guarde la nueva.
 *
 * Se ordena por timestamp y se corta. Hacerlo sobre el mapa entero en cada
 * escritura es O(n) con n chico; no amerita indice.
 */
export const guardarRespaldo = (nombre: NombreRespaldo, url: string, datos: unknown): void => {
  const mapa = leerMapa(nombre)

  mapa[url] = { t: Date.now(), d: datos }

  const entradas = Object.entries(mapa)
  if (entradas.length > MAXIMO_POR_RECURSO) {
    entradas
      .sort(([, a], [, b]) => a.t - b.t)
      .slice(0, entradas.length - MAXIMO_POR_RECURSO)
      .forEach(([urlVieja]) => {
        delete mapa[urlVieja]
      })
  }

  escribirMapa(nombre, mapa)
}

/** Lee el respaldo de una URL exacta. */
export const leerRespaldo = <T,>(nombre: NombreRespaldo, url: string): T | undefined => {
  const entrada = leerMapa(nombre)[url]
  return entrada === undefined ? undefined : (entrada.d as T)
}

/** Borra todos los respaldos. Lo usa el boton "Reintentar". */
export const limpiarRespaldos = (): void => {
  RESPALDOS.forEach((nombre) => {
    try {
      localStorage.removeItem(clave(nombre))
    } catch {
      // ignore
    }
  })
}

// ---------------------------------------------------------------------------
// Estado offline y sus suscriptores.
// ---------------------------------------------------------------------------

type Oyente = (offline: boolean) => void

const oyentes = new Set<Oyente>()

/**
 * Si se esta offline ahora.
 *
 * Vive en una variable y no se lee de `localStorage` en cada llamada: lo
 * consultan todos los `fetch` y cambia pocas veces.
 */
let offline = false

export const estaOffline = (): boolean => offline

export const suscribirOffline = (oyente: Oyente): (() => void) => {
  oyentes.add(oyente)
  oyente(offline)

  return () => {
    oyentes.delete(oyente)
  }
}

const avisar = (valor: boolean): void => {
  if (offline === valor) return
  offline = valor
  oyentes.forEach((oyente) => oyente(valor))
}

// ---------------------------------------------------------------------------
// Transiciones.
// ---------------------------------------------------------------------------

let avisoDado = false

/** El panel volvio a tener servidor. */
export const marcarOnline = (): void => {
  avisoDado = false
  avisar(false)
}

/**
 * El panel se quedo sin servidor.
 *
 * El `alert` de CE-05 va aca y no en `useApi`: es el unico lugar que sabe si es
 * la primera vez, asi que un modulo por pagina no lo dispara cinco veces.
 *
 * Va en `setTimeout` porque `alert` es bloqueante: disparado en pleno render de
 * React deja el commit a medias y en desarrollo tira un error de actualizacion
 * de estado sobre un componente desmontado.
 */
export const marcarOffline = (): void => {
  if (!avisoDado) {
    avisoDado = true
    setTimeout(() => {
      window.alert(
        'Modo offline: se muestran los ultimos datos guardados en este navegador. Los cambios no se guardan hasta que vuelva la conexion.'
      )
    }, 0)
  }

  avisar(true)
}

/** Expuesto para los tests: olvida el "ya avisé". */
export const reiniciarAviso = (): void => {
  avisoDado = false
}

/**
 * Falla una escritura si el panel esta sin servidor.
 *
 * **Por que no se encolan las escrituras.** Offline, un `POST` de crear vino no
 * llega a ningun lado. Guardarlo "para mandarlo despues" parece gratis, pero
 * entre que se guarda y que se manda el servidor pudo cambiar: el vino que
 *CREATE se creo, otro lo elimino, y el `PATCH` lo pisa. Resolver eso es un
 * problema de conflictos que no esta decidido en ninguna spec.
 *
 * Fallar con un mensaje claro es preferible: el admin sabe que no se guardo y
 * lo reintenta cuando vuelva la red, en vez de creer que quedo aplicado.
 *
 * Se llama al **inicio** de cada mutacion, no despues del fetch: si se
 * verificara despues, el fetch ya habria tardado 30 s en fallar.
 */
export const exigirConexion = (): void => {
  if (offline) {
    throw new Error(
      'Sin conexion con el servidor: los cambios no se pueden guardar. Vuelve a estar en linea para aplicarlos.'
    )
  }
}
