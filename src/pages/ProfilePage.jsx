import { useEffect, useState } from 'react'
import Icon from '../components/Icon.jsx'
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

  return (
    <section className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Institutional Records"
        title={isStudent ? 'Student Information Sheet' : 'Faculty Profile'}
        description={isStudent ? 'Official academic records and enrollment details for National University - MOA Campus.' : 'Official faculty appointment and institutional department assignment.'}
      />
      <Notice error={error} message={message} />
      {profile && (
        <>
          {/* Institutional ID Banner Card */}
          <div className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] overflow-hidden shadow-xs">
            <div className="bg-[#273a72] px-6 py-4 flex items-center justify-between text-white border-b-2 border-[#ebb12a]">
              <div className="flex items-center gap-3">
                <img src="/nulogoreal.png" alt="NU Shield" className="size-10 object-contain drop-shadow-sm" />
                <div>
                  <h2 className="text-base font-bold tracking-wide uppercase">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-xs text-blue-200">
                    {isStudent ? 'National University Student' : 'National University Faculty Member'} · MOA Campus
                  </p>
                </div>
              </div>
              <span className="inline-flex rounded-full bg-[#ebb12a] px-3 py-1 text-xs font-extrabold text-[#111e3e]">
                {profile.studentNumber ?? profile.employeeNumber}
              </span>
            </div>

            <dl className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {details.map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 dark:bg-white/5 p-3.5 border border-slate-100 dark:border-white/5">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Contact Details Card */}
          {isStudent ? (
            <div className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-6 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a] flex items-center gap-2">
                <Icon name="phone" className="size-4" />
                <span>Official Contact Details</span>
              </h3>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3.5 border border-slate-100 dark:border-white/5">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-blue-200">Institutional Email</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{profile.contactEmail || user.email || 'Not provided'}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3.5 border border-slate-100 dark:border-white/5">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-blue-200">Contact Number</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{profile.phone || 'Not provided'}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <form onSubmit={save} className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                Update Contact Information
              </h3>
              <label className="block text-sm font-medium text-slate-700 dark:text-blue-100">
                Official Email Address
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-sm"
                />
              </label>
              <button
                type="submit"
                className="rounded-lg bg-[#273a72] dark:bg-[#ebb12a] px-5 py-2.5 text-sm font-bold text-white dark:text-[#111e3e] hover:bg-[#1e2f5e] dark:hover:bg-[#f5b731] transition-colors"
              >
                Save Contact Information
              </button>
            </form>
          )}
        </>
      )}
    </section>
  )
}
