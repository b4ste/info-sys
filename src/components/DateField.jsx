import { useRef } from 'react'
import { formatDate, parseDateInput } from '../utils/date.js'

export default function DateField({ label, value, onChange, required = false }) {
  const pickerRef = useRef(null)
  const textRef = useRef(null)

  function openPicker() {
    const picker = pickerRef.current
    try {
      if (picker?.showPicker) picker.showPicker()
      else picker?.click()
    } catch {
      picker?.focus()
      picker?.click()
    }
  }

  return <div className="relative mt-1">
    <input ref={textRef} aria-label={label} required={required} type="text" inputMode="numeric" placeholder="DD/MM/YYYY" pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" title="Use DD/MM/YYYY" value={value} onChange={(event) => { event.target.setCustomValidity(''); onChange(event.target.value) }} onBlur={(event) => { if (value && !parseDateInput(value)) event.target.setCustomValidity('Enter a valid date as DD/MM/YYYY.') }} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-12" />
    <button type="button" aria-label={`Choose ${label.toLowerCase()}`} onClick={openPicker} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-blue-700"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M7 3v4M17 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
    <input ref={pickerRef} type="date" aria-hidden="true" tabIndex={-1} value={parseDateInput(value) ?? ''} onChange={(event) => { textRef.current?.setCustomValidity(''); onChange(formatDate(event.target.value)) }} className="pointer-events-none absolute right-0 top-0 h-full w-11 opacity-0" />
  </div>
}
