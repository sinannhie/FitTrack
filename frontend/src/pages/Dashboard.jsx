import { useState, useEffect } from 'react'
import { useUser } from '../hooks/useUser'
import {
  getWeightTrend,
  getNutritionSummary,
  getWeeklyNutrition,
} from '../services/api'

import {
  StatCard,
  Card,
  PageLoader,
  ErrorBanner,
  SectionHeader,
} from '../components/UI'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

// ── DATE HELPERS ─────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0]

const getMondayOf = (dateStr) => {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const addDays = (dateStr, n) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const weekRangeLabel = (monday) => {
  const sunday = addDays(monday, 6)

  const format = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`
  }

  return `${format(monday)} – ${format(sunday)}`
}

// ── TREND LOGIC ─────────────────────────────────────

const getTrend = (total, goal) => {
  if (!goal || total == null) return null
  const weeklyGoal = goal * 7

  if (total > weeklyGoal) return 'up'
  if (total < weeklyGoal) return 'down'
  return 'equal'
}

const trendLabel = (trend) => {
  if (trend === 'up') return '↑ Above goal'
  if (trend === 'down') return '↓ Below goal'
  return '✓ On track'
}

// ── COMPONENT ─────────────────────────────────────

export default function Dashboard() {
  const { user } = useUser()

  const proteinGoal =
    user?.protein_goal ?? Math.round((user?.weight ?? 0) * 2)

  const [currentMonday, setCurrentMonday] = useState(() =>
    getMondayOf(todayStr())
  )

  const thisMonday = getMondayOf(todayStr())
  const isCurrentWeek = currentMonday === thisMonday

  const [trend, setTrend] = useState(null)
  const [nutrition, setNutrition] = useState(null)
  const [weekly, setWeekly] = useState(null)

  const [loading, setLoading] = useState(true)
  const [weekLoading, setWeekLoading] = useState(false)
  const [error, setError] = useState('')

  const [chartMode, setChartMode] = useState('calories')

  // ── LOAD DAILY DATA ───────────────────────────────

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

  // ── LOAD WEEKLY DATA ─────────────────────────────

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

  const chartColor =
    chartMode === 'calories' ? '#f97316' : '#22c55e'

  const chartGoal =
    chartMode === 'calories'
      ? user?.calorie_goal ?? 0
      : proteinGoal ?? 0

  const calorieTrend = getTrend(
    weekly?.total_calories,
    user?.calorie_goal
  )

  const proteinTrend = getTrend(
    weekly?.total_protein_g,
    proteinGoal
  )

  return (
    <div className="space-y-8">

      <ErrorBanner message={error} />

      <h1 className="text-4xl font-bold">Dashboard</h1>

      {/* ── TOP CARDS ───────────────────────── */}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        <StatCard
          label="Current Weight"
          value={trend?.end_weight_kg?.toFixed(1) ?? '—'}
          unit="kg"
          sub={`Target: ${user?.target_weight ?? '—'} kg`}
          accent="lime"
        />

        <StatCard
          label="Weight Trend"
          value={trend?.change_kg ?? '—'}
          unit="kg"
          sub="Last 30 days"
          accent="ice"
        />

        <StatCard
          label="Weekly Calories"
          value={weekly ? Math.round(weekly.total_calories) : '—'}
          unit="kcal"
          sub={trendLabel(calorieTrend)}
          accent="ember"
        />

        <StatCard
          label="Weekly Protein"
          value={weekly ? Math.round(weekly.total_protein_g) : '—'}
          unit="g"
          sub={trendLabel(proteinTrend)}
          accent="ice"
        />
      </div>

      {/* ── WEEKLY CHART ───────────────────── */}

      <Card>
        <div className="flex justify-between items-center mb-4">
          <SectionHeader title="Weekly Overview" />
          <p className="text-sm text-gray-400">
            {weekRangeLabel(currentMonday)}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setChartMode('calories')}
            className={chartMode === 'calories' ? 'font-bold' : ''}
          >
            Calories
          </button>

          <button
            onClick={() => setChartMode('protein')}
            className={chartMode === 'protein' ? 'font-bold' : ''}
          >
            Protein
          </button>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setCurrentMonday(addDays(currentMonday, -7))}
          >
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
          <BarChart data={chartData}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />

            {chartGoal > 0 && (
              <ReferenceLine
                y={chartGoal}
                stroke={chartColor}
                strokeDasharray="4 4"
              />
            )}

            <Bar
              dataKey={
                chartMode === 'calories' ? 'calories' : 'protein'
              }
              fill={chartColor}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary */}
        {weekly && (
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              Week: {Math.round(weekly.total_calories)} kcal
            </div>
            <div>
              Avg: {Math.round(weekly.total_calories / 7)} kcal
            </div>
            <div>
              Protein: {Math.round(weekly.total_protein_g)} g
            </div>
          </div>
        )}
      </Card>

    </div>
  )
}