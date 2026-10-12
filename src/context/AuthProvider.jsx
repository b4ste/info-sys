import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 3500)

    api('/auth/me', { signal: controller.signal })
      .then(({ user: currentUser }) => { if (!controller.signal.aborted) setUser(currentUser) })
      .catch(() => { if (!controller.signal.aborted) setUser(null) })
      .finally(() => {
        clearTimeout(timeoutId)
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  async function login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (data.user) setUser(data.user)
    return data
  }

  async function verifyOtp(challengeToken, code, rememberOtp = false) {
    const data = await api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ challengeToken, code, rememberOtp }) })
    setUser(data.user)
    return data.user
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, setUser, loading, login, verifyOtp, logout }}>
    {loading ? <div role="status" className="grid min-h-screen place-items-center text-slate-600">Checking your session…</div> : children}
  </AuthContext.Provider>
}
