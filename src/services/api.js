const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function api(path, { signal, ...options } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal,
      ...options,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Cannot reach the API. Check that the backend is running.', { cause: error })
  }
  let result
  try {
    result = await response.json()
  } catch {
    throw new Error(response.status >= 500
      ? 'The API is unavailable. Check that the backend is running and connected to MongoDB.'
      : 'The API returned an invalid response.')
  }
  if (!response.ok || !result.success) {
    const error = new Error(result.error?.message ?? 'Request failed.')
    error.status = response.status
    error.details = result.error?.details
    throw error
  }
  return result.data
}

export const getHealth = (options) => api('/health', options)

export async function apiAll(path) {
  const items = []
  let page = 1
  for (;;) {
    const separator = path.includes('?') ? '&' : '?'
    const data = await api(`${path}${separator}page=${page}&limit=100`)
    items.push(...data.items)
    if (items.length >= data.total || data.items.length === 0) return items
    page += 1
  }
}
