import { useEffect, useState } from 'react'
import { Notice, PageHeader } from '../components/Page.jsx'
import { useAuth } from '../context/useAuth.js'
import { api } from '../services/api.js'

export default function ProfilePage() {
  const { user } = useAuth()
  const isStudent = user.role === 'student'
  const resource = isStudent ? 'students' : 'faculty'
  const [profile, setProfile] = useState(null)
  const [labels, setLabels] = useState({})
  const [contactEmail, setContactEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    api(`/${resource}/my`)
      .then(({ item }) => {
        if (active) {
          setProfile(item)
          setContactEmail(item.contactEmail)
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.status === 404 ? 'Your academic profile has not been created by an admin yet.' : requestError.message)
      })
    return () => { active = false }
  }, [resource])

  useEffect(() => {
    if (!profile) return
    let active = true
    const paths = isStudent
      ? [['programId', `/programs/${profile.programId}`], ...(profile.sectionId ? [['sectionId', `/sections/${profile.sectionId}`]] : [])]
      : [['departmentId', `/departments/${profile.departmentId}`]]
    Promise.all(paths.map(async ([key, path]) => [key, (await api(path)).item]))
      .then((entries) => {
        if (active) setLabels(Object.fromEntries(entries.map(([key, item]) => [key, key === 'departmentId' ? item.name : item.code ? `${item.code} · ${item.name}` : item.name])))
      })
      .catch(() => {})
    return () => { active = false }
  }, [profile, isStudent])

  async function save(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    try {
      const { item } = await api(`/${resource}/${profile._id}`, { method: 'PATCH', body: JSON.stringify({ contactEmail }) })
      setProfile(item)
      setMessage('Contact information updated.')
    } catch (requestError) { setError(requestError.message) }
  }

  const details = profile && [
    ['Full name', `${profile.firstName} ${profile.lastName}`],
    [isStudent ? 'Student number' : 'Employee number', profile.studentNumber ?? profile.employeeNumber],
    [isStudent ? 'Program' : 'Department', labels.programId ?? labels.departmentId ?? profile.programId ?? profile.departmentId],
    ...(isStudent ? [
      ['Year level', profile.yearLevel === 'irregular' ? 'Irregular' : profile.yearLevel],
      ['Section', labels.sectionId ?? (profile.sectionId ? String(profile.sectionId) : 'Not assigned')],
    ] : []),
  ]

  return <section className="max-w-3xl">
    <PageHeader eyebrow="My records" title="My profile" description={isStudent ? 'View your official academic and contact information.' : 'View your official academic details and update your contact information.'} />
    <Notice error={error} message={message} />
    {profile && <>
      <dl className="mt-7 grid gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
        {details.map(([label, value]) => <div key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{String(value)}</dd>
        </div>)}
      </dl>
      {isStudent
        ? <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold">Contact information</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact email</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{profile.contactEmail || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{profile.phone || 'Not provided'}</dd>
            </div>
          </dl>
        </section>
        : <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold">Contact information</h2>
          <label className="block text-sm font-medium">Contact email
            <input type="email" required value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
          </label>
          <button type="submit" className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white">Save contact details</button>
        </form>}
    </>}
  </section>
}
