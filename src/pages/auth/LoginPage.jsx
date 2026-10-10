import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import PasswordInput from '../../components/PasswordInput.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import { useAuth } from '../../context/useAuth.js'

export default function LoginPage() {
  const { user, login, verifyOtp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberOtp, setRememberOtp] = useState(false)
  const [challenge, setChallenge] = useState(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={`/${user.role}`} replace />

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (challenge) {
        const signedIn = await verifyOtp(challenge.token, code, rememberOtp)
        navigate(`/${signedIn.role}`, { replace: true })
      } else {
        const result = await login(email, password)
        if (result.user) {
          navigate(`/${result.user.role}`, { replace: true })
        } else {
          setChallenge({ token: result.challengeToken, email: result.email })
          setPassword('')
        }
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center bg-slate-50 px-5 py-10">
      <div className="absolute right-5 top-5"><ThemeToggle /></div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-blue-700 font-bold text-white">S</span><div><h1 className="font-bold text-slate-900">Student Information System</h1><p className="text-sm text-slate-500">{challenge ? 'Verify your email' : 'Sign in to your account'}</p></div></div>
        <form onSubmit={submit} className="space-y-5">
          {challenge ? <>
            <p className="text-sm text-slate-600">Enter the six-digit code sent to {challenge.email}. It expires in 10 minutes. Check your spam folder if needed.</p>
            <div><label htmlFor="login-code" className="mb-1 block text-sm font-medium">Verification code</label><input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 tracking-widest outline-blue-600" /></div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={rememberOtp} onChange={(event) => setRememberOtp(event.target.checked)} className="size-4 accent-blue-700" />Skip email codes on this browser for 1 hour</label>
          </> : <>
            <div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label><input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-blue-600" /></div>
            <div><label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label><PasswordInput id="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          </>}
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{busy ? 'Please wait…' : challenge ? 'Verify code' : 'Sign in'}</button>
          {challenge && <button type="button" onClick={() => { setChallenge(null); setCode(''); setError('') }} className="w-full text-sm font-medium text-blue-700 hover:underline">Back to sign in</button>}
        </form>
      </div>
    </main>
  )
}
