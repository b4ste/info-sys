export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-1">
      <div>
        {eyebrow && (
          <div className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-[#192d5c] text-[#273a72] dark:text-[#ebb12a] border border-blue-200/60 dark:border-[#273e7a]">
            <span>{eyebrow}</span>
          </div>
        )}
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#172b4d] dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-3xl text-sm text-slate-600 dark:text-blue-200/90">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

export function Notice({ error, message }) {
  if (!error && !message) return null
  const isErr = Boolean(error)
  return (
    <div
      role={isErr ? 'alert' : 'status'}
      className={`mt-5 flex items-center gap-3 rounded-xl p-3.5 text-sm font-medium border shadow-xs ${
        isErr
          ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/80'
          : 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/80'
      }`}
    >
      <span className="text-base shrink-0">{isErr ? '⚠️' : '✅'}</span>
      <p className="flex-1">{error || message}</p>
    </div>
  )
}

export function EmptyState({ children = 'No records found.' }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-8 text-center text-sm text-slate-500 dark:text-blue-200 shadow-xs">
      <svg
        className="mx-auto mb-2 size-8 text-slate-400 dark:text-blue-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <p>{children}</p>
    </div>
  )
}

export function LoadingState() {
  return (
    <div
      role="status"
      className="rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] p-8 text-center text-sm text-slate-500 dark:text-blue-200 shadow-xs flex flex-col items-center justify-center gap-3"
    >
      <svg
        className="size-7 animate-spin text-[#273a72] dark:text-[#ebb12a]"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <span>Loading official records…</span>
    </div>
  )
}

export function StatusBadge({ status }) {
  const tone =
    {
      active:
        'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60',
      approved:
        'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60',
      published:
        'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60',
      open: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60',
      pending:
        'bg-amber-50 text-amber-900 border-amber-200 dark:bg-[#ebb12a]/20 dark:text-[#ebb12a] dark:border-[#ebb12a]/40',
      draft:
        'bg-amber-50 text-amber-900 border-amber-200 dark:bg-[#ebb12a]/20 dark:text-[#ebb12a] dark:border-[#ebb12a]/40',
      midterm:
        'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700/60',
      upcoming:
        'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700/60',
      submitted:
        'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700/60',
      reviewing:
        'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700/60',
      inactive:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-blue-200 dark:border-white/10',
      closed:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-blue-200 dark:border-white/10',
      completed:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-blue-200 dark:border-white/10',
      withdrawn:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-blue-200 dark:border-white/10',
      rejected:
        'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/60',
    }[status] ??
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-blue-200 dark:border-white/10'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize border shadow-2xs ${tone}`}
    >
      {status}
    </span>
  )
}

export function RowActionButton({
  children,
  tone = 'default',
  className = '',
  ...props
}) {
  const colors =
    tone === 'danger'
      ? 'border-rose-300 text-rose-700 hover:border-rose-500 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-950/30'
      : 'border-[#273a72]/30 text-[#273a72] hover:bg-[#273a72]/10 hover:border-[#273a72] dark:border-[#ebb12a]/40 dark:text-[#ebb12a] dark:hover:bg-[#ebb12a]/15'
  return (
    <button
      type="button"
      {...props}
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold leading-tight whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#273a72] dark:focus-visible:ring-[#ebb12a] disabled:opacity-50 cursor-pointer ${colors} ${className}`}
    >
      {children}
    </button>
  )
}

export function Pager({
  page,
  total,
  limit,
  onPageChange,
  disabled = false,
  showSinglePage = false,
}) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (pages <= 1 && !showSinglePage) return null
  return (
    <div className="mt-5 flex items-center justify-end gap-3 text-xs sm:text-sm font-medium">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#16264f] text-slate-700 dark:text-blue-100 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
      >
        &larr; Previous
      </button>
      <span className="text-slate-600 dark:text-blue-200">
        Page <strong className="text-[#273a72] dark:text-[#ebb12a]">{page}</strong> of {pages}
      </span>
      <button
        type="button"
        disabled={disabled || page >= pages}
        onClick={() => onPageChange(page + 1)}
        className="rounded-lg border border-slate-300 dark:border-[#273e7a] bg-white dark:bg-[#16264f] text-slate-700 dark:text-blue-100 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
      >
        Next &rarr;
      </button>
    </div>
  )
}
