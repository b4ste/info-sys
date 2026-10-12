import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '../../components/Page.jsx'
import { api, apiAll } from '../../services/api.js'
import { formatGradePoint } from '../../utils/gradeScale.js'

const offeringLabel = (offering) =>
  `${offering.subjectId?.code} · ${offering.subjectId?.name} (${offering.academicTermId?.academicYear} T${offering.academicTermId?.termNumber})`

export default function FinalGradesPage() {
  const [offerings, setOfferings] = useState([])
  const [offeringId, setOfferingId] = useState('')
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    apiAll('/class-offerings')
      .then((items) => {
        if (active) setOfferings(items)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!offeringId) return
    let active = true
    Promise.resolve().then(async () => {
      setLoading(true)
      setError('')
      try {
        const [roster, grades] = await Promise.all([
          api(`/class-offerings/${offeringId}/roster`),
          apiAll(`/grades?classOfferingId=${offeringId}`),
        ])
        if (!active) return
        const gradeByEnrollment = new Map(grades.map((grade) => [String(grade.enrollmentId?._id), grade]))
        setRows(roster.items.map((enrollment) => ({ enrollment, grade: gradeByEnrollment.get(String(enrollment._id)) })))
      } catch (requestError) {
        if (active) {
          setError(requestError.message)
          setRows([])
        }
      } finally {
        if (active) setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [offeringId])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term
      ? rows.filter(
          ({ enrollment }) =>
            enrollment.studentId?.studentNumber?.toLowerCase().includes(term) ||
            `${enrollment.studentId?.firstName} ${enrollment.studentId?.lastName}`.toLowerCase().includes(term)
        )
      : rows
  }, [rows, search])

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Official Master Grading"
        title="Final Grades Summary"
        description="Select an assigned course section to review official grades and publication statuses for all enrolled students."
      />

      <div className="rounded-xl border border-blue-200/60 dark:border-[#273e7a] bg-blue-50/70 dark:bg-[#192d5c] p-4 text-xs text-[#273a72] dark:text-blue-100 flex items-center justify-between gap-3">
        <span>
          ℹ️ Saved grades remain as Draft until submitted, finalized, and published in{' '}
          <Link to="/faculty/classes" className="font-bold underline text-[#273a72] dark:text-[#ebb12a]">
            My classes
          </Link>.
        </span>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Filter and Class Section Selector */}
      <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-5 shadow-xs">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
            Select Class Section
          </label>
          <select
            value={offeringId}
            onChange={(event) => {
              setOfferingId(event.target.value)
              setRows([])
              setSearch('')
            }}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-slate-800 dark:text-white"
          >
            <option value="">Select an assigned class offering…</option>
            {offerings.map((offering) => (
              <option key={offering._id} value={offering._id}>
                {offeringLabel(offering)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
            Search Student
          </label>
          <input
            type="search"
            value={search}
            disabled={!offeringId}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student number or name"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-slate-800 dark:text-white disabled:opacity-50"
          />
        </div>
      </div>

      {!offeringId ? (
        <div className="mt-6">
          <EmptyState>Please select a class section above to view enrolled students and official grades.</EmptyState>
        </div>
      ) : loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : visible.length === 0 ? (
        <div className="mt-6"><EmptyState>No matching students found in this section.</EmptyState></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-xs">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Student Number
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Full Name
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Midterm
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Finals
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Official Final
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ enrollment, grade }) => (
                <tr key={enrollment._id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="px-5 py-3.5 font-bold text-[#273a72] dark:text-white">
                    {enrollment.studentId?.studentNumber}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                    {enrollment.studentId?.firstName} {enrollment.studentId?.lastName}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-blue-100">
                    {grade?.midtermGrade != null ? formatGradePoint(grade.midtermGrade) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-blue-100">
                    {grade?.finalsGrade != null ? formatGradePoint(grade.finalsGrade) : '—'}
                  </td>
                  <td className="px-5 py-3.5 font-extrabold text-sm text-[#273a72] dark:text-[#ebb12a]">
                    {grade?.finalGrade != null ? formatGradePoint(grade.finalGrade) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    {grade ? <StatusBadge status={grade.status} /> : <span className="text-xs text-slate-400">No Grade Record</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
