import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle.jsx'
import { useAuth } from '../context/useAuth.js'

const labels = { student: 'Student', faculty: 'Faculty', admin: 'Admin' }
const roleLinks = {
  student: [['profile', 'My profile'], ['classes', 'Browse classes'], ['requests', 'Enrollment requests'], ['enrolled', 'My classes / schedule'], ['grades', 'My grades'], ['history', 'Academic history']],
  faculty: [['profile', 'My profile'], ['classes', 'My classes'], ['final-grades', 'Final grades'], ['corrections', 'Grade corrections']],
}
const adminGroups = [
  { title: 'Academic Body', className: 'border-rose-400 bg-rose-400/10', headingClassName: 'text-rose-100', links: [['users', 'Accounts'], ['students', 'Students'], ['faculty', 'Faculty']] },
  { title: 'Academic Units', className: 'border-amber-300 bg-amber-300/10', headingClassName: 'text-amber-100', links: [['departments', 'Departments'], ['programs', 'Programs'], ['sections', 'Sections'], ['subjects', 'Subjects'], ['offerings', 'Class offerings']] },
  { title: 'Record Management', className: 'border-sky-300 bg-sky-300/10', headingClassName: 'text-sky-100', links: [['academic-terms', 'Academic terms'], ['enrollments', 'Enrollment approvals'], ['grades', 'Grade oversight'], ['corrections', 'Correction approvals'], ['audit', 'Audit history']] },
]

function SidebarLink({ to, label, end = false }) {
  return <NavLink to={to} end={end} className={({ isActive }) => `rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${isActive ? 'sidebar-active bg-blue-50 text-blue-700' : 'text-blue-50 hover:bg-blue-600'}`}>{label}</NavLink>
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const base = `/${user.role}`
  async function signOut() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="border-b border-blue-800 bg-blue-700 p-5 text-white md:sticky md:top-0 md:h-screen md:w-72 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r md:p-7">
        <div className="flex items-center gap-3">
          <span className="brand-on-light grid size-10 place-items-center rounded-xl bg-white font-bold text-blue-700">S</span>
          <div><p className="font-bold text-white">SIS</p><p className="text-xs text-blue-100">{labels[user.role]} portal</p></div>
        </div>
        <nav aria-label="Main navigation" className="mt-7 flex flex-col gap-4">
          <SidebarLink to={base} label="Dashboard" end />
          {user.role === 'admin' ? adminGroups.map((group) => (
            <section key={group.title} aria-label={group.title} className={`rounded-xl border-2 p-2 ${group.className}`}>
              <h2 className={`px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider ${group.headingClassName}`}>{group.title}</h2>
              <div className="flex flex-wrap gap-1 md:flex-col">
                {group.links.map(([path, label]) => <SidebarLink key={path} to={`${base}/${path}`} label={label} />)}
              </div>
            </section>
          )) : <div className="flex flex-wrap gap-2 md:flex-col">{roleLinks[user.role].map(([path, label]) => <SidebarLink key={path} to={`${base}/${path}`} label={label} />)}</div>}
          <div className="flex flex-col border-t border-blue-400/50 pt-3"><SidebarLink to={`${base}/settings`} label="Account settings" /></div>
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
