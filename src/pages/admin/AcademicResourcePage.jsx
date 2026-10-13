import { useEffect, useMemo, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, RowActionButton, StatusBadge } from '../../components/Page.jsx'
import DateField from '../../components/DateField.jsx'
import ActionDialog from '../../components/ActionDialog.jsx'
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
  const [archiveTarget, setArchiveTarget] = useState(null)
  const listPath = `/${resource}${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`
  const catalogPage = ['programs', 'sections', 'subjects'].includes(resource)
  const list = useApiList(listPath, { limit: catalogPage ? 6 : 20, enabled: !catalogPage })
  const sources = useMemo(() => [...new Set([...config.fields.map((field) => field.source).filter(Boolean), ...(resource === 'departments' ? ['departments'] : []), ...(resource === 'programs' ? ['programs'] : []), ...(resource === 'subjects' ? ['subjects'] : [])])], [config, resource])
  const selectedProgram = (refs.programs ?? []).find((program) => program._id === form.programId)
  const programsPage = resource === 'programs'
  const catalogLoading = catalogPage && (localCatalog.resource !== resource || localCatalog.revision !== catalogRevision)
  const searchText = search.trim().toLowerCase()
  const matchingCatalogItems = catalogPage ? localCatalog.items.filter((item) => {
    if (programsPage && departmentFilter && item.departmentId !== departmentFilter) return false
    if (!searchText) return true
    if (programsPage) return `${item.code} ${item.name}`.toLowerCase().includes(searchText)
    if (resource === 'subjects') return `${item.code} ${item.name}`.toLowerCase().includes(searchText)
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
      if (['departments', 'programs', 'subjects'].includes(resource)) {
        const uniqueFields = resource === 'departments' ? ['name'] : ['code', 'name']
        const existingItems = refs[resource] ?? []
        for (const field of uniqueFields) {
          const value = form[field]?.trim().toLocaleLowerCase('en')
          const duplicate = existingItems.some((item) => item._id !== editing?._id && item[field].trim().toLocaleLowerCase('en') === value)
          if (duplicate) throw new Error(`A ${{ departments: 'department', programs: 'program', subjects: 'subject' }[resource]} with this ${field} already exists.`)
        }
      }
      const body = serialize(form, config.fields)
      if (resource === 'departments' && !editing) body.code = crypto.randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase()
      await api(`/${resource}${editing ? `/${editing._id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) })
      setMessage(editing ? 'Record updated.' : 'Record created.')
      reset()
      if (catalogPage) { list.setPage(1); setCatalogRevision((revision) => revision + 1) }
      else await list.refresh()
    } catch (error) {
      setActionError(resource === 'subjects' && error.status === 400 && error.message === 'Invalid input.'
        ? 'The API rejected the subject data. It may still be running an older version that does not accept Department; update and restart the backend, then try again.'
        : error.message)
    }
    finally { setBusy(false) }
  }

  async function action(item, operation) {
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
      <form onSubmit={save} className="mt-7 rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-5 sm:p-6 shadow-xs">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-base font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">{editing ? 'Edit Academic Record' : 'Add Academic Record'}</h2>{editing && <button type="button" onClick={reset} className="text-xs text-slate-500 hover:text-slate-800 dark:text-blue-300 dark:hover:text-white underline">Cancel</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {config.fields.map((field) => <div key={field.name} className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-blue-100"><span>{field.label}</span>
            {field.type === 'programYearLevel' ? <SelectMenu ariaLabel={field.label} required disabled={!form.programId} value={form[field.name] ?? ''} onChange={(value) => setForm({ ...form, [field.name]: value })} placeholder={form.programId ? 'Select year level…' : 'Select a program first'} options={(selectedProgram?.yearLevels ?? []).map((year) => ({ value: year, label: `${year}${year % 10 === 1 && year % 100 !== 11 ? 'st' : year % 10 === 2 && year % 100 !== 12 ? 'nd' : year % 10 === 3 && year % 100 !== 13 ? 'rd' : 'th'} year` }))} />
              : field.source ? <SelectMenu ariaLabel={field.label} required={!field.optional} value={form[field.name] ?? ''} onChange={(value) => setForm({ ...form, [field.name]: value, ...(resource === 'sections' && field.name === 'programId' ? { yearLevel: '' } : {}) })} placeholder={field.optional ? 'None' : 'Select…'} options={[...(field.optional ? [{ value: '', label: 'None' }] : []), ...(refs[field.source] ?? []).map((item) => ({ value: item._id, label: `${referenceLabel(field.source, item)}${resource === 'programs' && field.source === 'departments' && item.status === 'inactive' ? ' (Inactive)' : ''}`, disabled: resource === 'programs' && field.source === 'departments' && item.status === 'inactive' }))]} />
              : field.type === 'date' ? <DateField label={field.label} required={!field.optional} value={form[field.name] ?? ''} onChange={(value) => setForm({ ...form, [field.name]: value })} />
                : <input aria-label={field.label} required={!field.optional} type={field.type === 'number' || field.type === 'term' ? 'number' : 'text'} min={field.type === 'term' ? 1 : field.type === 'number' ? 0 : undefined} max={field.type === 'term' ? 3 : undefined} value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-slate-800 dark:text-white" />}
          </div>)}
        </div>
        <button type="submit" disabled={busy} className="mt-5 rounded-lg bg-[#273a72] dark:bg-[#ebb12a] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white dark:text-[#111e3e] hover:bg-[#1c2e5b] dark:hover:bg-[#f5b731] transition-colors disabled:opacity-50">{busy ? 'Saving…' : editing ? 'Save Changes' : 'Create Record'}</button>
      </form>

      <div className="mt-8 flex flex-wrap items-end gap-3"><input aria-label="Search records" placeholder={resource === 'departments' ? 'Search name' : resource === 'sections' ? 'Search program or section' : 'Search code or name'} value={search} onChange={(event) => { setSearch(event.target.value); list.setPage(1) }} className="w-full max-w-sm rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2 text-xs text-slate-800 dark:text-white" />{resource === 'programs' && <div className="ml-auto w-full max-w-xs text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-blue-100">Department<SelectMenu ariaLabel="Filter programs by department" value={departmentFilter} onChange={(value) => { setDepartmentFilter(value); list.setPage(1) }} options={[{ value: '', label: 'All departments' }, ...(refs.departments ?? []).map((department) => ({ value: department._id, label: department.name }))]} /></div>}</div>
      {(catalogPage ? catalogLoading : list.loading) ? <div className="mt-5"><LoadingState /></div> : visibleItems.length === 0 ? <div className="mt-5"><EmptyState /></div> : <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-xs"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{config.fields.slice(0, 4).map((field) => <th key={field.name} className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">{field.label}</th>)}<th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Status</th><th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">Actions</th></tr></thead><tbody>{visibleItems.map((item) => <tr key={item._id} className="border-t border-slate-100 dark:border-white/5">{config.fields.slice(0, 4).map((field) => <td key={field.name} className="px-5 py-3.5 text-xs text-slate-800 dark:text-blue-100">{display(item, field)}</td>)}<td className="px-5 py-3.5"><StatusBadge status={item.status} /></td><td className="px-5 py-3.5"><div className="flex items-center gap-1.5 whitespace-nowrap"><RowActionButton onClick={() => startEdit(item)}>Edit</RowActionButton>{resource === 'academic-terms' ? <>{item.status === 'upcoming' && <RowActionButton onClick={() => action(item, 'activate')}>Activate</RowActionButton>}{item.status === 'active' && <RowActionButton onClick={() => action(item, 'complete')}>Complete</RowActionButton>}</> : item.status === 'active' && <RowActionButton tone="danger" onClick={() => setArchiveTarget(item)}>Archive</RowActionButton>}</div></td></tr>)}</tbody></table></div>}
      <Pager page={list.page} total={visibleTotal} limit={list.limit} onPageChange={list.setPage} disabled={catalogPage ? catalogLoading : list.loading} showSinglePage={resource === 'subjects' && visibleTotal > 0} />
      {archiveTarget && <ActionDialog title="Archive record?" description={`Archive ${archiveTarget.name ?? archiveTarget.code ?? archiveTarget.academicYear}?`} confirmLabel="Archive" onCancel={() => setArchiveTarget(null)} onConfirm={() => { const target = archiveTarget; setArchiveTarget(null); action(target, 'archive') }} />}
    </section>
  )
}
