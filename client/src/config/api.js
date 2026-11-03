const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export const API_BASE = `${serverUrl.replace(/\/$/, '')}/api`
export const SERVER_BASE = serverUrl.replace(/\/$/, '')
