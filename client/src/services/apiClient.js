const configuredApiUrl = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')

export const API_BASE_URL = configuredApiUrl.replace(/\/+$/, '')
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')
export const getAssetUrl = path => `${API_ORIGIN}/${String(path).replace(/^\/+/, '')}`

export const getAuthHeaders = (token = localStorage.getItem('token')) => (
  token ? { Authorization: `Bearer ${token}` } : {}
)

export async function apiRequest(path, options = {}, token) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...getAuthHeaders(token),
      ...(options.headers || {}),
    },
  })
  const data = await response.json()
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}
