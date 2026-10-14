import { useState, useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import PasswordInput from '../../components/PasswordInput.jsx'
import ThemeToggle from '../../components/ThemeToggle.jsx'
import { useAuth } from '../../context/useAuth.js'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Header Dropdown States
  const [appsOpen, setAppsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const appsRef = useRef(null)
  const helpRef = useRef(null)

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (appsRef.current && !appsRef.current.contains(e.target)) {
        setAppsOpen(false)
      }
      if (helpRef.current && !helpRef.current.contains(e.target)) {
        setHelpOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  if (user) return <Navigate to={`/${user.role}`} replace />

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await login(email, password)
      if (result.user) {
        navigate(`/${result.user.role}`, { replace: true })
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#edf0f5] dark:bg-[#111e3e] text-slate-800 dark:text-[#ffffff] font-sans antialiased transition-colors">
      {/* Top NUIS MOA Header Bar spanning edge-to-edge */}
      <header className="sticky top-0 z-50 bg-[#273a72] border-b-4 border-[#ebb12a] px-4 sm:px-6 md:px-8 py-2.5 shadow-md w-full">
        <div className="w-full flex items-center justify-between">
          {/* Far Left: Bento launcher icon + nulogo.png + NUIS MOA */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={appsRef}>
              <button
                type="button"
                onClick={() => {
                  setAppsOpen((prev) => !prev)
                  setHelpOpen(false)
                }}
                className={`p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-all focus:outline-none cursor-pointer ${
                  appsOpen ? 'bg-white/20 text-white' : ''
                }`}
                title="NU Central Apps & Services"
                aria-label="NU Central Apps & Services"
              >
                <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="3" width="4" height="4" rx="0.75" />
                  <rect x="10" y="3" width="4" height="4" rx="0.75" />
                  <rect x="17" y="3" width="4" height="4" rx="0.75" />
                  <rect x="3" y="10" width="4" height="4" rx="0.75" />
                  <rect x="10" y="10" width="4" height="4" rx="0.75" />
                  <rect x="17" y="10" width="4" height="4" rx="0.75" />
                  <rect x="3" y="17" width="4" height="4" rx="0.75" />
                  <rect x="10" y="17" width="4" height="4" rx="0.75" />
                  <rect x="17" y="17" width="4" height="4" rx="0.75" />
                </svg>
              </button>

              {appsOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-2xl z-50 overflow-hidden text-slate-800 dark:text-white animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="bg-[#273a72] px-4 py-3 text-white flex items-center justify-between border-b-2 border-[#ebb12a]">
                    <div className="flex items-center gap-2">
                      <svg className="size-4 text-[#ebb12a]" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="3" y="3" width="4" height="4" rx="0.75" />
                        <rect x="10" y="3" width="4" height="4" rx="0.75" />
                        <rect x="17" y="3" width="4" height="4" rx="0.75" />
                        <rect x="3" y="10" width="4" height="4" rx="0.75" />
                        <rect x="10" y="10" width="4" height="4" rx="0.75" />
                        <rect x="17" y="10" width="4" height="4" rx="0.75" />
                        <rect x="3" y="17" width="4" height="4" rx="0.75" />
                        <rect x="10" y="17" width="4" height="4" rx="0.75" />
                        <rect x="17" y="17" width="4" height="4" rx="0.75" />
                      </svg>
                      <span className="font-bold text-xs uppercase tracking-wider">NU Central Apps</span>
                    </div>
                    <span className="text-[10px] text-blue-200 uppercase font-semibold">MOA Campus</span>
                  </div>

                  <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAppsOpen(false)}
                      className="flex flex-col items-center text-center p-2.5 rounded-lg bg-blue-50/80 dark:bg-white/10 border border-blue-200/60 dark:border-white/10 hover:border-[#ebb12a] transition-colors cursor-pointer group"
                    >
                      <img src="/nulogoreal.png" alt="NUIS" className="size-7 object-contain mb-1.5" />
                      <span className="font-bold text-[#273a72] dark:text-[#ebb12a] leading-tight">NUIS MOA</span>
                      <span className="text-[10px] text-slate-500 dark:text-blue-200 mt-0.5">Active Portal</span>
                    </button>

                    <a
                      href="https://onlineapp.nu-moa.edu.ph/bills/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center text-center p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-slate-300 transition-colors group"
                    >
                      <div className="size-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-1.5">
                        <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-white leading-tight">NU Bills</span>
                      <span className="text-[10px] text-slate-500 dark:text-blue-200 mt-0.5">Payment Gateway</span>
                    </a>

                    <a
                      href="https://national-u.edu.ph/nu-moa/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center text-center p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-slate-300 transition-colors group"
                    >
                      <div className="size-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center mb-1.5">
                        <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-white leading-tight">NU MOA Web</span>
                      <span className="text-[10px] text-slate-500 dark:text-blue-200 mt-0.5">Official Campus</span>
                    </a>

                    <a
                      href="https://outlook.office.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center text-center p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-slate-300 transition-colors group"
                    >
                      <div className="size-7 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 grid place-items-center mb-1.5">
                        <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-white leading-tight">NU Webmail</span>
                      <span className="text-[10px] text-slate-500 dark:text-blue-200 mt-0.5">MS Outlook</span>
                    </a>

                    <a
                      href="https://teams.microsoft.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center text-center p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-white/5 hover:border-slate-300 transition-colors group"
                    >
                      <div className="size-7 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 grid place-items-center mb-1.5">
                        <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-white leading-tight">MS Teams</span>
                      <span className="text-[10px] text-slate-500 dark:text-blue-200 mt-0.5">Virtual Classes</span>
                    </a>

                    <div className="flex flex-col items-center text-center p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="size-7 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 grid place-items-center mb-1.5">
                        <svg className="size-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <span className="font-semibold text-amber-900 dark:text-amber-200 leading-tight">ITSO Help</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">Room 204</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#132247] p-2.5 text-center border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500 dark:text-blue-200">
                    National University MOA Campus
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <img
                src="/nulogoreal.png"
                alt="National University Shield"
                className="h-8 w-auto object-contain drop-shadow-xs"
              />
              <span className="font-bold text-white text-base sm:text-lg tracking-wide uppercase select-none">
                NUIS MOA
              </span>
            </div>
          </div>

          {/* Far Right: Portal User Badge + Dark/Light Theme Switch Button */}
          <div className="flex items-center gap-2 sm:gap-4 text-white">
            {/* Functional Portal Sign In / Account Help Dropdown */}
            <div className="relative" ref={helpRef}>
              <button
                type="button"
                onClick={() => {
                  setHelpOpen((prev) => !prev)
                  setAppsOpen(false)
                }}
                className={`flex items-center gap-2 text-xs font-semibold text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer select-none focus:outline-none ${
                  helpOpen ? 'bg-white/20' : ''
                }`}
                title="Portal Sign-In Assistance"
                aria-label="Portal Sign-In Assistance"
              >
                <span className="hidden sm:inline text-white/95">Portal Sign In</span>
                <div className="size-7.5 rounded-full bg-white/20 border border-white/40 grid place-items-center text-white shadow-xs">
                  <svg className="size-4.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              </button>

              {helpOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-2xl z-50 overflow-hidden text-slate-800 dark:text-white animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="bg-[#273a72] p-4 text-white border-b-2 border-[#ebb12a]">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-full bg-white/20 border border-white/40 grid place-items-center text-white">
                        <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider">NUIS MOA Access</h2>
                        <p className="text-[11px] text-blue-200">Student & Faculty Portal</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 text-xs">
                    <div className="rounded-lg bg-blue-50/80 dark:bg-white/5 p-3 border border-blue-100 dark:border-white/10">
                      <p className="font-bold text-[#273a72] dark:text-[#ebb12a]">Account Instructions</p>
                      <p className="text-[11px] text-slate-600 dark:text-blue-100 mt-1 leading-relaxed">
                        Use your official NU email (<span className="font-semibold text-[#273a72] dark:text-[#ebb12a]">@students.nu-moa.edu.ph</span> for students or <span className="font-semibold text-[#273a72] dark:text-[#ebb12a]">@nu-moa.edu.ph</span> for faculty).
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 border border-slate-100 dark:border-white/10">
                      <p className="font-bold text-slate-800 dark:text-white">Need Login Assistance?</p>
                      <p className="text-[11px] text-slate-600 dark:text-blue-100 mt-1">
                        For locked accounts or password resets, contact:
                      </p>
                      <div className="mt-2 space-y-1 text-[11px] font-semibold text-[#273a72] dark:text-[#ebb12a]">
                        <p>ITSO MOA: <a href="mailto:itso@nu-moa.edu.ph" className="underline hover:opacity-80">itso@nu-moa.edu.ph</a></p>
                        <p>Registrar: <a href="mailto:registrar@nu-moa.edu.ph" className="underline hover:opacity-80">registrar@nu-moa.edu.ph</a></p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-[#132247] border-t border-slate-100 dark:border-white/5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setHelpOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-[#273a72] hover:bg-[#1d2d5a] text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-md px-3 py-1.5 transition-colors cursor-pointer" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Breadcrumb Bar */}
        <div className="w-full max-w-md mb-3 flex items-center gap-2 text-xs font-medium px-1">
          <span className="flex items-center gap-1.5 text-[#273a72] dark:text-[#8eb5f5] font-semibold">
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
            </svg>
            Home
          </span>
          <span className="text-slate-400 dark:text-[#8eb5f5]/70 font-bold">&gt;</span>
          <span className="text-slate-600 dark:text-[#dbeafe] font-medium">Authentication</span>
          <span className="text-slate-400 dark:text-[#8eb5f5]/70 font-bold">&gt;</span>
          <span className="text-slate-800 dark:text-[#ffffff] font-bold">Student Information System</span>
        </div>

        {/* Login Modal Card in authentic NU MOA Blue styling */}
        <div className="w-full max-w-md rounded-xl border border-slate-200/90 dark:border-[#385196] bg-white dark:bg-[#1e2f65] shadow-xl shadow-slate-300/40 dark:shadow-2xl dark:shadow-[#0a142c]/90 overflow-hidden transition-all">
          {/* Card Header with transparent National University logo */}
          <div className="px-6 pt-7 pb-4 text-center border-b border-slate-100 dark:border-[#314a8f] bg-gradient-to-b from-white to-slate-50/50 dark:from-[#21346f] dark:to-[#1e2f65]">
            <div className="flex justify-center items-center">
              {/* Light mode: blue text logo */}
              <img
                src="/nulogo1.png"
                alt="National University"
                className="h-12 sm:h-14 w-auto max-w-[280px] object-contain dark:hidden"
              />
              {/* Dark mode: pure white text logo on transparent background */}
              <img
                src="/nulogo1_dark.png"
                alt="National University"
                className="h-12 sm:h-14 w-auto max-w-[280px] object-contain hidden dark:block"
              />
            </div>

            <div className="mt-3.5">
              <h1 className="text-[15px] sm:text-base font-semibold text-[#273a72] dark:text-[#ffffff] tracking-wider uppercase font-['Inter',sans-serif]">
                Student Information System
              </h1>
            </div>

            <p className="mt-1.5 text-xs text-slate-600 dark:text-[#dbeafe] font-medium">
              Sign in to access your student portal and records
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="p-6 sm:p-7 space-y-4">
            <>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#e0edff]">
                    Email / Student Account
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#9ab4e8]">
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="username"
                      required
                      placeholder="student@national-u.edu.ph"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-[#3a569b] bg-white dark:bg-[#14234b] pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-[#ffffff] placeholder-slate-400 dark:placeholder-[#8da4d8] outline-none focus:border-[#273a72] dark:focus:border-[#ebb12a] focus:ring-2 focus:ring-[#273a72]/20 dark:focus:ring-[#ebb12a]/30 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#e0edff]">
                      Password
                    </label>
                  </div>
                  <PasswordInput
                    id="password"
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="focus:border-[#273a72] dark:focus:border-[#ebb12a] focus:ring-2 focus:ring-[#273a72]/20 dark:focus:ring-[#ebb12a]/30 dark:bg-[#14234b] dark:border-[#3a569b] dark:text-[#ffffff] placeholder-slate-400 dark:placeholder-[#8da4d8] font-medium"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex cursor-pointer items-center gap-2 text-slate-700 dark:text-[#e0edff] font-medium select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="size-4 rounded accent-[#273a72] dark:accent-[#ebb12a] border-slate-300 text-[#273a72]"
                    />
                    <span>Remember account</span>
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault()
                      alert('For account recovery or password resets, please contact the ITSO Helpdesk or the Registrar’s Office.')
                    }}
                    className="text-[#273a72] dark:text-[#ebb12a] font-bold hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
            </>

            {error && (
              <div role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/60 p-3 text-xs text-rose-700 dark:text-[#ffe4e6] font-medium flex items-start gap-2 shadow-xs">
                <svg className="size-4 text-rose-500 dark:text-rose-300 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 rounded-lg bg-[#273a72] hover:bg-[#1e2f65] active:bg-[#172552] text-white dark:bg-[#ebb12a] dark:hover:bg-[#f3be39] dark:text-[#111e3e] dark:font-extrabold py-2.5 px-4 font-bold text-sm tracking-wide shadow-md shadow-[#273a72]/25 dark:shadow-[#ebb12a]/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy ? (
                <>
                  <svg className="size-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            {/* Help / ITSO info */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#314a8f] text-center">
              <p className="text-[11px] text-slate-600 dark:text-[#dbeafe] font-semibold">
                Official Information System · <span className="font-bold text-slate-800 dark:text-[#ffffff]">NU MOA Campus</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-[#cbdcf7] mt-0.5">
                For login concerns, visit <span className="text-[#273a72] dark:text-[#ebb12a] font-bold">ITSO MOA</span> (Information Technology Support Office)
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Footer matching NUIS MOA spanning edge-to-edge */}
      <footer className="w-full border-t border-slate-300 dark:border-[#2c4077] bg-white/70 dark:bg-[#111e3e]/90 backdrop-blur-xs py-3 px-4 sm:px-6 md:px-8 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-[#dbeafe]">
        <div>
          <a
            href="https://national-u.edu.ph/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#273a72] dark:text-[#8eb5f5] hover:underline"
          >
            National University
          </a>
          <span> &copy; 2018 - 2026</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://onlineapp.nu-moa.edu.ph/projectnuis/login.php"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-900 dark:hover:text-[#ffffff] transition-colors"
          >
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  )
}
