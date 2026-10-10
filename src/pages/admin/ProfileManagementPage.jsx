import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api, apiAll } from '../../services/api.js'

const studentFields = [
  ['userId', 'Account', 'users'], ['studentNumber', 'Student number'], ['firstName', 'First name'], ['middleName', 'Middle name'], ['lastName', 'Last name'], ['birthDate', 'Birth date', 'date'], ['contactEmail', 'Contact email', 'email'], ['phone', 'Phone'], ['programId', 'Program', 'programs'], ['yearLevel', 'Year level', 'number'], ['sectionId', 'Section', 'sections'],
]
const facultyFields = [
  ['userId', 'Account', 'users'], ['employeeNumber', 'Employee number'], ['firstName', 'First name'], ['lastName', 'Last name'], ['departmentId', 'Department', 'departments'], ['contactEmail', 'Contact email', 'email'],
]

export default function ProfileManagementPage({ kind }) {
  const resource = kind === 'student' ? 'students' : 'faculty'
  const fields = kind === 'student' ? studentFields : facultyFields
  const list = useApiList(`/${resource}`)
  const [refs, setRefs] = useState({})
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    const sources = kind === 'student' ? ['users', 'programs', 'sections'] : ['users', 'departments']
    Promise.all(sources.map(async (source) => [source, await apiAll(`/${source}${source === 'users' ? `?role=${kind}` : ''}`)]))
      .then((entries) => { if (active) setRefs(Object.fromEntries(entries)) })
      .catch((requestError) => { if (active) setError(requestError.message) })
    return () => { active = false }
  }, [kind])

  function edit(item) {
    setEditing(item)
    setForm(Object.fromEntries(fields.map(([name, , type]) => [name, type === 'date' && item[name] ? item[name].slice(0, 10) : item[name] ?? ''])))
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    const data = {}
    for (const [name, , type] of fields) {
      if (editing && name === 'userId') continue
      const value = String(form[name] ?? '').trim()
      if (!value && ['middleName', 'birthDate', 'phone'].includes(name)) continue
      if (!value && name === 'sectionId') { if (editing) data.sectionId = null; continue }
      data[name] = type === 'number' ? Number(value) : type === 'date' ? new Date(`${value}T00:00:00`).toISOString() : value
    }
    try {
      await api(`/${resource}${editing ? `/${editing._id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(data) })
      setMessage(editing ? 'Profile updated.' : 'Profile created.')
      setForm({})
      setEditing(null)
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
  }

  function options(source) {
    const items = refs[source] ?? []
    const available = source === 'sections' ? items.filter((item) => (!form.programId || item.programId === form.programId) && (!form.yearLevel || String(item.yearLevel) === String(form.yearLevel))) : items
    return available.map((item) => <option key={item._id} value={item._id}>{source === 'users' ? item.email : source === 'sections' ? item.name : `${item.code} · ${item.name}`}</option>)
  }

  return <section>
    <PageHeader eyebrow="People" title={`${kind === 'student' ? 'Student' : 'Faculty'} profiles`} description="Link accounts to official academic records. Account creation is in Accounts." />
    <Notice error={error || list.error} message={message} />
    <form onSubmit={save} className="mt-7 rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">{editing ? 'Edit profile' : 'Add profile'}</h2>{editing && <button type="button" onClick={() => { setEditing(null); setForm({}) }} className="text-sm text-slate-600 underline">Cancel</button>}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([name, label, type]) => <label key={name} className="text-sm font-medium text-slate-700">{label}
        {['users', 'programs', 'sections', 'departments'].includes(type) ? <select disabled={editing && name === 'userId'} required={!['sectionId'].includes(name)} value={form[name] ?? ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Select…</option>{options(type)}</select> : <input required={!['middleName', 'birthDate', 'phone'].includes(name)} type={type === 'date' ? 'date' : type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'} min={type === 'number' ? 1 : undefined} value={form[name] ?? ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />}
      </label>)}</div>
      <button type="submit" className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">{editing ? 'Save changes' : 'Create profile'}</button>
    </form>
    {list.loading ? <div className="mt-7"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-7"><EmptyState /></div> : <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Identifier</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{list.items.map((item) => <tr key={item._id} className="border-t border-slate-100"><td className="px-4 py-3">{item.studentNumber ?? item.employeeNumber}</td><td className="px-4 py-3">{item.firstName} {item.lastName}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="px-4 py-3"><button type="button" onClick={() => edit(item)} className="font-medium text-blue-700">Edit</button></td></tr>)}</tbody></table></div>}
    <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
  </section>
}
