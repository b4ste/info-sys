import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { EmptyState, LoadingState, PageHeader } from '../../components/Page.jsx'
import { api } from '../../services/api.js'

export default function RosterPage() {
  const { id } = useParams()
  const [items, setItems] = useState([])
  const [offering, setOffering] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([api(`/class-offerings/${id}`), api(`/class-offerings/${id}/roster`)])
      .then(([offeringResult, rosterResult]) => {
        if (active) {
          setOffering(offeringResult.item)
          setItems(rosterResult.items)
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          eyebrow="Official Class Roll"
          title="Class Roster"
          description={
            offering
              ? `${offering.subjectId?.code} · ${offering.subjectId?.name} (${offering.academicTermId?.academicYear} Term ${offering.academicTermId?.termNumber})`
              : 'Approved students enrolled in this section.'
          }
        />
        <Link
          to="/faculty/classes"
          className="rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#16264f] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          &larr; Back to My Classes
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : items.length === 0 ? (
        <div className="mt-6"><EmptyState>No approved students enrolled in this class section yet.</EmptyState></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-xs">
          <table className="w-full min-w-[550px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Student Number
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Student Full Name
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Approval Date
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="px-5 py-3.5 font-bold text-[#273a72] dark:text-white">
                    {item.studentId?.studentNumber}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                    {item.studentId?.firstName} {item.studentId?.lastName}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-blue-200">
                    {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : '—'}
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
