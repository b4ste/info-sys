import { useEffect, useId, useRef, useState } from 'react'

export default function SelectMenu({ value = '', onChange, options, placeholder = 'Select…', required = false, disabled = false, className = '', ariaLabel }) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listId = useId()
  const selectedIndex = options.findIndex((option) => String(option.value) === String(value))
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return undefined
    function closeOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  function showMenu() {
    if (disabled) return
    setActiveIndex(Math.max(selectedIndex, 0))
    setOpen(true)
  }

  function choose(option) {
    onChange(String(option.value))
    setOpen(false)
    buttonRef.current?.focus()
  }

  function handleKeyDown(event) {
    if (disabled) return
    if (event.key === 'Escape') { setOpen(false); return }
    if (options.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End')) {
      event.preventDefault()
      if (!open) { showMenu(); return }
      if (event.key === 'Home') setActiveIndex(0)
      else if (event.key === 'End') setActiveIndex(options.length - 1)
      else setActiveIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) showMenu()
      else if (options[activeIndex]) choose(options[activeIndex])
    }
  }

  return <div ref={rootRef} className={`relative mt-1 ${className}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button ref={buttonRef} type="button" role="combobox" aria-label={ariaLabel} aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" aria-activedescendant={open && options[activeIndex] ? `${listId}-${activeIndex}` : undefined} disabled={disabled} onClick={() => open ? setOpen(false) : showMenu()} onKeyDown={handleKeyDown} className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${open ? 'border-blue-400' : 'border-slate-300'}`}>
      <span className={`min-w-0 truncate ${selected ? 'text-slate-900' : 'text-slate-500'}`}>{selected?.label ?? placeholder}</span>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {required && <select required tabIndex={-1} aria-hidden="true" value={value} onChange={(event) => onChange(event.target.value)} onInvalid={() => { buttonRef.current?.focus(); showMenu() }} className="sr-only"><option value="">{placeholder}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
    {open && <div id={listId} role="listbox" aria-label={ariaLabel} className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
      {options.length === 0 ? <p className="px-3 py-2 text-sm text-slate-500">No options available</p> : options.map((option, index) => <button key={option.value} id={`${listId}-${index}`} type="button" role="option" aria-selected={String(option.value) === String(value)} tabIndex={-1} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${index === activeIndex ? 'bg-blue-50 text-blue-700' : 'text-slate-900 hover:bg-slate-50'}`}><span className="truncate">{option.label}</span>{String(option.value) === String(value) && <span aria-hidden="true">✓</span>}</button>)}
    </div>}
  </div>
}
