import { useEffect, useMemo, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import DateField from '../../components/DateField.jsx'
import SelectMenu from '../../components/SelectMenu.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api, apiAll } from '../../services/api.js'
import { formatDate, parseDateInput } from '../../utils/date.js'
import { referenceLabel, resourceConfig } from './resourceConfig.js'

function formatInput(value, field) {
  if (value == null) return ''
  if (field.type === 'yearLevels') return value.join(', ')
  if (field.type === 'date') return formatDate(value)
  return String(value)
}

function serialize(form, fields) {
  const data = {}
  for (const field of fields) {
    const value = form[field.name]?.trim() ?? ''
    if (!value && field.optional) continue
    if (field.type === 'number' || field.type === 'term' || field.type === 'programYearLevel') data[field.name] = Number(value)
    else if (field.type === 'yearLevels') data[field.name] = value.split(',').map((item) => Number(item.trim()))
    else if (field.type === 'date') {
      const date = parseDateInput(value)
      if (!date) throw new Error('Enter valid dates using DD/MM/YYYY.')
      data[field.name] = `${date}T00:00:00.000Z`
    }
    else data[field.name] = value
  }
  return data
}

export default function AcademicResourcePage({ resource }) {
  const config = resourceConfig[resource]
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [catalogRevision, setCatalogRevision] = useState(0)
  const [localCatalog, setLocalCatalog] = useState({ resource: '', revision: -1, items: [], error: '' })
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [refs, setRefs] = useState({})
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const listPath = `/${resource}${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`
  const catalogPage = resource === 'programs' || resource === 'sections'
  const list = useApiList(listPath, { limit: catalogPage ? 6 : 20, enabled: !catalogPage })
  const sources = useMemo(() => [...new Set(config.fields.map((field) => field.source).filter(Boolean))], [config])
  const selectedProgram = (refs.programs ?? []).find((program) => program._id === form.programId)
  const programsPage = resource === 'programs'
  const catalogLoading = catalogPage && (localCatalog.resource !== resource || localCatalog.revision !== catalogRevision)
  const searchText = search.trim().toLowerCase()
  const matchingCatalogItems = catalogPage ? localCatalog.items.filter((item) => {
    if (programsPage && departmentFilter && item.departmentId !== departmentFilter) return false
    if (!searchText) return true
    if (programsPage) return `${item.code} ${item.name}`.toLowerCase().includes(searchText)
    const program = (refs.programs ?? []).find((entry) => entry._id === item.programId)
    const term = (refs['academic-terms'] ?? []).find((entry) => entry._id === item.academicTermId)
    return [item.name, item.yearLevel, program?.code, program?.name, term?.academicYear, term?.termNumber]
      .filter((value) => value != null)
      .some((value) => String(value).toLowerCase().includes(searchText))
  }) : []
  const visibleItems = catalogPage ? matchingCatalogItems.slice((list.page - 1) * list.limit, list.page * list.limit) : list.items
  const visibleTotal = catalogPage ? matchingCatalogItems.length : list.total
  const visibleError = catalogPage ? localCatalog.error : list.error

  useEffect(() => {
    if (!catalogPage) return undefined
    let active = true
    apiAll(`/${resource}`).then((items) => {
      if (active) setLocalCatalog({ resource, revision: catalogRevision, items, error: '' })
    }).catch((error) => {
      if (active) setLocalCatalog({ resource, revision: catalogRevision, items: [], error: error.message })
    })
    return () => { active = false }
  }, [catalogPage, catalogRevision, resource])

  useEffect(() => {
    let active = true
    Promise.all(sources.map(async (source) => [source, await apiAll(`/${source}`)]))
      .then((entries) => { if (active) setRefs(Object.fromEntries(entries)) })
      .catch((error) => { if (active) setActionError(error.message) })
    return () => { active = false }
  }, [sources])

  function startEdit(item) {
    setEditing(item)
    setForm(Object.fromEntries(config.fields.map((field) => [field.name, formatInput(item[field.name], field)])))
    setMessage('')
    setActionError('')
  }

  function reset() { setEditing(null); setForm({}) }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setActionError('')
    try {
      const body = serialize(form, config.fields)
      if (resource === 'departments' && !editing) body.code = crypto.randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase()
      await api(`/${resource}${editing ? `/${editing._id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) })
      setMessage(editing ? 'Record updated.' : 'Record created.')
      reset()
      if (catalogPage) { list.setPage(1); setCatalogRevision((revision) => revision + 1) }
      else await list.refresh()
    } catch (error) { setActionError(error.message) }
    finally { setBusy(false) }
  }

  async function action(item, operation) {
    if (operation === 'archive' && !window.confirm(`Archive ${item.name ?? item.code ?? item.academicYear}?`)) return
    setActionError('')
    setMessage('')
    try {
      await api(`/${resource}/${item._id}${operation === 'archive' ? '' : `/${operation}`}`, { method: operation === 'archive' ? 'DELETE' : 'PATCH' })
      setMessage(operation === 'archive' ? 'Record archived.' : `Term ${operation === 'activate' ? 'activated' : 'completed'}.`)
      if (catalogPage) { list.setPage(1); setCatalogRevision((revision) => revision + 1) }
      else await list.refresh()
    } catch (error) { setActionError(error.message) }
  }

  function display(item, field) {
    const value = item[field.name]
    if (field.name === 'departmentId' && !value) return 'Unassigned'
    if (field.source) return referenceLabel(field.source, refs[field.source]?.find((option) => option._id === value))
    if (field.type === 'yearLevels') return value?.join(', ') ?? '—'
    if (field.type === 'date') return value ? formatDate(value) : '—'
    return value ?? '—'
  }

  return (
    <section>
      <PageHeader eyebrow="Academic management" title={config.title} description="Manage the official academic catalog and term structure." />
      <Notice error={actionError || visibleError} message={message} />
      <form onSubmit={save} className="mt-7 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{editing ? 'Edit record' : 'Add record'}</h2>{editing && <button type="button" onClick={reset} className="text-sm text-slate-600 underline">Cancel</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {config.fields.map((field) => <div key={field.name} className="block text-sm font-medium text-slate-700"><span>{field.label}</span>
            {field.type === 'programYearLevel' ? <SelectMenu ariaLabel={field.label} required disabled={!form.programId} value={form[field.name] ?? ''} onChange={(value) => setForm({ ...form, [field.name]: value })} placeholder={form.programId ? 'Select year level…' : 'Select a program first'} options={(selectedProgram?.yearLevels ?? []).map((year) => ({ value: year, label: `${year}${year % 10 === 1 && year % 100 !== 11 ? 'st' : year % 10 === 2 && year % 100 !== 12 ? 'nd' : year % 10 === 3 && year % 100 !== 13 ? 'rd' : 'th'} year` }))} />
              : field.source ? <SelectMenu ariaLabel={field.label} required={!field.optional} value={form[field.name] ?? ''} onChange={(value) => setForm({ ...form, [field.name]: value, ...(resource === 'sections' && field.name === 'programId' ? { yearLevel: '' } : {}) })} placeholder={field.optional ? 'None' : 'Select…'} options={[...(field.optional ? [{ value: '', label: 'None' }] : []), ...(refs[field.source] ?? []).map((item) => ({ value: item._id, label: referenceLabel(field.source, item) }))]} />
              : field.type === 'date' ? <DateField label={field.label} required={!field.optional} value={form[field.name] ?? ''} onChange={(value) => setForm({ ...form, [field.name]: value })} />
                : <input aria-label={field.label} required={!field.optional} type={field.type === 'number' || field.type === 'term' ? 'number' : 'text'} min={field.type === 'term' ? 1 : field.type === 'number' ? 0 : undefined} max={field.type === 'term' ? 3 : undefined} value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />}
          </div>)}
        </div>
        <button type="submit" disabled={busy} className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{busy ? 'Saving…' : editing ? 'Save changes' : 'Create'}</button>
      </form>

      <div className="mt-8 flex flex-wrap items-end gap-3"><input aria-label="Search records" placeholder={resource === 'departments' ? 'Search name' : resource === 'sections' ? 'Search program or section' : 'Search code or name'} value={search} onChange={(event) => { setSearch(event.target.value); list.setPage(1) }} className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />{resource === 'programs' && <div className="ml-auto w-full max-w-xs text-sm font-medium text-slate-700">Department<SelectMenu ariaLabel="Filter programs by department" value={departmentFilter} onChange={(value) => { setDepartmentFilter(value); list.setPage(1) }} options={[{ value: '', label: 'All departments' }, ...(refs.departments ?? []).map((department) => ({ value: department._id, label: department.name }))]} /></div>}</div>
      {(catalogPage ? catalogLoading : list.loading) ? <div className="mt-5"><LoadingState /></div> : visibleItems.length === 0 ? <div className="mt-5"><EmptyState /></div> : <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{config.fields.slice(0, 4).map((field) => <th key={field.name} className="px-4 py-3">{field.label}</th>)}<th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{visibleItems.map((item) => <tr key={item._id} className="border-t border-slate-100">{config.fields.slice(0, 4).map((field) => <td key={field.name} className="px-4 py-3">{display(item, field)}</td>)}<td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="space-x-3 whitespace-nowrap px-4 py-3"><button type="button" onClick={() => startEdit(item)} className="font-medium text-blue-700">Edit</button>{resource === 'academic-terms' ? <>{item.status === 'upcoming' && <button type="button" onClick={() => action(item, 'activate')} className="font-medium text-blue-700">Activate</button>}{item.status === 'active' && <button type="button" onClick={() => action(item, 'complete')} className="font-medium text-blue-700">Complete</button>}</> : item.status === 'active' && <button type="button" onClick={() => action(item, 'archive')} className="font-medium text-rose-700">Archive</button>}</td></tr>)}</tbody></table></div>}
      <Pager page={list.page} total={visibleTotal} limit={list.limit} onPageChange={list.setPage} disabled={catalogPage ? catalogLoading : list.loading} />
    </section>
  )
}
