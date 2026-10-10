import { useEffect, useMemo, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'
import { api, apiAll } from '../../services/api.js'
import { referenceLabel, resourceConfig } from './resourceConfig.js'

function formatInput(value, field) {
  if (value == null) return ''
  if (field.type === 'yearLevels') return value.join(', ')
  if (field.type === 'date') return new Date(value).toISOString().slice(0, 10)
  return String(value)
}

function serialize(form, fields) {
  const data = {}
  for (const field of fields) {
    const value = form[field.name]?.trim() ?? ''
    if (!value && field.optional) continue
    if (field.type === 'number' || field.type === 'term') data[field.name] = Number(value)
    else if (field.type === 'yearLevels') data[field.name] = value.split(',').map((item) => Number(item.trim()))
    else if (field.type === 'date') data[field.name] = new Date(`${value}T00:00:00`).toISOString()
    else data[field.name] = value
  }
  return data
}

export default function AcademicResourcePage({ resource }) {
  const config = resourceConfig[resource]
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [refs, setRefs] = useState({})
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useApiList(`/${resource}${query ? `?search=${encodeURIComponent(query)}` : ''}`)
  const sources = useMemo(() => [...new Set(config.fields.map((field) => field.source).filter(Boolean))], [config])

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
      await api(`/${resource}${editing ? `/${editing._id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) })
      setMessage(editing ? 'Record updated.' : 'Record created.')
      reset()
      await list.refresh()
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
      await list.refresh()
    } catch (error) { setActionError(error.message) }
  }

  function display(item, field) {
    const value = item[field.name]
    if (field.source) return referenceLabel(field.source, refs[field.source]?.find((option) => option._id === value))
    if (field.type === 'yearLevels') return value?.join(', ') ?? '—'
    if (field.type === 'date') return value ? new Date(value).toLocaleDateString() : '—'
    return value ?? '—'
  }

  return (
    <section>
      <PageHeader eyebrow="Academic management" title={config.title} description="Manage the official academic catalog and term structure." />
      <Notice error={actionError || list.error} message={message} />
      <form onSubmit={save} className="mt-7 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{editing ? 'Edit record' : 'Add record'}</h2>{editing && <button type="button" onClick={reset} className="text-sm text-slate-600 underline">Cancel</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {config.fields.map((field) => <label key={field.name} className="block text-sm font-medium text-slate-700">{field.label}
            {field.source ? <select required={!field.optional} value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">{field.optional ? 'None' : 'Select…'}</option>{(refs[field.source] ?? []).map((item) => <option key={item._id} value={item._id}>{referenceLabel(field.source, item)}</option>)}</select>
              : <input required={!field.optional} type={field.type === 'number' || field.type === 'term' ? 'number' : field.type === 'date' ? 'date' : 'text'} min={field.type === 'term' ? 1 : field.type === 'number' ? 0 : undefined} max={field.type === 'term' ? 3 : undefined} value={form[field.name] ?? ''} onChange={(event) => setForm({ ...form, [field.name]: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />}
          </label>)}
        </div>
        <button type="submit" disabled={busy} className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{busy ? 'Saving…' : editing ? 'Save changes' : 'Create'}</button>
      </form>

      <div className="mt-8 flex flex-wrap gap-3"><input aria-label="Search records" placeholder="Search code or name" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /><button type="button" onClick={() => { list.setPage(1); setQuery(search) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">Search</button></div>
      {list.loading ? <div className="mt-5"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-5"><EmptyState /></div> : <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{config.fields.slice(0, 4).map((field) => <th key={field.name} className="px-4 py-3">{field.label}</th>)}<th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>{list.items.map((item) => <tr key={item._id} className="border-t border-slate-100">{config.fields.slice(0, 4).map((field) => <td key={field.name} className="px-4 py-3">{display(item, field)}</td>)}<td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="space-x-3 whitespace-nowrap px-4 py-3"><button type="button" onClick={() => startEdit(item)} className="font-medium text-blue-700">Edit</button>{resource === 'academic-terms' ? <>{item.status === 'upcoming' && <button type="button" onClick={() => action(item, 'activate')} className="font-medium text-blue-700">Activate</button>}{item.status === 'active' && <button type="button" onClick={() => action(item, 'complete')} className="font-medium text-blue-700">Complete</button>}</> : item.status === 'active' && <button type="button" onClick={() => action(item, 'archive')} className="font-medium text-rose-700">Archive</button>}</td></tr>)}</tbody></table></div>}
      <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
    </section>
  )
}
