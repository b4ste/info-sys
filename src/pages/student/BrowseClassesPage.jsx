import { useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api } from '../../services/api.js'
import { enrollmentWindowFromTerm } from '../../utils/enrollmentWindow.js'

function scheduleText(schedule) {
  return schedule?.length
    ? schedule.map((slot) => `${slot.day} ${slot.startTime}–${slot.endTime}${slot.room ? ` (${slot.room})` : ''}`).join(', ')
    : 'Schedule not set'
}

export default function BrowseClassesPage() {
  const list = useApiList('/class-offerings?status=open')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')
  const offerings = list.items.map((item) => ({
    ...item,
    enrollmentWindow: item.enrollmentWindow ?? enrollmentWindowFromTerm(item.academicTermId),
  }))

  async function request(offering) {
    setBusyId(offering._id)
    setError('')
    setMessage('')
    try {
      await api('/enrollments', { method: 'POST', body: JSON.stringify({ classOfferingId: offering._id }) })
      setMessage(`Enrollment request submitted for ${offering.subjectId?.name}.`)
      await list.refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyId('')
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Curriculum & Enrollment"
        title="Browse Class Offerings"
        description="Available subjects and sections for your degree program. Requests are accepted during the active term enrollment window."
      />

      <Notice error={error || list.error} message={message} />

      {list.loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : offerings.length === 0 ? (
        <div className="mt-6"><EmptyState>No open classes are currently available for your program and year level.</EmptyState></div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {offerings.map((item) => {
            const isFull = item.enrollmentCount >= item.capacity
            return (
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
                      <h2 className="mt-0.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {item.subjectId?.name}
                      </h2>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-600 dark:text-blue-100">
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500 dark:text-blue-300">Term:</span>
                      <span>{item.academicTermId?.academicYear} · Term {item.academicTermId?.termNumber}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500 dark:text-blue-300">Schedule:</span>
                      <span>{scheduleText(item.schedule)}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500 dark:text-blue-300">Capacity:</span>
                      <span className={`font-semibold ${isFull ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {item.enrollmentCount} / {item.capacity} seats {isFull ? '(Class full)' : ''}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-blue-300 italic pt-1">
                      {item.enrollmentWindow.message}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    disabled={busyId === item._id || isFull || !item.enrollmentWindow.open}
                    onClick={() => request(item)}
                    className="w-full sm:w-auto rounded-lg bg-[#273a72] dark:bg-[#ebb12a] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white dark:text-[#111e3e] hover:bg-[#1c2e5b] dark:hover:bg-[#f5b731] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyId === item._id ? 'Submitting Request…' : 'Request Enrollment'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
    </section>
  )
}
