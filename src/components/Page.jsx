export function PageHeader({ eyebrow, title, description, children }) {
  return <div className="flex flex-wrap items-start justify-between gap-4"><div>{eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p>}<h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>{description && <p className="mt-2 max-w-2xl text-slate-600">{description}</p>}</div>{children}</div>
}

export function Notice({ error, message }) {
  if (!error && !message) return null
  return <p role={error ? 'alert' : 'status'} className={`mt-5 rounded-lg p-3 text-sm ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</p>
}

export function EmptyState({ children = 'No records found.' }) {
  return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{children}</p>
}

export function LoadingState() {
  return <p role="status" className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading…</p>
}

export function StatusBadge({ status }) {
  const tone = { active: 'bg-emerald-50 text-emerald-700', approved: 'bg-emerald-50 text-emerald-700', published: 'bg-emerald-50 text-emerald-700', open: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700', upcoming: 'bg-sky-50 text-sky-700', submitted: 'bg-sky-50 text-sky-700', reviewing: 'bg-sky-50 text-sky-700', inactive: 'bg-slate-100 text-slate-600', closed: 'bg-slate-100 text-slate-600', completed: 'bg-slate-100 text-slate-600', withdrawn: 'bg-slate-100 text-slate-600', rejected: 'bg-rose-50 text-rose-700' }[status] ?? 'bg-slate-100 text-slate-600'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{status}</span>
}

export function RowActionButton({ children, tone = 'default', className = '', ...props }) {
  const colors = tone === 'danger'
    ? 'border-rose-300 text-rose-700 hover:border-rose-500 hover:bg-rose-50'
    : 'border-blue-300 text-blue-700 hover:border-blue-500 hover:bg-blue-50'
  return <button type="button" {...props} className={`rounded-md border px-2 py-1 text-xs font-medium leading-tight whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50 ${colors} ${className}`}>{children}</button>
}

export function Pager({ page, total, limit, onPageChange, disabled = false, showSinglePage = false }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (pages <= 1 && !showSinglePage) return null
  return <div className="mt-5 flex items-center justify-end gap-3 text-sm"><button type="button" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={disabled || page >= pages} onClick={() => onPageChange(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Next</button></div>
}
