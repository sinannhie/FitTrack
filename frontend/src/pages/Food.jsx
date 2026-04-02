import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../hooks/useUser'
import { logFood, getFoodLogs, getNutritionSummary, getFoods, deleteFoodLog } from '../services/api'
import {
  Card,
  Input,
  Button,
  StatCard,
  ErrorBanner,
  MacroBar,
  EmptyState,
  SectionHeader,
} from '../components/UI'

const today = () => new Date().toISOString().split('T')[0]

const getFoodUnit = (foodName) => {
  if (!foodName) return 'g'
  const n = foodName.toLowerCase()
  if (n === 'egg') return 'pieces'
  if (n.includes('whey')) return 'scoops'
  if (['milk', 'chai', 'coconut water', 'black tea'].includes(n)) return 'ml'
  if (['parotta', 'puttu', 'kerala shawarma roll', 'kerala shawarma plate',
       'alfaham quarter', 'shawaya quarter', 'fried chicken quarter'].includes(n)) return 'pieces'
  return 'g'
}

const calculatePreview = (food, quantity) => {
  if (!food || !quantity || isNaN(quantity) || quantity <= 0) return null
  const name = food.name.toLowerCase()
  let factor = 1
  if (name === 'egg') factor = quantity
  else if (name.includes('whey')) factor = quantity
  else factor = quantity / 100
  const calories = food.calories_per_100g * factor
  const protein  = food.protein_per_100g  * factor
  const carbs    = food.carbs_per_100g    * factor
  const fat      = food.fat_per_100g      * factor
  if ([calories, protein, carbs, fat].some(v => isNaN(v))) return null
  return {
    calories: calories.toFixed(1),
    protein:  protein.toFixed(1),
    carbs:    carbs.toFixed(1),
    fat:      fat.toFixed(1),
  }
}

// ── Custom Food Modal ─────────────────────────────────────────────────────────

function CustomFoodModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = () => {
    if (!form.name.trim())         return setError('Food name is required.')
    if (!form.calories || parseFloat(form.calories) < 0) return setError('Enter a valid calorie amount.')
    setError('')
    onSave({
      name:     form.name.trim(),
      calories: parseFloat(form.calories) || 0,
      protein:  parseFloat(form.protein)  || 0,
      carbs:    parseFloat(form.carbs)    || 0,
      fat:      parseFloat(form.fat)      || 0,
    })
  }

  // Close on backdrop click
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl
                      animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl tracking-wide text-text">Add Custom Food</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-dim
                       hover:bg-muted hover:text-text transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* Name */}
          <div>
            <label className="label">Food Name *</label>
            <input
              type="text"
              placeholder="e.g. Homemade Granola"
              value={form.name}
              onChange={set('name')}
              autoFocus
              className="input-field"
            />
          </div>

          {/* Calories */}
          <div>
            <label className="label">Calories (kcal) *</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={form.calories}
              onChange={set('calories')}
              className="input-field"
            />
          </div>

          {/* Macros row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Protein (g)</label>
              <input type="number" placeholder="0" min="0" step="0.1"
                value={form.protein} onChange={set('protein')} className="input-field" />
            </div>
            <div>
              <label className="label">Carbs (g)</label>
              <input type="number" placeholder="0" min="0" step="0.1"
                value={form.carbs} onChange={set('carbs')} className="input-field" />
            </div>
            <div>
              <label className="label">Fat (g)</label>
              <input type="number" placeholder="0" min="0" step="0.1"
                value={form.fat} onChange={set('fat')} className="input-field" />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs font-body">{error}</p>}

          {/* Preview */}
          {form.calories && (
            <div className="bg-lime/5 border border-lime/20 rounded-xl px-4 py-3 text-xs font-mono
                            grid grid-cols-4 gap-2 text-center">
              <div><p className="text-dim mb-1">Cal</p><p className="text-lime font-semibold">{form.calories || 0}</p></div>
              <div><p className="text-dim mb-1">Pro</p><p className="text-ice font-semibold">{form.protein || 0}g</p></div>
              <div><p className="text-dim mb-1">Carb</p><p className="text-ember font-semibold">{form.carbs || 0}g</p></div>
              <div><p className="text-dim mb-1">Fat</p><p className="text-red-400 font-semibold">{form.fat || 0}g</p></div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-muted text-dim text-sm font-body
                       hover:border-border hover:text-text transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-2 flex-grow-[2] py-2.5 rounded-xl bg-lime text-void text-sm
                       font-display font-semibold hover:bg-lime/90 transition-colors"
          >
            Save & Add to List
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FoodPage() {
  const { user } = useUser()

  const [date, setDate]       = useState(today())
  const [foods, setFoods]     = useState([])
  const [logs, setLogs]       = useState([])
  const [summary, setSummary] = useState(null)

  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [error, setError]           = useState('')
  const [formError, setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [form, setForm] = useState({ food_name: '', quantity_g: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)        // ✅ FIX: controls the modal
  const [customFoods, setCustomFoods] = useState([])       // ✅ persists custom foods in session

  useEffect(() => {
    getFoods().then(r => setFoods(r.data))
  }, [])

  const loadLogs = useCallback(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      getFoodLogs(user.id, date),
      getNutritionSummary(user.id, date),
    ])
      .then(([l, s]) => { setLogs(l.data); setSummary(s.data) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, date])

  useEffect(() => { loadLogs() }, [loadLogs])

  const showSuccess = (msg) => {
    setFormSuccess(msg)
    setTimeout(() => setFormSuccess(''), 3000)
  }

  // ── Custom food saved from modal ──────────────────────────────
  const handleCustomSave = async (customFood) => {
    setShowModal(false)
    setFormError('')
    setSubmitting(true)
    try {
      await logFood(user.id, {
        date,
        food_name: customFood.name,
        quantity_g: 1,
        is_custom: true,
        calories: customFood.calories,
        protein:  customFood.protein,
        carbs:    customFood.carbs,
        fat:      customFood.fat,
      })
      // Also add to the local food list so user can re-select it
      setCustomFoods(prev => [...prev, {
        name: customFood.name,
        calories_per_100g: customFood.calories,
        protein_per_100g:  customFood.protein,
        carbs_per_100g:    customFood.carbs,
        fat_per_100g:      customFood.fat,
      }])
      showSuccess(`"${customFood.name}" added ✅`)
      loadLogs()
    } catch (err) {
      setFormError(err.message || 'Failed to add custom food')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Standard food submit ──────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!form.food_name)                       return setFormError('Select a food first')
    if (!form.quantity_g || form.quantity_g <= 0) return setFormError('Enter a valid quantity')

    setSubmitting(true)
    try {
      await logFood(user.id, {
        date,
        food_name: form.food_name,
        quantity_g: parseFloat(form.quantity_g),
      })
      setForm({ food_name: '', quantity_g: '' })
      showSuccess('Food added ✅')
      loadLogs()
    } catch (err) {
      setFormError(err.message || 'Failed to add food')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteFoodLog(user.id, id)
      loadLogs()
    } catch (err) {
      setError(err.message)
    }
  }

  // Merge API foods + session custom foods, then filter by search
  const allFoods     = [...foods, ...customFoods]
  const filteredFoods = allFoods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedFood = allFoods.find(f => f.name === form.food_name)
  const preview      = calculatePreview(selectedFood, parseFloat(form.quantity_g))

  const calGoal  = user?.calorie_goal  ?? 2000
  const proGoal  = user?.protein_goal  ?? 150
  const carbGoal = 250
  const fatGoal  = 65

  return (
    <>
      {/* ── Custom Food Modal ──────────────────────────────────── */}
      {showModal && (
        <CustomFoodModal
          onClose={() => setShowModal(false)}
          onSave={handleCustomSave}
        />
      )}

      <div className="space-y-6">

        {/* ── Page Header ──────────────────────────────────────── */}
        <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <h1 className="font-display text-4xl tracking-wide text-text">Nutrition</h1>
          <p className="text-dim text-sm mt-1 font-body">
            {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <ErrorBanner message={error} />

        {/* ── Stat Cards ───────────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <MacroStatCard
              label="Calories" value={Math.round(summary.total_calories)}
              unit="kcal" goal={calGoal} color="lime"
            />
            <MacroStatCard
              label="Protein" value={Math.round(summary.total_protein_g)}
              unit="g" goal={proGoal} color="ice"
            />
            <MacroStatCard
              label="Carbs" value={Math.round(summary.total_carbs_g)}
              unit="g" goal={carbGoal} color="ember"
            />
            <MacroStatCard
              label="Fat" value={Math.round(summary.total_fat_g)}
              unit="g" goal={fatGoal} color="red"
            />
          </div>
        )}

        {/* ── Main Grid ────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Add Food Panel ──────────────────────────────────── */}
          <Card className="lg:col-span-2 space-y-4 h-fit animate-fade-up opacity-0 animate-delay-100"
                style={{ animationFillMode: 'forwards' }}>

            <h2 className="font-display text-xl tracking-wide">Add Food</h2>

            <form onSubmit={handleSubmit} className="space-y-3">

              {/* Date */}
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Status messages */}
              {formError   && <p className="text-red-400 text-xs font-body bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">❌ {formError}</p>}
              {formSuccess && <p className="text-lime text-xs font-body bg-lime/10 border border-lime/20 rounded-lg px-3 py-2">{formSuccess}</p>}

              {/* Search */}
              <div>
                <label className="label">Search Food</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dim text-sm pointer-events-none">⌕</span>
                  <input
                    type="text"
                    placeholder="Search food..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="input-field pl-8"
                  />
                </div>
              </div>

              {/* Food dropdown list */}
              <div className="max-h-44 overflow-y-auto bg-surface border border-border rounded-xl
                              divide-y divide-border/50">

                {/* Add Custom Food button */}
                <button
                  type="button"
                  onClick={() => setShowModal(true)}          // ✅ FIX: opens modal
                  className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-body
                             text-lime hover:bg-lime/5 transition-colors"
                >
                  <span className="text-base font-bold leading-none">+</span>
                  Add Custom Food
                </button>

                {/* Food items */}
                {filteredFoods.length === 0 && search && (
                  <p className="px-4 py-3 text-dim text-xs font-body">No foods match "{search}"</p>
                )}
                {filteredFoods.map(f => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => {
                      const unit = getFoodUnit(f.name)
                      setForm({
                        food_name:  f.name,
                        quantity_g: unit === 'pieces' ? 1 : unit === 'ml' ? 100 : 100,
                      })
                      setSearch('')
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left
                                text-sm font-body transition-colors
                                ${form.food_name === f.name
                                  ? 'bg-lime/10 text-lime'
                                  : 'text-text hover:bg-muted/30'}`}
                  >
                    <span className="capitalize">{f.name}</span>
                    <span className="text-xs text-dim font-mono">{Math.round(f.calories_per_100g)} kcal</span>
                  </button>
                ))}
              </div>

              {/* Selected food preview */}
              {form.food_name && (
                <div className="bg-lime/5 border border-lime/20 rounded-xl px-4 py-3">
                  <p className="text-xs text-dim font-body mb-2">
                    Selected: <span className="text-lime font-semibold capitalize">{form.food_name}</span>
                  </p>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="label">
                        Quantity ({getFoodUnit(form.food_name)})
                      </label>
                      <input
                        type="number"
                        value={form.quantity_g}
                        onChange={set('quantity_g')}
                        min="0.1"
                        step="0.1"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Macro preview */}
              {preview && (
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Cal',  val: preview.calories, color: 'text-lime'    },
                    { label: 'Pro',  val: preview.protein,  color: 'text-ice'     },
                    { label: 'Carb', val: preview.carbs,    color: 'text-ember'   },
                    { label: 'Fat',  val: preview.fat,      color: 'text-red-400' },
                  ].map(m => (
                    <div key={m.label} className="bg-surface rounded-lg py-2">
                      <p className="text-[10px] text-dim font-mono uppercase">{m.label}</p>
                      <p className={`text-sm font-display font-semibold ${m.color}`}>{m.val}</p>
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Adding…' : 'Add Food'}
              </Button>

            </form>
          </Card>

          {/* ── Entries Panel ────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4 animate-fade-up opacity-0 animate-delay-200"
               style={{ animationFillMode: 'forwards' }}>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader title={`Entries — ${date}`} />
                <span className="text-xs text-dim font-mono">
                  {logs.length} item{logs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-lime/30 border-t-lime rounded-full animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <EmptyState
                  icon="🍽"
                  title="No entries yet"
                  description="Search and add your first meal above"
                />
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 bg-surface border border-border
                                 rounded-xl px-4 py-3 hover:border-muted transition-colors group"
                    >
                      {/* Food icon */}
                      <div className="w-9 h-9 rounded-lg bg-lime/10 flex items-center justify-center
                                      text-base flex-shrink-0">
                        {getFoodEmoji(log.food_name)}
                      </div>

                      {/* Name + qty */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-medium capitalize truncate">{log.food_name}</p>
                        <p className="text-xs text-dim font-mono">{log.quantity_g} {getFoodUnit(log.food_name)}</p>
                      </div>

                      {/* Macros */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-display font-semibold text-lime">
                          {Math.round(log.calories)} kcal
                        </p>
                        <p className="text-xs text-dim font-mono">
                          {(log.protein_g ?? log.protein ?? 0).toFixed(1)}g protein
                        </p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-dim
                                   hover:bg-red-400/10 hover:text-red-400 transition-all
                                   opacity-0 group-hover:opacity-100 flex-shrink-0 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Daily total footer */}
              {summary && logs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Total Cal',  val: `${Math.round(summary.total_calories)} kcal`, color: 'text-lime'    },
                    { label: 'Protein',    val: `${Math.round(summary.total_protein_g)}g`,    color: 'text-ice'     },
                    { label: 'Carbs',      val: `${Math.round(summary.total_carbs_g)}g`,      color: 'text-ember'   },
                    { label: 'Fat',        val: `${Math.round(summary.total_fat_g)}g`,        color: 'text-red-400' },
                  ].map(m => (
                    <div key={m.label}>
                      <p className="text-[10px] text-dim font-mono uppercase mb-0.5">{m.label}</p>
                      <p className={`text-sm font-display font-semibold ${m.color}`}>{m.val}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

          </div>
        </div>
      </div>
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFoodEmoji(name) {
  if (!name) return '🍽'
  const n = name.toLowerCase()
  if (n.includes('egg'))     return '🥚'
  if (n.includes('chicken')) return '🍗'
  if (n.includes('milk'))    return '🥛'
  if (n.includes('rice'))    return '🍚'
  if (n.includes('banana'))  return '🍌'
  if (n.includes('apple'))   return '🍎'
  if (n.includes('oat'))     return '🥣'
  if (n.includes('whey') || n.includes('protein')) return '💪'
  if (n.includes('fish') || n.includes('salmon') || n.includes('tuna')) return '🐟'
  return '🍽'
}

// ── Macro Stat Card (local to this page) ─────────────────────────────────────

function MacroStatCard({ label, value, unit, goal, color }) {
  const pct = Math.min(100, Math.round((value / goal) * 100))
  const barColor = {
    lime:  'bg-lime',
    ice:   'bg-ice',
    ember: 'bg-ember',
    red:   'bg-red-400',
  }[color] || 'bg-lime'
  const textColor = {
    lime:  'text-lime',
    ice:   'text-ice',
    ember: 'text-ember',
    red:   'text-red-400',
  }[color] || 'text-lime'

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-muted transition-colors">
      <p className="text-[10px] font-mono uppercase tracking-widest text-dim mb-2">{label}</p>
      <div className="flex items-baseline gap-1 mb-3">
        <span className={`font-display text-2xl font-bold ${textColor}`}>{value}</span>
        <span className="text-xs text-dim font-body">{unit}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
             style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] font-mono text-dim mt-1.5">{pct}% of {goal} {unit}</p>
    </div>
  )
}