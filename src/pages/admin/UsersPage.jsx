import { useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import PasswordInput from '../../components/PasswordInput.jsx'
import { useAuth } from '../../context/useAuth.js'
import { useApiList } from '../../hooks/useApiList.js'
import { api } from '../../services/api.js'

const emptyName = { firstName: '', middleName: '', lastName: '' }
const nameFields = [
  ['firstName', 'First name', true],
  ['middleName', 'Middle name (optional)', false],
  ['lastName', 'Last name', true],
]
const roleFilters = [
  ['', 'All'],
  ['student', 'Students'],
  ['faculty', 'Faculty'],
  ['admin', 'Admins'],
]

function NameFields({ value, onChange }) {
  return nameFields.map(([field, label, required]) => (
    <label key={field} className="text-sm font-medium">
      {label}
      <input type="text" required={required} maxLength={60} value={value[field]} onChange={(event) => onChange(field, event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
    </label>
  ))
}

function RoleBadge({ role }) {
  const tone = {
    student: 'bg-sky-50 text-sky-700',
    faculty: 'bg-violet-50 text-violet-700',
    admin: 'bg-amber-50 text-amber-700',
  }[role]
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{role}</span>
}

export default function UsersPage() {
  const { user: currentUser, setUser } = useAuth()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const filterParams = new URLSearchParams()
  if (query) filterParams.set('search', query)
  if (roleFilter) filterParams.set('role', roleFilter)
  const list = useApiList(`/users${filterParams.size ? `?${filterParams}` : ''}`)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [newName, setNewName] = useState(emptyName)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [busy, setBusy] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [nameDraft, setNameDraft] = useState(emptyName)
  const [savingName, setSavingName] = useState(false)

  async function create(event) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      await api('/users', { method: 'POST', body: JSON.stringify({ ...newName, email, password, role }) })
      setNewName(emptyName); setEmail(''); setPassword('')
      setMessage('Account created. Add its academic profile under Students or Faculty.')
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  async function saveName(event) {
    event.preventDefault()
    setSavingName(true); setError(''); setMessage('')
    try {
      const data = await api(`/users/${editingUser._id}/name`, { method: 'PATCH', body: JSON.stringify(nameDraft) })
      if (editingUser._id === currentUser._id) setUser(data.user)
      setEditingUser(null)
      setNameDraft(emptyName)
      setMessage('Account name updated.')
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
    finally { setSavingName(false) }
  }

  async function toggleStatus(user) {
    const status = user.status === 'active' ? 'inactive' : 'active'
    setError(''); setMessage('')
    try {
      await api(`/users/${user._id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      setMessage(`Account ${status === 'active' ? 'activated' : 'deactivated'}.`)
      await list.refresh()
    } catch (requestError) { setError(requestError.message) }
  }

  return <section>
    <PageHeader eyebrow="Administration" title="Accounts" description="Create accounts and control access. Student and faculty academic profiles are managed separately." />
    <Notice error={error || list.error} message={message} />
    <form onSubmit={create} className="mt-7 rounded-xl border border-slate-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-3"><NameFields value={newName} onChange={(field, value) => setNewName((current) => ({ ...current, [field]: value }))} /></div>
      <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        <label className="text-sm font-medium">Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
        <div><label htmlFor="temporary-password" className="block text-sm font-medium">Temporary password</label><div className="mt-1"><PasswordInput id="temporary-password" label="temporary password" required value={password} onChange={(event) => setPassword(event.target.value)} className="text-sm" /></div><span className="mt-1 block text-xs font-normal text-slate-500">Uppercase, lowercase, and special character.</span></div>
        <div className="grid items-start gap-4 sm:col-span-2 sm:grid-cols-[160px_minmax(0,1fr)] 2xl:col-span-1">
          <label className="text-sm font-medium">Role<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="student">Student</option><option value="faculty">Faculty</option><option value="admin">Admin</option></select></label>
          <button type="submit" disabled={busy} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:mt-6">{busy ? 'Creating…' : 'Create account'}</button>
        </div>
      </div>
    </form>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
      <div className="flex w-full max-w-lg gap-3"><input aria-label="Search accounts" placeholder="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /><button type="button" onClick={() => { list.setPage(1); setQuery(search) }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">Search</button></div>
      <label htmlFor="account-role-filter" className="text-sm font-medium">Filter by role
        <select id="account-role-filter" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); list.setPage(1) }} className="mt-1 block min-w-44 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
          {roleFilters.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}
        </select>
      </label>
    </div>
    {editingUser && <form onSubmit={saveName} className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm font-semibold">Edit name for {editingUser.email}</p>{editingUser.name && !editingUser.firstName && <p className="mt-1 text-xs text-slate-500">Current name: {editingUser.name}</p>}<div className="mt-3 grid gap-4 sm:grid-cols-3"><NameFields value={nameDraft} onChange={(field, value) => setNameDraft((current) => ({ ...current, [field]: value }))} /></div><div className="mt-4 flex gap-3"><button type="submit" disabled={savingName} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save name</button><button type="button" onClick={() => setEditingUser(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium">Cancel</button></div></form>}
    {list.loading ? <div className="mt-5"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-5"><EmptyState>No accounts match your filters.</EmptyState></div> : <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Action</th></tr></thead><tbody>{list.items.map((user) => <tr key={user._id} className="border-t border-slate-100"><td className="px-5 py-4">{user.name || '—'}</td><td className="px-5 py-4">{user.email}</td><td className="px-5 py-4"><RoleBadge role={user.role} /></td><td className="px-5 py-4"><StatusBadge status={user.status} /></td><td className="px-5 py-4"><div className="flex gap-4"><button type="button" onClick={() => { setEditingUser(user); setNameDraft({ firstName: user.firstName || '', middleName: user.middleName || '', lastName: user.lastName || '' }) }} className="font-medium text-blue-700 hover:underline">Edit name</button><button type="button" onClick={() => toggleStatus(user)} className="font-medium text-blue-700 hover:underline">{user.status === 'active' ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table></div>}
    <Pager page={list.page} total={list.total} limit={list.limit} onPageChange={list.setPage} />
  </section>
}
