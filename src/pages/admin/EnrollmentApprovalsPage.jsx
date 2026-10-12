import { useState } from 'react'
import ActionDialog from '../../components/ActionDialog.jsx'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api } from '../../services/api.js'

export default function EnrollmentApprovalsPage() {
  const [status, setStatus] = useState('pending')
  const list = useApiList(`/enrollments${status ? `?status=${status}` : ''}`)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  async function decide(item, operation, reason = '') {
    const body = operation === 'reject' ? JSON.stringify({ rejectionReason: reason.trim() }) : undefined
    setError('')
    setMessage('')
    try {
      await api(`/enrollments/${item._id}/${operation}`, { method: 'PATCH', ...(body && { body }) })
      setMessage(`Enrollment request ${operation === 'approve' ? 'approved' : 'rejected'} successfully.`)
      await list.refresh()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Registrar Administration"
        title="Enrollment Approvals"
        description="Verify prerequisite eligibility and seat capacity before approving course petitions. The system revalidates constraints upon submission."
      />

      <Notice error={error || list.error} message={message} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="block max-w-xs text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
          Filter by Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              list.setPage(1)
            }}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2 text-xs text-slate-800 dark:text-white"
          >
            <option value="">All Statuses</option>
            {['pending', 'approved', 'rejected', 'withdrawn'].map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : list.items.length === 0 ? (
        <div className="mt-6"><EmptyState>No student enrollment requests found matching the selected filter.</EmptyState></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-xs">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Student
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Subject & Section
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Requested Date
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Status
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((item) => (
                <tr key={item._id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {item.studentId?.firstName} {item.studentId?.lastName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-blue-300">
                      {item.studentId?.studentNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-blue-100">
                    <strong className="block text-[#273a72] dark:text-[#ebb12a]">
                      {item.classOfferingId?.subjectId?.code}
                    </strong>
                    <span>{item.classOfferingId?.subjectId?.name}</span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-blue-300">
                    {new Date(item.requestedAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {item.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => decide(item, 'approve')}
                          className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-bold transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTarget(item)
                            setRejectionReason('')
                          }}
                          className="rounded-md bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-blue-300/60">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />

      {rejectTarget && (
        <ActionDialog
          title="Reject Enrollment Request?"
          description={`Provide an institutional reason for rejecting ${
            rejectTarget.studentId?.firstName ?? 'this student'
          }'s course petition.`}
          fieldLabel="Reason for rejection"
          value={rejectionReason}
          onChange={setRejectionReason}
          confirmLabel="Confirm Rejection"
          onCancel={() => setRejectTarget(null)}
          onConfirm={() => {
            const target = rejectTarget
            const reason = rejectionReason
            setRejectTarget(null)
            decide(target, 'reject', reason)
          }}
        />
      )}
    </section>
  )
}
