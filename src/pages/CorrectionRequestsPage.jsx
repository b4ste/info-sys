import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const [component, setComponent] = useState('')
  const [proposedFinalGrade, setProposedFinalGrade] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [offerings, setOfferings] = useState([])
  const [offeringId, setOfferingId] = useState('')
  const [gradesLoading, setGradesLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([apiAll('/grades?status=published'), apiAll('/class-offerings')]).then(([gradeItems, offeringItems]) => { if (active) { setGrades(gradeItems); setOfferings(offeringItems) } }).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setGradesLoading(false) })
    return () => { active = false }
  }, [])

  const offeringById = useMemo(() => new Map(offerings.map((offering) => [String(offering._id), offering])), [offerings])
  const gradeById = useMemo(() => new Map(grades.map((grade) => [String(grade._id), grade])), [grades])
  const classGrades = useMemo(() => grades.filter((grade) => String(grade.enrollmentId?.classOfferingId?._id ?? grade.enrollmentId?.classOfferingId) === offeringId), [grades, offeringId])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const proposed = Number(proposedFinalGrade)
    if (!Number.isFinite(proposed) || proposed < 0 || proposed > 100) { setError('Proposed grade must be between 0 and 100.'); return }
    try {
      await api('/grade-correction-requests', { method: 'POST', body: JSON.stringify({ gradeId, component, proposedFinalGrade: proposed, reason }) })
      setMessage('Correction request submitted.')
      setOfferingId(''); setGradeId(''); setComponent(''); setProposedFinalGrade(''); setReason('')
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

  return <section>
    <PageHeader eyebrow="Grading" title={admin ? 'Correction approvals' : 'Grade corrections'} description={admin ? 'Review faculty requests to change published official grades.' : 'Request a change to a published official grade with a reason.'} />
    <Notice error={error || list.error} message={message} />
    {!admin && gradesLoading && <div className="mt-7"><LoadingState /></div>}
    {!admin && !gradesLoading && !error && grades.length === 0 && <div className="mt-7 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No published grades are available for correction in your assigned classes. Enter and publish a grade from <Link to="/faculty/classes" className="font-semibold text-blue-700 underline">My classes</Link> first.</div>}
    {!admin && !gradesLoading && grades.length > 0 && <form onSubmit={submit} className="mt-7 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2"><label className="text-sm font-medium">Course<select required value={offeringId} onChange={(event) => { setOfferingId(event.target.value); setGradeId('') }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select course…</option>{offerings.map((offering) => <option key={offering._id} value={offering._id}>{offering.subjectId?.code} · {offering.subjectId?.name}</option>)}</select></label><label className="text-sm font-medium">Enrolled student (current grade)<select required disabled={!offeringId} value={gradeId} onChange={(event) => setGradeId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 disabled:opacity-50"><option value="">Select student…</option>{classGrades.map((grade) => <option key={grade._id} value={grade._id}>{grade.enrollmentId?.studentId?.studentNumber} · {grade.enrollmentId?.studentId?.firstName} {grade.enrollmentId?.studentId?.lastName} · Midterm {grade.midtermScore ?? '—'} / Finals {grade.finalsScore ?? '—'}</option>)}</select></label><label className="text-sm font-medium">Grade to change<select required value={component} onChange={(event) => setComponent(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select midterm or finals…</option><option value="midterm">Midterm</option><option value="finals">Finals</option></select></label><label className="text-sm font-medium">Proposed grade (0–100)<input required type="number" min="0" max="100" step="any" value={proposedFinalGrade} onChange={(event) => setProposedFinalGrade(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" /></label><label className="text-sm font-medium sm:col-span-2">Reason<textarea required minLength={5} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><button type="submit" className="w-fit rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Submit request</button></form>}
    {list.loading ? <div className="mt-7"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-7"><EmptyState>No correction requests submitted yet.</EmptyState></div> : <div className="mt-7 rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold">Submitted Correction Request</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Change grade</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Review status</th></tr></thead><tbody>{list.items.map((item) => { const grade = gradeById.get(String(item.gradeId)); const student = grade?.enrollmentId?.studentId; const offering = offeringById.get(String(grade?.enrollmentId?.classOfferingId?._id ?? grade?.enrollmentId?.classOfferingId)); return <tr key={item._id} className="border-t border-slate-100"><td className="px-4 py-3">{student ? `${student.studentNumber} · ${student.firstName} ${student.lastName}` : '—'}</td><td className="px-4 py-3">{offering?.subjectId?.code ?? '—'}</td><td className="px-4 py-3">{offering?.subjectId?.name ?? '—'}</td><td className="px-4 py-3">{item.component ? `${item.component === 'midterm' ? 'Midterm' : 'Finals'}: ` : 'Official: '}{item.previousFinalGrade} → {item.proposedFinalGrade}</td><td className="px-4 py-3">{item.reason}</td><td className="px-4 py-3"><div className="flex items-center gap-3"><StatusBadge status={item.status} />{admin && ['pending', 'reviewing'].includes(item.status) && <button type="button" onClick={() => decide(item, 'approve')} className="font-medium text-blue-700">{item.status === 'reviewing' ? 'Retry approval' : 'Approve'}</button>}{admin && item.status === 'pending' && <button type="button" onClick={() => decide(item, 'reject')} className="font-medium text-rose-700">Reject</button>}</div></td></tr> })}</tbody></table></div></div>}
    <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
  </section>
}
