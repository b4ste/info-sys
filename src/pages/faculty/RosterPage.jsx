import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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
    Promise.all([api(`/class-offerings/${id}`), api(`/class-offerings/${id}/roster`)]).then(([offeringResult, rosterResult]) => { if (active) { setOffering(offeringResult.item); setItems(rosterResult.items) } }).catch((requestError) => { if (active) setError(requestError.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  return <section><PageHeader eyebrow="Teaching" title="Class roster" description={offering ? `${offering.subjectId?.code} · ${offering.subjectId?.name}` : 'Approved students in this class.'} />{error && <p role="alert" className="mt-5 text-sm text-rose-700">{error}</p>}{loading ? <div className="mt-7"><LoadingState /></div> : items.length === 0 ? <div className="mt-7"><EmptyState>No approved students yet.</EmptyState></div> : <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[500px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3">Student number</th><th className="px-5 py-3">Name</th><th className="px-5 py-3">Approved</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-t border-slate-100"><td className="px-5 py-4">{item.studentId?.studentNumber}</td><td className="px-5 py-4">{item.studentId?.firstName} {item.studentId?.lastName}</td><td className="px-5 py-4">{item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : '—'}</td></tr>)}</tbody></table></div>}</section>
}
