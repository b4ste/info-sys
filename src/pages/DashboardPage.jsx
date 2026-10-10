import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LoadingState, PageHeader } from '../components/Page.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'

const cards = {
  student: [
    { label: 'Open classes', path: '/class-offerings?status=open', to: '/student/classes' },
    { label: 'Pending requests', path: '/enrollments/my?status=pending', to: '/student/requests' },
    { label: 'Published grades', path: '/grades/my', to: '/student/grades' },
  ],
  faculty: [
    { label: 'Assigned classes', path: '/class-offerings', to: '/faculty/classes' },
    { label: 'Published grades', path: '/grades?status=published', to: '/faculty/final-grades' },
    { label: 'Correction requests', path: '/grade-correction-requests', to: '/faculty/corrections' },
  ],
  admin: [
    { label: 'Accounts', path: '/users', to: '/admin/users' },
    { label: 'Pending enrollments', path: '/enrollments?status=pending', to: '/admin/enrollments' },
    { label: 'Pending corrections', path: '/grade-correction-requests?status=pending', to: '/admin/corrections' },
  ],
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [counts, setCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all(cards[user.role].map(async (card) => ({ ...card, total: (await api(`${card.path}${card.path.includes('?') ? '&' : '?'}limit=1`)).total })))
      .then((items) => { if (active) setCounts(items) })
      .catch((requestError) => { if (active) setError(requestError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user.role])

  return <section><PageHeader eyebrow={`${user.role} dashboard`} title="Welcome to SIS" description={`Signed in as ${user.email}. Your dashboard shows live academic and account data.`} />{error && <p role="alert" className="mt-5 text-sm text-rose-700">{error}</p>}{loading ? <div className="mt-7"><LoadingState /></div> : <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{counts.map((card) => <Link key={card.label} to={card.to} className="rounded-xl border border-slate-200 bg-white p-6 transition hover:border-blue-300 hover:shadow-sm"><p className="text-sm font-medium text-slate-500">{card.label}</p><p className="mt-4 text-3xl font-bold text-slate-900">{card.total}</p><span className="mt-4 inline-block text-sm font-semibold text-blue-700">View records →</span></Link>)}</div>}</section>
}
