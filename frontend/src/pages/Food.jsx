import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../hooks/useUser'
import { logFood, getFoodLogs, getNutritionSummary, getFoods, deleteFoodLog } from '../services/api'
import {
  Card,
  Input,
  Select,
  Button,
  StatCard,
  PageLoader,
  ErrorBanner,
  MacroBar,
  EmptyState,
  SectionHeader,
  Badge,
} from '../components/UI'

const today = () => new Date().toISOString().split('T')[0]

// ✅ Smart unit label — egg is per piece, whey per scoop, milk per 100ml, rest per 100g
const getFoodUnit = (foodName) => {
  if (!foodName) return '100g'
  const n = foodName.toLowerCase()
  if (n === 'egg')                        return 'piece'
  if (n.includes('whey protein'))         return 'scoop'
  if (n.includes('milk'))                 return '100ml'
  if (n.includes('coconut oil'))          return 'g (1 tbsp = 14g)'
  if (n.includes('shawarma'))             return 'g (1 piece ≈ 250g)'
  if (n.includes('chapati'))              return 'g (1 piece ≈ 40g)'
  if (n.includes('dosa'))                 return 'g (1 piece ≈ 80g)'
  if (n.includes('parotta'))              return 'g (1 piece ≈ 100g)'
  if (n.includes('rumali'))               return 'g (1 piece ≈ 60g)'
  return '100g'
}

// ✅ Smart dropdown label — show correct unit in the food selector
const getFoodDropdownLabel = (food) => {
  const n = food.name.toLowerCase()
  const cal = food.calories_per_100g

  if (n === 'egg')                return `egg — ${cal} kcal/piece`
  if (n.includes('whey protein')) return `whey protein — ${cal} kcal/scoop`
  if (n.includes('milk'))         return `milk — ${cal} kcal/100ml`
  return `${food.name.replace(/_/g, ' ')} — ${cal} kcal/100g`
}

export default function FoodPage() {
  const { user } = useUser()
  const [date, setDate]         = useState(today())
  const [foods, setFoods]       = useState([])
  const [logs, setLogs]         = useState([])
  const [summary, setSummary]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')
  const [formError, setFormError] = useState('')

  const [form, setForm] = useState({ food_name: '', quantity_g: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Load food database once
  useEffect(() => {
    getFoods()
      .then((r) => setFoods(r.data))
      .catch(() => {})
  }, [])

  const loadLogs = useCallback(() => {
    if (!user) return
    setLoading(true)
    setError('')
    Promise.all([getFoodLogs(user.id, date), getNutritionSummary(user.id, date)])
      .then(([l, s]) => {
        setLogs(l.data)
        setSummary(s.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, date])

  useEffect(() => { loadLogs() }, [loadLogs])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.food_name) return setFormError('Select a food.')
    if (!form.quantity_g || parseFloat(form.quantity_g) <= 0)
      return setFormError('Enter a valid quantity.')
    setSubmitting(true)
    setFormError('')
    try {
      await logFood(user.id, {
        date,
        food_name:  form.food_name,
        quantity_g: parseFloat(form.quantity_g),
      })
      setForm({ food_name: '', quantity_g: '' })
      loadLogs()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (logId) => {
    try {
      await deleteFoodLog(user.id, logId)
      loadLogs()
    } catch (err) {
      setError(err.message)
    }
  }

  const selectedFood = foods.find((f) => f.name === form.food_name)
  const unit         = getFoodUnit(form.food_name)

  // ✅ Smart preview label for quantity input
  const quantityLabel = (() => {
    const n = form.food_name?.toLowerCase() ?? ''
    if (n === 'egg')                return 'Number of Eggs'
    if (n.includes('whey protein')) return 'Number of Scoops'
    if (n.includes('milk'))         return 'Quantity (ml)'
    return 'Quantity (g)'
  })()

  // ✅ Smart preview text
  const previewLabel = form.quantity_g > 0
    ? `Preview for ${form.quantity_g} ${unit}`
    : ''

  return (
    <div className="space-y-8">
      <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display text-5xl tracking-widest text-text">NUTRITION</h1>
        <p className="text-dim text-sm mt-1">Track your daily food intake and macros</p>
      </div>

      <ErrorBanner message={error} onRetry={loadLogs} />

      {/* Stats row */}
      {summary && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Calories" value={Math.round(summary.total_calories)} unit="kcal"
            sub={summary.calorie_goal ? `${Math.round(summary.calorie_remaining ?? 0)} remaining` : 'No goal'}
            accent="ember" icon="◎" delay={0} />
          <StatCard label="Protein" value={Math.round(summary.total_protein_g)} unit="g"
            sub={summary.protein_goal ? `Goal: ${summary.protein_goal}g` : 'No goal'}
            accent="ice" icon="◉" delay={100} />
          <StatCard label="Carbs" value={Math.round(summary.total_carbs_g)} unit="g" accent="lime" icon="◐" delay={200} />
          <StatCard label="Fat" value={Math.round(summary.total_fat_g)} unit="g" accent="dim" icon="◈" delay={300} />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">

        {/* ── Add food form ── */}
        <Card
          className="lg:col-span-2 animate-fade-up opacity-0 animate-delay-200 h-fit"
          style={{ animationFillMode: 'forwards' }}
        >
          <h2 className="font-display text-2xl tracking-wide mb-5">Log Food</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                max={today()}
              />
            </div>

            {/* ✅ Food selector with smart labels */}
            <Select
              label="Food"
              id="food_name"
              value={form.food_name}
              onChange={set('food_name')}
            >
              <option value="">Select food…</option>
              {foods.map((f) => (
                <option key={f.name} value={f.name}>
                  {getFoodDropdownLabel(f)}
                </option>
              ))}
            </Select>

            {/* Per-unit macro preview */}
            {selectedFood && (
              <div className="bg-surface border border-border rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-dim">
                    Per {getFoodUnit(selectedFood.name)}
                  </span>
                </div>
                <div />
                <div><span className="font-mono text-ember">{selectedFood.calories_per_100g}</span><span className="text-dim"> kcal</span></div>
                <div><span className="font-mono text-ice">{selectedFood.protein_per_100g}g</span><span className="text-dim"> protein</span></div>
                <div><span className="font-mono text-lime">{selectedFood.carbs_per_100g}g</span><span className="text-dim"> carbs</span></div>
                <div><span className="font-mono text-dim">{selectedFood.fat_per_100g}g</span><span className="text-dim"> fat</span></div>
              </div>
            )}

            {/* ✅ Smart quantity label */}
            <Input
              label={quantityLabel}
              id="quantity_g"
              type="number"
              min="1"
              step={form.food_name?.toLowerCase() === 'egg' ? '1' : '1'}
              placeholder={
                form.food_name?.toLowerCase() === 'egg'          ? '2' :
                form.food_name?.toLowerCase().includes('whey')   ? '1' :
                form.food_name?.toLowerCase().includes('milk')   ? '200' :
                '100'
              }
              value={form.quantity_g}
              onChange={set('quantity_g')}
            />

            {/* Live macro preview */}
            {selectedFood && form.quantity_g > 0 && (
              <div className="bg-lime/5 border border-lime/20 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] text-dim font-mono uppercase tracking-widest">
                  {previewLabel}
                </p>
                {[
                  ['Calories', ((selectedFood.calories_per_100g * form.quantity_g) / 100).toFixed(1), 'kcal', 'text-ember'],
                  ['Protein',  ((selectedFood.protein_per_100g  * form.quantity_g) / 100).toFixed(1), 'g',    'text-ice'],
                  ['Carbs',    ((selectedFood.carbs_per_100g    * form.quantity_g) / 100).toFixed(1), 'g',    'text-lime'],
                  ['Fat',      ((selectedFood.fat_per_100g      * form.quantity_g) / 100).toFixed(1), 'g',    'text-dim'],
                ].map(([k, v, u, c]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-dim">{k}</span>
                    <span className={`font-mono font-medium ${c}`}>{v} {u}</span>
                  </div>
                ))}
              </div>
            )}

            <ErrorBanner message={formError} />
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Logging…' : '+ Add Entry'}
            </Button>
          </form>
        </Card>

        {/* ── Logs list ── */}
        <div
          className="lg:col-span-3 animate-fade-up opacity-0 animate-delay-300 space-y-4"
          style={{ animationFillMode: 'forwards' }}
        >
          <Card>
            <SectionHeader title={`Entries — ${date}`} />

            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-border border-t-lime rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <EmptyState icon="◎" title="Nothing logged yet" description="Add your first meal above." />
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between gap-3 py-3 px-3 rounded-xl hover:bg-muted/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-lime/10 border border-lime/20 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-lime text-xs font-display">
                          {log.food_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold capitalize truncate">
                          {log.food_name.replace(/_/g, ' ')}
                        </p>
                        {/* ✅ Smart unit display in log entries */}
                        <p className="text-xs text-dim font-mono">
                          {log.food_name.toLowerCase() === 'egg'
                            ? `${log.quantity_g} egg${log.quantity_g > 1 ? 's' : ''}`
                            : log.food_name.toLowerCase().includes('whey')
                            ? `${log.quantity_g} scoop${log.quantity_g > 1 ? 's' : ''}`
                            : log.food_name.toLowerCase().includes('milk')
                            ? `${log.quantity_g}ml`
                            : `${log.quantity_g}g`
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-mono text-ember">{log.calories.toFixed(0)} kcal</p>
                        <p className="text-xs font-mono text-ice">{log.protein_g.toFixed(1)}g protein</p>
                      </div>
                      <div className="hidden md:flex gap-1">
                        <Badge color="lime">{log.carbs_g.toFixed(1)}c</Badge>
                        <Badge color="gray">{log.fat_g.toFixed(1)}f</Badge>
                      </div>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="opacity-0 group-hover:opacity-100 text-dim hover:text-ember transition-all text-xs px-2 py-1 rounded-lg hover:bg-ember/10"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Macro progress bars */}
          {summary && summary.food_entries > 0 && (
            <Card>
              <h3 className="font-display text-lg tracking-wide mb-4">Macro Progress</h3>
              <div className="space-y-4">
                <MacroBar label="Calories" current={summary.total_calories} goal={summary.calorie_goal} color="ember" />
                <MacroBar label="Protein"  current={summary.total_protein_g} goal={summary.protein_goal} color="ice" />
                <MacroBar label="Carbs"    current={summary.total_carbs_g} color="lime" />
                <MacroBar label="Fat"      current={summary.total_fat_g} color="dim" />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}