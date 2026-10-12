import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LoadingState } from '../components/Page.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'

const statCardsConfig = {
  student: [
    { label: 'Open Classes', path: '/class-offerings?status=open', to: '/student/classes', icon: 'book', color: 'from-[#273a72] to-[#1e2f5e]' },
    { label: 'Pending Requests', path: '/enrollments/my?status=pending', to: '/student/requests', icon: 'clock', color: 'from-[#d99718] to-[#b3790a]' },
    { label: 'Published Grades', path: '/grades/my', to: '/student/grades', icon: 'award', color: 'from-[#19725d] to-[#115042]' },
  ],
  faculty: [
    { label: 'Assigned Classes', path: '/class-offerings', to: '/faculty/classes', icon: 'book', color: 'from-[#273a72] to-[#1e2f5e]' },
    { label: 'Published Grades', path: '/grades?status=published', to: '/faculty/final-grades', icon: 'award', color: 'from-[#19725d] to-[#115042]' },
    { label: 'Correction Requests', path: '/grade-correction-requests', to: '/faculty/corrections', icon: 'clipboard', color: 'from-[#d99718] to-[#b3790a]' },
  ],
  admin: [
    { label: 'User Accounts', path: '/users', to: '/admin/users', icon: 'users', color: 'from-[#273a72] to-[#1e2f5e]' },
    { label: 'Pending Enrollments', path: '/enrollments?status=pending', to: '/admin/enrollments', icon: 'clipboard', color: 'from-[#d99718] to-[#b3790a]' },
    { label: 'Pending Corrections', path: '/grade-correction-requests?status=pending', to: '/admin/corrections', icon: 'clock', color: 'from-[#b93838] to-[#8f2121]' },
  ],
}

// Iconic NUIS MOA module groups (matching onlineapp.nu-moa.edu.ph/projectnuis/main.php)
const nuisModules = {
  student: [
    {
      id: 'docs',
      title: 'Documents & Manuals',
      description: 'Collection of documents, forms and manuals for administration, students, faculty, and staff.',
      iconColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      links: [
        { label: 'Student Information Sheet', to: '/student/profile' },
        { label: 'Academic Terms & Calendar', to: '/student/classes' },
        { label: 'Data Privacy Policy', href: 'https://onlineapp.nu-moa.edu.ph/projectnuis/policy.php' },
      ],
    },
    {
      id: 'students',
      title: 'Students',
      description: 'Stores and tracks all student information, including grades, accountabilities, and more.',
      iconColor: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5" />
        </svg>
      ),
      links: [
        { label: 'My Student Profile', to: '/student/profile' },
        { label: 'Academic History & Transcripts', to: '/student/history' },
        { label: 'View Published Grades', to: '/student/grades' },
      ],
    },
    {
      id: 'services',
      title: 'Student Services',
      description: 'Group of modules for student development, activities, and enrollment services.',
      iconColor: 'bg-blue-100 text-[#273a72] dark:bg-blue-950/60 dark:text-[#8eb5f5]',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      links: [
        { label: 'Browse Class Offerings', to: '/student/classes' },
        { label: 'Enrollment Requests & Status', to: '/student/requests' },
        { label: 'My Enrolled Classes & Schedule', to: '/student/enrolled' },
      ],
    },
    {
      id: 'bills',
      title: 'NU Bills & Assessment',
      description: 'National University online assessment of tuition, fees, and clearance portal.',
      iconColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      links: [
        { label: 'NU Bills Portal', href: 'https://onlineapp.nu-moa.edu.ph/bills/' },
        { label: 'Payment Options & Clearance', href: 'https://onlineapp.nu-moa.edu.ph/bills/' },
      ],
    },
  ],
  faculty: [
    {
      id: 'teaching',
      title: 'Teaching & Class Management',
      description: 'Manage assigned course sections, student rosters, and academic sessions.',
      iconColor: 'bg-blue-100 text-[#273a72] dark:bg-blue-950/60 dark:text-[#8eb5f5]',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      links: [
        { label: 'My Assigned Classes', to: '/faculty/classes' },
        { label: 'Faculty Profile', to: '/faculty/profile' },
      ],
    },
    {
      id: 'grading',
      title: 'Grading Sheets & Publishing',
      description: 'Encode midterm scores, calculate final grades, and publish official grades.',
      iconColor: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      links: [
        { label: 'Final Grades Summary', to: '/faculty/final-grades' },
        { label: 'Grade Corrections', to: '/faculty/corrections' },
      ],
    },
    {
      id: 'docs-faculty',
      title: 'Documents & Faculty Manuals',
      description: 'Collection of syllabi, grading policies, and faculty institutional resources.',
      iconColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      links: [
        { label: 'NU Faculty Code & Guidelines', href: 'https://national-u.edu.ph' },
        { label: 'ITSO Support & Helpdesk', href: 'https://onlineapp.nu-moa.edu.ph' },
      ],
    },
  ],
  admin: [
    {
      id: 'body',
      title: 'Academic Body & Accounts',
      description: 'User access, student directory, and faculty records administration.',
      iconColor: 'bg-blue-100 text-[#273a72] dark:bg-blue-950/60 dark:text-[#8eb5f5]',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      links: [
        { label: 'User Accounts Management', to: '/admin/users' },
        { label: 'Students Directory', to: '/admin/students' },
        { label: 'Faculty Directory', to: '/admin/faculty' },
      ],
    },
    {
      id: 'units',
      title: 'Academic Units & Offerings',
      description: 'Configure departments, degree programs, curriculum subjects, and class schedules.',
      iconColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      links: [
        { label: 'Departments & Programs', to: '/admin/departments' },
        { label: 'Sections & Subjects', to: '/admin/sections' },
        { label: 'Class Offerings & Scheduling', to: '/admin/offerings' },
      ],
    },
    {
      id: 'records',
      title: 'Registrar & Grade Oversight',
      description: 'Academic terms lifecycle, enrollment approvals, grade locks, and audit trails.',
      iconColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      iconSvg: (
        <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      links: [
        { label: 'Academic Terms', to: '/admin/academic-terms' },
        { label: 'Enrollment Approvals', to: '/admin/enrollments' },
        { label: 'Grade Oversight', to: '/admin/grades' },
        { label: 'Correction Approvals', to: '/admin/corrections' },
        { label: 'System Audit History', to: '/admin/audit' },
      ],
    },
  ],
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [counts, setCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    Promise.all(
      statCardsConfig[user.role].map(async (card) => {
        try {
          const res = await api(`${card.path}${card.path.includes('?') ? '&' : '?'}limit=1`)
          return { ...card, total: res.total ?? 0 }
        } catch {
          return { ...card, total: 0 }
        }
      })
    )
      .then((items) => {
        if (active) setCounts(items)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user.role])

  const modules = nuisModules[user.role] || []

  // Filter modules based on search input
  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return modules
    return modules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.links.some((l) => l.label.toLowerCase().includes(q))
    )
  }, [modules, search])

  return (
    <div className="space-y-6">
      {/* NUIS MOA Home Section Header matching media_1791813959663.png */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-300 dark:border-[#273e7a]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-[#273a72] text-white dark:bg-[#ebb12a] dark:text-[#111e3e]">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#273a72] dark:text-white leading-tight">
              Home
            </h1>
            <p className="text-xs text-slate-500 dark:text-blue-200">
              National University Information System · Control Center
            </p>
          </div>
        </div>

        {/* Quick Search bar on the right (like in NUIS MOA screenshot) */}
        <div className="relative w-full sm:w-64">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules..."
            className="w-full rounded-md border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3 py-1.5 pl-8 text-xs text-slate-800 dark:text-white shadow-2xs focus:outline-none"
          />
          <svg
            className="absolute left-2.5 top-2 size-3.5 text-slate-400 dark:text-blue-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-3 text-xs text-rose-800 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      {/* Live Academic Counters (Styled in NU Navy & Gold) */}
      <div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full">
              <LoadingState />
            </div>
          ) : (
            counts.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-5 shadow-xs transition-all hover:border-[#273a72] dark:hover:border-[#ebb12a] hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-blue-300">
                      {card.label}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-[#273a72] dark:text-white">
                      {card.total}
                    </p>
                  </div>
                  <div className="size-11 rounded-xl bg-blue-50 dark:bg-[#192d5c] text-[#273a72] dark:text-[#ebb12a] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#273a72] dark:text-[#ebb12a] group-hover:underline">
                  <span>View records</span>
                  <span>&rarr;</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Authentic NUIS MOA Module Grid (matching onlineapp.nu-moa.edu.ph/projectnuis/main.php) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-300">
            System Modules & Services
          </h2>
          {search && (
            <span className="text-xs text-slate-500 dark:text-blue-300">
              Showing matching modules
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((module) => (
            <div
              key={module.id}
              className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-5 shadow-xs transition-all hover:border-[#273a72]/60 dark:hover:border-[#ebb12a]/60 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-lg shrink-0 ${module.iconColor}`}>
                    {module.iconSvg}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[#273a72] dark:text-white">
                      {module.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-blue-200 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </div>

                {/* Sublinks */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                  {module.links.map((link) =>
                    link.to ? (
                      <Link
                        key={link.label}
                        to={link.to}
                        className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-blue-100 hover:text-[#273a72] dark:hover:text-[#ebb12a] p-1 rounded hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="truncate">{link.label}</span>
                        <span className="text-slate-400 dark:text-blue-300">&rsaquo;</span>
                      </Link>
                    ) : (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-blue-100 hover:text-[#273a72] dark:hover:text-[#ebb12a] p-1 rounded hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="truncate">{link.label}</span>
                        <span className="text-[10px] text-slate-400">↗</span>
                      </a>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Institutional Banner matching NU Central Portal (media_1791814009886.png) */}
      <div className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-gradient-to-r from-[#273a72] to-[#1c2e5b] p-5 sm:p-6 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/nulogoreal.png"
            alt="National University"
            className="size-12 object-contain drop-shadow-sm shrink-0"
          />
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-wide">
              National University · MOA Campus
            </h3>
            <p className="text-xs text-blue-100/90 mt-0.5">
              &ldquo;I&apos;m a bulldog. I refuse to lose, and I&apos;m always going to compete.&rdquo; &mdash; Education that works.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="https://onlineapp.nu-moa.edu.ph/bills/"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#ebb12a] px-3.5 py-2 text-xs font-bold text-[#111e3e] hover:bg-[#f5b731] transition-colors"
          >
            Access NU Bills
          </a>
          <a
            href="https://national-u.edu.ph"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
          >
            Visit University Website
          </a>
        </div>
      </div>
    </div>
  )
}
