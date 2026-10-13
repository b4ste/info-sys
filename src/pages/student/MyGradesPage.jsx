import Icon from '../../components/Icon.jsx'
import { EmptyState, LoadingState, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { formatGradePoint } from '../../utils/gradeScale.js'

export default function MyGradesPage() {
  const list = useApiList('/grades/my')

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Academic Performance"
        title="Official Report of Grades"
        description="Published midterm grades, official finals, and grade points for enrolled courses at National University."
      />

      {list.error && (
        <div role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          {list.error}
        </div>
      )}

      {list.loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : list.items.length === 0 ? (
        <div className="mt-6"><EmptyState>No published grades found for your student records yet.</EmptyState></div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {list.items.map((grade) => {
            const subject = grade.enrollmentId?.classOfferingId?.subjectId
            return (
              <article
                key={grade._id}
                className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-5 shadow-xs transition-all hover:border-[#273a72] dark:hover:border-[#ebb12a]"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-3.5">
                  <div>
                    <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                      {subject?.code}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {subject?.name}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-blue-300">
                      {grade.publishedAt
                        ? `Published ${new Date(grade.publishedAt).toLocaleDateString()}`
                        : 'Midterm recorded'}
                    </p>
                  </div>
                  <StatusBadge status={grade.status === 'published' ? 'published' : 'midterm'} />
                </div>

                {/* Official Grade Metric Grid */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 border border-slate-100 dark:border-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-blue-300">Midterm</p>
                    <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                      {formatGradePoint(grade.midtermGrade)}
                    </p>
                    {grade.midtermScore != null && (
                      <p className="text-[11px] text-slate-500 dark:text-blue-300">{grade.midtermScore}%</p>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 border border-slate-100 dark:border-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-blue-300">Finals</p>
                    <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                      {formatGradePoint(grade.finalsGrade)}
                    </p>
                    {grade.finalsScore != null && (
                      <p className="text-[11px] text-slate-500 dark:text-blue-300">{grade.finalsScore}%</p>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 border border-slate-100 dark:border-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-blue-300">Average</p>
                    <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                      {grade.calculatedGrade == null ? '—' : `${grade.calculatedGrade}%`}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-blue-300">Calculated</p>
                  </div>

                  <div className="rounded-lg bg-blue-50 dark:bg-[#192d5c] p-3 border border-blue-200/60 dark:border-[#273e7a]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Final Grade</p>
                    <p className="mt-1 text-base font-extrabold text-[#273a72] dark:text-[#ebb12a]">
                      {grade.finalGrade == null ? '—' : formatGradePoint(grade.finalGrade)}
                    </p>
                    <p className="text-[11px] font-semibold text-[#273a72]/80 dark:text-[#ebb12a]/80">Official</p>
                  </div>
                </div>

                {/* Score Breakdown if present */}
                {grade.components?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-blue-300 mb-2">
                      Assessment Breakdown
                    </p>
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-blue-100">
                      {grade.components.map((c) => (
                        <div key={c.name} className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-white/5 last:border-0">
                          <span>{c.name} ({c.weight}%)</span>
                          <span className="font-semibold">{c.earnedScore} / {c.maxScore}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {grade.revisions?.length > 0 && (
                  <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-[#273a72] dark:text-[#ebb12a]">
                    <Icon name="info" className="size-3.5 shrink-0" />
                    {grade.revisions.length} approved correction{grade.revisions.length > 1 ? 's' : ''} on official record.
                  </p>
                )}
              </article>
            )
          })}
        </div>
      )}

      <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
    </section>
  )
}
