import { useEffect, useRef, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, RowActionButton, StatusBadge } from '../../components/Page.jsx'
import SelectMenu from '../../components/SelectMenu.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api, apiAll } from '../../services/api.js'

const studentFields = [
  ['userId', 'Account', 'users'], ['studentNumber', 'Student number'], ['firstName', 'First name'], ['middleName', 'Middle name'], ['lastName', 'Last name'], ['birthDate', 'Birth date', 'date'], ['contactEmail', 'Contact email', 'email'], ['phone', 'Phone (+63 mobile)', 'phone'], ['programId', 'Program', 'programs'], ['yearLevel', 'Year level', 'yearLevel'], ['sectionId', 'Section', 'sections'],
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
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const dialogRef = useRef(null)
  const selectedAccount = (refs.users ?? []).find((account) => account._id === form.userId)
  const localToday = new Date()
  localToday.setMinutes(localToday.getMinutes() - localToday.getTimezoneOffset())
  const maxBirthDate = localToday.toISOString().slice(0, 10)

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
    setError('')
    if (kind === 'student') setFormOpen(true)
  }

  function closeForm() {
    if (saving) return
    setFormOpen(false)
    setEditing(null)
    setForm({})
    setError('')
  }

  useEffect(() => {
    if (!formOpen || kind !== 'student') return undefined
    const previousFocus = document.activeElement
    dialogRef.current?.querySelector('input:not([readonly]), button, select')?.focus()
    return () => previousFocus?.focus()
  }, [formOpen, kind])

  function handleDialogKeyDown(event) {
    if (event.key === 'Escape' && !saving) {
      closeForm()
      return
    }
    if (event.key !== 'Tab') return
    const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
    if (!controls.length) return
    if (event.shiftKey && document.activeElement === controls[0]) {
      event.preventDefault()
      controls.at(-1).focus()
    } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
      event.preventDefault()
      controls[0].focus()
    }
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!selectedAccount) {
      setError('Select an account before saving the profile.')
      return
    }
    setSaving(true)
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
      if (kind === 'student') setFormOpen(false)
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }

  function options(source) {
    const items = refs[source] ?? []
    const available = source === 'sections' ? items.filter((item) => (!form.programId || item.programId === form.programId) && (!form.yearLevel || String(item.yearLevel) === String(form.yearLevel))) : items
    return available.map((item) => ({ value: item._id, label: source === 'users' ? item.email : ['sections', 'departments'].includes(source) ? item.name : `${item.code} · ${item.name}` }))
  }

  function updateField(name, value) {
    if (name === 'studentNumber') {
      const digits = value.replace(/\D/g, '').slice(0, 10)
      value = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits
    } else if (name === 'phone') {
      value = value.replace(/[^\d+]/g, '')
    }
    setForm((current) => ({ ...current, [name]: value }))
  }

  return <section className="space-y-6">
    <PageHeader eyebrow="Directory Administration" title={`${kind === 'student' ? 'Student' : 'Faculty'} Profiles`} description="Link authenticated institutional accounts to official National University registrar profiles." />
    <Notice error={kind === 'student' && formOpen ? list.error : error || list.error} message={kind === 'student' && formOpen ? '' : message} />
    {kind === 'student' && <button type="button" onClick={() => { setEditing(null); setForm({}); setError(''); setMessage(''); setFormOpen(true) }} className="rounded-lg bg-[#273a72] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#1c2e5b] dark:bg-[#ebb12a] dark:text-[#111e3e] dark:hover:bg-[#f5b731]">Add Student Profile</button>}
    {(kind !== 'student' || formOpen) && <div className={kind === 'student' ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4' : ''} onMouseDown={kind === 'student' ? (event) => { if (event.target === event.currentTarget) closeForm() } : undefined} onKeyDown={kind === 'student' ? handleDialogKeyDown : undefined}>
      <form onSubmit={save} className={kind === 'student' ? 'max-h-[min(90vh,800px)] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-[#273e7a] dark:bg-[#16264f] dark:text-white' : 'rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-6 shadow-xs'} ref={kind === 'student' ? dialogRef : undefined} role={kind === 'student' ? 'dialog' : undefined} aria-modal={kind === 'student' ? 'true' : undefined} aria-labelledby={kind === 'student' ? 'student-profile-dialog-title' : undefined}>
        <div className="mb-5 flex items-center justify-between gap-4"><h2 id={kind === 'student' ? 'student-profile-dialog-title' : undefined} className="text-base font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">{editing ? 'Edit Profile Record' : 'Create Profile Record'}</h2>{kind === 'student' ? <button type="button" onClick={closeForm} disabled={saving} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-[#273e7a] dark:text-blue-100 dark:hover:bg-white/10">Close</button> : editing && <button type="button" onClick={closeForm} className="text-xs text-slate-500 underline hover:text-slate-800 dark:text-blue-300 dark:hover:text-white">Cancel</button>}</div>
        {kind === 'student' && error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([name, label, type]) => <div key={name} className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-blue-100"><span>{label}</span>
          {type === 'yearLevel' ? <SelectMenu ariaLabel={label} required value={form[name] ?? ''} onChange={(value) => setForm({ ...form, yearLevel: value, sectionId: '' })} options={[...((refs.programs ?? []).find((program) => program._id === form.programId)?.yearLevels ?? []).map((year) => ({ value: year, label: `${year}${year % 10 === 1 && year % 100 !== 11 ? 'st' : year % 10 === 2 && year % 100 !== 12 ? 'nd' : year % 10 === 3 && year % 100 !== 13 ? 'rd' : 'th'} year` })), { value: 'irregular', label: 'Irregular' }]} /> : ['users', 'programs', 'sections', 'departments'].includes(type) ? <SelectMenu ariaLabel={label} disabled={(editing && name === 'userId') || (name === 'sectionId' && form.yearLevel === 'irregular')} required={name !== 'sectionId' && !(editing && name === 'userId')} value={form[name] ?? ''} onChange={(value) => setForm({ ...form, [name]: value, ...(name === 'programId' ? { yearLevel: '', sectionId: '' } : {}) })} options={[...(name === 'sectionId' ? [{ value: '', label: 'None' }] : []), ...options(type)]} /> : <input aria-label={label} required={!['middleName', 'birthDate', 'phone', 'contactEmail'].includes(name)} type={type === 'phone' ? 'tel' : type === 'date' ? 'date' : type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'} inputMode={name === 'studentNumber' ? 'numeric' : type === 'phone' ? 'tel' : undefined} pattern={name === 'studentNumber' ? '\\d{4}-\\d{6}' : type === 'phone' ? '(?:\\+639\\d{9}|09\\d{9})' : undefined} title={name === 'studentNumber' ? 'Use the format 0000-000000.' : type === 'phone' ? 'Use +639XXXXXXXXX or 09XXXXXXXXX.' : undefined} placeholder={name === 'studentNumber' ? '0000-000000' : type === 'phone' ? '+639XXXXXXXXX' : undefined} maxLength={name === 'studentNumber' ? 11 : type === 'phone' ? 13 : undefined} max={type === 'date' ? maxBirthDate : undefined} min={type === 'number' ? 1 : undefined} value={accountFields.has(name) ? selectedAccount?.[name] ?? '' : form[name] ?? ''} readOnly={accountFields.has(name)} onChange={accountFields.has(name) ? undefined : (event) => updateField(name, event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 read-only:cursor-default read-only:bg-slate-50 dark:border-[#273e7a] dark:bg-[#132247] dark:text-white dark:read-only:bg-white/5" />}
        </div>)}</div>
        <div className="mt-5 flex justify-end gap-2.5">{kind === 'student' && <button type="button" onClick={closeForm} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-[#273e7a] dark:text-blue-100 dark:hover:bg-white/10">Cancel</button>}<button type="submit" disabled={saving} className="rounded-lg bg-[#273a72] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#1c2e5b] disabled:opacity-50 dark:bg-[#ebb12a] dark:text-[#111e3e] dark:hover:bg-[#f5b731]">{saving ? 'Saving…' : editing ? 'Save Profile Changes' : 'Create Profile'}</button></div>
      </form>
    </div>}
    {list.loading ? <div className="mt-6"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-6"><EmptyState /></div> : <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-xs"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Identifier</th><th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Name</th><th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Status</th><th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Action</th></tr></thead><tbody>{list.items.map((item) => <tr key={item._id} className="border-t border-slate-100 dark:border-white/5"><td className="px-5 py-3.5 font-bold text-[#273a72] dark:text-white">{item.studentNumber ?? item.employeeNumber}</td><td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{item.firstName} {item.lastName}</td><td className="px-5 py-3.5"><StatusBadge status={item.status} /></td><td className="px-5 py-3.5"><RowActionButton onClick={() => edit(item)}>Edit</RowActionButton></td></tr>)}</tbody></table></div>}
    <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
  </section>
}
