import { useState } from 'react'
import PasswordInput from '../components/PasswordInput.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const data = await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
      setUser(data.user)
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Password updated.')
    } catch (requestError) { setError(requestError.message) }
  }

  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-bold text-slate-900">Account settings</h1>
      <p className="mt-2 text-slate-600">Signed in as {user.email}</p>
      {user.mustChangePassword && <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Change your temporary password to continue.</p>}
      <form onSubmit={submit} className="mt-8 space-y-5 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Change password</h2>
        <div><label htmlFor="current-password" className="mb-1 block text-sm font-medium">Current password</label><PasswordInput id="current-password" label="current password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div>
        <div><label htmlFor="new-password" className="mb-1 block text-sm font-medium">New password</label><PasswordInput id="new-password" label="new password" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><p className="mt-1 text-xs text-slate-500">Use an uppercase letter, a lowercase letter, and a special character.</p></div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
        <button type="submit" className="rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800">Save password</button>
      </form>
    </section>
  )
}
