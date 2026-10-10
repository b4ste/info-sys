import { useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api } from '../../services/api.js'

export default function EnrollmentApprovalsPage() {
  const [status, setStatus] = useState('pending')
  const list = useApiList(`/enrollments${status ? `?status=${status}` : ''}`)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function decide(item, operation) {
    let body
    if (operation === 'reject') {
      const reason = window.prompt('Reason for rejection:')
      if (!reason) return
      body = JSON.stringify({ rejectionReason: reason })
    }
    setError('')
    setMessage('')
    try {
      await api(`/enrollments/${item._id}/${operation}`, { method: 'PATCH', ...(body && { body }) })
      setMessage(`Request ${operation === 'approve' ? 'approved' : 'rejected'}.`)
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
  }

  return <section><PageHeader eyebrow="Enrollment" title="Enrollment approvals" description="Review eligibility and capacity before approving student requests. The API rechecks both when you decide." /><Notice error={error || list.error} message={message} /><label className="mt-7 block max-w-xs text-sm font-medium">Status<select value={status} onChange={(event) => { setStatus(event.target.value); list.setPage(1) }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">All</option>{['pending', 'approved', 'rejected', 'withdrawn'].map((item) => <option key={item}>{item}</option>)}</select></label>{list.loading ? <div className="mt-5"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-5"><EmptyState>No enrollment requests found.</EmptyState></div> : <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Requested</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{list.items.map((item) => <tr key={item._id} className="border-t border-slate-100"><td className="px-4 py-3">{item.studentId?.studentNumber} · {item.studentId?.firstName} {item.studentId?.lastName}</td><td className="px-4 py-3">{item.classOfferingId?.subjectId?.code} · {item.classOfferingId?.subjectId?.name}</td><td className="px-4 py-3">{new Date(item.requestedAt).toLocaleDateString()}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="space-x-3 whitespace-nowrap px-4 py-3">{item.status === 'pending' && <><button type="button" onClick={() => decide(item, 'approve')} className="font-medium text-blue-700">Approve</button><button type="button" onClick={() => decide(item, 'reject')} className="font-medium text-rose-700">Reject</button></>}</td></tr>)}</tbody></table></div>}<Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} /></section>
}
