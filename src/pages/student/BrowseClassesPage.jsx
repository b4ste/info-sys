import { useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api } from '../../services/api.js'

function scheduleText(schedule) {
  return schedule?.length ? schedule.map((slot) => `${slot.day} ${slot.startTime}–${slot.endTime}${slot.room ? ` · ${slot.room}` : ''}`).join(', ') : 'Schedule not set'
}

export default function BrowseClassesPage() {
  const list = useApiList('/class-offerings?status=open')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')

  async function request(offering) {
    setBusyId(offering._id)
    setError('')
    setMessage('')
    try {
      await api('/enrollments', { method: 'POST', body: JSON.stringify({ classOfferingId: offering._id }) })
      setMessage(`Enrollment request sent for ${offering.subjectId?.name}.`)
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
    finally { setBusyId('') }
  }

  return <section><PageHeader eyebrow="Enrollment" title="Browse classes" description="Offerings for your program and year level. Requests are accepted only during an active term's enrollment period." /><Notice error={error || list.error} message={message} />{list.loading ? <div className="mt-7"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-7"><EmptyState>No open classes are available for your program and year level.</EmptyState></div> : <div className="mt-7 grid gap-4 md:grid-cols-2">{list.items.map((item) => <article key={item._id} className="rounded-xl border border-slate-200 bg-white p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-blue-700">{item.subjectId?.code}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{item.subjectId?.name}</h2></div><StatusBadge status={item.status} /></div><p className="mt-3 text-sm text-slate-600">{item.academicTermId?.academicYear} · Term {item.academicTermId?.termNumber}</p><p className="mt-2 text-sm text-slate-600">{scheduleText(item.schedule)}</p><p className="mt-2 text-sm text-slate-600">Seats: {item.enrollmentCount}/{item.capacity}</p><button type="button" disabled={busyId === item._id || item.enrollmentCount >= item.capacity} onClick={() => request(item)} className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busyId === item._id ? 'Submitting…' : 'Request enrollment'}</button></article>)}</div>}<Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} /></section>
}
