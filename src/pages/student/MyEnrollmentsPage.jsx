import { useState } from 'react'
import ActionDialog from '../../components/ActionDialog.jsx'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api } from '../../services/api.js'

export default function MyEnrollmentsPage({ view = 'requests' }) {
  const path = view === 'classes' ? '/enrollments/my?status=approved' : '/enrollments/my'
  const list = useApiList(path)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [withdrawTarget, setWithdrawTarget] = useState(null)

  async function withdraw(item) {
    setError('')
    try {
      await api(`/enrollments/${item._id}/withdraw`, { method: 'PATCH' })
      setMessage('Enrollment withdrawn.')
      await list.refresh()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const isClassesView = view === 'classes'

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Enrollment Management"
        title={isClassesView ? 'My Enrolled Classes & Schedule' : 'My Enrollment Requests'}
        description={
          isClassesView
            ? 'Official registered subjects and weekly meeting schedule for the academic term.'
            : 'Track the real-time status of your course enrollment petitions and registrar reviews.'
        }
      />

      <Notice error={error || list.error} message={message} />

      {list.loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : list.items.length === 0 ? (
        <div className="mt-6">
          <EmptyState>
            {isClassesView
              ? 'You have no officially approved classes for this term yet.'
              : 'No enrollment requests submitted yet.'}
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 space-y-3.5">
          {list.items.map((item) => {
            const subject = item.classOfferingId?.subjectId
            const offering = item.classOfferingId
            return (
              <article
                key={item._id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-5 shadow-xs transition-all hover:border-[#273a72] dark:hover:border-[#ebb12a]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                      {subject?.code}
                    </span>
                    <span className="text-slate-300 dark:text-blue-300/40">·</span>
                    <span className="text-xs text-slate-500 dark:text-blue-300">
                      Requested on {new Date(item.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                    {subject?.name}
                  </h2>

                  {item.rejectionReason && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      ⚠️ Reason for rejection: {item.rejectionReason}
                    </p>
                  )}

                  {isClassesView && (
                    <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-blue-100">
                      <span className="text-slate-400 dark:text-blue-300">🗓️ Schedule:</span>
                      <span>
                        {offering?.schedule?.length
                          ? offering.schedule
                              .map(
                                (slot) =>
                                  `${slot.day} ${slot.startTime}–${slot.endTime}${slot.room ? ` (${slot.room})` : ''}`
                              )
                              .join(', ')
                          : 'Schedule to be announced'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  {['pending', 'approved'].includes(item.status) && (
                    <button
                      type="button"
                      onClick={() => setWithdrawTarget(item)}
                      className="rounded-lg border border-rose-300 dark:border-rose-500/40 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />

      {withdrawTarget && (
        <ActionDialog
          title="Withdraw Enrollment?"
          description={`Are you sure you want to withdraw from ${
            withdrawTarget.classOfferingId?.subjectId?.name ?? 'this subject'
          }?`}
          confirmLabel="Withdraw"
          onCancel={() => setWithdrawTarget(null)}
          onConfirm={() => {
            const target = withdrawTarget
            setWithdrawTarget(null)
            withdraw(target)
          }}
        />
      )}
    </section>
  )
}
