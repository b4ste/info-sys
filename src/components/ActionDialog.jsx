import { useEffect, useRef } from 'react'

export default function ActionDialog({ title, description, confirmLabel, onConfirm, onCancel, value, onChange, fieldLabel, busy = false }) {
  const firstControl = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    firstControl.current?.focus()
    return () => previousFocus?.focus()
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape' && !busy) onCancel()
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onKeyDown={handleKeyDown}>
    <div role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" aria-describedby="action-dialog-description" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
      <h2 id="action-dialog-title" className="text-xl font-semibold">{title}</h2>
      <p id="action-dialog-description" className="mt-2 text-sm text-slate-600">{description}</p>
      <form onSubmit={(event) => { event.preventDefault(); onConfirm() }}>
        {fieldLabel && <label className="mt-5 block text-sm font-medium">{fieldLabel}<textarea ref={firstControl} required maxLength={500} rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>}
        <div className="mt-6 flex justify-end gap-3">
          <button ref={fieldLabel ? undefined : firstControl} type="button" disabled={busy} onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">Cancel</button>
          <button type="submit" disabled={busy || (fieldLabel && !value?.trim())} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </form>
    </div>
  </div>
}
