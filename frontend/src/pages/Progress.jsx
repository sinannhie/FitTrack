import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../hooks/useUser'
import { getWeightTrend, getCalorieWeightCorrelation, getWeeklySummary, logWeight, getWeightHistory } from '../services/api'
import {
  Card,
  Input,
  Button,
  StatCard,
  PageLoader,
  ErrorBanner,
  EmptyState,
  SectionHeader,
  TrendBadge,
  Badge,
} from '../components/UI'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Line,
  LineChart,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

const today = () => new Date().toISOString().split('T')[0]
const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1">
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

const PERIODS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
]

export default function ProgressPage() {
  const { user } = useUser()
  const [period, setPeriod] = useState(30)
  const [trend, setTrend] = useState(null)
  const [correlation, setCorrelation] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [weightHistory, setWeightHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Weight log form
  const [weightForm, setWeightForm] = useState({ date: today(), weight_kg: '', notes: '' })
  const [weightSubmitting, setWeightSubmitting] = useState(false)
  const [weightError, setWeightError] = useState('')
  const [weightSuccess, setWeightSuccess] = useState(false)

  const loadData = useCallback(() => {
    if (!user) return
    setLoading(true)
    setError('')
    Promise.all([
      getWeightTrend(user.id, period),
      getCalorieWeightCorrelation(user.id, period),
      getWeeklySummary(user.id, 8),
      getWeightHistory(user.id),
    ])
      .then(([t, c, w, wh]) => {
        setTrend(t.data)
        setCorrelation(c.data)
        setWeekly(w.data)
        setWeightHistory(wh.data.entries || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, period])

  useEffect(() => { loadData() }, [loadData])

  const handleWeightLog = async (e) => {
    e.preventDefault()
    if (!weightForm.weight_kg || parseFloat(weightForm.weight_kg) <= 0) {
      return setWeightError('Enter a valid weight.')
    }
    setWeightSubmitting(true)
    setWeightError('')
    try {
      await logWeight(user.id, {
        date: weightForm.date,
        weight_kg: parseFloat(weightForm.weight_kg),
        notes: weightForm.notes || null,
      })
      setWeightSuccess(true)
      setTimeout(() => setWeightSuccess(false), 2000)
      setWeightForm((f) => ({ ...f, weight_kg: '', notes: '' }))
      loadData()
    } catch (err) {
      setWeightError(err.message)
    } finally {
      setWeightSubmitting(false)
    }
  }

  // Chart data
  const weightChartData = weightHistory.map((e) => ({ date: fmt(e.date), kg: e.weight_kg }))

  const correlationData = correlation?.data?.filter((d) => d.weight_kg != null).map((d) => ({
    date: fmt(d.date),
    calories: d.total_calories,
    weight: d.weight_kg,
  })) || []

  const weeklyChartData = weekly?.weeks?.map((w) => ({
    week: fmt(w.week_start),
    protein: w.avg_daily_protein_g,
    calories: w.avg_daily_calories,
    workouts: w.total_workout_days,
  })) || []

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <h1 className="font-display text-5xl tracking-widest text-text">PROGRESS</h1>
          <p className="text-dim text-sm mt-1">Analytics and trend insights</p>
        </div>
        {/* Period selector */}
        <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p.value ? 'bg-lime text-void' : 'text-dim hover:text-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} onRetry={loadData} />

      {/* Trend stats */}
      {trend && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Start Weight"
            value={trend.start_weight_kg?.toFixed(1) ?? '—'}
            unit="kg"
            accent="dim"
            icon="◈"
            delay={0}
          />
          <StatCard
            label="Current Weight"
            value={trend.end_weight_kg?.toFixed(1) ?? '—'}
            unit="kg"
            accent="lime"
            icon="◈"
            delay={100}
          />
          <StatCard
            label="Change"
            value={trend.change_kg != null ? (trend.change_kg > 0 ? `+${trend.change_kg}` : trend.change_kg) : '—'}
            unit="kg"
            accent={trend.change_kg < 0 ? 'ice' : 'ember'}
            icon="◐"
            delay={200}
          />
          <div
            className="card animate-fade-up opacity-0 flex flex-col gap-3"
            style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
          >
            <span className="label">Trend</span>
            <div className="flex items-center gap-2 mt-1">
              <TrendBadge trend={trend.trend} />
            </div>
            <p className="text-xs text-dim">{period}-day window · {trend.data_points?.length ?? 0} entries</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Weight log form */}
        <Card
          className="animate-fade-up opacity-0 animate-delay-200 h-fit"
          style={{ animationFillMode: 'forwards' }}
        >
          <h2 className="font-display text-2xl tracking-wide mb-5">Log Weight</h2>
          <form onSubmit={handleWeightLog} className="space-y-4">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={weightForm.date}
                onChange={(e) => setWeightForm((f) => ({ ...f, date: e.target.value }))}
                className="input-field"
                max={today()}
              />
            </div>
            <Input
              label="Weight (kg)"
              id="weight_kg"
              type="number"
              step="0.1"
              min="20"
              max="400"
              placeholder="78.5"
              value={weightForm.weight_kg}
              onChange={(e) => setWeightForm((f) => ({ ...f, weight_kg: e.target.value }))}
            />
            <Input
              label="Notes (optional)"
              id="notes"
              placeholder="Morning, fasted…"
              value={weightForm.notes}
              onChange={(e) => setWeightForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <ErrorBanner message={weightError} />
            {weightSuccess && (
              <div className="text-xs text-lime font-mono text-center py-2">✓ Weight logged!</div>
            )}
            <Button type="submit" disabled={weightSubmitting} className="w-full">
              {weightSubmitting ? 'Saving…' : 'Log Weight →'}
            </Button>
          </form>

          {/* Recent entries */}
          {weightHistory.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border">
              <p className="label mb-3">Recent Entries</p>
              <div className="space-y-1.5">
                {[...weightHistory].reverse().slice(0, 5).map((e, i) => (
                  <div key={i} className="flex justify-between text-xs py-1.5 px-2 rounded-lg hover:bg-muted/20">
                    <span className="text-dim font-mono">{fmt(e.date)}</span>
                    <span className="font-mono font-semibold text-lime">{e.weight_kg} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Weight chart */}
        <Card
          className="lg:col-span-2 animate-fade-up opacity-0 animate-delay-300"
          style={{ animationFillMode: 'forwards' }}
        >
          <SectionHeader title={`Weight Trend — ${period} days`} />
          {weightChartData.length < 2 ? (
            <EmptyState icon="◈" title="Not enough data" description="Log weight on at least 2 days to see your trend." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={weightChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8F135" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C8F135" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="kg" name="Weight (kg)" stroke="#C8F135" strokeWidth={2}
                  fill="url(#wGrad)" dot={{ r: 3, fill: '#C8F135', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                {user?.target_weight && (
                  <Line type="monotone" dataKey={() => user.target_weight} name="Target"
                    stroke="#888" strokeDasharray="4 4" strokeWidth={1} dot={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Correlation + weekly */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Calorie / weight correlation */}
        <Card
          className="animate-fade-up opacity-0 animate-delay-400"
          style={{ animationFillMode: 'forwards' }}
        >
          <SectionHeader title="Calories vs Weight" />
          <p className="text-[11px] text-dim font-mono mb-4">Daily paired data points — look for inverse patterns</p>
          {correlationData.length < 3 ? (
            <EmptyState icon="◎" title="Not enough data" description="Log food and weight on the same days to see correlation." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={correlationData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis yAxisId="cal" orientation="left" tick={{ fontSize: 9 }} stroke="#FF4D1C" />
                <YAxis yAxisId="wt" orientation="right" tick={{ fontSize: 9 }} stroke="#C8F135" domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line yAxisId="cal" type="monotone" dataKey="calories" name="Calories (kcal)"
                  stroke="#FF4D1C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line yAxisId="wt" type="monotone" dataKey="weight" name="Weight (kg)"
                  stroke="#C8F135" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Weekly protein + workouts */}
        <Card
          className="animate-fade-up opacity-0 animate-delay-500"
          style={{ animationFillMode: 'forwards' }}
        >
          <SectionHeader title="Weekly Protein & Training" />
          {weeklyChartData.length === 0 ? (
            <EmptyState icon="◉" title="No weekly data yet" description="Log food and workouts for weekly insights." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="prot" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="wo" orientation="right" tick={{ fontSize: 9 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="prot" dataKey="protein" name="Avg Protein (g)" fill="#7DD8F8" radius={[3, 3, 0, 0]} opacity={0.85} />
                <Bar yAxisId="wo" dataKey="workouts" name="Workout Days" fill="#C8F135" radius={[3, 3, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Detailed weekly table */}
      {weekly?.weeks?.length > 0 && (
        <Card
          className="animate-fade-up opacity-0 animate-delay-500"
          style={{ animationFillMode: 'forwards' }}
        >
          <SectionHeader title="Weekly Detail" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Week', 'Food Days', 'Avg Cal', 'Avg Protein', 'Workouts', 'Avg Weight', 'Weight Δ'].map((h) => (
                    <th key={h} className="text-left py-2 pr-4 text-[11px] text-dim font-mono uppercase tracking-wider font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...weekly.weeks].reverse().map((w, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs text-dim">{fmt(w.week_start)}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs font-mono">{w.days_logged_food}<span className="text-dim">/7</span></span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-ember font-mono text-sm">{Math.round(w.avg_daily_calories)}</td>
                    <td className="py-3 pr-4 font-medium text-ice font-mono text-sm">{Math.round(w.avg_daily_protein_g)}g</td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 7 }).map((_, d) => (
                          <div
                            key={d}
                            className={`w-3 h-3 rounded-sm ${d < w.total_workout_days ? 'bg-lime' : 'bg-muted/40'}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {w.avg_weight_kg ? `${w.avg_weight_kg} kg` : <span className="text-dim">—</span>}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {w.weight_change_kg != null ? (
                        <span className={w.weight_change_kg < 0 ? 'text-ice' : w.weight_change_kg > 0 ? 'text-ember' : 'text-dim'}>
                          {w.weight_change_kg > 0 ? '+' : ''}{w.weight_change_kg} kg
                        </span>
                      ) : <span className="text-dim">—</span>}
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
