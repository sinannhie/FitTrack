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

    {/* Header */}
    <div>
      <h1 className="text-4xl font-bold">Dashboard</h1>
    </div>

    {/* ── TOP 4 CARDS ── */}
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

      {/* Current Weight */}
      <StatCard
        label="Current Weight"
        value={trend?.end_weight_kg?.toFixed(1) ?? '—'}
        unit="kg"
        sub={`Target: ${user?.target_weight ?? '—'} kg`}
        accent="lime"
      />

      {/* Weight Trend */}
      <StatCard
        label="Weight Trend"
        value={trend?.change_kg ?? '—'}
        unit="kg"
        sub="Last 30 days"
        accent="ice"
      />

      {/* Weekly Calories */}
      <StatCard
        label="Weekly Calories"
        value={weekly ? Math.round(weekly.total_calories) : '—'}
        unit="kcal"
        sub="This week"
        accent="ember"
      />

      {/* Weekly Protein */}
      <StatCard
        label="Weekly Protein"
        value={weekly ? Math.round(weekly.total_protein_g) : '—'}
        unit="g"
        sub="This week"
        accent="ice"
      />
    </div>

    {/* ── WEEKLY CHART ── */}
    <Card>
      <div className="flex justify-between items-center mb-4">
        <SectionHeader title="Weekly Overview" />
        <p className="text-sm text-gray-400">
          {weekRangeLabel(currentMonday)}
        </p>
      </div>

      {/* Toggle */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setChartMode('calories')}>
          Calories
        </button>
        <button onClick={() => setChartMode('protein')}>
          Protein
        </button>
      </div>

      {/* Week Navigation */}
      <div className="flex gap-3 mb-4">
        <button onClick={() => setCurrentMonday(addDays(currentMonday, -7))}>
          ‹
        </button>
        <button
          onClick={() => setCurrentMonday(addDays(currentMonday, 7))}
          disabled={isCurrentWeek}
        >
          ›
        </button>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={weekly?.days || []}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />

          <ReferenceLine
            y={chartMode === 'calories' ? user?.calorie_goal : proteinGoal}
            stroke="gray"
            strokeDasharray="4 4"
          />

          <Bar
            dataKey={chartMode === 'calories' ? 'calories' : 'protein'}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary */}
      {weekly && (
        <div className="flex gap-6 mt-4">
          <div>Week: {Math.round(weekly.total_calories)} kcal</div>
          <div>Avg: {Math.round(weekly.total_calories / 7)} kcal</div>
          <div>Protein: {Math.round(weekly.total_protein_g)} g</div>
        </div>
      )}
    </Card>
  </div>
)

}