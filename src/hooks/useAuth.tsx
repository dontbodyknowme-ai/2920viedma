import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { api } from '../api/client.js'
import type { PublicUser } from '../api/schemas.js'

interface AuthContextValue {
  user: PublicUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
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

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login(email, password)
    api.setAccessToken(data.accessToken)
    setUser(data.user)
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