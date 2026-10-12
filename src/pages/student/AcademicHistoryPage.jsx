import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '../../components/Page.jsx'
import { apiAll } from '../../services/api.js'
import { formatGradePoint } from '../../utils/gradeScale.js'

export default function AcademicHistoryPage() {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([apiAll('/enrollments/my'), apiAll('/grades/my')])
      .then(([enrollments, grades]) => {
        if (!active) return
        const byEnrollment = new Map(grades.map((grade) => [grade.enrollmentId?._id, grade]))
        setAttempts(enrollments.map((item) => ({ enrollment: item, grade: byEnrollment.get(item._id) })))
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
  }, [])

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Permanent Academic Record"
        title="Official Academic History"
        description="Comprehensive log of course enrollment attempts, retakes, and official earned grades at National University."
      />

      {error && (
        <div role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : attempts.length === 0 ? (
        <div className="mt-6"><EmptyState>No academic history or course attempts recorded yet.</EmptyState></div>
      ) : (
        <div className="mt-6 space-y-3.5">
          {attempts.map(({ enrollment, grade }) => {
            const subject = enrollment.classOfferingId?.subjectId
            const hasFinal = grade?.finalGrade != null
            return (
              <article
                key={enrollment._id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-5 shadow-xs transition-all hover:border-[#273a72] dark:hover:border-[#ebb12a]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                      {subject?.code}
                    </span>
                    <span className="text-slate-300 dark:text-blue-300/40">·</span>
                    <span className="text-xs text-slate-500 dark:text-blue-300">
                      Term Enrollment: {new Date(enrollment.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                    {subject?.name}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={enrollment.status} />
                  <div className="rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white">
                    {hasFinal ? (
                      <span className="text-[#273a72] dark:text-[#ebb12a]">
                        Final Grade: {formatGradePoint(grade.finalGrade)}
                      </span>
                    ) : grade?.midtermGrade != null ? (
                      <span className="text-sky-700 dark:text-sky-300">
                        Midterm: {formatGradePoint(grade.midtermGrade)}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-blue-300/60 font-normal">
                        Grade Pending
                      </span>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
