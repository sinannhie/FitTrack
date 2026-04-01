import { useState, useEffect } from 'react'
import { useUser } from '../hooks/useUser'
import {
  getWeightTrend,
  getNutritionSummary,
  getWeeklySummary,
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
} from 'recharts'

// ── Date helpers ─────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

const fmt = (d) => {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

// Get Monday of the week containing `date`
const getMondayOf = (date) => {
  const d = new Date(date + 'T00:00:00')
  const day = d.getDay() // 0=Sun,1=Mon,...
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// Add N days to a date string
const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// Format week range label e.g. "30 Mar – 5 Apr"
const weekLabel = (monday) => {
  const sunday = addDays(monday, 6)
  const fmtShort = (ds) => {
    const d = new Date(ds + 'T00:00:00')
    return d.toLocaleDateString('en', { day: 'numeric', month: 'short' })
  }
  return `${fmtShort(monday)} – ${fmtShort(sunday)}`
}

// Build 7-day skeleton (Mon–Sun) for a given Monday
const buildWeekDays = (monday) =>
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({
    label,
    date: addDays(monday, i),
    calories: 0,
  }))

// ── Tooltip ──────────────────────────────────────────────────────
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
  const fatGoal     = Math.round((user?.weight ?? 0) * 0.7)
  const carbsGoal   = user?.calorie_goal
    ? Math.max(0, Math.round((user.calorie_goal - proteinGoal * 4 - fatGoal * 9) / 4))
    : 0

  // ── Week navigator state ─────────────────────────────────────
  const [currentMonday, setCurrentMonday] = useState(() => getMondayOf(today()))
  const thisMonday = getMondayOf(today())
  const isCurrentWeek = currentMonday === thisMonday

  const [trend, setTrend]                 = useState(null)
  const [nutrition, setNutrition]         = useState(null)
  const [weekly, setWeekly]               = useState(null)
  const [weekDayData, setWeekDayData]     = useState([])
  const [loading, setLoading]             = useState(true)
  const [weekLoading, setWeekLoading]     = useState(false)
  const [error, setError]                 = useState('')

  // Load main dashboard data
  useEffect(() => {
    if (!user) return
    Promise.all([
      getWeightTrend(user.id, 30),
      getNutritionSummary(user.id, today()),
      getWeeklySummary(user.id, 6),
    ])
      .then(([t, n, w]) => {
        setTrend(t.data)
        setNutrition(n.data)
        setWeekly(w.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  // Load per-day calorie data for selected week
  useEffect(() => {
    if (!user) return
    setWeekLoading(true)
    const days = buildWeekDays(currentMonday)

    // Fetch nutrition summary for each day of the week
    Promise.all(
      days.map((d) =>
        getNutritionSummary(user.id, d.date)
          .then((r) => ({ ...d, calories: Math.round(r.data?.total_calories ?? 0) }))
          .catch(() => d)
      )
    )
      .then(setWeekDayData)
      .finally(() => setWeekLoading(false))
  }, [user, currentMonday])

  if (loading) return <PageLoader />

  const currentWeight = trend?.end_weight_kg

  const caloriesPct = nutrition?.calorie_goal
    ? Math.round((nutrition.total_calories / nutrition.calorie_goal) * 100)
    : null

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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Current Weight"
          value={currentWeight?.toFixed(1) ?? '—'}
          unit="kg"
          sub={`Target: ${user?.target_weight ?? '—'} kg`}
          accent="lime"
          icon="◈"
        />
        <StatCard
          label="Calories Today"
          value={Math.round(nutrition?.total_calories ?? 0)}
          unit="kcal"
          sub={caloriesPct != null ? `${caloriesPct}% of goal` : 'No goal set'}
          accent="ember"
          icon="◎"
        />
        <StatCard
          label="Protein Today"
          value={Math.round(nutrition?.total_protein_g ?? 0)}
          unit="g"
          sub={proteinGoal > 0 ? `Goal: ${proteinGoal}g` : 'No goal set'}
          accent="ice"
          icon="◉"
        />
        <StatCard
          label="Weight Trend"
          value={
            trend?.change_kg != null
              ? trend.change_kg > 0 ? `+${trend.change_kg}` : trend.change_kg
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
      </div>

      {/* Today's Macros — no TrendBadge, no "No data" */}
      {nutrition && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl tracking-wide">Today's Macros</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <MacroBar
              label="Calories"
              current={nutrition.total_calories}
              goal={nutrition.calorie_goal}
              color="ember"
            />
            <MacroBar
              label="Protein"
              current={nutrition.total_protein_g}
              goal={proteinGoal}
              color="ice"
            />
            <MacroBar
              label="Carbs"
              current={nutrition.total_carbs_g}
              goal={carbsGoal}
              color="lime"
            />
            <MacroBar
              label="Fat"
              current={nutrition.total_fat_g}
              goal={fatGoal}
              color="dim"
            />
          </div>
        </Card>
      )}

      {/* Weekly Calories — Mon to Sun navigator */}
      <Card>
        {/* Week header with prev/next */}
        <div className="flex items-center justify-between mb-5">
          <SectionHeader title="Weekly Calories" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentMonday(addDays(currentMonday, -7))}
              className="w-7 h-7 rounded-lg border border-muted text-dim hover:border-lime/50
                hover:text-lime transition-all flex items-center justify-center text-sm"
            >
              ‹
            </button>
            <span className="text-xs font-mono text-dim min-w-[120px] text-center">
              {weekLabel(currentMonday)}
            </span>
            <button
              onClick={() => setCurrentMonday(addDays(currentMonday, 7))}
              disabled={isCurrentWeek}
              className={`w-7 h-7 rounded-lg border border-muted flex items-center justify-center
                text-sm transition-all
                ${isCurrentWeek
                  ? 'opacity-30 cursor-not-allowed text-dim'
                  : 'text-dim hover:border-lime/50 hover:text-lime'
                }`}
            >
              ›
            </button>
          </div>
        </div>

        {weekLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-border border-t-lime rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekDayData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="calories" fill="#FF4D1C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Calorie goal reference line label */}
        {user?.calorie_goal && (
          <p className="text-[10px] text-dim font-mono mt-2 text-right">
            Daily goal: {user.calorie_goal} kcal
          </p>
        )}
      </Card>
    </div>
  )
}