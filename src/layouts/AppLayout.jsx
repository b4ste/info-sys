import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useAuth } from '../context/useAuth.js'

const labels = { student: 'Student', faculty: 'Faculty', admin: 'Admin' }

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const base = `/${user.role}`
  const roleLinks = {
    student: [['profile', 'My profile'], ['classes', 'Browse classes'], ['requests', 'Enrollment requests'], ['enrolled', 'My classes / schedule'], ['grades', 'My grades'], ['history', 'Academic history']],
    faculty: [['profile', 'My profile'], ['classes', 'My classes'], ['final-grades', 'Final grades'], ['corrections', 'Grade corrections']],
    admin: [['users', 'Accounts'], ['students', 'Students'], ['faculty', 'Faculty'], ['departments', 'Departments'], ['programs', 'Programs'], ['sections', 'Sections'], ['subjects', 'Subjects'], ['curriculum-rules', 'Curriculum'], ['academic-terms', 'Academic terms'], ['offerings', 'Class offerings'], ['enrollments', 'Enrollment approvals'], ['grades', 'Grade oversight'], ['corrections', 'Correction approvals'], ['audit', 'Audit history']],
  }
  const links = [{ to: base, label: 'Dashboard', end: true }, ...roleLinks[user.role].map(([path, label]) => ({ to: `${base}/${path}`, label })), { to: `${base}/settings`, label: 'Account settings' }]

  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="border-b border-blue-800 bg-blue-700 p-5 text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r md:p-7">
        <div className="flex items-center gap-3">
          <span className="brand-on-light grid size-10 place-items-center rounded-xl bg-white font-bold text-blue-700">S</span>
          <div><p className="font-bold text-white">SIS</p><p className="text-xs text-blue-100">{labels[user.role]} portal</p></div>
        </div>
        <nav aria-label="Main navigation" className="mt-7 flex flex-wrap gap-2 md:flex-col">
          {links.map(({ to, label, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `rounded-lg px-4 py-2.5 text-sm font-medium ${isActive ? 'sidebar-active bg-blue-50 text-blue-700' : 'text-blue-50 hover:bg-blue-600'}`}>{label}</NavLink>)}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
          <div><p className="text-sm font-semibold text-slate-900">{user.name || user.email}</p><p className="text-xs text-slate-500">{user.email} · <span className="capitalize">{user.role}</span></p></div>
          <div className="flex items-center gap-2"><ThemeToggle /><button type="button" onClick={signOut} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Sign out</button></div>
        </header>
        <main className="mx-auto max-w-6xl p-5 sm:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
