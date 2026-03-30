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
  TrendBadge,
  MacroBar,
  EmptyState,
} from '../components/UI'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

// ✅ FIX 1: Macro calculation using weight — supports multiple possible field names
const calcMacros = (weight) => {
  if (!weight || isNaN(weight)) return { protein: 0, fat: 0, carbs: 0 }

  const protein = Math.round(weight * 2)       // 2g per kg bodyweight
  const fat = Math.round(weight * 0.7)         // 0.7g per kg bodyweight
  // Carbs goal derived from calorie budget after protein & fat (calculated later with calorie_goal)
  return { protein, fat }
}

// ✅ FIX 2: Carbs goal calculation using remaining calories
const calcCarbsGoal = (calorieGoal, proteinGoal, fatGoal) => {
  if (!calorieGoal) return 0
  const remaining = calorieGoal - proteinGoal * 4 - fatGoal * 9  // protein=4kcal/g, fat=9kcal/g
  return Math.max(0, Math.round(remaining / 4))                  // carbs=4kcal/g
}

const today = () => new Date().toISOString().split('T')[0]

const fmt = (d) => {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

// ✅ Tooltip
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-dim font-mono mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useUser()

  // ✅ FIX 1: Try all common field names your backend might use for weight
  const userWeight =
    user?.weight ??
    user?.weight_kg ??
    user?.current_weight ??
    user?.currentWeight ??
    null

  // REMOVE these local calculation functions entirely:
// const calcMacros = ...
// const calcCarbsGoal = ...

// REPLACE with:
  const proteinGoal = user?.protein_goal ?? 0
  const fatGoal     = Math.round((user?.weight ?? 0) * 0.7)
  const carbsGoal   = user?.calorie_goal
    ? Math.max(0, Math.round((user.calorie_goal - proteinGoal * 4 - fatGoal * 9) / 4))
    : 0

  const [trend, setTrend] = useState(null)
  const [nutrition, setNutrition] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [weightHistory, setWeightHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    // 🛠️ DEBUG: Remove this log once protein goal is confirmed working
    console.log('[FitTrack] user object:', user)
    console.log('[FitTrack] resolved userWeight:', userWeight)
    console.log('[FitTrack] proteinGoal:', proteinGoal, '| fatGoal:', fatGoal)

    Promise.all([
      getWeightTrend(user.id, 30),
      getNutritionSummary(user.id, today()),
      getWeeklySummary(user.id, 6),
      getWeightHistory(user.id),
    ])
      .then(([t, n, w, wh]) => {
        setTrend(t.data)
        setNutrition(n.data)
        setWeekly(w.data)
        setWeightHistory(wh.data.entries || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <PageLoader />

  const weeklyData =
    weekly?.weeks?.map((w) => ({
      week: fmt(w.week_start),
      calories: w.avg_daily_calories,
      protein: w.avg_daily_protein_g,
      workouts: w.total_workout_days,
    })) || []

  const weightData = weightHistory.map((e) => ({
    date: fmt(e.date),
    kg: e.weight_kg,
  }))

  const currentWeight = trend?.end_weight_kg

  const caloriesPct = nutrition?.calorie_goal
    ? Math.round((nutrition.total_calories / nutrition.calorie_goal) * 100)
    : null

  // ✅ FIX 2: Carbs goal computed from calorie budget
  const carbsGoal = calcCarbsGoal(nutrition?.calorie_goal, proteinGoal, fatGoal)

  return (
    <div className="space-y-8">
      <ErrorBanner message={error} />

      {/* Header */}
      <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display text-5xl tracking-widest text-text">DASHBOARD</h1>
        <p className="text-dim text-sm mt-1">
          {new Date().toLocaleDateString('en', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Current Weight"
          value={currentWeight?.toFixed(1) ?? '—'}
          unit="kg"
          sub={trend ? `Target: ${user.target_weight ?? '—'} kg` : undefined}
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

        {/* ✅ FIX 1: Protein goal now shows weight-based target */}
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
              ? trend.change_kg > 0
                ? `+${trend.change_kg}`
                : trend.change_kg
              : '—'
          }
          unit="kg"
          sub="Last 30 days"
          accent={
            trend?.trend === 'losing'
              ? 'ice'
              : trend?.trend === 'gaining'
              ? 'ember'
              : 'lime'
          }
          icon="◐"
        />
      </div>

      {/* Macros */}
      {nutrition && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl tracking-wide">Today's Macros</h2>
            {trend?.trend && <TrendBadge trend={trend.trend} />}
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Calories — uses API calorie_goal */}
            <MacroBar
              label="Calories"
              current={nutrition.total_calories}
              goal={nutrition.calorie_goal}
              color="ember"
            />

            {/* ✅ FIX 1: Protein goal = weight × 2 */}
            <MacroBar
              label="Protein"
              current={nutrition.total_protein_g}
              goal={proteinGoal}
              color="ice"
            />

            {/* ✅ FIX 2: Carbs goal now calculated from remaining calories */}
            <MacroBar
              label="Carbs"
              current={nutrition.total_carbs_g}
              goal={carbsGoal}
              color="lime"
            />

            {/* ✅ FIX 1: Fat goal = weight × 0.7 */}
            <MacroBar
              label="Fat"
              current={nutrition.total_fat_g}
              goal={fatGoal}
              color="dim"
            />
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <SectionHeader title="Weight History" />
          {weightData.length === 0 ? (
            <EmptyState
              icon="◈"
              title="No weight data"
              description="Log your weight to see the trend chart."
            />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="kg"
                  stroke="#C8F135"
                  fillOpacity={0.2}
                  fill="#C8F135"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <SectionHeader title="Weekly Calories" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="calories" fill="#FF4D1C" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
