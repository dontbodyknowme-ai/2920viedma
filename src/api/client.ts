import type {
  Wine,
  PublicWine,
  AuthTokens,
  PublicUser,
  ImportResult,
  Order,
  Customer,
  Metrics,
  HealthResponse,
  WineCreateInput,
  WineUpdateInput,
  OrderUpdateInput,
  CustomerUpdateInput
} from './schemas.js'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }

  // El `Content-Type` va **solo si hay cuerpo**. Declararlo en un POST sin
  // body hace que Fastify responda `FST_ERR_CTP_EMPTY_JSON_BODY` ("Body cannot
  // be empty when content-type is set to application/json"), que es como
  // rompieron `POST /api/auth/logout` y `POST /api/auth/refresh`: el panel
  // necesito los dos para renovar y cerrar sesion.
  if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] = 'application/json'
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })

  if (response.status === 401 && retry) {
    const refreshed = await refreshToken()
    if (refreshed) {
      return request(path, options, false)
    }
    clearAuth()
    throw new Error('Sesión expirada. Inicie sesión nuevamente.')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    })
    if (response.ok) {
      const data = await response.json()
      accessToken = data.accessToken
      return true
    }
  } catch {
    // ignore
  }
  return false
}

function clearAuth(): void {
  accessToken = null
}

function buildQueryString(query?: Record<string, string>): string {
  if (!query) return ''
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value)
    }
  })
  const qs = params.toString()
  return qs ? '?' + qs : ''
}

const apiObj = {
  get<T>(path: string, query?: Record<string, string>): Promise<T> {
    return request(`${path}${buildQueryString(query)}`, { method: 'GET' })
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request(path, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request(path, {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
  },

  delete<T>(path: string): Promise<T> {
    return request(path, { method: 'DELETE' })
  },

  uploadFile<T>(path: string, formData: FormData): Promise<T> {
    const headers: HeadersInit = {}
    if (accessToken) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`
    }
    return request(path, {
      method: 'POST',
      headers,
      body: formData
    })
  },
  wines: {
    list: (query?: Record<string, string>): Promise<{ data: Wine[]; total: number; page: number; limit: number; totalPages: number }> =>
      request(`/api/wines${buildQueryString(query)}`, { method: 'GET' }),

    public: (): Promise<PublicWine[]> =>
      request<PublicWine[]>('/api/wines/public', { method: 'GET' }),

    create: (data: WineCreateInput): Promise<Wine> =>
      request<Wine>('/api/wines', {
        method: 'POST',
        body: JSON.stringify(data)
      }),

    update: (id: string, data: WineUpdateInput): Promise<Wine> =>
      request<Wine>(`/api/wines/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      }),

    delete: (id: string): Promise<void> =>
      request<void>(`/api/wines/${id}`, { method: 'DELETE' }),

    import: (formData: FormData): Promise<ImportResult> =>
      request<ImportResult>('/api/wines/import', {
        method: 'POST',
        body: formData,
        headers: {}
      })
  },

  orders: {
    list: (query?: Record<string, string>): Promise<{ data: Order[]; total: number; page: number; limit: number; totalPages: number }> =>
      request(`/api/orders${buildQueryString(query)}`, { method: 'GET' }),

    get: (id: string): Promise<Order> =>
      request<Order>(`/api/orders/${id}`),

    update: (id: string, data: OrderUpdateInput): Promise<Order> =>
      request<Order>(`/api/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
  },

  customers: {
    list: (query?: Record<string, string>): Promise<{ data: Customer[]; total: number; page: number; limit: number; totalPages: number }> =>
      request(`/api/customers${buildQueryString(query)}`, { method: 'GET' }),

    get: (id: string): Promise<Customer> =>
      request<Customer>(`/api/customers/${id}`),

    update: (id: string, data: CustomerUpdateInput): Promise<Customer> =>
      request<Customer>(`/api/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      })
  },

  metrics: {
    get: (): Promise<Metrics> =>
      request<Metrics>('/api/metrics')
  },

  upload: {
    uploadFile: (formData: FormData): Promise<{ id: string; url: string }> =>
      request<{ id: string; url: string }>('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {}
      }),

    delete: (id: string): Promise<void> =>
      request<void>(`/api/upload/${id}`, { method: 'DELETE' })
  },

  health: {
    get: (): Promise<HealthResponse> =>
      request<HealthResponse>('/health')
  },

  auth: {
    login: (email: string, password: string): Promise<AuthTokens> =>
      request<AuthTokens>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),

    refresh: (): Promise<AuthTokens> =>
      request<AuthTokens>('/api/auth/refresh', {
        method: 'POST'
      }),

    logout: (): Promise<void> =>
      request<void>('/api/auth/logout', {
        method: 'POST'
      }),

    me: (): Promise<PublicUser> =>
      request<PublicUser>('/api/auth/me')
  },

  setAccessToken: (token: string | null) => { accessToken = token },
  getAccessToken: () => accessToken,
  clearAuth: () => { accessToken = null }
}

export const api = apiObj