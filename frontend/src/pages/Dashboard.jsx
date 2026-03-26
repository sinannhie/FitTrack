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

const today = () => new Date().toISOString().split('T')[0]

const fmt = (d) => {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

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
  const [trend, setTrend] = useState(null)
  const [nutrition, setNutrition] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [weightHistory, setWeightHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
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

  return (
    <div className="space-y-8">
      <ErrorBanner message={error} />

      {/* Page header */}
      <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display text-5xl tracking-widest text-text">DASHBOARD</h1>
        <p className="text-dim text-sm mt-1">
          {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Current Weight"
          value={currentWeight?.toFixed(1) ?? '—'}
          unit="kg"
          sub={trend ? `Target: ${user.target_weight ?? '—'} kg` : undefined}
          accent="lime"
          icon="◈"
          delay={0}
        />
        <StatCard
          label="Calories Today"
          value={Math.round(nutrition?.total_calories ?? 0)}
          unit="kcal"
          sub={caloriesPct != null ? `${caloriesPct}% of goal` : 'No goal set'}
          accent="ember"
          icon="◎"
          delay={100}
        />
        <StatCard
          label="Protein Today"
          value={Math.round(nutrition?.total_protein_g ?? 0)}
          unit="g"
          sub={nutrition?.protein_goal ? `Goal: ${nutrition.protein_goal}g` : 'No goal set'}
          accent="ice"
          icon="◉"
          delay={200}
        />
        <StatCard
          label="Weight Trend"
          value={trend?.change_kg != null ? (trend.change_kg > 0 ? `+${trend.change_kg}` : trend.change_kg) : '—'}
          unit="kg"
          sub="Last 30 days"
          accent={trend?.trend === 'losing' ? 'ice' : trend?.trend === 'gaining' ? 'ember' : 'lime'}
          icon="◐"
          delay={300}
        />
      </div>

      {/* Macro progress */}
      {nutrition && (
        <Card
          className="animate-fade-up opacity-0 animate-delay-300"
          style={{ animationFillMode: 'forwards' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl tracking-wide">Today's Macros</h2>
            {trend?.trend && <TrendBadge trend={trend.trend} />}
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
              goal={nutrition.protein_goal}
              color="ice"
            />
            <MacroBar label="Carbs" current={nutrition.total_carbs_g} color="lime" />
            <MacroBar label="Fat" current={nutrition.total_fat_g} color="dim" />
          </div>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Weight chart */}
        <Card
          className="animate-fade-up opacity-0 animate-delay-400"
          style={{ animationFillMode: 'forwards' }}
        >
          <SectionHeader title="Weight History" />
          {weightData.length === 0 ? (
            <EmptyState icon="◈" title="No weight data" description="Log your weight to see the trend chart." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weightData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8F135" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C8F135" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="kg"
                  name="Weight"
                  stroke="#C8F135"
                  strokeWidth={2}
                  fill="url(#weightGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#C8F135' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Weekly calories */}
        <Card
          className="animate-fade-up opacity-0 animate-delay-500"
          style={{ animationFillMode: 'forwards' }}
        >
          <SectionHeader title="Weekly Calories" />
          {weeklyData.length === 0 ? (
            <EmptyState icon="◎" title="No weekly data" description="Log food for a few days to see weekly averages." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="calories" name="Avg Kcal" fill="#FF4D1C" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Weekly summary table */}
      {weekly?.weeks?.length > 0 && (
        <Card
          className="animate-fade-up opacity-0 animate-delay-500"
          style={{ animationFillMode: 'forwards' }}
        >
          <SectionHeader title="Weekly Breakdown" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Week', 'Avg Cal', 'Avg Protein', 'Workouts', 'Avg Weight', 'Δ Weight'].map((h) => (
                    <th key={h} className="text-left py-2 pr-4 text-[11px] text-dim font-mono uppercase tracking-wider font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...weekly.weeks].reverse().map((w, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs text-dim">{fmt(w.week_start)}</td>
                    <td className="py-3 pr-4 font-medium text-ember">{Math.round(w.avg_daily_calories)}</td>
                    <td className="py-3 pr-4 font-medium text-ice">{Math.round(w.avg_daily_protein_g)}g</td>
                    <td className="py-3 pr-4">
                      <span className="font-mono text-lime">{w.total_workout_days}</span>
                      <span className="text-dim text-xs"> days</span>
                    </td>
                    <td className="py-3 pr-4 font-mono">
                      {w.avg_weight_kg ? `${w.avg_weight_kg} kg` : <span className="text-dim">—</span>}
                    </td>
                    <td className="py-3 pr-4 font-mono">
                      {w.weight_change_kg != null ? (
                        <span className={w.weight_change_kg < 0 ? 'text-ice' : w.weight_change_kg > 0 ? 'text-ember' : 'text-dim'}>
                          {w.weight_change_kg > 0 ? '+' : ''}{w.weight_change_kg} kg
                        </span>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
