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

const calcMacros = (weight) => {
if (!weight) return { protein: 0, fat: 0 }

return {
protein: Math.round(weight * 2),
fat: Math.round(weight * 0.7),
}
}

const today = () => new Date().toISOString().split('T')[0]

const fmt = (d) => {
const dt = new Date(d + 'T00:00:00')
return dt.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

function CustomTooltip({ active, payload, label }) {
if (!active || !payload?.length) return null
return ( <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs"> <p className="text-dim font-mono mb-1">{label}</p>
{payload.map((p) => (
<p key={p.name} style={{ color: p.color }} className="font-medium">
{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value} </p>
))} </div>
)
}

export default function Dashboard() {
const { user } = useUser()
const { protein: proteinGoal, fat: fatGoal } = calcMacros(user?.weight)

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

return ( <div className="space-y-8"> <ErrorBanner message={error} />

```
  {/* Header */}
  <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
    <h1 className="font-display text-5xl tracking-widest text-text">DASHBOARD</h1>
    <p className="text-dim text-sm mt-1">
      {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

    <StatCard
      label="Protein Today"
      value={Math.round(nutrition?.total_protein_g ?? 0)}
      unit="g"
      sub={`Goal: ${proteinGoal}g`}
      accent="ice"
      icon="◉"
    />

    <StatCard
      label="Weight Trend"
      value={trend?.change_kg != null ? (trend.change_kg > 0 ? `+${trend.change_kg}` : trend.change_kg) : '—'}
      unit="kg"
      sub="Last 30 days"
      accent={trend?.trend === 'losing' ? 'ice' : trend?.trend === 'gaining' ? 'ember' : 'lime'}
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

  {/* Charts */}
  <div className="grid lg:grid-cols-2 gap-4">
    <Card>
      <SectionHeader title="Weight History" />
      {weightData.length === 0 ? (
        <EmptyState icon="◈" title="No weight data" description="Log your weight to see the trend chart." />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={weightData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="kg" stroke="#C8F135" fillOpacity={0.2} fill="#C8F135" />
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
```

)
}
