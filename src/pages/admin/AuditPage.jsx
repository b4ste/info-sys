import { EmptyState, LoadingState, PageHeader, Pager } from '../../components/Page.jsx'
import { useApiList } from '../../hooks/useApiList.js'

const rowStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }

export default function AuditPage() {
  const list = useApiList('/audit-events', { limit: 10 })

  function changePage(nextPage) {
    if (nextPage === list.page) list.refresh()
    else list.setPage(nextPage)
  }

  return (
    <section>
      <PageHeader eyebrow="Administration" title="Audit history" description="Decisions, publication events, and sensitive academic changes are recorded here." />
      {list.error && <p role="alert" className="mt-5 text-sm text-rose-700">{list.error}</p>}
      {list.loading && list.items.length === 0 ? <div className="mt-7"><LoadingState /></div> : list.items.length === 0 ? <div className="mt-7"><EmptyState>No audit events yet.</EmptyState></div> : (
        <div className="mt-7 overflow-x-auto rounded-xl border border-slate-200 bg-white" aria-busy={list.loading}>
          <div role="table" aria-label="Audit history" className="min-w-[650px] text-sm">
            <div role="rowgroup"><div role="row" style={rowStyle} className="bg-slate-50 text-left text-slate-600"><div role="columnheader" className="px-4 py-3 font-semibold">When</div><div role="columnheader" className="px-4 py-3 font-semibold">Email</div><div role="columnheader" className="px-4 py-3 font-semibold">Action</div></div></div>
            <div role="rowgroup">
              {list.items.map((item) => <div key={item._id} role="row" style={rowStyle} className="border-t border-slate-100"><div role="cell" className="truncate px-4 py-3">{new Date(item.createdAt).toLocaleString()}</div><div role="cell" className="truncate px-4 py-3" title={item.actorId?.email ?? 'Unknown'}>{item.actorId?.email ?? 'Unknown'}</div><div role="cell" className="truncate px-4 py-3">{item.action}</div></div>)}
              {Array.from({ length: Math.max(0, list.limit - list.items.length) }, (_, index) => <div key={`empty-${index}`} aria-hidden="true" style={rowStyle} className="border-t border-slate-100"><div className="px-4 py-3">&nbsp;</div><div /><div /></div>)}
            </div>
          </div>
        </div>
      )}
      {list.items.length > 0 && <div className="mt-3 h-5 text-sm text-slate-500">{list.loading && <span role="status">Loading next page…</span>}</div>}
      <Pager page={list.loadedPage} total={list.total} limit={list.limit} onPageChange={changePage} disabled={list.loading} />
    </section>
  )
}
