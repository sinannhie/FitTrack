import { useState, useEffect } from 'react'
import { useUser } from '../hooks/useUser'
import {
  getWeightTrend,
  getNutritionSummary,
  getWeightHistory,
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
  const up    = delta > 0
  const zero  = delta === 0
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

 // make sure this is your configured axios instance

import { getWeeklyNutrition } from '../services/api'


export default function Dashboard() {
  const { user } = useUser()

  const proteinGoal = user?.protein_goal ?? Math.round((user?.weight ?? 0) * 2)
  const fatGoal     = Math.round((user?.weight ?? 0) * 0.7)
  const carbsGoal   = user?.calorie_goal
    ? Math.max(0, Math.round((user.calorie_goal - proteinGoal * 4 - fatGoal * 9) / 4))
    : 0

  // Week navigator
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOf(todayStr()))
  const thisMonday    = getMondayOf(todayStr())
  const isCurrentWeek = currentMonday === thisMonday

  const [trend,     setTrend]     = useState(null)
  const [nutrition, setNutrition] = useState(null)
  const [weekly,    setWeekly]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [weekLoading, setWeekLoading] = useState(false)
  const [error,     setError]     = useState('')

  // Main data
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

  // Weekly data — refetches when week changes
  useEffect(() => {
    if (!user) return
    setWeekLoading(true)
    getWeeklyNutrition(user.id, currentMonday)
      .then((r) => setWeekly(r.data))
      .catch(() => setWeekly(null))
      .finally(() => setWeekLoading(false))
  }, [user, currentMonday])

  if (loading) return <PageLoader />

  const currentWeight = trend?.end_weight_kg
  const caloriesPct   = nutrition?.calorie_goal
    ? Math.round((nutrition.total_calories / nutrition.calorie_goal) * 100)
    : null

  // Chart mode toggle
  const [chartMode, setChartMode] = useState('calories') // 'calories' | 'protein'
  const chartData  = weekly?.days ?? []
  const chartColor = chartMode === 'calories' ? '#FF4D1C' : '#38BDF8'
  const chartGoal  = chartMode === 'calories' ? user?.calorie_goal : proteinGoal

  return (
    <div className="space-y-8">
      <ErrorBanner message={error} />

      {/* Header */}
      <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display text-5xl tracking-widest text-text">DASHBOARD</h1>
        <p className="text-dim text-sm mt-1">
          {new Date().toLocaleDateString('en', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        {/* 1 — Current Weight */}
        <StatCard
          label="Current Weight"
          value={currentWeight?.toFixed(1) ?? '—'}
          unit="kg"
          sub={`Target: ${user?.target_weight ?? '—'} kg`}
          accent="lime"
          icon="◈"
        />

        {/* 2 — Weight Trend */}
        <StatCard
          label="Weight Trend"
          value={
            trend?.change_kg != null
              ? trend.change_kg > 0 ? `+${trend.change_kg}` : `${trend.change_kg}`
              : '—'
          }
          unit="kg"
          sub="Last 30 days"
          accent={
            trend?.trend === 'losing' ? 'ice'
            : trend?.trend === 'gaining' ? 'ember'
            : 'lime'
          }
          icon="◐"
        />

        {/* 3 — Weekly Calories */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-dim text-xs font-mono uppercase tracking-widest">Weekly Calories</p>
            <span className="text-ember text-lg">◎</span>
          </div>
          <p className="font-display text-3xl text-ember leading-tight">
            {weekly ? Math.round(weekly.total_calories).toLocaleString() : '—'}
            <span className="text-sm text-dim font-body ml-1">kcal</span>
          </p>
          <div className="mt-1">
            <TrendArrow delta={weekly?.calorie_trend} unit=" kcal" />
          </div>
          {user?.calorie_goal && weekly && (
            <p className="text-[10px] text-dim font-mono mt-0.5">
              Goal: {(user.calorie_goal * 7).toLocaleString()} kcal/week
            </p>
          )}
        </div>

        {/* 4 — Weekly Protein */}
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-dim text-xs font-mono uppercase tracking-widest">Weekly Protein</p>
            <span className="text-ice text-lg">◉</span>
          </div>
          <p className="font-display text-3xl text-ice leading-tight">
            {weekly ? Math.round(weekly.total_protein_g) : '—'}
            <span className="text-sm text-dim font-body ml-1">g</span>
          </p>
          <div className="mt-1">
            <TrendArrow delta={weekly?.protein_trend} unit="g" />
          </div>
          {proteinGoal > 0 && weekly && (
            <p className="text-[10px] text-dim font-mono mt-0.5">
              Goal: {proteinGoal * 7}g/week
            </p>
          )}
        </div>
      </div>

      {/* Today's Macros */}
      {nutrition && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl tracking-wide">Today's Macros</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <MacroBar label="Calories" current={nutrition.total_calories} goal={nutrition.calorie_goal} color="ember" />
            <MacroBar label="Protein"  current={nutrition.total_protein_g} goal={proteinGoal} color="ice" />
            <MacroBar label="Carbs"    current={nutrition.total_carbs_g}   goal={carbsGoal}   color="lime" />
            <MacroBar label="Fat"      current={nutrition.total_fat_g}     goal={fatGoal}     color="dim" />
          </div>
        </Card>
      )}

      {/* Weekly Chart — Mon to Sun with toggle */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <SectionHeader title="Weekly Overview" />
            <p className="text-dim text-xs font-mono -mt-1">{weekRangeLabel(currentMonday)}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Calories / Protein toggle */}
            <div className="flex rounded-lg border border-muted overflow-hidden text-xs font-mono">
              <button
                onClick={() => setChartMode('calories')}
                className={`px-3 py-1.5 transition-colors ${
                  chartMode === 'calories' ? 'bg-ember/20 text-ember' : 'text-dim hover:text-text'
                }`}
              >
                Calories
              </button>
              <button
                onClick={() => setChartMode('protein')}
                className={`px-3 py-1.5 transition-colors ${
                  chartMode === 'protein' ? 'bg-ice/20 text-ice' : 'text-dim hover:text-text'
                }`}
              >
                Protein
              </button>
            </div>

            {/* Week prev/next */}
            <button
              onClick={() => setCurrentMonday(addDays(currentMonday, -7))}
              className="w-7 h-7 rounded-lg border border-muted text-dim hover:border-lime/50
                hover:text-lime transition-all flex items-center justify-center"
            >
              ‹
            </button>
            <button
              onClick={() => setCurrentMonday(addDays(currentMonday, 7))}
              disabled={isCurrentWeek}
              className={`w-7 h-7 rounded-lg border border-muted flex items-center justify-center
                transition-all ${isCurrentWeek
                  ? 'opacity-30 cursor-not-allowed text-dim'
                  : 'text-dim hover:border-lime/50 hover:text-lime'
                }`}
            >
              ›
            </button>
          </div>
        </div>

        {weekLoading ? (
          <div className="h-[220px] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-border border-t-lime rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              {/* Daily goal reference line */}
              {chartGoal && (
                <ReferenceLine
                  y={chartGoal}
                  stroke={chartColor}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{ value: 'goal', fill: chartColor, fontSize: 9, position: 'insideTopRight' }}
                />
              )}
              <Bar
                dataKey={chartMode === 'calories' ? 'calories' : 'protein'}
                fill={chartColor}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Summary row below chart */}
        {weekly && (
          <div className="flex gap-6 mt-3 pt-3 border-t border-border">
            <div>
              <p className="text-[10px] text-dim font-mono uppercase tracking-widest">Week Total</p>
              <p className="text-sm font-mono text-ember">
                {Math.round(weekly.total_calories).toLocaleString()} kcal
              </p>
            </div>
            <div>
              <p className="text-[10px] text-dim font-mono uppercase tracking-widest">Avg / Day</p>
              <p className="text-sm font-mono text-lime">
                {Math.round(weekly.total_calories / 7).toLocaleString()} kcal
              </p>
            </div>
            <div>
              <p className="text-[10px] text-dim font-mono uppercase tracking-widest">Total Protein</p>
              <p className="text-sm font-mono text-ice">
                {Math.round(weekly.total_protein_g)}g
              </p>
            </div>
            <div>
              <p className="text-[10px] text-dim font-mono uppercase tracking-widest">vs Last Week</p>
              <TrendArrow delta={chartMode === 'calories' ? weekly.calorie_trend : weekly.protein_trend}
                unit={chartMode === 'calories' ? ' kcal' : 'g'} />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}