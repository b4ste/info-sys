import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'

export default function MyClassesPage() {
  const list = useApiList('/class-offerings')

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Faculty Assignment"
        title="My Teaching Load & Classes"
        description="Course sections assigned to your faculty profile for National University - MOA Campus."
      />

      {list.error && (
        <div role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          {list.error}
        </div>
      )}

      {list.loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : list.items.length === 0 ? (
        <div className="mt-6"><EmptyState>No assigned class offerings for your faculty profile yet.</EmptyState></div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {list.items.map((item) => (
            <article
              key={item._id}
              className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-5 shadow-xs transition-all hover:border-[#273a72] dark:hover:border-[#ebb12a] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                      {item.subjectId?.code}
                    </span>
                    <h2 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                      {item.subjectId?.name}
                    </h2>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-blue-100">
                  <p>
                    <strong className="text-slate-500 dark:text-blue-300">Term:</strong> {item.academicTermId?.academicYear} · Term {item.academicTermId?.termNumber}
                  </p>
                  <p>
                    <strong className="text-slate-500 dark:text-blue-300">Schedule:</strong> {item.schedule?.length ? item.schedule.map((slot) => `${slot.day} ${slot.startTime}–${slot.endTime}${slot.room ? ` (${slot.room})` : ''}`).join(', ') : 'Schedule not set'}
                  </p>
                  <p>
                    <strong className="text-slate-500 dark:text-blue-300">Enrollment:</strong> {item.enrollmentCount} enrolled / {item.capacity} capacity
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-2.5">
                <Link
                  to={`/faculty/classes/${item._id}/roster`}
                  className="rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  👥 View Class Roster
                </Link>
                <Link
                  to={`/faculty/classes/${item._id}/grades`}
                  className="rounded-lg bg-[#273a72] dark:bg-[#ebb12a] px-3.5 py-1.5 text-xs font-bold text-white dark:text-[#111e3e] hover:bg-[#1c2e5b] dark:hover:bg-[#f5b731] transition-colors"
                >
                  📝 Enter & Publish Grades
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
    </section>
  )
}
