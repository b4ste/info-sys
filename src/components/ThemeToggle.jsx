import { useState } from 'react'
import Icon from './Icon.jsx'

export default function ThemeToggle({ className = '' }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('sis-theme', next ? 'dark' : 'light') } catch { /* Storage may be unavailable. */ }
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={className || "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
      <span>{dark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
