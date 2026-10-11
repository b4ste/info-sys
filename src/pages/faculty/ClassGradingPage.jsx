import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EmptyState, LoadingState, Notice, PageHeader, StatusBadge } from '../../components/Page.jsx'
import ActionDialog from '../../components/ActionDialog.jsx'
import { api, apiAll } from '../../services/api.js'
import { formatGradePoint, percentToGradePoint } from '../../utils/gradeScale.js'

const idOf = (value) => value?._id ?? value
const inputClass = 'mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-100'

const ACTIONS = {
  save: { title: 'Save grades?', description: 'Saves the midterm and finals scores as a draft. Nothing is visible to the student yet.', confirmLabel: 'Save', success: 'Grades saved as a draft.' },
  'publish-midterm': { title: 'Publish midterm grade?', description: 'The student and admin will see the midterm grade. It can no longer be edited afterwards.', confirmLabel: 'Publish midterm', success: 'Midterm grade published.' },
  submit: { title: 'Submit grade?', description: 'Marks the grade as submitted. Requires both midterm and finals. You can still edit scores until it is finalized.', confirmLabel: 'Submit', success: 'Grade submitted.' },
  finalize: { title: 'Finalize grade?', description: 'Locks the scores. They can no longer be edited directly.', confirmLabel: 'Finalize', success: 'Grade finalized.' },
  publish: { title: 'Publish final grade?', description: 'The student and admin will see the finals and the official final grade. Later changes need an approved correction request.', confirmLabel: 'Publish final', success: 'Grade published.' },
}

export default function ClassGradingPage() {
  const { id } = useParams()
  const [offering, setOffering] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [grades, setGrades] = useState([])
  const [selected, setSelected] = useState('')
  const [midterm, setMidterm] = useState('')
  const [finals, setFinals] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [classData, enrollmentItems, gradeItems] = await Promise.all([api(`/class-offerings/${id}`), apiAll(`/enrollments?classOfferingId=${id}&status=approved`), apiAll(`/grades?classOfferingId=${id}`)])
    setOffering(classData.item)
    setEnrollments(enrollmentItems)
    setGrades(gradeItems)
  }, [id])

  useEffect(() => { let active = true; Promise.resolve().then(refresh).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [refresh])

  const enrollment = enrollments.find((item) => item._id === selected)
  const grade = grades.find((item) => idOf(item.enrollmentId) === selected)
  const editable = !grade || ['draft', 'submitted'].includes(grade.status)
  const midtermLocked = Boolean(grade?.midtermPublished)
  const bothEntered = midterm !== '' && finals !== ''
  const average = bothEntered ? (Number(midterm) + Number(finals)) / 2 : null

  function selectEnrollment(enrollmentId) {
    setSelected(enrollmentId)
    const existing = grades.find((item) => idOf(item.enrollmentId) === enrollmentId)
    setMidterm(existing?.midtermScore ?? '')
    setFinals(existing?.finalsScore ?? '')
    setError('')
    setMessage('')
  }

  async function confirm() {
    const key = pending
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (key === 'save') {
        const body = { finalsScore: finals === '' ? null : Number(finals) }
        if (!midtermLocked) body.midtermScore = midterm === '' ? null : Number(midterm)
        await api(`/grades/enrollment/${selected}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await api(`/grades/${grade._id}/${key}`, { method: 'PATCH' })
      }
      setMessage(ACTIONS[key].success)
      await refresh()
    } catch (requestError) { setError(requestError.message) } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const save = (event) => {
    event.preventDefault()
    setPending('save')
  }

  return <section>
    <PageHeader eyebrow="Teaching" title="Grade entry" description={offering ? `${offering.subjectId?.code} · ${offering.subjectId?.name}` : 'Enter midterm and finals grades.'} />
    <Notice error={error} message={message} />
    {loading ? <div className="mt-7"><LoadingState /></div> : <div className="mt-7 grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        {enrollments.length === 0 && <EmptyState>No approved students.</EmptyState>}
        {enrollments.map((item) => <button key={item._id} type="button" onClick={() => selectEnrollment(item._id)} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm ${selected === item._id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}><span>{item.studentId?.firstName} {item.studentId?.lastName}<span className="block text-xs text-slate-500">{item.studentId?.studentNumber}</span></span><StatusBadge status={grades.find((entry) => idOf(entry.enrollmentId) === item._id)?.status ?? 'draft'} /></button>)}
      </div>
      {enrollment && <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{enrollment.studentId?.firstName} {enrollment.studentId?.lastName}</h2>{grade && <StatusBadge status={grade.status} />}</div>
        <form onSubmit={save} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Midterm grade (%)<input type="number" min="0" max="100" step="any" disabled={!editable || midtermLocked} value={midterm} onChange={(event) => setMidterm(event.target.value)} className={inputClass} /></label>
          <p className="text-sm text-slate-500">Midterm equivalent: {midterm === '' ? '—' : formatGradePoint(percentToGradePoint(Number(midterm)))}{midtermLocked && ' · published to student'}</p>
          <label className="block border-t border-slate-100 pt-4 text-sm font-medium">Finals grade (%)<input type="number" min="0" max="100" step="any" disabled={!editable} value={finals} onChange={(event) => setFinals(event.target.value)} className={inputClass} /></label>
          <p className="text-sm text-slate-500">Finals equivalent: {finals === '' ? '—' : formatGradePoint(percentToGradePoint(Number(finals)))}</p>
          <p className="border-t border-slate-100 pt-4 text-sm font-semibold">Official final grade: {average == null ? 'Enter both midterm and finals' : `${formatGradePoint(percentToGradePoint(average))} (average ${average.toFixed(2)}%)`}</p>
          {editable && <button type="submit" className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Save grades</button>}
        </form>
        {grade && <div className="mt-6 flex flex-wrap gap-3">
          {grade.midtermScore != null && !grade.midtermPublished && <button type="button" onClick={() => setPending('publish-midterm')} className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700">Publish midterm</button>}
          {grade.status === 'draft' && <button type="button" onClick={() => setPending('submit')} className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700">Submit</button>}
          {grade.status === 'submitted' && <button type="button" onClick={() => setPending('finalize')} className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700">Finalize</button>}
          {grade.status === 'finalized' && <button type="button" onClick={() => setPending('publish')} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">Publish final</button>}
        </div>}
      </div>}
    </div>}
    {pending && <ActionDialog {...ACTIONS[pending]} busy={busy} onCancel={() => setPending(null)} onConfirm={confirm} />}
  </section>
}
