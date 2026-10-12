import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { EmptyState, LoadingState, Notice, PageHeader, StatusBadge } from '../../components/Page.jsx'
import ActionDialog from '../../components/ActionDialog.jsx'
import { api, apiAll } from '../../services/api.js'
import { formatGradePoint, percentToGradePoint } from '../../utils/gradeScale.js'

const idOf = (value) => value?._id ?? value
const inputClass =
  'mt-1.5 block w-full max-w-xs rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-sm text-slate-800 dark:text-white disabled:bg-slate-100 dark:disabled:bg-white/5 disabled:opacity-60'

const ACTIONS = {
  save: {
    title: 'Save grades?',
    description: 'Saves the midterm and finals scores as a draft. Nothing is visible to the student yet.',
    confirmLabel: 'Save draft',
    success: 'Grades saved as draft successfully.',
  },
  'publish-midterm': {
    title: 'Publish midterm grade?',
    description: 'The student and registrar will see the midterm grade. It will be officially locked afterwards.',
    confirmLabel: 'Publish midterm',
    success: 'Midterm grade published to student records.',
  },
  submit: {
    title: 'Submit grade?',
    description: 'Marks the grade as submitted. Requires both midterm and finals scores.',
    confirmLabel: 'Submit grade',
    success: 'Grade officially submitted.',
  },
  finalize: {
    title: 'Finalize grade?',
    description: 'Locks the scores. They can no longer be edited directly.',
    confirmLabel: 'Finalize',
    success: 'Grade finalized.',
  },
  publish: {
    title: 'Publish final grade?',
    description: 'The student and registrar will see the finals and the official final grade. Later changes require an approved correction request.',
    confirmLabel: 'Publish final grade',
    success: 'Official final grade published.',
  },
}

export default function ClassGradingPage() {
  const { id } = useParams()
  const [offering, setOffering] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [grades, setGrades] = useState([])
  const [selected, setSelected] = useState('')
  const [midterm, setMidterm] = useState('')
  const [finals, setFinals] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [classData, enrollmentItems, gradeItems] = await Promise.all([
      api(`/class-offerings/${id}`),
      apiAll(`/enrollments?classOfferingId=${id}&status=approved`),
      apiAll(`/grades?classOfferingId=${id}`),
    ])
    setOffering(classData.item)
    setEnrollments(enrollmentItems)
    setGrades(gradeItems)
  }, [id])

  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(refresh)
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [refresh])

  const enrollment = enrollments.find((item) => item._id === selected)
  const grade = grades.find((item) => idOf(item.enrollmentId) === selected)
  const editable = !grade || ['draft', 'submitted'].includes(grade.status)
  const midtermLocked = Boolean(grade?.midtermPublished)
  const bothEntered = midterm !== '' && finals !== ''
  const average = bothEntered ? (Number(midterm) + Number(finals)) / 2 : null

  function selectEnrollment(enrollmentId) {
    setSelected(enrollmentId)
    const existing = grades.find((item) => idOf(item.enrollmentId) === enrollmentId)
    setMidterm(existing?.midtermScore ?? '')
    setFinals(existing?.finalsScore ?? '')
    setError('')
    setMessage('')
  }

  async function confirm() {
    const key = pending
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (key === 'save') {
        const body = { finalsScore: finals === '' ? null : Number(finals) }
        if (!midtermLocked) body.midtermScore = midterm === '' ? null : Number(midterm)
        await api(`/grades/enrollment/${selected}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await api(`/grades/${grade._id}/${key}`, { method: 'PATCH' })
      }
      setMessage(ACTIONS[key].success)
      await refresh()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
      setPending(null)
    }
  }

  const save = (event) => {
    event.preventDefault()
    setPending('save')
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          eyebrow="Faculty Grading Sheet"
          title="Grade Entry & Encoding"
          description={
            offering
              ? `${offering.subjectId?.code} · ${offering.subjectId?.name} (${offering.academicTermId?.academicYear} Term ${offering.academicTermId?.termNumber})`
              : 'Enter midterm and finals grades for approved students.'
          }
        />
        <Link
          to="/faculty/classes"
          className="rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#16264f] px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        >
          &larr; Back to My Classes
        </Link>
      </div>

      <Notice error={error} message={message} />

      {loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Left Student List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-blue-300 px-1">
              Enrolled Students ({enrollments.length})
            </h3>
            {enrollments.length === 0 && <EmptyState>No approved students enrolled in this section.</EmptyState>}
            {enrollments.map((item) => {
              const currentGrade = grades.find((entry) => idOf(entry.enrollmentId) === item._id)
              const isSelected = selected === item._id
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => selectEnrollment(item._id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#273a72] bg-blue-50/80 dark:border-[#ebb12a] dark:bg-[#192d5c] shadow-xs'
                      : 'border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {item.studentId?.firstName} {item.studentId?.lastName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-blue-300 font-medium">
                      {item.studentId?.studentNumber}
                    </span>
                  </div>
                  <StatusBadge status={currentGrade?.status ?? 'draft'} />
                </button>
              )
            })}
          </div>

          {/* Right Grade Form Card */}
          {enrollment ? (
            <div className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-6 shadow-xs space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                    Official Student Record
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {enrollment.studentId?.firstName} {enrollment.studentId?.lastName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-blue-300">
                    ID: {enrollment.studentId?.studentNumber}
                  </p>
                </div>
                {grade && <StatusBadge status={grade.status} />}
              </div>

              <form onSubmit={save} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
                    Midterm Grade Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    disabled={!editable || midtermLocked}
                    value={midterm}
                    onChange={(event) => setMidterm(event.target.value)}
                    className={inputClass}
                    placeholder="0 - 100"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-blue-300">
                    Midterm equivalent:{' '}
                    <strong className="text-[#273a72] dark:text-[#ebb12a]">
                      {midterm === '' ? '—' : formatGradePoint(percentToGradePoint(Number(midterm)))}
                    </strong>
                    {midtermLocked && ' · Published to student'}
                  </p>
                </div>

                <div className="border-t border-slate-100 dark:border-white/5 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-blue-200">
                    Finals Grade Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    disabled={!editable}
                    value={finals}
                    onChange={(event) => setFinals(event.target.value)}
                    className={inputClass}
                    placeholder="0 - 100"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-blue-300">
                    Finals equivalent:{' '}
                    <strong className="text-[#273a72] dark:text-[#ebb12a]">
                      {finals === '' ? '—' : formatGradePoint(percentToGradePoint(Number(finals)))}
                    </strong>
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 dark:bg-[#192d5c] p-4 border border-blue-200/60 dark:border-[#273e7a]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                    Official Final Grade
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-[#273a72] dark:text-white">
                    {average == null
                      ? 'Enter both midterm and finals to calculate'
                      : `${formatGradePoint(percentToGradePoint(average))} (Average: ${average.toFixed(2)}%)`}
                  </p>
                </div>

                {editable && (
                  <button
                    type="submit"
                    className="rounded-lg bg-[#273a72] dark:bg-[#ebb12a] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white dark:text-[#111e3e] hover:bg-[#1c2e5b] dark:hover:bg-[#f5b731] transition-colors"
                  >
                    Save Grades as Draft
                  </button>
                )}
              </form>

              {grade && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-2.5">
                  {grade.midtermScore != null && !grade.midtermPublished && (
                    <button
                      type="button"
                      onClick={() => setPending('publish-midterm')}
                      className="rounded-lg border border-[#273a72] dark:border-[#ebb12a] px-3.5 py-1.5 text-xs font-bold text-[#273a72] dark:text-[#ebb12a] hover:bg-blue-50 dark:hover:bg-white/5 transition-colors"
                    >
                      Publish Midterm Grade
                    </button>
                  )}
                  {grade.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => setPending('submit')}
                      className="rounded-lg border border-[#273a72] dark:border-[#ebb12a] px-3.5 py-1.5 text-xs font-bold text-[#273a72] dark:text-[#ebb12a] hover:bg-blue-50 dark:hover:bg-white/5 transition-colors"
                    >
                      Submit for Registrar Review
                    </button>
                  )}
                  {grade.status === 'submitted' && (
                    <button
                      type="button"
                      onClick={() => setPending('finalize')}
                      className="rounded-lg border border-[#273a72] dark:border-[#ebb12a] px-3.5 py-1.5 text-xs font-bold text-[#273a72] dark:text-[#ebb12a] hover:bg-blue-50 dark:hover:bg-white/5 transition-colors"
                    >
                      Finalize Scores
                    </button>
                  )}
                  {grade.status === 'finalized' && (
                    <button
                      type="button"
                      onClick={() => setPending('publish')}
                      className="rounded-lg bg-[#273a72] dark:bg-[#ebb12a] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white dark:text-[#111e3e] hover:bg-[#1c2e5b] dark:hover:bg-[#f5b731] transition-colors"
                    >
                      Publish Official Final Grade
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-12 text-center text-sm text-slate-500 dark:text-blue-200">
              Please select a student from the list to view or enter official grades.
            </div>
          )}
        </div>
      )}

      {pending && (
        <ActionDialog
          {...ACTIONS[pending]}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      )}
    </section>
  )
}
