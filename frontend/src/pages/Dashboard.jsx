import { useState, useEffect } from 'react'
import { useUser } from '../hooks/useUser'
import {
  getWeightTrend,
  getNutritionSummary,
  getWeightHistory,
  getWeeklyNutrition, // ✅ import correctly
} from '../services/api'

import {
  StatCard,
  Card,
  PageLoader,
  ErrorBanner,
  SectionHeader,
  MacroBar,
  EmptyState,
} from '../components/UI'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

// ── Date helpers ─────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0]

const getMondayOf = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const weekRangeLabel = (monday) => {
  const sunday = addDays(monday, 6)
  const fmt = (ds) => {
    const d = new Date(ds + 'T00:00:00')
    return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
  }
  return `${fmt(monday)} – ${fmt(sunday)}`
}

// ── Trend badge ───────────────────────────────────────────────────
function TrendArrow({ delta, unit = '' }) {
  if (delta === null || delta === undefined) return null
  const up = delta > 0
  const zero = delta === 0
  if (zero) return <span className="text-dim text-xs font-mono">→ same</span>
  return (
    <span className={`text-xs font-mono flex items-center gap-0.5 ${up ? 'text-ember' : 'text-ice'}`}>
      {up ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}{unit} vs last week
    </span>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-dim font-mono mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(0) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useUser()

  const proteinGoal = user?.protein_goal ?? Math.round((user?.weight ?? 0) * 2)
  const fatGoal = Math.round((user?.weight ?? 0) * 0.7)
  const carbsGoal = user?.calorie_goal
    ? Math.max(0, Math.round((user.calorie_goal - proteinGoal * 4 - fatGoal * 9) / 4))
    : 0

  const [currentMonday, setCurrentMonday] = useState(() => getMondayOf(todayStr()))
  const thisMonday = getMondayOf(todayStr())
  const isCurrentWeek = currentMonday === thisMonday

  const [trend, setTrend] = useState(null)
  const [nutrition, setNutrition] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weekLoading, setWeekLoading] = useState(false)
  const [error, setError] = useState('')

  // ✅ FIXED: moved here (before return)
  const [chartMode, setChartMode] = useState('calories')

  useEffect(() => {
    if (!user) return
    Promise.all([
      getWeightTrend(user.id, 30),
      getNutritionSummary(user.id, todayStr()),
    ])
      .then(([t, n]) => {
        setTrend(t.data)
        setNutrition(n.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (!user) return
    setWeekLoading(true)
    getWeeklyNutrition(user.id, currentMonday)
      .then((r) => setWeekly(r.data))
      .catch(() => setWeekly(null))
      .finally(() => setWeekLoading(false))
  }, [user, currentMonday])

  if (loading) return <PageLoader />

  const chartData = weekly?.days ?? []
  const chartColor = chartMode === 'calories' ? '#FF4D1C' : '#38BDF8'
  const chartGoal = chartMode === 'calories' ? user?.calorie_goal : proteinGoal

  return (
    <div className="space-y-8">
      <ErrorBanner message={error} />

      <div>
        <h1 className="text-4xl">Dashboard</h1>
      </div>

      <Card>
        <SectionHeader title="Weekly Overview" />

        <button onClick={() => setChartMode('calories')}>Calories</button>
        <button onClick={() => setChartMode('protein')}>Protein</button>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            {chartGoal && <ReferenceLine y={chartGoal} stroke={chartColor} />}
            <Bar
              dataKey={chartMode === 'calories' ? 'calories' : 'protein'}
              fill={chartColor}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}