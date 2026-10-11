import { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api.js'

export function useApiList(path, { initialPage = 1, limit = 20, enabled = true } = {}) {
  const [page, setPage] = useState(initialPage)
  const [loadedPage, setLoadedPage] = useState(initialPage)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const separator = path.includes('?') ? '&' : '?'
      const data = await api(`${path}${separator}page=${page}&limit=${limit}`)
      setItems(data.items)
      setTotal(data.total)
      setLoadedPage(page)
    } catch (requestError) { setError(requestError.message) }
    finally { setLoading(false) }
  }, [path, page, limit])

  useEffect(() => { if (enabled) Promise.resolve().then(refresh) }, [enabled, refresh])
  return { items, total, loading, error, page, loadedPage, setPage, refresh, limit }
}
