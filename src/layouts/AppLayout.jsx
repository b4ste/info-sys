import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useAuth } from '../context/useAuth.js'

const roleLabels = { student: 'Student', faculty: 'Faculty', admin: 'Administrator' }

const studentLinks = [
  { to: '', label: 'Home', icon: 'home', end: true },
  { to: 'profile', label: 'My Profile', icon: 'user' },
  { to: 'classes', label: 'Browse Classes', icon: 'book' },
  { to: 'requests', label: 'Enrollment Requests', icon: 'clipboard' },
  { to: 'enrolled', label: 'My Schedule / Classes', icon: 'calendar' },
  { to: 'grades', label: 'View Grades', icon: 'chart' },
  { to: 'history', label: 'Academic History', icon: 'history' },
]

const facultyLinks = [
  { to: '', label: 'Home', icon: 'home', end: true },
  { to: 'profile', label: 'My Profile', icon: 'user' },
  { to: 'classes', label: 'My Classes', icon: 'book' },
  { to: 'final-grades', label: 'Final Grades', icon: 'chart' },
  { to: 'corrections', label: 'Grade Corrections', icon: 'clipboard' },
]

const adminGroups = [
  {
    title: 'Academic Body',
    links: [
      { to: 'users', label: 'User Accounts', icon: 'users' },
      { to: 'students', label: 'Students Directory', icon: 'user' },
      { to: 'faculty', label: 'Faculty Directory', icon: 'user' },
    ],
  },
  {
    title: 'Academic Units',
    links: [
      { to: 'departments', label: 'Departments', icon: 'building' },
      { to: 'programs', label: 'Programs', icon: 'mortarboard' },
      { to: 'sections', label: 'Sections', icon: 'folder' },
      { to: 'subjects', label: 'Subjects', icon: 'book' },
      { to: 'offerings', label: 'Class Offerings', icon: 'calendar' },
    ],
  },
  {
    title: 'Record Management',
    links: [
      { to: 'academic-terms', label: 'Academic Terms', icon: 'calendar' },
      { to: 'enrollments', label: 'Enrollment Approvals', icon: 'clipboard' },
      { to: 'grades', label: 'Grade Oversight', icon: 'chart' },
      { to: 'corrections', label: 'Correction Approvals', icon: 'clipboard' },
      { to: 'audit', label: 'Audit History', icon: 'history' },
    ],
  },
]

function Icon({ name, className = 'size-4' }) {
  switch (name) {
    case 'home':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    case 'user':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case 'users':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    case 'book':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    case 'clipboard':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    case 'calendar':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 7V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    case 'chart':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    case 'history':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'building':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    case 'mortarboard':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5" />
        </svg>
      )
    case 'folder':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      )
    case 'cog':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      )
  }
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)

  const profileRef = useRef(null)
  const base = `/${user.role}`

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  // Auto close mobile drawer on route change
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
    setProfileOpen(false)
  }, [location.pathname])

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  // Greeting based on current time
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User')

  return (
    <div className="min-h-screen flex flex-col bg-[#edf0f5] dark:bg-[#111e3e] text-slate-800 dark:text-white font-sans antialiased transition-colors">
      {/* Top NUIS MOA Header Bar (Sticky Full-Width Edge-to-Edge) */}
      <header className="sticky top-0 z-50 bg-[#273a72] border-b-4 border-[#ebb12a] px-4 sm:px-6 md:px-8 py-2.5 shadow-md w-full">
        <div className="w-full flex items-center justify-between">
          {/* Left: 3x3 Dots Menu Toggle Button + nulogoreal.png + NUIS MOA */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-all focus:outline-none cursor-pointer"
              title={sidebarOpen ? 'Collapse Navigation Menu' : 'Expand Navigation Menu'}
              aria-label={sidebarOpen ? 'Collapse Navigation Menu' : 'Expand Navigation Menu'}
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

            <NavLink to={base} className="flex items-center gap-2.5 group">
              <img
                src="/nulogoreal.png"
                alt="National University Shield"
                className="h-8 w-auto object-contain drop-shadow-xs"
              />
              <span className="font-bold text-white text-base sm:text-lg tracking-wide uppercase select-none group-hover:text-blue-100 transition-colors">
                NUIS MOA
              </span>
            </NavLink>
          </div>

          {/* Right: Functional Profile Dropdown + ThemeToggle + Sign Out */}
          <div className="flex items-center gap-2 sm:gap-3.5 text-white">
            {/* Functional Profile Dropdown Button */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer select-none focus:outline-none"
                title="Account Profile Menu"
                aria-label="Account Profile Menu"
              >
                <div className="size-7.5 rounded-full bg-white/20 border border-white/40 grid place-items-center text-white shadow-xs">
                  <svg className="size-4.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <span className="hidden sm:inline text-xs font-semibold">Hi, {displayName}</span>
                <svg className="size-3 text-white/70 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-2xl z-50 overflow-hidden text-slate-800 dark:text-white animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Header */}
                  <div className="bg-[#273a72] p-4 text-white border-b-2 border-[#ebb12a]">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-[#ebb12a] text-[#111e3e] font-black text-sm grid place-items-center shadow-xs">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{displayName}</p>
                        <p className="text-xs text-blue-200 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
                          {roleLabels[user.role]} · NU MOA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Menu Links */}
                  <div className="p-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`${base}/settings`)
                        setProfileOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-blue-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left cursor-pointer"
                    >
                      <svg className="size-4 text-[#273a72] dark:text-[#ebb12a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Security Settings</span>
                    </button>

                    <a
                      href="https://onlineapp.nu-moa.edu.ph/bills/"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-blue-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-left"
                    >
                      <svg className="size-4 text-[#273a72] dark:text-[#ebb12a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span>Access NU Bills Portal</span>
                    </a>
                  </div>

                  <div className="p-2 border-t border-slate-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={signOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle className="text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/30 rounded-md px-2.5 py-1.5 transition-colors cursor-pointer" />

            <button
              type="button"
              onClick={signOut}
              className="text-xs font-semibold text-white bg-rose-600/80 hover:bg-rose-600 border border-rose-500/50 rounded-md px-3 py-1.5 transition-colors cursor-pointer hidden md:inline-block"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Control Center Welcome Banner (matching NUIS MOA main.php) */}
      <div className="bg-blue-50/80 dark:bg-[#15234a] border-b border-blue-100 dark:border-[#273a72] px-4 sm:px-6 md:px-8 py-2 text-xs font-semibold text-[#273a72] dark:text-[#8eb5f5] flex items-center justify-between">
        <div>
          <span>{greeting}, welcome to your control center!</span>
          <span className="hidden md:inline text-slate-400 dark:text-blue-300/60 ml-2">|</span>
          <span className="hidden md:inline ml-2 text-slate-600 dark:text-blue-200">
            {roleLabels[user.role]} Portal · NU MOA Campus
          </span>
        </div>
        <div className="text-[11px] font-medium text-slate-500 dark:text-blue-300">
          A.Y. 2026-2027
        </div>
      </div>

      {/* Body: Sidebar + Main Content */}
      <div className="flex-1 flex min-w-0">
        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          />
        )}

        {/* Sidebar Navigation (Togglable on both desktop and mobile) */}
        <aside
          className={`fixed md:sticky top-[57px] sm:top-[61px] md:top-[93px] z-40 h-[calc(100vh-57px)] sm:h-[calc(100vh-61px)] md:h-[calc(100vh-93px)] shrink-0 overflow-y-auto bg-white dark:bg-[#16264f] border-r border-slate-200 dark:border-[#273a72] transition-all duration-300 ease-in-out ${
            sidebarOpen
              ? 'translate-x-0 w-64 p-4 opacity-100'
              : '-translate-x-full md:translate-x-0 md:w-0 md:p-0 md:border-r-0 md:opacity-0 md:overflow-hidden'
          }`}
        >
          {/* User mini badge in sidebar for mobile */}
          <div className="mb-4 pb-4 border-b border-slate-100 dark:border-white/10 sm:hidden">
            <p className="text-sm font-bold text-[#273a72] dark:text-white">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-blue-200 capitalize">{user.role} Portal</p>
          </div>

          <nav aria-label="Portal Navigation" className="space-y-4">
            {/* Main Links */}
            <div>
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-blue-300">
                Menu Navigation
              </p>
              <div className="space-y-1">
                {(user.role === 'student' ? studentLinks : user.role === 'faculty' ? facultyLinks : [
                  { to: '', label: 'Home', icon: 'home', end: true },
                ]).map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to ? `${base}/${link.to}` : base}
                    end={link.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 dark:bg-[#1e346b] text-[#273a72] dark:text-[#ebb12a] border-l-4 border-[#273a72] dark:border-[#ebb12a]'
                          : 'text-slate-600 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`
                    }
                  >
                    <Icon name={link.icon} className="size-4 shrink-0 text-current" />
                    <span>{link.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Admin Management Groups */}
            {user.role === 'admin' && (
              <div className="space-y-3">
                {adminGroups.map((group) => (
                  <div key={group.title} className="rounded-lg bg-slate-50/70 dark:bg-white/5 p-2 border border-slate-100 dark:border-white/5">
                    <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                      {group.title}
                    </p>
                    <div className="space-y-0.5">
                      {group.links.map((link) => (
                        <NavLink
                          key={link.to}
                          to={`${base}/${link.to}`}
                          className={({ isActive }) =>
                            `flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-[#273a72] text-white dark:bg-[#ebb12a] dark:text-[#111e3e] font-bold'
                                : 'text-slate-600 dark:text-blue-100 hover:bg-white dark:hover:bg-white/10'
                            }`
                          }
                        >
                          <Icon name={link.icon} className="size-3.5 shrink-0" />
                          <span>{link.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* External Apps matching NUIS MOA (image 3) */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/10">
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-blue-300">
                NU Apps
              </p>
              <div className="space-y-1">
                <a
                  href="https://onlineapp.nu-moa.edu.ph/bills/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <svg className="size-4 shrink-0 text-[#273a72] dark:text-[#ebb12a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span>NU Bills</span>
                </a>
                <a
                  href="https://outlook.office.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <svg className="size-4 shrink-0 text-[#273a72] dark:text-[#ebb12a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>MS Outlook</span>
                </a>
                <a
                  href="https://teams.microsoft.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <svg className="size-4 shrink-0 text-[#273a72] dark:text-[#ebb12a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                  <span>MS Teams</span>
                </a>
              </div>
            </div>

            {/* Others */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/10">
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-blue-300">
                Others
              </p>
              <div className="space-y-1">
                <NavLink
                  to={`${base}/settings`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-[#1e346b] text-[#273a72] dark:text-[#ebb12a] border-l-4 border-[#273a72] dark:border-[#ebb12a]'
                        : 'text-slate-600 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`
                  }
                >
                  <Icon name="cog" className="size-4 shrink-0 text-current" />
                  <span>Account Settings</span>
                </NavLink>
                <a
                  href="https://onlineapp.nu-moa.edu.ph/projectnuis/policy.php"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <svg className="size-4 shrink-0 text-slate-400 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Data Privacy</span>
                </a>
              </div>
            </div>
          </nav>
        </aside>

        {/* Main Content View */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8 transition-all duration-300">
          <Outlet />
        </main>
      </div>

      {/* Institutional Footer (matching NUIS MOA) */}
      <footer className="w-full border-t border-slate-300 dark:border-[#273a72] bg-white/70 dark:bg-[#111e3e]/90 backdrop-blur-xs py-3 px-4 sm:px-6 md:px-8 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-blue-200">
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
            href="https://onlineapp.nu-moa.edu.ph/projectnuis/policy.php"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  )
}
