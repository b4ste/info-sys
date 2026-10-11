import { useEffect, useState } from 'react'
import { EmptyState, LoadingState, Notice, PageHeader, Pager, StatusBadge } from '../../components/Page.jsx'
import SelectMenu from '../../components/SelectMenu.jsx'
import { api, apiAll } from '../../services/api.js'

const emptyForm = {
  programId: '', subjectId: '', academicTermId: '', yearLevel: '', sectionId: '', facultyId: '', capacity: '30',
}

function label(item, fallback = 'Unknown') {
  return item ? `${item.code ? `${item.code} · ` : ''}${item.name}` : fallback
}

export default function ClassOfferingsPage() {
  const [refs, setRefs] = useState({})
  const [offerings, setOfferings] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)
  const [selectedOfferingId, setSelectedOfferingId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [assignedIds, setAssignedIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      ...['subjects', 'programs', 'academic-terms', 'faculty', 'sections', 'students', 'departments'].map(async (source) => [source, await apiAll(`/${source}`)]),
      apiAll('/class-offerings'),
    ]).then((results) => {
      if (!active) return
      setRefs(Object.fromEntries(results.slice(0, -1)))
      setOfferings(results.at(-1))
    }).catch((requestError) => {
      if (active) setError(requestError.message)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const programs = refs.programs ?? []
  const terms = refs['academic-terms'] ?? []
  const departments = refs.departments ?? []
  const selectedProgram = programs.find((item) => item._id === form.programId)
  const selectedOffering = offerings.find((item) => item._id === selectedOfferingId)
  const eligibleStudents = (refs.students ?? []).filter((student) =>
    selectedOffering && student.status === 'active'
    && student.programId === selectedOffering.programId
    && (student.yearLevel === 'irregular' || student.yearLevel === selectedOffering.yearLevel)
    && (!selectedOffering.sectionId || student.sectionId === selectedOffering.sectionId)
    && !assignedIds.includes(student._id))
  const sectionOptions = (refs.sections ?? []).filter((section) =>
    section.status === 'active' && section.programId === form.programId
    && String(section.yearLevel) === form.yearLevel && section.academicTermId === form.academicTermId)

  async function create(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const body = {
        ...form,
        yearLevel: Number(form.yearLevel),
        capacity: Number(form.capacity),
        gradeComponents: [{ name: 'Final assessment', weight: 100 }],
      }
      if (!body.sectionId) delete body.sectionId
      await api('/class-offerings', { method: 'POST', body: JSON.stringify(body) })
      setOfferings(await apiAll('/class-offerings'))
      setForm(emptyForm)
      setPage(1)
      setMessage('Class created. The assigned teacher can now see this subject in My classes.')
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  async function chooseOffering(offering) {
    setSelectedOfferingId(offering._id)
    setStudentId('')
    setAssignedIds([])
    setError('')
    try {
      const enrollments = await apiAll(`/enrollments?classOfferingId=${offering._id}`)
      setAssignedIds(enrollments.map((item) => item.studentId?._id ?? item.studentId))
    } catch (requestError) { setError(requestError.message) }
  }

  async function assign(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await api('/enrollments/assign', { method: 'POST', body: JSON.stringify({ studentId, classOfferingId: selectedOfferingId }) })
      const [updatedOfferings, enrollments] = await Promise.all([
        apiAll('/class-offerings'),
        apiAll(`/enrollments?classOfferingId=${selectedOfferingId}`),
      ])
      setOfferings(updatedOfferings)
      setAssignedIds(enrollments.map((item) => item.studentId?._id ?? item.studentId))
      setStudentId('')
      setMessage('Student enrolled. This subject now appears in the student’s My classes and the teacher’s roster.')
    } catch (requestError) { setError(requestError.message) }
    finally { setBusy(false) }
  }

  if (loading) return <section><PageHeader eyebrow="Academic units" title="Class offerings" /><div className="mt-7"><LoadingState /></div></section>

  return <section>
    <PageHeader eyebrow="Academic units" title="Class offerings" description="Create a class from a subject, assign its teacher, and enroll students." />
    <Notice error={error} message={message} />
    <form onSubmit={create} className="mt-7 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold">Create class</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="text-sm font-medium">Program<SelectMenu ariaLabel="Program" required value={form.programId} onChange={(value) => setForm({ ...form, programId: value, subjectId: '', facultyId: '', yearLevel: '', sectionId: '' })} options={programs.filter((item) => item.status === 'active').map((item) => ({ value: item._id, label: label(item) }))} /></div>
        <div className="text-sm font-medium">Year level<SelectMenu ariaLabel="Year level" required disabled={!selectedProgram} value={form.yearLevel} onChange={(value) => setForm({ ...form, yearLevel: value, sectionId: '' })} options={(selectedProgram?.yearLevels ?? []).map((year) => ({ value: year, label: `Year ${year}` }))} /></div>
        <div className="text-sm font-medium">Academic term<SelectMenu ariaLabel="Academic term" required value={form.academicTermId} onChange={(value) => setForm({ ...form, academicTermId: value, sectionId: '' })} options={terms.filter((item) => item.status !== 'completed').map((item) => ({ value: item._id, label: `${item.academicYear} · Term ${item.termNumber}` }))} /></div>
        <div className="text-sm font-medium">Subject<SelectMenu ariaLabel="Subject" required disabled={!selectedProgram} value={form.subjectId} onChange={(value) => setForm({ ...form, subjectId: value })} placeholder={selectedProgram ? 'Select...' : 'Select a program first'} options={(refs.subjects ?? []).filter((item) => item.status === 'active' && item.departmentId === selectedProgram?.departmentId).map((item) => ({ value: item._id, label: `${label(item)} (${departments.find((dept) => dept._id === item.departmentId)?.name ?? 'Department'})` }))} /></div>
        <div className="text-sm font-medium">Teacher<SelectMenu ariaLabel="Teacher" required disabled={!selectedProgram} value={form.facultyId} onChange={(value) => setForm({ ...form, facultyId: value })} placeholder={selectedProgram ? 'Select...' : 'Select a program first'} options={(refs.faculty ?? []).filter((item) => item.status === 'active' && item.departmentId === selectedProgram?.departmentId).map((item) => ({ value: item._id, label: `${item.firstName} ${item.lastName}` }))} /></div>
        <div className="text-sm font-medium">Section (optional)<SelectMenu ariaLabel="Section" value={form.sectionId} onChange={(value) => setForm({ ...form, sectionId: value })} options={[{ value: '', label: 'All sections' }, ...sectionOptions.map((item) => ({ value: item._id, label: item.name }))]} /></div>
        <label className="text-sm font-medium">Capacity<input aria-label="Capacity" required type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      </div>
      <button type="submit" disabled={busy} className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Create class</button>
    </form>

    <div className="mt-7">
      {offerings.length === 0 ? <EmptyState>No classes created yet.</EmptyState> : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Program / year</th><th className="px-4 py-3">Teacher</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Action</th></tr></thead><tbody>{offerings.slice((page - 1) * 6, page * 6).map((item) => <tr key={item._id} className="border-t border-slate-100"><td className="px-4 py-3">{label(item.subjectId)}</td><td className="px-4 py-3">{label(programs.find((program) => program._id === item.programId))} · Year {item.yearLevel}</td><td className="px-4 py-3">{(() => { const teacher = (refs.faculty ?? []).find((faculty) => faculty._id === item.facultyId); return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown' })()}</td><td className="px-4 py-3">{item.academicTermId?.academicYear} · Term {item.academicTermId?.termNumber}</td><td className="px-4 py-3">{item.enrollmentCount}/{item.capacity}</td><td className="px-4 py-3"><div className="flex items-center gap-3"><StatusBadge status={item.status} /><button type="button" onClick={() => chooseOffering(item)} className="font-medium text-blue-700">Enroll student</button></div></td></tr>)}</tbody></table></div>}
      <Pager page={page} total={offerings.length} limit={6} onPageChange={setPage} />
    </div>

    {selectedOffering && <form onSubmit={assign} className="mt-7 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-4"><h2 className="font-semibold">Enroll student in {label(selectedOffering.subjectId)}</h2><button type="button" onClick={() => { setSelectedOfferingId(''); setStudentId('') }} className="text-sm text-slate-600 underline">Close</button></div>
      <div className="mt-4 max-w-md text-sm font-medium">Student<SelectMenu ariaLabel="Student" required value={studentId} onChange={setStudentId} options={eligibleStudents.map((student) => ({ value: student._id, label: `${student.studentNumber} · ${student.firstName} ${student.lastName}` }))} /></div>
      {eligibleStudents.length === 0 && <p className="mt-3 text-sm text-slate-500">No available students match this class’s program, year level, and section.</p>}
      <button type="submit" disabled={busy || !studentId} className="mt-5 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Enroll student</button>
    </form>}
  </section>
}
