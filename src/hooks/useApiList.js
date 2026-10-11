import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api.js'

export function useApiList(path, { initialPage = 1, limit = 20, enabled = true } = {}) {
  const [page, setPage] = useState(initialPage)
  const [loadedPage, setLoadedPage] = useState(initialPage)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const requestSequence = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++requestSequence.current
    setLoading(true)
    setError('')
    try {
      const separator = path.includes('?') ? '&' : '?'
      const data = await api(`${path}${separator}page=${page}&limit=${limit}`)
      if (requestId !== requestSequence.current) return
      setItems(data.items)
      setTotal(data.total)
      setLoadedPage(page)
    } catch (requestError) {
      if (requestId === requestSequence.current) setError(requestError.message)
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [path, page, limit])

  useEffect(() => { if (enabled) Promise.resolve().then(refresh) }, [enabled, refresh])
  return { items, total, loading, error, page, loadedPage, setPage, refresh, limit }
}
