import { useState } from 'react'
import { EmptyState, LoadingState, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { formatGradePoint } from '../../utils/gradeScale.js'

export default function GradeOversightPage() {
  const [status, setStatus] = useState('')
  const list = useApiList(`/grades${status ? `?status=${status}` : ''}`)

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Registrar Oversight"
        title="Official Grade Oversight"
        description="Comprehensive institutional repository of student grade entries. Any modification to published grades requires an approved faculty petition."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="block max-w-xs text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
          Filter by Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              list.setPage(1)
            }}
            className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2 text-xs text-slate-800 dark:text-white"
          >
            <option value="">All Grading Stages</option>
            {['draft', 'submitted', 'finalized', 'published'].map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.error && (
        <div role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-3.5 text-xs text-rose-800 dark:text-rose-200">
          {list.error}
        </div>
      )}

      {list.loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : list.items.length === 0 ? (
        <div className="mt-6"><EmptyState>No grade records found matching the criteria.</EmptyState></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-xs">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Student
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Midterm
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Finals
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Calculated
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Official Final
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Status
                </th>
                <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Corrections
                </th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((item) => (
                <tr key={item._id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {item.enrollmentId?.studentId?.firstName} {item.enrollmentId?.studentId?.lastName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-blue-300">
                      {item.enrollmentId?.studentId?.studentNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-blue-100">
                    {item.midtermGrade != null ? formatGradePoint(item.midtermGrade) : '—'}
                    {item.midtermScore != null && ` (${item.midtermScore}%)`}
                    {item.midtermPublished && (
                      <span className="ml-2 inline-block rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                        Published
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-700 dark:text-blue-100">
                    {item.finalsGrade != null ? formatGradePoint(item.finalsGrade) : '—'}
                    {item.finalsScore != null && ` (${item.finalsScore}%)`}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 dark:text-blue-100">
                    {item.calculatedGrade == null ? 'Incomplete' : `${item.calculatedGrade}%`}
                  </td>
                  <td className="px-5 py-3.5 font-extrabold text-[#273a72] dark:text-[#ebb12a]">
                    {item.finalGrade != null ? formatGradePoint(item.finalGrade) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-blue-300">
                    {item.revisions?.length > 0 ? (
                      <span className="font-bold text-amber-700 dark:text-amber-300">{item.revisions.length} revision(s)</span>
                    ) : (
                      'None'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
    </section>
  )
}
