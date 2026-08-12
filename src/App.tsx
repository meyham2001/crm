import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity as ActivityIcon, AlertCircle, ArrowLeft, ArrowUpRight, Bell, Building2, CalendarClock, Check,
  CheckCircle2, ChevronDown, CircleDollarSign, ClipboardList, Clock3, Edit3, ExternalLink, Filter, Kanban,
  LayoutDashboard, Mail, MoreHorizontal, Phone, Plus, Search, StickyNote, Target, Trash2, TrendingUp, Users, X,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DndContext, DragOverlay, PointerSensor, useDroppable, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { api } from './api'
import { STAGES, type Activity, type ActivityType, type Bootstrap, type Contact, type ContactStatus, type Deal, type DetailContact, type DetailDeal, type DetailOrganization, type Organization, type Stage } from './types'

type View = 'dashboard' | 'organizations' | 'contacts' | 'deals' | 'pipeline'
type DetailState = { kind: 'organization'; id: number } | { kind: 'contact'; id: number } | { kind: 'deal'; id: number } | null
type ModalState = { kind: 'organization' | 'contact' | 'deal' | 'activity'; record?: Organization | Contact | Deal | Activity; context?: { contactId?: number; dealId?: number } } | null

const stageColors: Record<Stage, string> = { New: '#6b7280', Qualified: '#209dd7', Proposal: '#753991', Negotiation: '#ecad0a', Won: '#26966a', Lost: '#cf4d5c' }
const stageDescriptions: Record<Stage, string> = { New: 'Fresh opportunity', Qualified: 'Right fit confirmed', Proposal: 'Solution shared', Negotiation: 'Closing details', Won: 'Revenue secured', Lost: 'Not moving forward' }
const activityIcons = { note: StickyNote, call: Phone, email: Mail }

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : '—'
const shortDate = (value?: string | null) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : '—'
const timeAgo = (value: string) => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date(value)
}
const initials = (first: string, last = '') => `${first[0] || ''}${last[0] || ''}`.toUpperCase()
const fullName = (contact?: Contact | null) => contact ? `${contact.firstName} ${contact.lastName}` : 'Unassigned'
const todayInput = () => new Date().toISOString().slice(0, 10)
const localDateTime = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return `${todayInput()}T09:00`
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
}

function App() {
  const [data, setData] = useState<Bootstrap | null>(null)
  const [view, setView] = useState<View>('dashboard')
  const [detail, setDetail] = useState<DetailState>(null)
  const [detailData, setDetailData] = useState<DetailOrganization | DetailContact | DetailDeal | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    try { setData(await api.bootstrap()); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load your CRM') }
  }
  useEffect(() => { refresh().finally(() => setLoading(false)) }, [])

  const openDetail = async (next: Exclude<DetailState, null>) => {
    setDetail(next); setDetailData(null); setDetailLoading(true)
    try {
      const result = next.kind === 'organization' ? await api.organization(next.id) : next.kind === 'contact' ? await api.contact(next.id) : await api.deal(next.id)
      setDetailData(result)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load record') } finally { setDetailLoading(false) }
  }
  const refreshDetail = async () => {
    await refresh()
    if (detail) await openDetail(detail)
  }
  const navigate = (next: View) => { setView(next); setDetail(null); setDetailData(null) }
  const closeModal = () => setModal(null)
  useActivityEvents(
    (context) => setModal({ kind: 'activity', context }),
    (activity, context) => setModal({ kind: 'activity', record: activity, context }),
  )

  if (loading) return <div className="loading-screen"><div className="brand-mark">P</div><p>Loading your workspace…</p></div>
  if (!data) return <div className="loading-screen"><AlertCircle size={28} /><p>{error || 'Something went wrong.'}</p><button className="button primary" onClick={() => { setLoading(true); refresh().finally(() => setLoading(false)) }}>Try again</button></div>

  const detailPage = detail && detailData ? (
    detail.kind === 'organization' ? <OrganizationDetail data={detailData as DetailOrganization} onBack={() => { setDetail(null); setDetailData(null) }} onEdit={() => setModal({ kind: 'organization', record: detailData })} onOpenDetail={openDetail} onMutated={refreshDetail} /> :
      detail.kind === 'contact' ? <ContactDetail data={detailData as DetailContact} onBack={() => { setDetail(null); setDetailData(null) }} onEdit={() => setModal({ kind: 'contact', record: detailData })} onOpenDetail={openDetail} onMutated={refreshDetail} /> :
        <DealDetail data={detailData as DetailDeal} onBack={() => { setDetail(null); setDetailData(null) }} onEdit={() => setModal({ kind: 'deal', record: detailData })} onOpenDetail={openDetail} onMutated={refreshDetail} />
  ) : detail ? <div className="loading-inline">Loading record…</div> : null

  return (
    <div className="app-shell">
      <Sidebar view={view} navigate={navigate} />
      <main className="main-content">
        <Topbar view={view} detail={detail} />
        {error && <div className="error-banner"><AlertCircle size={16} /> {error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
        <div className="page-wrap">
          {detailPage || view === 'dashboard' && <Dashboard data={data} onOpenDetail={openDetail} onNavigate={navigate} />}
          {!detail && view === 'organizations' && <OrganizationsView data={data} onOpenDetail={openDetail} onAdd={() => setModal({ kind: 'organization' })} onEdit={(record) => setModal({ kind: 'organization', record })} onMutated={refresh} />}
          {!detail && view === 'contacts' && <ContactsView data={data} onOpenDetail={openDetail} onAdd={() => setModal({ kind: 'contact' })} onEdit={(record) => setModal({ kind: 'contact', record })} onMutated={refresh} />}
          {!detail && view === 'deals' && <DealsView data={data} onOpenDetail={openDetail} onAdd={() => setModal({ kind: 'deal' })} onEdit={(record) => setModal({ kind: 'deal', record })} onMutated={refresh} />}
          {!detail && view === 'pipeline' && <PipelineView data={data} onOpenDetail={openDetail} onMutated={refresh} />}
        </div>
      </main>
      {modal?.kind === 'organization' && <OrganizationModal record={modal.record as Organization | undefined} onClose={closeModal} onSaved={async () => { closeModal(); await refresh(); if (detail) await openDetail(detail) }} />}
      {modal?.kind === 'contact' && <ContactModal record={modal.record as Contact | undefined} organizations={data.organizations} onClose={closeModal} onSaved={async () => { closeModal(); await refresh(); if (detail) await openDetail(detail) }} />}
      {modal?.kind === 'deal' && <DealModal record={modal.record as Deal | undefined} organizations={data.organizations} contacts={data.contacts} onClose={closeModal} onSaved={async () => { closeModal(); await refresh(); if (detail) await openDetail(detail) }} />}
      {modal?.kind === 'activity' && <ActivityModal record={modal.record as Activity | undefined} context={modal.context} onClose={closeModal} onSaved={async () => { closeModal(); await refresh(); if (detail) await openDetail(detail) }} />}
    </div>
  )
}

function Sidebar({ view, navigate }: { view: View; navigate: (view: View) => void }) {
  const nav = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organizations' as View, label: 'Organizations', icon: Building2 },
    { id: 'contacts' as View, label: 'Contacts', icon: Users },
    { id: 'deals' as View, label: 'Deals', icon: Target },
    { id: 'pipeline' as View, label: 'Pipeline', icon: Kanban },
  ]
  return <aside className="sidebar">
    <div className="logo-lockup"><div className="brand-mark">P</div><div><strong>personal</strong><span>CRM</span></div></div>
    <div className="workspace-label">WORKSPACE</div>
    <nav className="main-nav" aria-label="Main navigation">{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'pipeline' && <span className="nav-pip" />}</button>)}</nav>
    <div className="sidebar-bottom"><div className="sidebar-note"><span className="live-dot" /> Local workspace <small>SQLite synced</small></div><button className="nav-item muted"><MoreHorizontal size={18} /><span>More</span></button></div>
  </aside>
}

function Topbar({ view, detail }: { view: View; detail: DetailState }) {
  const label = detail ? 'Record details' : view[0].toUpperCase() + view.slice(1)
  return <header className="topbar"><div className="topbar-title"><span className="eyebrow">PERSONAL CRM / {detail ? 'DETAILS' : view.toUpperCase()}</span><h1>{label}</h1></div><div className="topbar-actions"><div className="sync-status"><span className="live-dot" /> Saved locally</div><button className="icon-button" title="Notifications" aria-label="Notifications"><Bell size={18} /></button><div className="avatar">JD</div></div></header>
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow || 'OVERVIEW'}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>
}

function Dashboard({ data, onOpenDetail, onNavigate }: { data: Bootstrap; onOpenDetail: (detail: Exclude<DetailState, null>) => void; onNavigate: (view: View) => void }) {
  const wonDeals = data.deals.filter((deal) => deal.stage === 'Won')
  const openDeals = data.deals.filter((deal) => !['Won', 'Lost'].includes(deal.stage))
  const wonRevenue = wonDeals.reduce((sum, deal) => sum + deal.value, 0)
  const expectedRevenue = openDeals.reduce((sum, deal) => sum + deal.value * deal.probability / 100, 0)
  const overdue = data.activities.filter((activity) => activity.dueDate && !activity.done && activity.dueDate < todayInput()).length
  const months = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const value = new Date(); value.setMonth(value.getMonth() - (5 - index), 1)
    const key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
    return { key, label: value.toLocaleDateString('en-US', { month: 'short' }) }
  }), [])
  const wonTrend = months.map((month) => { const deals = wonDeals.filter((deal) => deal.closeDate.slice(0, 7) === month.key); return { month: month.label, deals: deals.length, revenue: deals.reduce((sum, deal) => sum + deal.value, 0) } })
  const pipeline = STAGES.map((stage) => { const deals = data.deals.filter((deal) => deal.stage === stage); return { stage, count: deals.length, total: deals.reduce((sum, deal) => sum + deal.value, 0), expected: deals.reduce((sum, deal) => sum + deal.value * deal.probability / 100, 0) } })
  const tasks = data.activities.filter((activity) => activity.dueDate && !activity.done).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate))).slice(0, 5)
  const recent = data.activities.slice(0, 6)
  return <div className="dashboard-page">
    <div className="dashboard-intro"><div><span className="eyebrow amber">MONDAY, {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase()}</span><h2>Good morning, Jordan <span className="wave">✦</span></h2><p>Here’s the latest signal from your revenue workspace.</p></div><button className="button secondary" onClick={() => onNavigate('pipeline')}><Kanban size={16} /> Open pipeline <ArrowUpRight size={16} /></button></div>
    <section className="stat-grid">
      <StatCard label="Open pipeline" value={money(openDeals.reduce((sum, deal) => sum + deal.value, 0))} detail={`${openDeals.length} active opportunities`} icon={Target} tone="blue" />
      <StatCard label="Weighted forecast" value={money(expectedRevenue)} detail="Probability-adjusted value" icon={TrendingUp} tone="purple" />
      <StatCard label="Won revenue" value={money(wonRevenue)} detail={`${wonDeals.length} closed deals`} icon={CircleDollarSign} tone="amber" />
      <StatCard label="Needs attention" value={String(overdue).padStart(2, '0')} detail={overdue ? 'Overdue follow-ups' : 'No overdue follow-ups'} icon={Clock3} tone={overdue ? 'red' : 'green'} />
    </section>
    <div className="dashboard-grid primary-grid">
      <section className="panel chart-panel"><PanelHeader title="Won performance" subtitle="Closed revenue and deal volume" action={<button className="subtle-button">Last 6 months <ChevronDown size={14} /></button>} /><div className="chart-legend"><span><i className="legend-dot blue" /> Deals won</span><span><i className="legend-dot amber" /> Revenue</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={wonTrend} barSize={18} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e7ebf0" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#8b95a5', fontSize: 11 }} /><YAxis yAxisId="deals" axisLine={false} tickLine={false} tick={{ fill: '#8b95a5', fontSize: 11 }} allowDecimals={false} /><YAxis yAxisId="revenue" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#b47b00', fontSize: 10 }} tickFormatter={(value) => value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`} width={42} /><Tooltip formatter={(value, name) => [name === 'revenue' ? money(Number(value)) : value, name === 'revenue' ? 'Revenue' : 'Deals']} /><Bar yAxisId="deals" dataKey="deals" fill="#209dd7" radius={[5, 5, 0, 0]} /><Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#ecad0a" strokeWidth={3} dot={{ fill: '#fff', stroke: '#ecad0a', strokeWidth: 2, r: 4 }} /></BarChart></ResponsiveContainer></div></section>
      <section className="panel activity-panel"><PanelHeader title="Recent activity" subtitle="The latest movement across your book" action={<button className="text-button" onClick={() => onNavigate('contacts')}>View all <ArrowUpRight size={14} /></button>} />{recent.length === 0 ? <EmptyState icon={ActivityIcon} title="No activity yet" copy="Log a note, call, or email from a record." /> : <div className="activity-feed compact">{recent.map((activity) => <ActivityFeedItem key={activity.id} activity={activity} onOpen={() => activity.dealId ? onOpenDetail({ kind: 'deal', id: activity.dealId }) : activity.contactId ? onOpenDetail({ kind: 'contact', id: activity.contactId }) : undefined} />)}</div>}</section>
    </div>
    <div className="dashboard-grid secondary-grid">
      <section className="panel pipeline-summary"><PanelHeader title="Pipeline health" subtitle="Expected revenue by stage" action={<button className="text-button" onClick={() => onNavigate('pipeline')}>Full board <ArrowUpRight size={14} /></button>} />{pipeline.map((item) => <div className="stage-summary" key={item.stage}><div className="stage-label"><span className="stage-dot" style={{ background: stageColors[item.stage] }} /> <strong>{item.stage}</strong><span className="count-pill">{item.count}</span></div><div className="stage-bar"><span style={{ width: `${Math.min(100, Math.max(4, item.expected / Math.max(expectedRevenue, 1) * 100))}%`, background: stageColors[item.stage] }} /></div><div className="stage-value"><strong>{money(item.expected)}</strong><small>{money(item.total)} total</small></div></div>)}</section>
      <section className="panel tasks-panel"><PanelHeader title="Follow-ups" subtitle="Upcoming and overdue tasks" action={<span className="task-count">{tasks.length} open</span>} />{tasks.length === 0 ? <EmptyState icon={CheckCircle2} title="All caught up" copy="No open follow-ups right now." /> : <div className="task-list">{tasks.map((task) => <TaskRow key={task.id} activity={task} onOpen={() => task.dealId ? onOpenDetail({ kind: 'deal', id: task.dealId }) : task.contactId ? onOpenDetail({ kind: 'contact', id: task.contactId }) : undefined} />)}</div>}</section>
    </div>
  </div>
}

function StatCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: typeof Target; tone: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}
function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) { return <div className="panel-header"><div><h3>{title}</h3><p>{subtitle}</p></div>{action}</div> }
function EmptyState({ icon: Icon, title, copy }: { icon: typeof ActivityIcon; title: string; copy: string }) { return <div className="empty-state"><Icon size={25} /><strong>{title}</strong><p>{copy}</p></div> }

function ActivityFeedItem({ activity, onOpen }: { activity: Activity; onOpen?: () => void }) {
  const Icon = activityIcons[activity.type]
  return <button className="activity-feed-item" onClick={onOpen}><div className={`activity-type ${activity.type}`}><Icon size={15} /></div><div className="activity-content"><strong>{activity.description}</strong><span>{activity.contactName || activity.dealName || 'Workspace activity'} · {timeAgo(activity.occurredAt)}</span></div><ArrowUpRight size={14} className="activity-arrow" /></button>
}

function TaskRow({ activity, onOpen, onToggle }: { activity: Activity; onOpen?: () => void; onToggle?: (done: boolean) => void }) {
  const overdue = activity.dueDate && activity.dueDate < todayInput()
  return <div className={`task-row ${overdue ? 'overdue' : ''}`}><button className="task-check" onClick={() => onToggle?.(!activity.done)} aria-label={activity.done ? 'Mark task not done' : 'Mark task done'}>{activity.done && <Check size={13} />}</button><button className="task-body" onClick={onOpen}><strong>{activity.description}</strong><span>{activity.dealName || activity.contactName || 'Workspace task'}</span></button><span className="task-date">{overdue && <AlertCircle size={13} />}{shortDate(activity.dueDate)}</span></div>
}

function OrganizationsView({ data, onOpenDetail, onAdd, onEdit, onMutated }: { data: Bootstrap; onOpenDetail: (detail: Exclude<DetailState, null>) => void; onAdd: () => void; onEdit: (record: Organization) => void; onMutated: () => Promise<void> | void }) {
  const [search, setSearch] = useState('')
  const rows = data.organizations.filter((org) => `${org.name} ${org.industry} ${org.website}`.toLowerCase().includes(search.toLowerCase()))
  const remove = async (id: number) => { if (window.confirm('Delete this organization? Related contacts and deals will remain without an organization.')) { await api.deleteOrganization(id); await onMutated() } }
  return <><PageHeading eyebrow="RELATIONSHIPS" title="Organizations" description="The companies and teams behind your opportunities." actions={<button className="button primary" onClick={onAdd}><Plus size={17} /> Add organization</button>} /><div className="toolbar"><div className="search-field"><Search size={17} /><input aria-label="Search organizations" placeholder="Search organizations…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><span className="result-count">{rows.length} of {data.organizations.length} organizations</span></div><div className="panel table-panel"><table><thead><tr><th>Organization</th><th>Industry</th><th>Contacts</th><th>Deals</th><th>Website</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((org) => <tr key={org.id} onClick={() => onOpenDetail({ kind: 'organization', id: org.id })}><td><div className="entity-cell"><div className="entity-logo org">{org.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><strong>{org.name}</strong><span>{org.notes || 'No notes yet'}</span></div></div></td><td><span className="industry-text">{org.industry}</span></td><td><span className="number-cell">{org.contactCount}</span></td><td><span className="number-cell">{org.dealCount}</span></td><td><a className="website-link" href={`https://${org.website}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{org.website} <ExternalLink size={13} /></a></td><td><RowActions onEdit={() => onEdit(org)} onDelete={() => remove(org.id)} /></td></tr>)}</tbody></table>{rows.length === 0 && <EmptyState icon={Building2} title="No organizations found" copy="Try a different search or add a new organization." />}</div></>
}

function ContactsView({ data, onOpenDetail, onAdd, onEdit, onMutated }: { data: Bootstrap; onOpenDetail: (detail: Exclude<DetailState, null>) => void; onAdd: () => void; onEdit: (record: Contact) => void; onMutated: () => Promise<void> | void }) {
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('')
  const rows = data.contacts.filter((contact) => `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.title} ${contact.organizationName || ''}`.toLowerCase().includes(search.toLowerCase()) && (!status || contact.status === status))
  const remove = async (id: number) => { if (window.confirm('Delete this contact? Their activities will remain in the workspace.')) { await api.deleteContact(id); await onMutated() } }
  return <><PageHeading eyebrow="RELATIONSHIPS" title="Contacts" description="Keep every relationship warm and every conversation close." actions={<button className="button primary" onClick={onAdd}><Plus size={17} /> Add contact</button>} /><div className="toolbar"><div className="search-field"><Search size={17} /><input aria-label="Search contacts" placeholder="Search by name, email, or title…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="filter-select"><Filter size={15} /><select aria-label="Filter contacts by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="lead">Lead</option><option value="qualified">Qualified</option><option value="customer">Customer</option></select><ChevronDown size={14} /></div><span className="result-count">{rows.length} contacts</span></div><div className="panel table-panel"><table><thead><tr><th>Contact</th><th>Organization</th><th>Title</th><th>Status</th><th>Last touch</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((contact) => <tr key={contact.id} onClick={() => onOpenDetail({ kind: 'contact', id: contact.id })}><td><div className="entity-cell"><div className="avatar small">{initials(contact.firstName, contact.lastName)}</div><div><strong>{fullName(contact)}</strong><span>{contact.email}</span></div></div></td><td><span className="related-link">{contact.organizationName || 'No organization'}</span></td><td><span className="industry-text">{contact.title}</span></td><td><StatusBadge status={contact.status} /></td><td><span className="last-touch">{data.activities.find((activity) => activity.contactId === contact.id) ? timeAgo(data.activities.find((activity) => activity.contactId === contact.id)!.occurredAt) : 'No activity'}</span></td><td><RowActions onEdit={() => onEdit(contact)} onDelete={() => remove(contact.id)} /></td></tr>)}</tbody></table>{rows.length === 0 && <EmptyState icon={Users} title="No contacts found" copy="Try adjusting the search or status filter." />}</div></>
}

function DealsView({ data, onOpenDetail, onAdd, onEdit, onMutated }: { data: Bootstrap; onOpenDetail: (detail: Exclude<DetailState, null>) => void; onAdd: () => void; onEdit: (record: Deal) => void; onMutated: () => Promise<void> | void }) {
  const [search, setSearch] = useState('')
  const rows = data.deals.filter((deal) => `${deal.name} ${deal.organizationName || ''} ${deal.contactName || ''} ${deal.stage}`.toLowerCase().includes(search.toLowerCase()))
  const remove = async (id: number) => { if (window.confirm('Delete this deal? Its activity history will remain available.')) { await api.deleteDeal(id); await onMutated() } }
  return <><PageHeading eyebrow="REVENUE" title="Deals" description="A clear view of every opportunity, from first conversation to close." actions={<button className="button primary" onClick={onAdd}><Plus size={17} /> Add deal</button>} /><div className="toolbar"><div className="search-field"><Search size={17} /><input aria-label="Search deals" placeholder="Search deals, companies, or stages…" value={search} onChange={(event) => setSearch(event.target.value)} /></div><span className="result-count">{rows.length} of {data.deals.length} deals</span><button className="subtle-button"><Filter size={15} /> Filter view <ChevronDown size={14} /></button></div><div className="panel table-panel"><table><thead><tr><th>Deal</th><th>Organization</th><th>Stage</th><th>Value</th><th>Probability</th><th>Close date</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((deal) => <tr key={deal.id} onClick={() => onOpenDetail({ kind: 'deal', id: deal.id })}><td><div className="deal-cell"><div className="deal-icon"><Target size={16} /></div><div><strong>{deal.name}</strong><span>{deal.contactName || 'No primary contact'}</span></div></div></td><td><span className="related-link">{deal.organizationName || 'No organization'}</span></td><td><StageBadge stage={deal.stage} /></td><td><strong className="money-cell">{money(deal.value)}</strong></td><td><div className="probability"><span className="progress"><i style={{ width: `${deal.probability}%` }} /></span><span>{deal.probability}%</span></div></td><td><span className="date-cell"><CalendarClock size={14} />{date(deal.closeDate)}</span></td><td><RowActions onEdit={() => onEdit(deal)} onDelete={() => remove(deal.id)} /></td></tr>)}</tbody></table>{rows.length === 0 && <EmptyState icon={Target} title="No deals found" copy="Try a different search or add a new deal." />}</div></>
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) { return <div className="row-actions" onClick={(event) => event.stopPropagation()}><button className="icon-button edit" title="Edit" aria-label="Edit" onClick={onEdit}><Edit3 size={15} /></button><button className="icon-button delete" title="Delete" aria-label="Delete" onClick={onDelete}><Trash2 size={15} /></button></div> }
function StatusBadge({ status }: { status: ContactStatus }) { return <span className={`status-badge ${status}`}><i />{status}</span> }
function StageBadge({ stage }: { stage: Stage }) { return <span className="stage-badge" style={{ color: stageColors[stage], backgroundColor: `${stageColors[stage]}14` }}><i style={{ background: stageColors[stage] }} />{stage}</span> }

function PipelineView({ data, onOpenDetail, onMutated }: { data: Bootstrap; onOpenDetail: (detail: Exclude<DetailState, null>) => void; onMutated: () => Promise<void> | void }) {
  const [activeId, setActiveId] = useState<number | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const changeStage = async (id: number, stage: Stage) => { setActiveId(null); await api.updateDealStage(id, stage); await onMutated() }
  const onDragEnd = async (event: DragEndEvent) => { const id = Number(event.active.id); const stage = event.over?.id as Stage | undefined; if (stage && STAGES.includes(stage) && data.deals.find((deal) => deal.id === id)?.stage !== stage) await changeStage(id, stage); else setActiveId(null) }
  const activeDeal = activeId ? data.deals.find((deal) => deal.id === activeId) : null
  return <div className="pipeline-page"><PageHeading eyebrow="REVENUE OPERATIONS" title="Pipeline" description="Move opportunities forward and see the shape of your forecast." actions={<div className="pipeline-kpis"><span><strong>{data.deals.filter((deal) => !['Won', 'Lost'].includes(deal.stage)).length}</strong> open deals</span><span><strong>{money(data.deals.filter((deal) => !['Won', 'Lost'].includes(deal.stage)).reduce((sum, deal) => sum + deal.value, 0))}</strong> open value</span></div>} /><div className="pipeline-tip"><Kanban size={17} /><span>Drag any card into a new stage to update its forecast. Stage probability updates automatically when a deal is won or lost.</span></div><DndContext sensors={sensors} onDragStart={(event) => setActiveId(Number(event.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}><div className="pipeline-board">{STAGES.map((stage) => <PipelineColumn key={stage} stage={stage} deals={data.deals.filter((deal) => deal.stage === stage)} onOpenDetail={onOpenDetail} onNativeDrop={(id) => changeStage(id, stage)} />)}</div><DragOverlay>{activeDeal && <DealCard deal={activeDeal} overlay />}</DragOverlay></DndContext></div>
}

function PipelineColumn({ stage, deals, onOpenDetail, onNativeDrop }: { stage: Stage; deals: Deal[]; onOpenDetail: (detail: Exclude<DetailState, null>) => void; onNativeDrop: (id: number) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage })
  const total = deals.reduce((sum, deal) => sum + deal.value, 0); const expected = deals.reduce((sum, deal) => sum + deal.value * deal.probability / 100, 0)
  return <section ref={setNodeRef} className={`pipeline-column ${isOver ? 'is-over' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = Number(event.dataTransfer.getData('text/plain')); if (id) onNativeDrop(id) }}><div className="column-header"><div><span className="column-title"><i style={{ background: stageColors[stage] }} />{stage}<b>{deals.length}</b></span><p>{stageDescriptions[stage]}</p></div><button className="column-menu" aria-label={`${stage} options`}><MoreHorizontal size={17} /></button></div><div className="column-totals"><span>{money(total)} total</span><strong>{money(expected)} expected</strong></div><div className="deal-stack">{deals.map((deal) => <DealCard key={deal.id} deal={deal} onOpen={() => onOpenDetail({ kind: 'deal', id: deal.id })} />)}{deals.length === 0 && <div className="drop-placeholder"><Plus size={16} /><span>Drop deal here</span></div>}</div></section>
}
function DealCard({ deal, onOpen, overlay }: { deal: Deal; onOpen?: () => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })
  return <article ref={setNodeRef} className={`pipeline-deal ${isDragging || overlay ? 'dragging' : ''}`} style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }} draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', String(deal.id))} onClick={onOpen} {...listeners} {...attributes}><div className="deal-card-top"><span className="deal-card-symbol"><Target size={14} /></span><span className="probability-label">{deal.probability}% likely</span></div><strong>{deal.name}</strong><span className="deal-card-company">{deal.organizationName || 'Unassigned organization'}</span><div className="deal-card-bottom"><strong>{money(deal.value)}</strong><span>{shortDate(deal.closeDate)} <CalendarClock size={13} /></span></div></article>
}

function OrganizationDetail({ data, onBack, onEdit, onOpenDetail, onMutated }: { data: DetailOrganization; onBack: () => void; onEdit: () => void; onOpenDetail: (detail: Exclude<DetailState, null>) => void; onMutated: () => Promise<void> | void }) {
  return <div className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to organizations</button><div className="detail-hero"><div className="entity-logo org large">{data.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div><span className="eyebrow">ORGANIZATION</span><h2>{data.name}</h2><p>{data.industry} · {data.website}</p></div><button className="button secondary detail-edit" onClick={onEdit}><Edit3 size={15} /> Edit organization</button></div><div className="detail-grid"><section className="panel detail-info"><PanelHeader title="Company profile" subtitle="Key context for this relationship" /><div className="info-grid"><InfoItem label="Website" value={data.website} /><InfoItem label="Industry" value={data.industry} /><InfoItem label="Contacts" value={String(data.contacts.length)} /><InfoItem label="Active deals" value={String(data.deals.filter((deal) => !['Won', 'Lost'].includes(deal.stage)).length)} /></div>{data.notes && <div className="notes-block"><span>Notes</span><p>{data.notes}</p></div>}</section><section className="panel"><PanelHeader title="People" subtitle={`${data.contacts.length} contacts at this organization`} action={<button className="text-button" onClick={() => onOpenDetail({ kind: 'contact', id: data.contacts[0]?.id })} disabled={!data.contacts.length}>View first contact <ArrowUpRight size={14} /></button>} />{data.contacts.map((contact) => <button className="related-row" key={contact.id} onClick={() => onOpenDetail({ kind: 'contact', id: contact.id })}><div className="avatar small">{initials(contact.firstName, contact.lastName)}</div><div><strong>{fullName(contact)}</strong><span>{contact.title}</span></div><StatusBadge status={contact.status} /><ArrowUpRight size={14} /></button>)}</section></div><section className="panel detail-table"><PanelHeader title="Deals with this organization" subtitle={`${data.deals.length} opportunities connected to ${data.name}`} />{data.deals.length ? <table><thead><tr><th>Deal</th><th>Stage</th><th>Value</th><th>Close date</th></tr></thead><tbody>{data.deals.map((deal) => <tr key={deal.id} onClick={() => onOpenDetail({ kind: 'deal', id: deal.id })}><td><strong>{deal.name}</strong><span className="table-subline">{deal.contactName || 'No primary contact'}</span></td><td><StageBadge stage={deal.stage} /></td><td><strong>{money(deal.value)}</strong></td><td>{date(deal.closeDate)}</td></tr>)}</tbody></table> : <EmptyState icon={Target} title="No deals yet" copy="Opportunities connected to this organization will appear here." />}</section></div>
}

function ContactDetail({ data, onBack, onEdit, onOpenDetail, onMutated }: { data: DetailContact; onBack: () => void; onEdit: () => void; onOpenDetail: (detail: Exclude<DetailState, null>) => void; onMutated: () => Promise<void> | void }) {
  return <div className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to contacts</button><div className="detail-hero"><div className="avatar large">{initials(data.firstName, data.lastName)}</div><div><span className="eyebrow">CONTACT</span><h2>{fullName(data)}</h2><p>{data.title} {data.organizationName && <>at <button className="inline-link" onClick={() => data.organizationId && onOpenDetail({ kind: 'organization', id: data.organizationId })}>{data.organizationName}</button></>}</p></div><div className="hero-badges"><StatusBadge status={data.status} /><button className="button secondary detail-edit" onClick={onEdit}><Edit3 size={15} /> Edit contact</button></div></div><div className="detail-columns"><div className="detail-main"><section className="panel detail-info"><PanelHeader title="Contact details" subtitle="The best ways to reach this person" /><div className="contact-detail-list"><a href={`mailto:${data.email}`}><Mail size={16} /><span><small>Email</small><strong>{data.email}</strong></span><ArrowUpRight size={14} /></a><a href={`tel:${data.phone}`}><Phone size={16} /><span><small>Phone</small><strong>{data.phone || 'No phone number'}</strong></span><ArrowUpRight size={14} /></a><div><Building2 size={16} /><span><small>Organization</small><strong>{data.organizationName || 'No organization'}</strong></span></div></div></section><section className="panel"><PanelHeader title="Related deals" subtitle={`${data.deals.length} opportunities with this contact`} />{data.deals.length ? data.deals.map((deal) => <button className="related-row" key={deal.id} onClick={() => onOpenDetail({ kind: 'deal', id: deal.id })}><div className="deal-icon"><Target size={15} /></div><div><strong>{deal.name}</strong><span>{money(deal.value)} · closes {date(deal.closeDate)}</span></div><StageBadge stage={deal.stage} /><ArrowUpRight size={14} /></button>) : <EmptyState icon={Target} title="No related deals" copy="Connect this contact to a deal to see it here." />}</section></div><ActivityTimeline activities={data.activities} context={{ contactId: data.id }} onMutated={onMutated} /></div></div>
}

function DealDetail({ data, onBack, onEdit, onOpenDetail, onMutated }: { data: DetailDeal; onBack: () => void; onEdit: () => void; onOpenDetail: (detail: Exclude<DetailState, null>) => void; onMutated: () => Promise<void> | void }) {
  return <div className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to deals</button><div className="detail-hero"><div className="deal-icon large"><Target size={25} /></div><div><span className="eyebrow">DEAL</span><h2>{data.name}</h2><p>{data.organizationName || 'Unassigned organization'} {data.contactName && <>· with {data.contactName}</>}</p></div><div className="hero-badges"><StageBadge stage={data.stage} /><button className="button secondary detail-edit" onClick={onEdit}><Edit3 size={15} /> Edit deal</button></div></div><div className="detail-columns"><div className="detail-main"><section className="panel deal-overview"><PanelHeader title="Deal snapshot" subtitle="A clear read on this opportunity" /><div className="deal-metrics"><div><span>Deal value</span><strong>{money(data.value)}</strong></div><div><span>Probability</span><strong>{data.probability}%</strong></div><div><span>Expected revenue</span><strong>{money(data.value * data.probability / 100)}</strong></div><div><span>Expected close</span><strong>{date(data.closeDate)}</strong></div></div><div className="stage-selector"><label htmlFor="detail-stage">Move deal to</label><select id="detail-stage" value={data.stage} onChange={async (event) => { await api.updateDealStage(data.id, event.target.value as Stage); await onMutated() }}>{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select><ChevronDown size={15} /></div></section><section className="panel"><PanelHeader title="Relationship" subtitle="People and company connected to this opportunity" /><div className="relationship-cards"><button onClick={() => data.organizationId && onOpenDetail({ kind: 'organization', id: data.organizationId })}><Building2 size={17} /><span><small>Organization</small><strong>{data.organizationName || 'Unassigned'}</strong></span><ArrowUpRight size={14} /></button><button onClick={() => data.contactId && onOpenDetail({ kind: 'contact', id: data.contactId })}><Users size={17} /><span><small>Primary contact</small><strong>{data.contactName || 'Unassigned'}</strong></span><ArrowUpRight size={14} /></button></div></section></div><ActivityTimeline activities={data.activities} context={{ dealId: data.id }} onMutated={onMutated} /></div></div>
}

function InfoItem({ label, value }: { label: string; value: string }) { return <div className="info-item"><span>{label}</span><strong>{value}</strong></div> }

function ActivityTimeline({ activities, context, onMutated }: { activities: Activity[]; context: { contactId?: number; dealId?: number }; onMutated: () => Promise<void> | void }) {
  const [search, setSearch] = useState('')
  const visible = activities.filter((activity) => activity.description.toLowerCase().includes(search.toLowerCase()))
  return <section className="panel timeline-panel"><PanelHeader title="Activity timeline" subtitle="Newest conversations first" action={<button className="button primary small" onClick={() => window.dispatchEvent(new CustomEvent('crm:add-activity', { detail: context }))}><Plus size={15} /> Log activity</button>} /><div className="timeline-search"><Search size={14} /><input aria-label="Search activity" placeholder="Search activity…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{visible.length ? <div className="timeline">{visible.map((activity) => <ActivityTimelineItem key={activity.id} activity={activity} onMutated={onMutated} context={context} />)}</div> : <EmptyState icon={ActivityIcon} title="No matching activity" copy="Log the first note, call, or email for this record." />}</section>
}

function ActivityTimelineItem({ activity, onMutated, context }: { activity: Activity; onMutated: () => Promise<void> | void; context: { contactId?: number; dealId?: number } }) {
  const Icon = activityIcons[activity.type]
  const [busy, setBusy] = useState(false)
  const toggle = async () => { setBusy(true); await api.toggleActivity(activity.id, !activity.done); await onMutated(); setBusy(false) }
  const remove = async () => { if (window.confirm('Delete this activity?')) { await api.deleteActivity(activity.id); await onMutated() } }
  return <div className={`timeline-item ${activity.done ? 'completed' : ''}`}><div className={`activity-type ${activity.type}`}><Icon size={15} /></div><div className="timeline-line" /><div className="timeline-copy"><div className="timeline-meta"><strong>{activity.type}</strong><span>{timeAgo(activity.occurredAt)}</span>{activity.dueDate && <span className={`due-badge ${activity.dueDate < todayInput() && !activity.done ? 'overdue' : ''}`}>{activity.done ? 'Completed' : `Follow up ${shortDate(activity.dueDate)}`}</span>}</div><p>{activity.description}</p><div className="timeline-actions"><button onClick={toggle} disabled={busy}>{activity.done ? <><CheckCircle2 size={13} /> Mark not done</> : <><Clock3 size={13} /> Mark done</>}</button><button onClick={() => window.dispatchEvent(new CustomEvent('crm:edit-activity', { detail: { activity, context } }))}><Edit3 size={13} /> Edit</button><button onClick={remove}><Trash2 size={13} /> Delete</button></div></div></div>
}

function useActivityEvents(onAdd: (context: { contactId?: number; dealId?: number }) => void, onEdit: (activity: Activity, context: { contactId?: number; dealId?: number }) => void) {
  useEffect(() => { const add = (event: Event) => onAdd((event as CustomEvent).detail); const edit = (event: Event) => { const detail = (event as CustomEvent).detail; onEdit(detail.activity, detail.context) }; window.addEventListener('crm:add-activity', add); window.addEventListener('crm:edit-activity', edit); return () => { window.removeEventListener('crm:add-activity', add); window.removeEventListener('crm:edit-activity', edit) } }, [onAdd, onEdit])
}

function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="form-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label> }
function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode; wide?: boolean }) { return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true"><div className="modal-header"><div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>{children}</div></div> }
function ModalActions({ onClose, label }: { onClose: () => void; label: string }) { return <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>Cancel</button><button className="button primary" type="submit">{label}</button></div> }

function OrganizationModal({ record, onClose, onSaved }: { record?: Organization; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: record?.name || '', website: record?.website || '', industry: record?.industry || '', notes: record?.notes || '' }); const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!form.name.trim()) return; setSaving(true); try { record ? await api.updateOrganization(record.id, form) : await api.createOrganization(form); await onSaved() } finally { setSaving(false) } }
  return <Modal title={record ? 'Edit organization' : 'Add organization'} eyebrow="ORGANIZATION" onClose={onClose}><form onSubmit={submit}><FormField label="Company name"><input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Northstar Labs" /></FormField><div className="form-grid"><FormField label="Website"><input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="company.com" /></FormField><FormField label="Industry"><input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} placeholder="e.g. SaaS" /></FormField></div><FormField label="Notes"><textarea rows={4} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Useful context about this organization…" /></FormField><ModalActions onClose={onClose} label={saving ? 'Saving…' : record ? 'Save changes' : 'Add organization'} /></form></Modal>
}

function ContactModal({ record, organizations, onClose, onSaved }: { record?: Contact; organizations: Organization[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ firstName: record?.firstName || '', lastName: record?.lastName || '', email: record?.email || '', phone: record?.phone || '', title: record?.title || '', status: record?.status || 'lead' as ContactStatus, organizationId: record?.organizationId || null as number | null }); const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) return; setSaving(true); try { record ? await api.updateContact(record.id, form) : await api.createContact(form); await onSaved() } finally { setSaving(false) } }
  return <Modal title={record ? 'Edit contact' : 'Add contact'} eyebrow="CONTACT" onClose={onClose}><form onSubmit={submit}><div className="form-grid"><FormField label="First name"><input autoFocus required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} placeholder="First name" /></FormField><FormField label="Last name"><input required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} placeholder="Last name" /></FormField></div><div className="form-grid"><FormField label="Email"><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@company.com" /></FormField><FormField label="Phone"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(555) 555-0123" /></FormField></div><div className="form-grid"><FormField label="Job title"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. VP Product" /></FormField><FormField label="Status"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ContactStatus })}><option value="lead">Lead</option><option value="qualified">Qualified</option><option value="customer">Customer</option></select></FormField></div><FormField label="Organization"><select value={form.organizationId || ''} onChange={(event) => setForm({ ...form, organizationId: event.target.value ? Number(event.target.value) : null })}><option value="">No organization</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></FormField><ModalActions onClose={onClose} label={saving ? 'Saving…' : record ? 'Save changes' : 'Add contact'} /></form></Modal>
}

function DealModal({ record, organizations, contacts, onClose, onSaved }: { record?: Deal; organizations: Organization[]; contacts: Contact[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: record?.name || '', organizationId: record?.organizationId || null as number | null, contactId: record?.contactId || null as number | null, stage: record?.stage || 'New' as Stage, value: record?.value || 0, probability: record?.probability ?? 25, closeDate: record?.closeDate || todayInput() }); const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!form.name.trim()) return; setSaving(true); try { record ? await api.updateDeal(record.id, form) : await api.createDeal(form); await onSaved() } finally { setSaving(false) } }
  return <Modal title={record ? 'Edit deal' : 'Add deal'} eyebrow="OPPORTUNITY" onClose={onClose}><form onSubmit={submit}><FormField label="Deal name"><input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Enterprise rollout" /></FormField><div className="form-grid"><FormField label="Organization"><select value={form.organizationId || ''} onChange={(event) => setForm({ ...form, organizationId: event.target.value ? Number(event.target.value) : null })}><option value="">No organization</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></FormField><FormField label="Primary contact"><select value={form.contactId || ''} onChange={(event) => setForm({ ...form, contactId: event.target.value ? Number(event.target.value) : null })}><option value="">No contact</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{fullName(contact)} · {contact.organizationName || 'No org'}</option>)}</select></FormField></div><div className="form-grid three"><FormField label="Stage"><select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as Stage, probability: event.target.value === 'Won' ? 100 : event.target.value === 'Lost' ? 0 : form.probability })}>{STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></FormField><FormField label="Value (USD)"><input type="number" min="0" step="1000" value={form.value} onChange={(event) => setForm({ ...form, value: Number(event.target.value) })} /></FormField><FormField label="Probability"><div className="input-suffix"><input type="number" min="0" max="100" value={form.probability} onChange={(event) => setForm({ ...form, probability: Number(event.target.value) })} /><span>%</span></div></FormField></div><FormField label="Expected close date"><input type="date" value={form.closeDate} onChange={(event) => setForm({ ...form, closeDate: event.target.value })} /></FormField><ModalActions onClose={onClose} label={saving ? 'Saving…' : record ? 'Save changes' : 'Add deal'} /></form></Modal>
}

function ActivityModal({ record, context, onClose, onSaved }: { record?: Activity; context?: { contactId?: number; dealId?: number }; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ type: record?.type || 'note' as ActivityType, description: record?.description || '', occurredAt: record?.occurredAt ? localDateTime(record.occurredAt) : `${todayInput()}T09:00`, dueDate: record?.dueDate || '', done: record?.done || false }); const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!form.description.trim()) return; setSaving(true); try { const payload = { ...form, occurredAt: new Date(form.occurredAt).toISOString(), dueDate: form.dueDate || null, contactId: record?.contactId ?? context?.contactId ?? null, dealId: record?.dealId ?? context?.dealId ?? null }; record ? await api.updateActivity(record.id, payload) : await api.createActivity(payload); await onSaved() } finally { setSaving(false) } }
  return <Modal title={record ? 'Edit activity' : 'Log activity'} eyebrow={record ? 'ACTIVITY' : 'NEW ACTIVITY'} onClose={onClose}><form onSubmit={submit}><div className="activity-type-picker"><button type="button" className={form.type === 'note' ? 'selected' : ''} onClick={() => setForm({ ...form, type: 'note' })}><StickyNote size={16} /> Note</button><button type="button" className={form.type === 'call' ? 'selected' : ''} onClick={() => setForm({ ...form, type: 'call' })}><Phone size={16} /> Call</button><button type="button" className={form.type === 'email' ? 'selected' : ''} onClick={() => setForm({ ...form, type: 'email' })}><Mail size={16} /> Email</button></div><FormField label="What happened?"><textarea autoFocus required rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Write a concise note about the conversation…" /></FormField><div className="form-grid"><FormField label="When"><input type="datetime-local" value={form.occurredAt} onChange={(event) => setForm({ ...form, occurredAt: event.target.value })} /></FormField><FormField label="Follow-up due (optional)"><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></FormField></div>{record && <label className="checkbox-field"><input type="checkbox" checked={form.done} onChange={(event) => setForm({ ...form, done: event.target.checked })} /> Mark this follow-up as complete</label>}<ModalActions onClose={onClose} label={saving ? 'Saving…' : record ? 'Save activity' : 'Log activity'} /></form></Modal>
}

export default App
