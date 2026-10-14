import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api } from '../api/client.js'
import type { PublicUser } from '../api/schemas.js'

interface AuthContextValue {
  user: PublicUser | null
  isLoading: boolean
  isAuthenticated: boolean
  /**
   * Devuelve **el usuario que entro**.
   *
   * No es un detalle: el gate necesita el rol recien autenticado para saber a
   * que seccion mandarlo, y leerlo del contexto no serviria —dentro del mismo
   * `await`, el `user` del closure es el de antes del login, o sea `null`. Es
   * el mismo motivo por el que el login entra por aca y no por `api.auth.login()`
   * directo (ver gotcha 13 de `AGENTS.md`): el token y el estado los setea este
   * hook, y el que necesita saber **quien** entro tambien.
   */
  login: (email: string, password: string) => Promise<PublicUser>
  logout: () => Promise<void>
  hasRole: (role: 'admin' | 'gestor' | 'vendedor') => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const hasRole = useCallback((role: 'admin' | 'gestor' | 'vendedor') => {
    return user?.role === role
  }, [user])

  const login = useCallback(async (email: string, password: string): Promise<PublicUser> => {
    const data = await api.auth.login(email, password)
    api.setAccessToken(data.accessToken)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout()
    api.setAccessToken(null)
    setUser(null)
  }, [])

  const me = useCallback(async () => {
    try {
      const userData = await api.auth.me()
      if (userData) {
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    me()
  }, [me])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}