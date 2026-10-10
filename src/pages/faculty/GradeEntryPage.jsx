import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EmptyState, LoadingState, Notice, PageHeader, StatusBadge } from '../../components/Page.jsx'
import { api, apiAll } from '../../services/api.js'

export default function GradeEntryPage() {
  const { id } = useParams()
  const [offering, setOffering] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [grades, setGrades] = useState([])
  const [selected, setSelected] = useState('')
  const [scores, setScores] = useState({})
  const [finalGrade, setFinalGrade] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    const [classData, enrollmentItems, gradeItems] = await Promise.all([api(`/class-offerings/${id}`), apiAll(`/enrollments?classOfferingId=${id}&status=approved`), apiAll(`/grades?classOfferingId=${id}`)])
    setOffering(classData.item)
    setEnrollments(enrollmentItems)
    setGrades(gradeItems)
  }, [id])

  useEffect(() => { let active = true; Promise.resolve().then(refresh).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [refresh])

  const enrollment = enrollments.find((item) => item._id === selected)
  const grade = grades.find((item) => (item.enrollmentId?._id ?? item.enrollmentId) === selected)

  function selectEnrollment(enrollmentId) {
    setSelected(enrollmentId)
    const existing = grades.find((item) => (item.enrollmentId?._id ?? item.enrollmentId) === enrollmentId)
    setScores(Object.fromEntries((existing?.components ?? []).map((item) => [item.name, { earnedScore: item.earnedScore, maxScore: item.maxScore }])))
    setFinalGrade(existing?.finalGrade ?? '')
    setError('')
    setMessage('')
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const components = offering.gradeComponents.filter((item) => scores[item.name]?.earnedScore !== '' && scores[item.name]?.earnedScore != null && scores[item.name]?.maxScore).map((item) => ({ name: item.name, earnedScore: Number(scores[item.name].earnedScore), maxScore: Number(scores[item.name].maxScore) }))
    try {
      await api(`/grades/enrollment/${selected}`, { method: 'PUT', body: JSON.stringify({ components, finalGrade: finalGrade === '' ? null : Number(finalGrade) }) })
      setMessage('Grade saved as a draft.')
      await refresh()
    } catch (requestError) { setError(requestError.message) }
  }

  async function transition(operation) {
    setError('')
    setMessage('')
    try {
      await api(`/grades/${grade._id}/${operation}`, { method: 'PATCH' })
      setMessage(`Grade ${operation === 'publish' ? 'published' : operation === 'finalize' ? 'finalized' : 'submitted'}.`)
      await refresh()
    } catch (requestError) { setError(requestError.message) }
  }

  return <section><PageHeader eyebrow="Teaching" title="Grade entry" description={offering ? `${offering.subjectId?.code} · ${offering.subjectId?.name}` : 'Enter scores and official final grades.'} /><Notice error={error} message={message} />{loading ? <div className="mt-7"><LoadingState /></div> : <div className="mt-7 grid gap-6 lg:grid-cols-[280px_1fr]"><div className="space-y-2">{enrollments.length === 0 && <EmptyState>No approved students.</EmptyState>}{enrollments.map((item) => <button key={item._id} type="button" onClick={() => selectEnrollment(item._id)} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left text-sm ${selected === item._id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'}`}><span>{item.studentId?.firstName} {item.studentId?.lastName}<span className="block text-xs text-slate-500">{item.studentId?.studentNumber}</span></span><StatusBadge status={grades.find((entry) => (entry.enrollmentId?._id ?? entry.enrollmentId) === item._id)?.status ?? 'draft'} /></button>)}</div>{enrollment && <div className="rounded-xl border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{enrollment.studentId?.firstName} {enrollment.studentId?.lastName}</h2>{grade && <StatusBadge status={grade.status} />}</div><p className="mt-2 text-sm text-slate-500">Calculated: {grade?.calculatedGrade == null ? 'Incomplete scores' : `${grade.calculatedGrade}%`} · Official: {grade?.finalGrade ?? 'Not entered'}</p><form onSubmit={save} className="mt-6 space-y-4">{offering.gradeComponents.map((component) => <div key={component.name} className="grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_110px_110px] sm:items-center"><label className="text-sm font-medium">{component.name} ({component.weight}%)</label><input aria-label={`${component.name} earned score`} type="number" min="0" step="any" placeholder="Earned" disabled={grade && !['draft', 'submitted'].includes(grade.status)} value={scores[component.name]?.earnedScore ?? ''} onChange={(event) => setScores({ ...scores, [component.name]: { ...scores[component.name], earnedScore: event.target.value } })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input aria-label={`${component.name} maximum score`} type="number" min="0.01" step="any" placeholder="Maximum" disabled={grade && !['draft', 'submitted'].includes(grade.status)} value={scores[component.name]?.maxScore ?? ''} onChange={(event) => setScores({ ...scores, [component.name]: { ...scores[component.name], maxScore: event.target.value } })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>)}<label className="block text-sm font-medium">Official final grade<input type="number" step="any" disabled={grade && !['draft', 'submitted'].includes(grade.status)} value={finalGrade} onChange={(event) => setFinalGrade(event.target.value)} className="mt-1 block w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5" /></label>{(!grade || ['draft', 'submitted'].includes(grade.status)) && <button type="submit" className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Save grade</button>}</form>{grade && <div className="mt-6 flex flex-wrap gap-3">{grade.status === 'draft' && <button type="button" onClick={() => transition('submit')} className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700">Submit</button>}{grade.status === 'submitted' && <button type="button" onClick={() => transition('finalize')} className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-medium text-blue-700">Finalize</button>}{grade.status === 'finalized' && <button type="button" onClick={() => transition('publish')} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">Publish</button>}</div>}</div>}</div>}</section>
}
