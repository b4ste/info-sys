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
    } catch (requestError) { setError(requestError.message) }
  }

  return <section><PageHeader eyebrow="Enrollment" title={view === 'classes' ? 'My classes and schedule' : 'My enrollment requests'} description={view === 'classes' ? 'Approved classes across academic terms.' : 'Track pending, approved, rejected, and withdrawn attempts.'} /><Notice error={error || list.error} message={message} />{list.loading ? <div className="mt-7"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-7"><EmptyState>No enrollment records found.</EmptyState></div> : <div className="mt-7 space-y-3">{list.items.map((item) => <article key={item._id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"><div><h2 className="font-semibold text-slate-900">{item.classOfferingId?.subjectId?.code} · {item.classOfferingId?.subjectId?.name}</h2><p className="mt-1 text-sm text-slate-500">Requested {new Date(item.requestedAt).toLocaleDateString()}</p>{item.rejectionReason && <p className="mt-1 text-sm text-rose-700">Reason: {item.rejectionReason}</p>}{view === 'classes' && <p className="mt-2 text-sm text-slate-600">{item.classOfferingId?.schedule?.map((slot) => `${slot.day} ${slot.startTime}–${slot.endTime}`).join(', ') || 'Schedule not set'}</p>}</div><div className="flex items-center gap-4"><StatusBadge status={item.status} />{['pending', 'approved'].includes(item.status) && <button type="button" onClick={() => setWithdrawTarget(item)} className="text-sm font-medium text-rose-700">Withdraw</button>}</div></article>)}</div>}<Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />{withdrawTarget && <ActionDialog title="Withdraw enrollment?" description={`Withdraw from ${withdrawTarget.classOfferingId?.subjectId?.name ?? 'this class'}?`} confirmLabel="Withdraw" onCancel={() => setWithdrawTarget(null)} onConfirm={() => { const target = withdrawTarget; setWithdrawTarget(null); withdraw(target) }} />}</section>
}
