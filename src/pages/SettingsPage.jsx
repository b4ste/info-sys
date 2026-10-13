import { useState } from 'react'
import Icon from '../components/Icon.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { Notice, PageHeader } from '../components/Page.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const data = await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setUser(data.user)
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Account password updated successfully.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="max-w-xl space-y-6">
      <PageHeader
        eyebrow="Account Security"
        title="Security Settings"
        description={`Manage credentials for ${user.email} · National University Information System.`}
      />

      <Notice error={error} message={message} />

      {user.mustChangePassword && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs font-semibold text-amber-900 dark:text-amber-200">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          <span>Action required: You are currently using a temporary password. Please set a new permanent password to secure your account.</span>
        </div>
      )}

      <form
        onSubmit={submit}
        className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-6 shadow-xs space-y-5"
      >
        <div className="border-b border-slate-100 dark:border-white/5 pb-3">
          <h2 className="text-base font-bold text-[#273a72] dark:text-white">
            Change Account Password
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-blue-200">
            Ensure your password is at least 8 characters with upper, lower, and special symbols.
          </p>
        </div>

        <div>
          <label htmlFor="current-password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
            Current Password
          </label>
          <PasswordInput
            id="current-password"
            label="current password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="new-password" className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
            New Password
          </label>
          <PasswordInput
            id="new-password"
            label="new password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-blue-300">
            Must contain an uppercase letter, a lowercase letter, and a special character.
          </p>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#273a72] dark:bg-[#ebb12a] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white dark:text-[#111e3e] hover:bg-[#1c2e5b] dark:hover:bg-[#f5b731] transition-colors disabled:opacity-50"
        >
          {busy ? 'Updating…' : 'Save New Password'}
        </button>
      </form>
    </section>
  )
}
