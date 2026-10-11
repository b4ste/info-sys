import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '../../components/Page.jsx'
import { apiAll } from '../../services/api.js'

export default function AcademicHistoryPage() {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([apiAll('/enrollments/my'), apiAll('/grades/my')]).then(([enrollments, grades]) => {
      if (!active) return
      const byEnrollment = new Map(grades.map((grade) => [grade.enrollmentId?._id, grade]))
      setAttempts(enrollments.map((item) => ({ enrollment: item, grade: byEnrollment.get(item._id) })))
    }).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return <section><PageHeader eyebrow="Academic records" title="Academic history" description="Each class keeps its own enrollment attempt and published grade, including retakes." />{error && <p role="alert" className="mt-5 text-sm text-rose-700">{error}</p>}{loading ? <div className="mt-7"><LoadingState /></div> : attempts.length === 0 ? <div className="mt-7"><EmptyState>No academic attempts yet.</EmptyState></div> : <div className="mt-7 space-y-3">{attempts.map(({ enrollment, grade }) => <article key={enrollment._id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"><div><h2 className="font-semibold">{enrollment.classOfferingId?.subjectId?.code} · {enrollment.classOfferingId?.subjectId?.name}</h2><p className="mt-1 text-sm text-slate-500">Requested {new Date(enrollment.requestedAt).toLocaleDateString()}</p></div><div className="flex items-center gap-3"><StatusBadge status={enrollment.status} /><span className="text-sm font-semibold">{grade ? `Final: ${grade.finalGrade}` : 'No published grade'}</span></div></article>)}</div>}</section>
}
