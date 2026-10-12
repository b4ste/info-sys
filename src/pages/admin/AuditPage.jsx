import { EmptyState, LoadingState, Notice, PageHeader, Pager } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'

const rowStyle = { display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(220px, 1.2fr) minmax(200px, 1.5fr)' }

export default function AuditPage() {
  const list = useApiList('/audit-events', { limit: 10 })

  function changePage(nextPage) {
    if (nextPage === list.page) list.refresh()
    else list.setPage(nextPage)
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Security & Compliance"
        title="Institutional Audit Trail"
        description="Comprehensive immutable event ledger tracking user authentication, grade publications, enrollment decisions, and administrative changes."
      />

      <Notice error={list.error} />

      {list.loading && list.items.length === 0 ? (
        <div className="mt-6"><LoadingState /></div>
      ) : list.items.length === 0 ? (
        <div className="mt-6"><EmptyState>No audit log events recorded yet.</EmptyState></div>
      ) : (
        <div
          className="mt-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-[#273e7a] bg-white dark:bg-[#16264f] shadow-xs"
          aria-busy={list.loading}
        >
          <div role="table" aria-label="Audit history" className="min-w-[650px] text-sm">
            <div role="rowgroup">
              <div role="row" style={rowStyle} className="bg-slate-50 text-left text-slate-600 border-b border-slate-200/60 dark:border-[#273e7a]">
                <div role="columnheader" className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Timestamp
                </div>
                <div role="columnheader" className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Actor Account
                </div>
                <div role="columnheader" className="px-5 py-3.5 font-bold text-xs uppercase tracking-wider text-[#273a72] dark:text-[#ebb12a]">
                  Logged Action
                </div>
              </div>
            </div>
            <div role="rowgroup">
              {list.items.map((item) => (
                <div
                  key={item._id}
                  role="row"
                  style={rowStyle}
                  className="border-t border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5"
                >
                  <div role="cell" className="truncate px-5 py-3 text-xs text-slate-500 dark:text-blue-300">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                  <div role="cell" className="truncate px-5 py-3 font-semibold text-slate-800 dark:text-white" title={item.actorId?.email ?? 'System'}>
                    {item.actorId?.email ?? 'System'}
                  </div>
                  <div role="cell" className="truncate px-5 py-3 text-xs font-mono text-slate-700 dark:text-blue-100">
                    {item.action}
                  </div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, list.limit - list.items.length) }, (_, index) => (
                <div key={`empty-${index}`} aria-hidden="true" style={rowStyle} className="border-t border-slate-100 dark:border-white/5">
                  <div className="px-5 py-3">&nbsp;</div>
                  <div />
                  <div />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {list.items.length > 0 && (
        <div className="h-5 text-xs text-slate-500 dark:text-blue-300">
          {list.loading && <span role="status">Fetching next log entries…</span>}
        </div>
      )}

      <Pager page={list.loadedPage} total={list.total} limit={list.limit} onPageChange={changePage} disabled={list.loading} />
    </section>
  )
}
