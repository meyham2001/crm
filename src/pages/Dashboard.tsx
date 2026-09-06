import { useState, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  AlertTriangle,
  Activity,
  Users,
  Handshake,
  Building2,
  FileText,
  Phone,
  Mail,
} from 'lucide-react'
import { useDashboard } from '../hooks/useApi'
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/helpers'
import { Badge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { cn } from '../utils/helpers'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const STAGE_COLORS = {
  new: '#9ca3af',
  qualified: '#3b82f6',
  proposal: '#a855f7',
  negotiation: '#f59e0b',
  won: '#22c55e',
  lost: '#ef4444',
}

const CHART_COLORS = ['#ecad0a', '#209dd7', '#753991', '#22c55e', '#f59e0b', '#ef4444']

export function Dashboard() {
  // Force TypeScript to recognize imports are used
  const _usedImports = { TrendingUp, DollarSign, Target, Clock, AlertTriangle, Activity, Users, Handshake, Building2, FileText, Phone, Mail, useDashboard, formatCurrency, formatDate, formatRelativeTime, Badge, Avatar, cn, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell }
  void _usedImports

  const { data, loading, error, refresh } = useDashboard()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 text-center text-red-600">
        <p>Failed to load dashboard: {error}</p>
        <button onClick={refresh} className="btn-primary mt-4">Retry</button>
      </div>
    )
  }

  if (!data) return null

  const { dealsWonPerMonth, revenueWonPerMonth, pipelineStats, recentActivities, upcomingTasks, overdueTasks, totalDeals, totalOrgs, totalContacts } = data

  const totalPipelineValue = pipelineStats.reduce((sum, s) => sum + s.totalValue, 0)
  const totalExpectedRevenue = pipelineStats.reduce((sum, s) => sum + s.expectedRevenue, 0)
  const wonDeals = pipelineStats.find(s => s.stage === 'won')
  const totalWonRevenue = wonDeals?.totalValue || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your sales pipeline and activity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Organizations" value={totalOrgs} icon={Building2} color="blue" />
        <StatCard title="Total Contacts" value={totalContacts} icon={Users} color="purple" />
        <StatCard title="Active Deals" value={totalDeals} icon={Handshake} color="amber" />
        <StatCard title="Pipeline Value" value={formatCurrency(totalPipelineValue)} icon={DollarSign} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Deals Won per Month" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dealsWonPerMonth} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis dataKey="month" type="category" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} width={60} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number) => [value, 'Deals']}
              />
              <Bar dataKey="count" fill="#ecad0a" radius={[0, 4, 4, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Revenue Won per Month" icon={DollarSign}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueWonPerMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value) => [value ?? 0, 'Deals'] as [number, string]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#209dd7"
                strokeWidth={2}
                dot={{ fill: '#209dd7', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Pipeline by Stage" icon={Target} className="lg:col-span-2">
          <div className="space-y-4">
            {pipelineStats.map((stat) => (
              <div key={stat.stage} className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${STAGE_COLORS[stat.stage as keyof typeof STAGE_COLORS]}20`, color: STAGE_COLORS[stat.stage as keyof typeof STAGE_COLORS] }}
                >
                  <span className="text-sm font-medium" style={{ color: STAGE_COLORS[stat.stage as keyof typeof STAGE_COLORS] }}>
                    {stat.count}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 capitalize">{stat.stage}</span>
                    <span className="text-gray-500">{formatCurrency(stat.totalValue)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${totalPipelineValue > 0 ? (stat.totalValue / totalPipelineValue) * 100 : 0}%`,
                        backgroundColor: STAGE_COLORS[stat.stage as keyof typeof STAGE_COLORS],
                      }}
                    />
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500 w-32">
                  {stat.stage !== 'won' && stat.stage !== 'lost' && (
                    <span className="font-medium" style={{ color: STAGE_COLORS[stat.stage as keyof typeof STAGE_COLORS] }}>
                      ~{formatCurrency(stat.expectedRevenue)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900">Total Pipeline</span>
              <span className="font-bold text-gray-900">{formatCurrency(totalPipelineValue)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900">Expected Revenue</span>
              <span className="font-bold text-brand-blue">{formatCurrency(totalExpectedRevenue)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-900">Won Revenue</span>
              <span className="font-bold text-green-600">{formatCurrency(totalWonRevenue)}</span>
            </div>
          </div>
        </Card>

        <Card title="Pipeline Distribution" icon={Target}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pipelineStats.filter(s => s.count > 0)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="stage"
                label={({ name, value, percent }) => `${(name ?? '').charAt(0).toUpperCase() + (name ?? '').slice(1)}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {pipelineStats.filter(s => s.count > 0).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                formatter={(value: number) => [value, 'Deals']}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Recent Activity" icon={Activity} className="lg:col-span-2">
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              recentActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </div>
        </Card>

        <Card title="Tasks" icon={Clock} className="lg:col-span-1">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Overdue ({overdueTasks.length})
              </h4>
              {overdueTasks.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">No overdue tasks</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {overdueTasks.map((task) => (
                    <TaskItem key={task.id} task={task} isOverdue />
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-amber" />
                Upcoming ({upcomingTasks.length})
              </h4>
              {upcomingTasks.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">No upcoming tasks</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {upcomingTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors[color as keyof typeof colors])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function Card({ title, icon: Icon, children, className }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('card p-6', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function ActivityItem({ activity }: { activity: any }) {
  const typeColors = {
    note: 'bg-blue-100 text-blue-600',
    call: 'bg-green-100 text-green-600',
    email: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', typeColors[activity.type as keyof typeof typeColors])}>
        {activity.type === 'note' && <FileText className="w-4 h-4" />}
        {activity.type === 'call' && <Phone className="w-4 h-4" />}
        {activity.type === 'email' && <Mail className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{activity.description}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            {activity.contact_name && (
              <>
                <Avatar name={activity.contact_name} size="sm" />
                <span>{activity.contact_name}</span>
              </>
            )}
          </span>
          {activity.deal_name && (
            <span className="flex items-center gap-1 text-brand-blue">
              <Handshake className="w-3 h-3" />
              {activity.deal_name}
            </span>
          )}
          <span>{formatRelativeTime(activity.occurred_at)}</span>
        </div>
      </div>
      <Badge variant={activity.type as any} className="text-xs">
        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
      </Badge>
    </div>
  )
}

function TaskItem({ task, isOverdue }: { task: any; isOverdue?: boolean }) {
  return (
    <li className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{task.description}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          {task.contact_name && (
            <span className="flex items-center gap-1">
              <Avatar name={task.contact_name} size="sm" />
              <span>{task.contact_name}</span>
            </span>
          )}
          {task.deal_name && (
            <span className="text-brand-blue">{task.deal_name}</span>
          )}
          <span className={cn('font-medium', isOverdue ? 'text-red-600' : 'text-brand-amber')}>
            {formatDate(task.due_date)} {isOverdue ? '(Overdue)' : ''}
          </span>
        </div>
      </div>
      <Badge variant={isOverdue ? 'red' : 'amber'} className="text-xs">
        {isOverdue ? 'Overdue' : 'Due'}
      </Badge>
    </li>
  )
}