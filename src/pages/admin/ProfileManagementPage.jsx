import { useEffect, useState } from 'react'
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

function validateStudentProfile(form, selectedAccount, maxBirthDate) {
  const errors = {}
  if (!selectedAccount) errors.userId = 'Select an account.'
  if (!/^\d{4}-\d{6}$/.test(form.studentNumber ?? '')) errors.studentNumber = 'Enter a student number in the format 0000-000000.'
  if (form.birthDate && form.birthDate > maxBirthDate) errors.birthDate = 'Birth date cannot be in the future.'
  if (form.phone && !/^(?:\+639\d{9}|09\d{9})$/.test(form.phone)) errors.phone = 'Enter a Philippine mobile number as +639XXXXXXXXX or 09XXXXXXXXX.'
  if (!form.programId) errors.programId = 'Select a program.'
  if (!form.yearLevel) errors.yearLevel = 'Select a year level.'
  return errors
}

function toInternationalPhone(value) {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  const nationalNumber = digits.startsWith('63') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits
  return nationalNumber ? `+63${nationalNumber}` : ''
}

export default function ProfileManagementPage({ kind }) {
  const resource = kind === 'student' ? 'students' : 'faculty'
  const fields = kind === 'student' ? studentFields : facultyFields
  const list = useApiList(`/${resource}`)
  const [refs, setRefs] = useState({})
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(null)
  const [showValidation, setShowValidation] = useState(false)
  const [validationModalOpen, setValidationModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const selectedAccount = (refs.users ?? []).find((account) => account._id === form.userId)
  const localToday = new Date()
  localToday.setMinutes(localToday.getMinutes() - localToday.getTimezoneOffset())
  const maxBirthDate = localToday.toISOString().slice(0, 10)
  const validationErrors = kind === 'student' ? validateStudentProfile(form, selectedAccount, maxBirthDate) : {}

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
    setForm(Object.fromEntries(fields.map(([name, , type]) => [name, type === 'date' && item[name] ? item[name].slice(0, 10) : type === 'phone' ? toInternationalPhone(item[name]) : item[name] ?? ''])))
    setError('')
    setShowValidation(false)
    setValidationModalOpen(false)
  }

  async function save(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (kind === 'student' && Object.keys(validationErrors).length) {
      setShowValidation(true)
      setValidationModalOpen(true)
      return
    }
    setShowValidation(false)
    setValidationModalOpen(false)
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
      const digits = value.replace(/\D/g, '')
      const nationalNumber = digits.startsWith('63') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits
      value = nationalNumber ? `+63${nationalNumber.slice(0, 10)}` : ''
    }
    setForm((current) => ({ ...current, [name]: value }))
  }

  function closeForm() {
    setEditing(null)
    setForm({})
    setShowValidation(false)
    setValidationModalOpen(false)
  }

  return <section className="space-y-6">
    <PageHeader eyebrow="Directory Administration" title={`${kind === 'student' ? 'Student' : 'Faculty'} Profiles`} description="Link authenticated institutional accounts to official National University registrar profiles." />
    <Notice error={error || list.error} message={message} />
    {showValidation && Object.keys(validationErrors).length > 0 && <div role="status" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"><p className="font-semibold">Please correct these fields:</p><ul className="mt-2 list-disc pl-5">{Object.entries(validationErrors).map(([field, text]) => <li key={field}>{fields.find(([name]) => name === field)?.[1] ?? field}: {text}</li>)}</ul></div>}
    <form onSubmit={save} noValidate={kind === 'student'} className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-6 shadow-xs">
        <div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-base font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">{editing ? 'Edit Profile Record' : 'Create Profile Record'}</h2>{editing && <button type="button" onClick={() => { setEditing(null); setForm({}); setShowValidation(false) }} className="text-xs text-slate-500 underline hover:text-slate-800 dark:text-blue-300 dark:hover:text-white">Cancel</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{fields.map(([name, label, type]) => <div key={name} className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-blue-100"><span>{label}</span>
          {type === 'yearLevel' ? <SelectMenu ariaLabel={label} required value={form[name] ?? ''} onChange={(value) => setForm({ ...form, yearLevel: value, sectionId: '' })} options={[...((refs.programs ?? []).find((program) => program._id === form.programId)?.yearLevels ?? []).map((year) => ({ value: year, label: `${year}${year % 10 === 1 && year % 100 !== 11 ? 'st' : year % 10 === 2 && year % 100 !== 12 ? 'nd' : year % 10 === 3 && year % 100 !== 13 ? 'rd' : 'th'} year` })), { value: 'irregular', label: 'Irregular' }]} />
            : ['users', 'programs', 'sections', 'departments'].includes(type) ? <SelectMenu ariaLabel={label} disabled={(editing && name === 'userId') || (name === 'sectionId' && form.yearLevel === 'irregular')} required={name !== 'sectionId' && !(editing && name === 'userId')} value={form[name] ?? ''} onChange={(value) => setForm({ ...form, [name]: value, ...(name === 'programId' ? { yearLevel: '', sectionId: '' } : {}) })} options={[...(name === 'sectionId' ? [{ value: '', label: 'None' }] : []), ...options(type)]} />
              : type === 'phone' ? <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-[#273e7a] dark:bg-[#132247]"><span aria-hidden="true" className="inline-flex items-center border-r border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600 dark:border-[#273e7a] dark:bg-white/5 dark:text-blue-200">+63</span><input aria-label={label} type="tel" inputMode="numeric" pattern={'9\\d{9}'} title="Enter the 10-digit mobile number after +63." placeholder="9171234567" maxLength={10} value={(form.phone ?? '').slice(3)} onChange={(event) => updateField(name, event.target.value)} className="min-w-0 flex-1 px-3.5 py-2.5 text-xs text-slate-800 outline-none dark:text-white" /></div>
                : <input aria-label={label} required={!['middleName', 'birthDate', 'phone', 'contactEmail'].includes(name)} type={type === 'date' ? 'date' : type === 'email' ? 'email' : type === 'number' ? 'number' : 'text'} inputMode={name === 'studentNumber' ? 'numeric' : undefined} pattern={name === 'studentNumber' ? '\\d{4}-\\d{6}' : undefined} title={name === 'studentNumber' ? 'Use the format 0000-000000.' : undefined} placeholder={name === 'studentNumber' ? '0000-000000' : undefined} maxLength={name === 'studentNumber' ? 11 : undefined} max={type === 'date' ? maxBirthDate : undefined} min={type === 'number' ? 1 : undefined} value={accountFields.has(name) ? selectedAccount?.[name] ?? '' : form[name] ?? ''} readOnly={accountFields.has(name)} onChange={accountFields.has(name) ? undefined : (event) => updateField(name, event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-800 read-only:cursor-default read-only:bg-slate-50 dark:border-[#273e7a] dark:bg-[#132247] dark:text-white dark:read-only:bg-white/5" />}
          {showValidation && validationErrors[name] && <p className="mt-1 text-xs font-medium normal-case text-rose-700 dark:text-rose-300">{validationErrors[name]}</p>}
        </div>)}</div>
        <div className="mt-5 flex justify-end gap-2.5">{kind === 'student' && <button type="button" onClick={closeForm} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-[#273e7a] dark:text-blue-100 dark:hover:bg-white/10">Cancel</button>}<button type="submit" disabled={saving} className="rounded-lg bg-[#273a72] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#1c2e5b] disabled:opacity-50 dark:bg-[#ebb12a] dark:text-[#111e3e] dark:hover:bg-[#f5b731]">{saving ? 'Saving…' : editing ? 'Save Profile Changes' : 'Create Profile'}</button></div>
      </form>
    {validationModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setValidationModalOpen(false) }} onKeyDown={(event) => { if (event.key === 'Escape') setValidationModalOpen(false) }}>
      <div role="dialog" aria-modal="true" aria-labelledby="student-validation-title" className="w-full max-w-md rounded-xl border border-rose-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-rose-800 dark:bg-[#16264f] dark:text-white">
        <h2 id="student-validation-title" className="text-base font-bold text-rose-800 dark:text-rose-200">Please check the student profile</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-blue-100">{Object.entries(validationErrors).map(([field, text]) => <li key={field}>{fields.find(([name]) => name === field)?.[1] ?? field}: {text}</li>)}</ul>
        <div className="mt-5 flex justify-end"><button type="button" autoFocus onClick={() => setValidationModalOpen(false)} className="rounded-lg bg-[#273a72] px-4 py-2 text-xs font-bold text-white hover:bg-[#1c2e5b] dark:bg-[#ebb12a] dark:text-[#111e3e]">Review fields</button></div>
      </div>
    </div>}
    {list.loading ? <div className="mt-6"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-6"><EmptyState /></div> : <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-xs"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Identifier</th><th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Name</th><th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Status</th><th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Action</th></tr></thead><tbody>{list.items.map((item) => <tr key={item._id} className="border-t border-slate-100 dark:border-white/5"><td className="px-5 py-3.5 font-bold text-[#273a72] dark:text-white">{item.studentNumber ?? item.employeeNumber}</td><td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">{item.firstName} {item.lastName}</td><td className="px-5 py-3.5"><StatusBadge status={item.status} /></td><td className="px-5 py-3.5"><RowActionButton onClick={() => edit(item)}>Edit</RowActionButton></td></tr>)}</tbody></table></div>}
    <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
  </section>
}
