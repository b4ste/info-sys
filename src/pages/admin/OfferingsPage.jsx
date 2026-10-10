import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api, apiAll } from '../../services/api.js'
import { referenceLabel } from './resourceConfig.js'

const fields = [
  ['subjectId', 'Subject', 'subjects'], ['academicTermId', 'Term', 'academic-terms'], ['programId', 'Program', 'programs'], ['yearLevel', 'Year level', 'number'], ['sectionId', 'Section (optional)', 'sections'], ['facultyId', 'Assigned faculty', 'faculty'], ['capacity', 'Capacity', 'number'],
]
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function OfferingsPage() {
  const list = useApiList('/class-offerings')
  const [refs, setRefs] = useState({})
  const [form, setForm] = useState({})
  const [components, setComponents] = useState([])
  const [schedule, setSchedule] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.all(['subjects', 'academic-terms', 'programs', 'sections', 'faculty'].map(async (source) => [source, await apiAll(`/${source}`)]))
      .then((entries) => { if (active) setRefs(Object.fromEntries(entries)) })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [])

  function reset() { setEditing(null); setForm({}); setComponents([]); setSchedule([]) }
  function edit(item) {
    setEditing(item)
    setForm(Object.fromEntries(fields.map(([name]) => [name, item[name]?._id ?? item[name] ?? ''])))
    setComponents(item.gradeComponents ?? [])
    setSchedule(item.schedule ?? [])
  }
  function updateRow(setter, rows, index, key, value) { setter(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row)) }

  async function save(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const body = { ...form, yearLevel: Number(form.yearLevel), capacity: Number(form.capacity), gradeComponents: components.map((item) => ({ name: item.name, weight: Number(item.weight) })), schedule }
    if (!body.sectionId) delete body.sectionId
    try {
      await api(`/class-offerings${editing ? `/${editing._id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) })
      setMessage(editing ? 'Offering updated.' : 'Offering created.')
      reset()
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
  }

  async function changeStatus(item, status) {
    setError('')
    try {
      await api(`/class-offerings/${item._id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setMessage(`Offering ${status}.`)
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
  }

  return <section>
    <PageHeader eyebrow="Academic management" title="Class offerings" description="Assign faculty, set capacity, schedule classes, and configure grade weights." />
    <Notice error={error || list.error} message={message} />
    <form onSubmit={save} className="mt-7 space-y-6 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{editing ? 'Edit offering' : 'Create offering'}</h2>{editing && <button type="button" onClick={reset} className="text-sm underline">Cancel</button>}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([name, label, type]) => <label key={name} className="text-sm font-medium text-slate-700">{label}
        {type === 'number' ? <input required type="number" min="1" value={form[name] ?? ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /> : <select required={name !== 'sectionId'} value={form[name] ?? ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select…</option>{(refs[type] ?? []).map((item) => <option key={item._id} value={item._id}>{referenceLabel(type, item)}</option>)}</select>}
      </label>)}</div>
      <div><div className="flex items-center justify-between"><h3 className="font-semibold">Grade components</h3><button type="button" onClick={() => setComponents([...components, { name: '', weight: '' }])} className="text-sm font-medium text-blue-700">Add component</button></div><p className="mt-1 text-sm text-slate-500">Weights must total 100% before grades can be completed.</p><div className="mt-3 space-y-2">{components.map((item, index) => <div key={index} className="flex flex-wrap gap-2"><input aria-label={`Component ${index + 1} name`} required placeholder="Name" value={item.name} onChange={(event) => updateRow(setComponents, components, index, 'name', event.target.value)} className="min-w-40 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input aria-label={`Component ${index + 1} weight`} required type="number" min="0" max="100" placeholder="Weight %" value={item.weight} onChange={(event) => updateRow(setComponents, components, index, 'weight', event.target.value)} className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={() => setComponents(components.filter((_, rowIndex) => rowIndex !== index))} className="text-sm text-rose-700">Remove</button></div>)}</div></div>
      <div><div className="flex items-center justify-between"><h3 className="font-semibold">Schedule</h3><button type="button" onClick={() => setSchedule([...schedule, { day: 'Monday', startTime: '08:00', endTime: '09:00', room: '' }])} className="text-sm font-medium text-blue-700">Add meeting</button></div><div className="mt-3 space-y-2">{schedule.map((item, index) => <div key={index} className="flex flex-wrap gap-2"><select aria-label={`Meeting ${index + 1} day`} value={item.day} onChange={(event) => updateRow(setSchedule, schedule, index, 'day', event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{days.map((day) => <option key={day}>{day}</option>)}</select><input aria-label={`Meeting ${index + 1} start time`} type="time" value={item.startTime} onChange={(event) => updateRow(setSchedule, schedule, index, 'startTime', event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input aria-label={`Meeting ${index + 1} end time`} type="time" value={item.endTime} onChange={(event) => updateRow(setSchedule, schedule, index, 'endTime', event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input aria-label={`Meeting ${index + 1} room`} placeholder="Room" value={item.room ?? ''} onChange={(event) => updateRow(setSchedule, schedule, index, 'room', event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button type="button" onClick={() => setSchedule(schedule.filter((_, rowIndex) => rowIndex !== index))} className="text-sm text-rose-700">Remove</button></div>)}</div></div>
      <button type="submit" className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">{editing ? 'Save changes' : 'Create offering'}</button>
    </form>
    {list.loading ? <div className="mt-7"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-7"><EmptyState /></div> : <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{list.items.map((item) => <tr key={item._id} className="border-t border-slate-100"><td className="px-4 py-3">{item.subjectId?.code} · {item.subjectId?.name}</td><td className="px-4 py-3">{referenceLabel('academic-terms', item.academicTermId)}</td><td className="px-4 py-3">{item.enrollmentCount}/{item.capacity}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="space-x-3 whitespace-nowrap px-4 py-3"><button type="button" onClick={() => edit(item)} className="font-medium text-blue-700">Edit</button>{item.status === 'open' && <button type="button" onClick={() => changeStatus(item, 'closed')} className="font-medium text-amber-700">Close</button>}{item.status === 'closed' && <button type="button" onClick={() => changeStatus(item, 'open')} className="font-medium text-blue-700">Open</button>}{item.status !== 'completed' && <button type="button" onClick={() => changeStatus(item, 'completed')} className="font-medium text-slate-700">Complete</button>}</td></tr>)}</tbody></table></div>}
    <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
  </section>
}
