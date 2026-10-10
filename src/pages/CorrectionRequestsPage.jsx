import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../components/Page.jsx'
import { useAuth } from '../context/useAuth.js'
import { useApiList } from '../hooks/useApiList.js'
import { api, apiAll } from '../services/api.js'

export default function CorrectionRequestsPage() {
  const { user } = useAuth()
  const admin = user.role === 'admin'
  const list = useApiList('/grade-correction-requests')
  const [grades, setGrades] = useState([])
  const [gradeId, setGradeId] = useState('')
  const [proposedFinalGrade, setProposedFinalGrade] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (admin) return
    let active = true
    apiAll('/grades?status=published').then((items) => { if (active) setGrades(items) }).catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [admin])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      await api('/grade-correction-requests', { method: 'POST', body: JSON.stringify({ gradeId, proposedFinalGrade: Number(proposedFinalGrade), reason }) })
      setMessage('Correction request submitted.')
      setGradeId(''); setProposedFinalGrade(''); setReason('')
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
  }

  async function decide(item, operation) {
    setError('')
    setMessage('')
    try {
      await api(`/grade-correction-requests/${item._id}/${operation}`, { method: 'PATCH', ...(operation === 'reject' && { body: JSON.stringify({}) }) })
      setMessage(`Correction request ${operation === 'approve' ? 'approved' : 'rejected'}.`)
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
  }

  return <section><PageHeader eyebrow="Grading" title={admin ? 'Correction approvals' : 'Grade corrections'} description={admin ? 'Review faculty requests to change published official grades.' : 'Request a change to a published official grade with a reason.'} /><Notice error={error || list.error} message={message} />{!admin && <form onSubmit={submit} className="mt-7 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2"><label className="text-sm font-medium">Published grade<select required value={gradeId} onChange={(event) => setGradeId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select grade…</option>{grades.map((grade) => <option key={grade._id} value={grade._id}>{grade.enrollmentId?.studentId?.studentNumber} · {grade.finalGrade}</option>)}</select></label><label className="text-sm font-medium">Proposed official grade<input required type="number" step="any" value={proposedFinalGrade} onChange={(event) => setProposedFinalGrade(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium sm:col-span-2">Reason<textarea required minLength={5} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><button type="submit" className="w-fit rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Submit request</button></form>}{list.loading ? <div className="mt-7"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-7"><EmptyState>No correction requests found.</EmptyState></div> : <div className="mt-7 space-y-3">{list.items.map((item) => <article key={item._id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"><div><p className="font-semibold">{item.previousFinalGrade} → {item.proposedFinalGrade}</p><p className="mt-1 text-sm text-slate-600">{item.reason}</p><p className="mt-1 text-xs text-slate-500">Requested {new Date(item.createdAt).toLocaleString()}</p></div><div className="flex items-center gap-3"><StatusBadge status={item.status} />{admin && ['pending', 'reviewing'].includes(item.status) && <button type="button" onClick={() => decide(item, 'approve')} className="text-sm font-medium text-blue-700">{item.status === 'reviewing' ? 'Retry approval' : 'Approve'}</button>}{admin && item.status === 'pending' && <button type="button" onClick={() => decide(item, 'reject')} className="text-sm font-medium text-rose-700">Reject</button>}</div></article>)}</div>}<Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} /></section>
}
