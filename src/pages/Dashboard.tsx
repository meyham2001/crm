import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, BadgeDollarSign, Check, Circle, HandCoins, Target, TrendingUp } from "lucide-react";
import type { DashboardStats } from "../../shared/types";
import { useFetch } from "../hooks";
import { useToast } from "../components/Toast";
import { ActivityIcon, ActivityTypeLabel, DueChip } from "../components/Activity";
import { patch } from "../api";
import { fmtDateShort, fmtMoney, fmtMoneyCompact, isOverdue, relativeTime } from "../format";

const STAGE_COLORS: Record<string, string> = {
  New: "#cdd3dc",
  Qualified: "#209dd7",
  Proposal: "#ecad0a",
  Negotiation: "#753991",
  Won: "#2e9e5b",
  Lost: "#9aa4b1",
};

function TooltipBox({ active, payload, label, money }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="recharts-tooltip-wrap">
      <div className="tt-label">{label}</div>
      {payload.map((p) => (
        <div key={p.name}>
          <span className="swatch" style={{ display: "inline-block", width: 8, height: 8, borderRadius: 3, background: p.color, marginRight: 6 }} />
          {p.name}: {money ? fmtMoney(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const toast = useToast();
  const { data, loading, reload } = useFetch<DashboardStats>("/api/dashboard");

  const pipelineChart = useMemo(
    () =>
      (data?.pipeline ?? []).map((p) => ({
        stage: p.stage,
        total: Math.round(p.value),
        expected: Math.round(p.expected),
      })),
    [data]
  );

  const toggleTask = async (id: number, done: boolean) => {
    try {
      await patch(`/api/activities/${id}`, { done });
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update task");
    }
  };

  if (loading) {
    return <div className="page"><div className="empty-state">Loading…</div></div>;
  }
  if (!data) {
    return <div className="page"><div className="empty-state">Couldn't load dashboard.</div></div>;
  }

  const s = data;
  const today = new Date().toDateString();
  const overdueTasks = s.tasks.filter((t) => t.overdue);
  const upcomingTasks = s.tasks.filter((t) => !t.overdue);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">{today}</div>
        </div>
        <div className="page-head-actions">
          <span className="pill"><TrendingUp size={13} /> {s.wonCount} deals won all time</span>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon blue"><BadgeDollarSign size={19} /></div>
          <div>
            <div className="stat-label">Open pipeline</div>
            <div className="stat-value">{fmtMoney(s.openValue)}</div>
            <div className="stat-sub">{s.openCount} deals in play</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Target size={19} /></div>
          <div>
            <div className="stat-label">Expected revenue</div>
            <div className="stat-value">{fmtMoney(s.openExpected)}</div>
            <div className="stat-sub">weighted by probability</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><HandCoins size={19} /></div>
          <div>
            <div className="stat-label">Won this month</div>
            <div className="stat-value">{s.wonThisMonthCount} · {fmtMoney(s.wonThisMonthValue)}</div>
            <div className="stat-sub">{fmtMoney(s.wonValue)} won all time</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><AlertCircle size={19} /></div>
          <div>
            <div className="stat-label">Tasks due</div>
            <div className="stat-value">{s.taskDueCount}</div>
            <div className="stat-sub">within the next 7 days</div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>Deals won per month</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={s.wonByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7684" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#6b7684" }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(21,26,34,0.04)" }} />
              <Bar dataKey="count" name="Deals won" fill="#ecad0a" radius={[5, 5, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Revenue won per month</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={s.wonByMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7684" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => fmtMoneyCompact(v)} tick={{ fontSize: 11, fill: "#6b7684" }} axisLine={false} tickLine={false} width={54} />
              <Tooltip content={<TooltipBox money />} cursor={{ fill: "rgba(21,26,34,0.04)" }} />
              <Bar dataKey="revenue" name="Revenue" fill="#209dd7" radius={[5, 5, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card span-2">
          <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Pipeline overview</span>
            <span className="chart-legend">
              <span><span className="swatch" style={{ background: "#e2e6ec" }} /> Total value</span>
              <span><span className="swatch" style={{ background: "#209dd7" }} /> Expected revenue (value × probability)</span>
            </span>
          </h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={pipelineChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f5" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 12, fill: "#37404d", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => fmtMoneyCompact(v)} tick={{ fontSize: 11, fill: "#6b7684" }} axisLine={false} tickLine={false} width={54} />
              <Tooltip content={<TooltipBox money />} cursor={{ fill: "rgba(21,26,34,0.04)" }} />
              <Bar dataKey="total" name="Total value" fill="#e2e6ec" radius={[5, 5, 0, 0]} maxBarSize={38} />
              <Bar dataKey="expected" name="Expected revenue" radius={[5, 5, 0, 0]} maxBarSize={38}>
                {pipelineChart.map((p) => (
                  <Cell key={p.stage} fill={STAGE_COLORS[p.stage] ?? "#209dd7"} />
                ))}
                <LabelList dataKey="expected" position="top" formatter={(v: number) => fmtMoneyCompact(v)} style={{ fontSize: 10.5, fill: "#6b7684", fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>Upcoming & overdue follow-ups</h3>
          {s.tasks.length === 0 ? (
            <p className="feed-empty">No due follow-ups. Add a due date to any activity to create one.</p>
          ) : (
            <>
              {overdueTasks.length > 0 && (
                <>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--red)", margin: "4px 0 2px" }}>
                    Overdue ({overdueTasks.length})
                  </div>
                  {overdueTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={(done) => toggleTask(t.id, done)} />
                  ))}
                </>
              )}
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--gray-500)", margin: "6px 0 2px" }}>
                Upcoming
              </div>
              {upcomingTasks.length === 0 && overdueTasks.length === 0 && <p className="feed-empty">No follow-ups due in the next two weeks.</p>}
              {upcomingTasks.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={(done) => toggleTask(t.id, done)} />
              ))}
            </>
          )}
        </div>

        <div className="card">
          <h3>Recent activity</h3>
          <div className="timeline" style={{ maxHeight: 340, overflowY: "auto" }}>
            {s.recent.map((a) => {
              const target = a.contact_name ? (
                <Link to={`/contacts/${a.contact_id}`}>{a.contact_name}</Link>
              ) : a.deal_name ? (
                <Link to={`/deals/${a.deal_id}`}>{a.deal_name}</Link>
              ) : null;
              return (
                <div key={a.id} className="timeline-item">
                  <ActivityIcon type={a.type} />
                  <div className="timeline-body">
                    <div className="timeline-top">
                      <ActivityTypeLabel type={a.type} />
                      <span className="timeline-when">{relativeTime(a.happened_at)}</span>
                      {a.due_date && <DueChip dueDate={a.due_date} done={Boolean(a.done)} />}
                    </div>
                    <div className="timeline-desc">{a.description}</div>
                    {target && <div className="timeline-links">{target}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: NonNullable<DashboardStats["tasks"]>[number]; onToggle: (done: boolean) => void }) {
  const overdue = isOverdue(task.due_date);
  return (
    <div className="task-row">
      <button
        className="icon-btn"
        onClick={() => onToggle(!task.done)}
        aria-label="Toggle done"
        title={task.done ? "Mark not done" : "Mark done"}
        style={{ marginRight: 2 }}
      >
        {task.done ? <Check size={15} style={{ color: "var(--green)" }} /> : <Circle size={15} />}
      </button>
      <div className="task-txt">
        <span className={task.done ? "strike" : ""}>{task.description}</span>
        <span className="task-sub">
          {task.contact_name && (
            <>
              <Link to={`/contacts/${task.contact_id}`}>{task.contact_name}</Link>
              {" · "}
            </>
          )}
          {task.deal_name && (
            <>
              <Link to={`/deals/${task.deal_id}`}>{task.deal_name}</Link>
              {" · "}
            </>
          )}
          due {fmtDateShort(task.due_date)}
          {!task.done && overdue && <span style={{ color: "var(--red)", marginLeft: 6, fontWeight: 600 }}>overdue</span>}
        </span>
      </div>
      {!task.done && overdue && <DueChip dueDate={task.due_date} done={false} />}
    </div>
  );
}