import { useEffect, useState } from 'react'
import { api } from '../services/api.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    api('/auth/me', { signal: controller.signal })
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
    return () => controller.abort()
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

  return <AuthContext.Provider value={{ user, setUser, loading, login, verifyOtp, logout }}>{children}</AuthContext.Provider>
}
