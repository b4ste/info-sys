import { useEffect, useRef } from 'react'

export default function ActionDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  value,
  onChange,
  fieldLabel,
  busy = false,
}) {
  const firstControl = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    firstControl.current?.focus()
    return () => previousFocus?.focus()
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape' && !busy) onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-dialog-title"
        aria-describedby="action-dialog-description"
        className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-6 text-slate-900 dark:text-white shadow-2xl space-y-4"
      >
        <div>
          <h2 id="action-dialog-title" className="text-lg font-bold text-[#273a72] dark:text-white">
            {title}
          </h2>
          <p id="action-dialog-description" className="mt-1 text-xs text-slate-600 dark:text-blue-200 leading-relaxed">
            {description}
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            onConfirm()
          }}
          className="space-y-4"
        >
          {fieldLabel && (
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-blue-100">
              {fieldLabel}
              <textarea
                ref={firstControl}
                required
                maxLength={500}
                rows={3}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#132247] px-3.5 py-2.5 text-xs text-slate-800 dark:text-white"
              />
            </label>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              ref={fieldLabel ? undefined : firstControl}
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-blue-100 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || (fieldLabel && !value?.trim())}
              className="rounded-lg bg-[#273a72] dark:bg-[#ebb12a] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white dark:text-[#111e3e] hover:bg-[#1c2e5b] dark:hover:bg-[#f5b731] transition-colors disabled:opacity-50"
            >
              {busy ? 'Processing…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
