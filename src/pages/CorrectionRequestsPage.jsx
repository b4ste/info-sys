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
    Promise.all([apiAll('/grades?status=published'), apiAll('/class-offerings')])
      .then(([gradeItems, offeringItems]) => {
        if (active) {
          setGrades(gradeItems)
          setOfferings(offeringItems)
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setGradesLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const offeringById = useMemo(
    () => new Map(offerings.map((offering) => [String(offering._id), offering])),
    [offerings]
  )
  const gradeById = useMemo(() => new Map(grades.map((grade) => [String(grade._id), grade])), [grades])
  const classGrades = useMemo(
    () =>
      grades.filter(
        (grade) =>
          String(grade.enrollmentId?.classOfferingId?._id ?? grade.enrollmentId?.classOfferingId) === offeringId
      ),
    [grades, offeringId]
  )

  async function submit(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const proposed = Number(proposedFinalGrade)
    if (!Number.isFinite(proposed) || proposed < 0 || proposed > 100) {
      setError('Proposed grade must be between 0 and 100.')
      return
    }
    try {
      await api('/grade-correction-requests', {
        method: 'POST',
        body: JSON.stringify({ gradeId, component, proposedFinalGrade: proposed, reason }),
      })
      setMessage('Grade correction request submitted to registrar for review.')
      setOfferingId('')
      setGradeId('')
      setComponent('')
      setProposedFinalGrade('')
      setReason('')
      await list.refresh()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function decide(item, operation) {
    setError('')
    setMessage('')
    try {
      await api(`/grade-correction-requests/${item._id}/${operation}`, {
        method: 'PATCH',
        ...(operation === 'reject' && { body: JSON.stringify({}) }),
      })
      setMessage(`Correction request ${operation === 'approve' ? 'approved' : 'rejected'}.`)
      await list.refresh()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Academic Records & Registrar"
        title={admin ? 'Grade Correction Approvals' : 'Grade Change Petitions'}
        description={
          admin
            ? 'Official registrar workbench to review faculty petitions for published grade amendments.'
            : 'Formally request an adjustment to a published official student grade with supporting justification.'
        }
      />

      <Notice error={error || list.error} message={message} />

      {!admin && gradesLoading && (
        <div className="mt-6"><LoadingState /></div>
      )}

      {!admin && !gradesLoading && !error && grades.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-6 text-xs text-slate-600 dark:text-blue-100 shadow-xs">
          No published grades are currently eligible for correction in your assigned classes. Enter and publish a grade from{' '}
          <Link to="/faculty/classes" className="font-bold underline text-[#273a72] dark:text-[#ebb12a]">
            My classes
          </Link>{' '}
          first.
        </div>
      )}

      {!admin && !gradesLoading && grades.length > 0 && (
        <form
          onSubmit={submit}
          className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-6 shadow-xs grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 border-b border-slate-100 dark:border-white/5 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
              Submit Grade Correction Petition
            </h2>
          </div>

          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
            Course Section
            <select
              required
              value={offeringId}
              onChange={(event) => {
                setOfferingId(event.target.value)
                setGradeId('')
              }}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-slate-800 dark:text-white"
            >
              <option value="">Select course…</option>
              {offerings.map((offering) => (
                <option key={offering._id} value={offering._id}>
                  {offering.subjectId?.code} · {offering.subjectId?.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
            Enrolled Student (Current Grade)
            <select
              required
              disabled={!offeringId}
              value={gradeId}
              onChange={(event) => setGradeId(event.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-slate-800 dark:text-white disabled:opacity-50"
            >
              <option value="">Select student…</option>
              {classGrades.map((grade) => (
                <option key={grade._id} value={grade._id}>
                  {grade.enrollmentId?.studentId?.studentNumber} · {grade.enrollmentId?.studentId?.firstName}{' '}
                  {grade.enrollmentId?.studentId?.lastName} (Midterm: {grade.midtermScore ?? '—'} / Finals:{' '}
                  {grade.finalsScore ?? '—'})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
            Grading Component to Modify
            <select
              required
              value={component}
              onChange={(event) => setComponent(event.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-slate-800 dark:text-white"
            >
              <option value="">Select midterm or finals…</option>
              <option value="midterm">Midterm Score</option>
              <option value="finals">Finals Score</option>
            </select>
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
            Proposed New Grade (0–100)
            <input
              required
              type="number"
              min="0"
              max="100"
              step="any"
              value={proposedFinalGrade}
              onChange={(event) => setProposedFinalGrade(event.target.value)}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-slate-800 dark:text-white"
              placeholder="e.g. 92.5"
            />
          </label>

          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200 sm:col-span-2">
            Justification & Supporting Reason
            <textarea
              required
              minLength={5}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-slate-800 dark:text-white"
              placeholder="Provide a clear academic reason for the grade change request..."
            />
          </label>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-[#273a72] dark:bg-[#ebb12a] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white dark:text-[#111e3e] hover:bg-[#1c2e5b] dark:hover:bg-[#f5b731] transition-colors"
            >
              Submit Official Correction Request
            </button>
          </div>
        </form>
      )}

      {list.loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : list.items.length === 0 ? (
        <div className="mt-6"><EmptyState>No grade correction requests recorded yet.</EmptyState></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-xs">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Student
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Course
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Grade Revision
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Reason
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Status & Review
                </th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((item) => {
                const grade = gradeById.get(String(item.gradeId))
                const student = grade?.enrollmentId?.studentId
                const offering = offeringById.get(
                  String(grade?.enrollmentId?.classOfferingId?._id ?? grade?.enrollmentId?.classOfferingId)
                )
                return (
                  <tr key={item._id} className="border-t border-slate-100 dark:border-white/5">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {student ? `${student.firstName} ${student.lastName}` : '—'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-blue-300">
                        {student?.studentNumber}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-blue-100">
                      <strong className="block text-[#273a72] dark:text-[#ebb12a]">
                        {offering?.subjectId?.code ?? '—'}
                      </strong>
                      <span>{offering?.subjectId?.name ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-xs text-slate-800 dark:text-white">
                      <span className="text-slate-400 dark:text-blue-300">
                        {item.component ? `${item.component.toUpperCase()}: ` : 'OFFICIAL: '}
                      </span>
                      <span className="line-through text-slate-400 mr-1.5">{item.previousFinalGrade}</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">&rarr; {item.proposedFinalGrade}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600 dark:text-blue-200 max-w-xs">
                      {item.reason}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={item.status} />
                        {admin && ['pending', 'reviewing'].includes(item.status) && (
                          <button
                            type="button"
                            onClick={() => decide(item, 'approve')}
                            className="rounded-md bg-emerald-600 text-white px-2.5 py-1 text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {admin && item.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => decide(item, 'reject')}
                            className="rounded-md bg-rose-600 text-white px-2.5 py-1 text-xs font-bold hover:bg-rose-700 transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
    </section>
  )
}
