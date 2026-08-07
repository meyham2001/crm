import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CalendarClock, CircleDollarSign, Inbox, ListTodo, TrendingUp } from "lucide-react";
import { api } from "../api";
import { useData } from "../hooks";
import { fmtDate, fmtMoney, fmtMoneyCompact, isOverdue, relTime } from "../format";
import { errMsg, type ActivityRow, type DashboardData } from "../types";
import { ErrorBanner, Loading, PageHeader } from "../components/ui";
import { ActivityIcon } from "../components/ActivityTimeline";
import { useToast } from "../components/Toast";

const COLORS = {
  blue: "#209dd7",
  amber: "#ecad0a",
  purple: "#753991",
  grayBar: "#d7dde5",
  axis: "#8b96a5",
  grid: "#e9edf1"
};

function moneyTick(v: number): string {
  return fmtMoneyCompact(v);
}

function ChartTooltip({ active, payload, label, money }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 11px", boxShadow: "var(--shadow)", fontSize: 12.5 }}>
      <div style={{ fontWeight: 650, marginBottom: 3 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: p.fill ?? p.color, display: "inline-block" }} />
          {p.name}: <strong style={{ color: "var(--text)" }}>{money ? fmtMoney(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function PipelineTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 11px", boxShadow: "var(--shadow)", fontSize: 12.5 }}>
      <div style={{ fontWeight: 650, marginBottom: 3 }}>{row.label}</div>
      <div style={{ color: "var(--text-secondary)" }}>
        {row.count} {row.count === 1 ? "deal" : "deals"} · {fmtMoney(row.total)} total
      </div>
      <div style={{ color: "var(--text-secondary)" }}>
        Expected: <strong style={{ color: "var(--text)" }}>{fmtMoney(row.expected)}</strong>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useData(() => api<DashboardData>("/dashboard"), []);

  async function toggleTask(task: ActivityRow) {
    const markingDone = !task.done;
    try {
      await api(`/activities/${task.id}`, { method: "PATCH", body: JSON.stringify({ done: markingDone }) });
      if (markingDone) {
        toast("Task marked as done", "success", {
          label: "Undo",
          onClick: () => {
            api(`/activities/${task.id}`, { method: "PATCH", body: JSON.stringify({ done: false }) })
              .then(() => reload())
              .catch((e) => toast(errMsg(e), "error"));
          }
        });
      } else {
        toast("Task marked as not done");
      }
      reload();
    } catch (e) {
      toast(errMsg(e), "error");
    }
  }

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBanner message={error ?? "Could not load the dashboard"} onRetry={reload} />;

  const { kpis } = data;
  const overdue = data.tasks.filter((t) => isOverdue(t.due_date!));
  const upcoming = data.tasks.filter((t) => !isOverdue(t.due_date!));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="How your sales are going" />

      <div className="kpi-grid">
        <div className="card kpi">
          <div className="kpi-label">
            <Inbox size={14} />
            Open pipeline
          </div>
          <div className="kpi-value">{fmtMoney(kpis.openValue)}</div>
          <div className="kpi-sub">
            {kpis.openCount} active {kpis.openCount === 1 ? "deal" : "deals"}
          </div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">
            <TrendingUp size={14} />
            Expected revenue
          </div>
          <div className="kpi-value">{fmtMoney(kpis.expectedValue)}</div>
          <div className="kpi-sub">probability-weighted open deals</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">
            <CircleDollarSign size={14} />
            Won this month
          </div>
          <div className="kpi-value">{fmtMoney(kpis.wonThisMonthRevenue)}</div>
          <div className="kpi-sub">
            {kpis.wonThisMonthCount} {kpis.wonThisMonthCount === 1 ? "deal" : "deals"} closed
          </div>
        </div>
        <div className={`card kpi${kpis.overdueTaskCount > 0 ? " alert" : ""}`}>
          <div className="kpi-label">
            <ListTodo size={14} />
            Overdue tasks
          </div>
          <div className="kpi-value">{kpis.overdueTaskCount}</div>
          <div className="kpi-sub">{kpis.overdueTaskCount > 0 ? "need your attention" : "all caught up"}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <div className="card-title">
            Deals won per month
            <span className="chart-note">last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.wonByMonth} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={COLORS.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: COLORS.axis }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: COLORS.axis }} />
              <Tooltip cursor={{ fill: "rgba(32,157,215,0.07)" }} content={<ChartTooltip />} />
              <Bar dataKey="count" name="Deals won" fill={COLORS.blue} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-pad">
          <div className="card-title">
            Revenue won per month
            <span className="chart-note">last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.wonByMonth} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={COLORS.grid} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: COLORS.axis }} />
              <YAxis tickFormatter={moneyTick} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: COLORS.axis }} width={52} />
              <Tooltip cursor={{ fill: "rgba(236,173,10,0.09)" }} content={<ChartTooltip money />} />
              <Bar dataKey="revenue" name="Revenue won" fill={COLORS.amber} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div className="card-title">
          Pipeline by stage
          <span className="legend">
            <span>
              <span className="swatch" style={{ background: COLORS.grayBar }} />
              Total value
            </span>
            <span>
              <span className="swatch" style={{ background: COLORS.purple }} />
              Expected revenue (probability-weighted)
            </span>
          </span>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data.pipeline} layout="vertical" margin={{ top: 0, right: 18, left: 8, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={COLORS.grid} />
            <XAxis type="number" tickFormatter={moneyTick} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: COLORS.axis }} />
            <YAxis type="category" dataKey="label" width={92} tickLine={false} axisLine={false} tick={{ fontSize: 12.5, fill: "var(--text-secondary)" }} />
            <Tooltip cursor={{ fill: "rgba(117,57,145,0.05)" }} content={<PipelineTooltip />} />
            <Bar dataKey="total" name="Total value" fill={COLORS.grayBar} radius={[0, 4, 4, 0]} maxBarSize={16} />
            <Bar dataKey="expected" name="Expected revenue" fill={COLORS.purple} radius={[0, 4, 4, 0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-3-2" style={{ marginBottom: 0 }}>
        <div className="card card-pad">
          <div className="card-title">Recent activity</div>
          {data.recentActivities.length === 0 ? (
            <div className="empty-state">No activity yet — log something from a contact or deal.</div>
          ) : (
            <div className="feed">
              {data.recentActivities.map((a) => (
                <div className="feed-item" key={a.id}>
                  <div className={`feed-icon ${a.type}`}>
                    <ActivityIcon type={a.type} size={14} />
                  </div>
                  <div className="feed-body">
                    <div className="feed-desc">{a.description}</div>
                    <div className="feed-meta">
                      {a.contact_name && <Link to={`/contacts/${a.contact_id}`}>{a.contact_name}</Link>}
                      {a.contact_name && a.deal_name && " · "}
                      {a.deal_name && <Link to={`/deals/${a.deal_id}`}>{a.deal_name}</Link>}
                    </div>
                  </div>
                  <span className="feed-time">{relTime(a.occurred_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="card-title">Upcoming &amp; overdue tasks</div>
          {data.tasks.length === 0 ? (
            <div className="empty-state">
              <CalendarClock size={24} />
              <div>Nothing due. Add a follow-up date to any activity to create a task.</div>
            </div>
          ) : (
            <div className="task-list">
              {overdue.length > 0 && <div className="task-group-label overdue">Overdue</div>}
              {overdue.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t)} />
              ))}
              {upcoming.length > 0 && <div className="task-group-label">Upcoming</div>}
              {upcoming.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TaskRow({ task, onToggle }: { task: ActivityRow; onToggle: () => void }) {
  const overdue = isOverdue(task.due_date!);
  return (
    <div className="task-row">
      <input type="checkbox" checked={task.done} onChange={onToggle} aria-label={`Mark “${task.description}” done`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="task-desc">{task.description}</div>
        <div className="task-meta">
          {task.contact_name && <Link to={`/contacts/${task.contact_id}`}>{task.contact_name}</Link>}
          {task.deal_name && <Link to={`/deals/${task.deal_id}`}>{task.deal_name}</Link>}
          <span className={`due-chip${overdue ? " overdue" : ""}`}>
            <CalendarClock size={11} />
            {overdue ? `Overdue · ${fmtDate(task.due_date)}` : fmtDate(task.due_date)}
          </span>
        </div>
      </div>
    </div>
  );
}
