import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import SelectMenu from '../../components/SelectMenu.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api, apiAll } from '../../services/api.js'

const studentFields = [
  ['userId', 'Account', 'users'], ['studentNumber', 'Student number'], ['firstName', 'First name'], ['middleName', 'Middle name'], ['lastName', 'Last name'], ['birthDate', 'Birth date', 'date'], ['contactEmail', 'Contact email', 'email'], ['phone', 'Phone'], ['programId', 'Program', 'programs'], ['yearLevel', 'Year level', 'yearLevel'], ['sectionId', 'Section', 'sections'],
]
const facultyFields = [
  ['userId', 'Account', 'users'], ['employeeNumber', 'Employee number'], ['firstName', 'First name'], ['lastName', 'Last name'], ['departmentId', 'Department', 'departments'], ['contactEmail', 'Contact email', 'email'],
]
const accountFields = new Set(['firstName', 'middleName', 'lastName', 'contactEmail'])

export default function ProfileManagementPage({ kind }) {
  const resource = kind === 'student' ? 'students' : 'faculty'
  const fields = kind === 'student' ? studentFields : facultyFields
  const list = useApiList(`/${resource}`)
  const [refs, setRefs] = useState({})
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const selectedAccount = (refs.users ?? []).find((account) => account._id === form.userId)

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
    if (!selectedAccount) {
      setError('Select an account before saving the profile.')
      return
    }
    const data = {}
    for (const [name, , type] of fields) {
      if (editing && name === 'userId') continue
      if (accountFields.has(name)) continue
      const value = String(form[name] ?? '').trim()
      if (!value && ['middleName', 'birthDate', 'phone'].includes(name)) continue
      if (!value && name === 'sectionId') { if (editing) data.sectionId = null; continue }
      data[name] = type === 'number' || (type === 'yearLevel' && value !== 'irregular') ? Number(value) : type === 'date' ? new Date(`${value}T00:00:00`).toISOString() : value
    }
    data.firstName = selectedAccount.firstName
    data.lastName = selectedAccount.lastName
    if (kind === 'student') data.middleName = selectedAccount.middleName?.trim() || null
    data.contactEmail = selectedAccount.email
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
    return available.map((item) => ({ value: item._id, label: source === 'users' ? item.email : ['sections', 'departments'].includes(source) ? item.name : `${item.code} · ${item.name}` }))
  }

  return <section>
    <PageHeader eyebrow="People" title={`${kind === 'student' ? 'Student' : 'Faculty'} profiles`} description="Link accounts to official academic records. Account creation is in Accounts." />
    <Notice error={error || list.error} message={message} />
    <form onSubmit={save} className="mt-7 rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">{editing ? 'Edit profile' : 'Add profile'}</h2>{editing && <button type="button" onClick={() => { setEditing(null); setForm({}) }} className="text-sm text-slate-600 underline">Cancel</button>}</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([name, label, type]) => <div key={name} className="text-sm font-medium text-slate-700"><span>{label}</span>
        {type === 'yearLevel' ? <SelectMenu ariaLabel={label} required value={form[name] ?? ''} onChange={(value) => setForm({ ...form, yearLevel: value, sectionId: '' })} options={[...((refs.programs ?? []).find((program) => program._id === form.programId)?.yearLevels ?? []).map((year) => ({ value: year, label: `${year}${year % 10 === 1 && year % 100 !== 11 ? 'st' : year % 10 === 2 && year % 100 !== 12 ? 'nd' : year % 10 === 3 && year % 100 !== 13 ? 'rd' : 'th'} year` })), { value: 'irregular', label: 'Irregular' }]} /> : ['users', 'programs', 'sections', 'departments'].includes(type) ? <SelectMenu ariaLabel={label} disabled={(editing && name === 'userId') || (name === 'sectionId' && form.yearLevel === 'irregular')} required={name !== 'sectionId' && !(editing && name === 'userId')} value={form[name] ?? ''} onChange={(value) => setForm({ ...form, [name]: value, ...(name === 'programId' ? { yearLevel: '', sectionId: '' } : {}) })} options={[...(name === 'sectionId' ? [{ value: '', label: 'None' }] : []), ...options(type)]} /> : <input aria-label={label} required={!['middleName', 'birthDate', 'phone', 'contactEmail'].includes(name)} type={name === 'phone' ? 'tel' : type === 'date' ? 'date' : type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'} inputMode={name === 'phone' ? 'numeric' : undefined} pattern={name === 'phone' ? '[0-9]*' : undefined} maxLength={name === 'phone' ? 40 : undefined} min={type === 'number' ? 1 : undefined} value={accountFields.has(name) ? selectedAccount?.[name] ?? '' : form[name] ?? ''} readOnly={accountFields.has(name)} onChange={accountFields.has(name) ? undefined : (event) => setForm({ ...form, [name]: name === 'phone' ? event.target.value.replace(/\D/g, '') : event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 read-only:cursor-default read-only:bg-slate-50" />}
      </div>)}</div>
      <button type="submit" className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">{editing ? 'Save changes' : 'Create profile'}</button>
    </form>
    {list.loading ? <div className="mt-7"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-7"><EmptyState /></div> : <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Identifier</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{list.items.map((item) => <tr key={item._id} className="border-t border-slate-100"><td className="px-4 py-3">{item.studentNumber ?? item.employeeNumber}</td><td className="px-4 py-3">{item.firstName} {item.lastName}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="px-4 py-3"><button type="button" onClick={() => edit(item)} className="font-medium text-blue-700">Edit</button></td></tr>)}</tbody></table></div>}
    <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
  </section>
}
