import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '../../components/Page.jsx'
import { api, apiAll } from '../../services/api.js'

const offeringLabel = (offering) => `${offering.subjectId?.code} · ${offering.subjectId?.name} (${offering.academicTermId?.academicYear} T${offering.academicTermId?.termNumber})`

export default function FinalGradesPage() {
  const [offerings, setOfferings] = useState([])
  const [offeringId, setOfferingId] = useState('')
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiAll('/class-offerings').then((items) => { if (active) setOfferings(items) }).catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!offeringId) return
    let active = true
    Promise.resolve().then(async () => {
      setLoading(true)
      setError('')
      try {
        const [roster, grades] = await Promise.all([api(`/class-offerings/${offeringId}/roster`), apiAll(`/grades?classOfferingId=${offeringId}`)])
        if (!active) return
        const gradeByEnrollment = new Map(grades.map((grade) => [String(grade.enrollmentId?._id), grade]))
        setRows(roster.items.map((enrollment) => ({ enrollment, grade: gradeByEnrollment.get(String(enrollment._id)) })))
      } catch (requestError) {
        if (active) { setError(requestError.message); setRows([]) }
      } finally {
        if (active) setLoading(false)
      }
    })
    return () => { active = false }
  }, [offeringId])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? rows.filter(({ enrollment }) => enrollment.studentId?.studentNumber?.toLowerCase().includes(term)) : rows
  }, [rows, search])

  return <section><PageHeader eyebrow="Teaching" title="Final grades" description="Select a class section to review the official grades of its students." /><p className="mt-3 text-sm text-slate-600">A saved grade stays Draft until you submit, finalize, and publish it in <Link to="/faculty/classes" className="font-semibold text-blue-700 underline">My classes</Link>.</p>{error && <p role="alert" className="mt-5 text-sm text-rose-700">{error}</p>}<div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Class section<select value={offeringId} onChange={(event) => { setOfferingId(event.target.value); setRows([]); setSearch('') }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select class section…</option>{offerings.map((offering) => <option key={offering._id} value={offering._id}>{offeringLabel(offering)}</option>)}</select></label><label className="text-sm font-medium">Search student ID<input type="search" value={search} disabled={!offeringId} onChange={(event) => setSearch(event.target.value)} placeholder="Student ID" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 disabled:opacity-50" /></label></div>{!offeringId ? <div className="mt-7"><EmptyState>Select a class section to view its students.</EmptyState></div> : loading ? <div className="mt-7"><LoadingState /></div> : visible.length === 0 ? <div className="mt-7"><EmptyState>No students found.</EmptyState></div> : <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{visible.map(({ enrollment, grade }) => <tr key={enrollment._id} className="border-t border-slate-100"><td className="px-4 py-3">{enrollment.studentId?.studentNumber}</td><td className="px-4 py-3">{enrollment.studentId?.firstName} {enrollment.studentId?.lastName}</td><td className="px-4 py-3">{grade?.finalGrade ?? '—'}</td><td className="px-4 py-3">{grade ? <StatusBadge status={grade.status} /> : <span className="text-slate-500">No grade</span>}</td></tr>)}</tbody></table></div>}</section>
}
