import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { toast } from 'react-hot-toast'
import { useUser } from '../hooks/useUser'
import {
  logFood, getFoodLogs, getNutritionSummary,
  getFoods, deleteFoodLog,
} from '../services/api'
import { ErrorBanner } from '../components/UI'

import NutritionCard from '../components/nutrition/NutritionCard'
import FoodEntryItem from '../components/nutrition/FoodEntryItem'
import AddFoodPanel  from '../components/nutrition/AddFoodPanel'

const today = () => new Date().toISOString().split('T')[0]

/* ── Meal config ──────────────────────────────────────────────── */
const MEAL_META = {
  breakfast: { label: 'Breakfast', icon: '🌅', order: 0 },
  lunch:     { label: 'Lunch',     icon: '☀️', order: 1 },
  snack:     { label: 'Snack',     icon: '🍎', order: 2 },
  dinner:    { label: 'Dinner',    icon: '🌙', order: 3 },
}

function groupByMeal(logs) {
  const groups = {}
  for (const log of logs) {
    const key = log.meal_type || 'snack'
    if (!groups[key]) groups[key] = []
    groups[key].push(log)
  }
  return Object.entries(groups)
    .map(([mealType, entries]) => ({ mealType, entries, ...MEAL_META[mealType] }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
}

/* ── Skeleton loaders ─────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="card-glass p-4 flex flex-col gap-3">
      <div className="skeleton h-3 w-16 rounded" />
      <div className="skeleton h-8 w-24 rounded-lg" />
      <div className="skeleton h-1.5 w-full rounded-full" />
    </div>
  )
}

function EntrySkeleton() {
  return (
    <div className="flex items-center gap-3 bg-card border border-border/50 rounded-2xl px-4 py-3">
      <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-3 w-32 rounded" />
        <div className="skeleton h-2.5 w-16 rounded" />
      </div>
      <div className="space-y-1.5 items-end flex flex-col">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-2 w-28 rounded" />
      </div>
    </div>
  )
}

/* ── Custom Food Modal ────────────────────────────────────────── */
function CustomFoodModal({ onClose, onSave }) {
  const [form,  setForm]  = useState({ name:'', calories:'', protein:'', carbs:'', fat:'' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = () => {
    if (!form.name.trim())             return setError('Food name is required.')
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-void/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card-glass w-full max-w-md shadow-modal animate-slide-up sm:animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-display font-semibold">Add Custom Food</h2>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-dim
                       hover:bg-white/8 hover:text-text transition-all text-[15px]">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Food Name *</label>
            <input type="text" placeholder="e.g. Homemade Granola"
              value={form.name} onChange={set('name')} autoFocus className="input-field" />
          </div>
          <div>
            <label className="label">Calories (kcal) *</label>
            <input type="number" placeholder="0" min="0"
              value={form.calories} onChange={set('calories')} className="input-field" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Fat (g)']].map(([k,l]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input type="number" placeholder="0" min="0" step="0.1"
                  value={form[k]} onChange={set(k)} className="input-field" />
              </div>
            ))}
          </div>

          {error && <p className="text-[12px] text-rose-400">{error}</p>}

          {form.calories && (
            <div className="grid grid-cols-4 gap-2 rounded-xl p-3 border border-border/40"
                 style={{ background: 'rgba(255,255,255,0.03)' }}>
              {[
                { l:'Cal',  v: form.calories || 0, c: '#a8f04a' },
                { l:'Pro',  v: form.protein  || 0, c: '#7dd3fc' },
                { l:'Carb', v: form.carbs    || 0, c: '#f97316' },
                { l:'Fat',  v: form.fat      || 0, c: '#fb7185' },
              ].map(m => (
                <div key={m.l} className="text-center">
                  <p className="text-[9px] font-mono text-dim uppercase mb-0.5">{m.l}</p>
                  <p className="text-[13px] font-bold font-display" style={{ color: m.c }}>{m.v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2.5 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-[2]">Save & Add</button>
        </div>
      </div>
    </div>
  )
}

/* ── Quick Edit Modal ─────────────────────────────────────────── */
function QuickEditModal({ log, onClose, onSave }) {
  const [qty,      setQty]      = useState(String(log.quantity_g))
  const [mealType, setMealType] = useState(log.meal_type || 'snack')

  const MEAL_TYPES = [
    { id:'breakfast', icon:'🌅' }, { id:'lunch', icon:'☀️' },
    { id:'snack', icon:'🍎' }, { id:'dinner', icon:'🌙' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                    bg-void/70 backdrop-blur-sm p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card-glass w-full max-w-sm shadow-modal animate-slide-up sm:animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[16px] font-display font-semibold capitalize">{log.food_name}</h2>
            <p className="text-[11px] text-dim mt-0.5">{Math.round(log.calories ?? 0)} kcal</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-dim
                       hover:bg-white/8 hover:text-text transition-all text-[15px]">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Quantity (g)</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)}
              min="0.1" step="0.1" className="input-field" autoFocus />
          </div>
          <div>
            <label className="label">Meal</label>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_TYPES.map(m => (
                <button key={m.id} type="button" onClick={() => setMealType(m.id)}
                  className={`py-2 rounded-xl text-[18px] transition-all duration-150
                    ${mealType === m.id ? 'bg-lime/15 border border-lime/30 scale-105' : 'bg-muted/40 border border-transparent hover:border-border'}`}>
                  {m.icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => onSave({ qty: parseFloat(qty), mealType })} className="btn-primary flex-[2]">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Meal Group ───────────────────────────────────────────────── */
function MealGroup({ mealType, entries, icon, label, onDelete, onDuplicate, onEdit }) {
  const totalCal = entries.reduce((s, e) => s + (e.calories ?? 0), 0)

  return (
    <div className="space-y-2">
      {/* Group header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icon || '🍽'}</span>
          <span className="text-[13px] font-semibold text-text/80">{label || mealType}</span>
          <span className="text-[11px] font-mono text-dim">
            {entries.length} item{entries.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-[12px] font-mono text-lime font-semibold">
          {Math.round(totalCal)} kcal
        </span>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {entries.map(log => (
          <FoodEntryItem
            key={log.id}
            log={log}
            onDelete={() => onDelete(log.id)}
            onDuplicate={() => onDuplicate(log)}
            onEdit={() => onEdit(log)}
          />
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                       */
/* ═══════════════════════════════════════════════════════════════ */
export default function FoodPage() {
  const { user } = useUser()

  /* ── state ────────────────────────────────────────────────── */
  const [date,      setDate]      = useState(today)
  const [foods,     setFoods]     = useState([])
  const [logs,      setLogs]      = useState([])
  const [summary,   setSummary]   = useState(null)
  const [customFoods, setCustomFoods] = useState([])

  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [error,       setError]       = useState('')
  const [formError,   setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [showCustomModal, setShowCustomModal] = useState(false)
  const [editingLog,      setEditingLog]      = useState(null)

  /* ── load food DB once ────────────────────────────────────── */
  useEffect(() => {
    getFoods()
      .then(r => setFoods(r.data))
      .catch(() => {}) // non-critical
  }, [])

  /* ── load daily logs ──────────────────────────────────────── */
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

  /* ── success flash ────────────────────────────────────────── */
  const flash = (msg) => {
    setFormSuccess(msg)
    setTimeout(() => setFormSuccess(''), 3000)
  }

  /* ── add standard food ────────────────────────────────────── */
  const handleAddFood = useCallback(async ({ date: d, food_name, quantity_g, meal_type }) => {
    setFormError('')
    setSubmitting(true)
    try {
      await logFood(user.id, { date: d, food_name, quantity_g, meal_type })
      flash('Food added ✓')
      toast.success(`${food_name} added`)
      loadLogs()
    } catch (err) {
      setFormError(err.message || 'Failed to add food')
    } finally {
      setSubmitting(false)
    }
  }, [user, loadLogs])

  /* ── add custom food ──────────────────────────────────────── */
  const handleCustomSave = useCallback(async (customFood) => {
    setShowCustomModal(false)
    setSubmitting(true)
    setFormError('')
    try {
      await logFood(user.id, {
        date,
        food_name:  customFood.name,
        quantity_g: 1,
        is_custom:  true,
        calories:   customFood.calories,
        protein:    customFood.protein,
        carbs:      customFood.carbs,
        fat:        customFood.fat,
        meal_type:  null,
      })
      // Persist in session so food appears in search
      setCustomFoods(prev => [...prev, {
        name:              customFood.name,
        calories_per_100g: customFood.calories,
        protein_per_100g:  customFood.protein,
        carbs_per_100g:    customFood.carbs,
        fat_per_100g:      customFood.fat,
      }])
      toast.success(`${customFood.name} added`)
      flash(`"${customFood.name}" added ✓`)
      loadLogs()
    } catch (err) {
      setFormError(err.message || 'Failed to add custom food')
    } finally {
      setSubmitting(false)
    }
  }, [user, date, loadLogs])

  /* ── delete entry ─────────────────────────────────────────── */
  const handleDelete = useCallback(async (logId) => {
    try {
      await deleteFoodLog(user.id, logId)
      toast.success('Entry removed', { icon: '🗑' })
      loadLogs()
    } catch (err) {
      setError(err.message)
    }
  }, [user, loadLogs])

  /* ── duplicate entry ──────────────────────────────────────── */
  const handleDuplicate = useCallback(async (log) => {
    try {
      await logFood(user.id, {
        date,
        food_name:  log.food_name,
        quantity_g: log.quantity_g,
        is_custom:  log.is_custom ?? false,
        ...(log.is_custom ? {
          calories: log.calories,
          protein:  log.protein_g ?? log.protein ?? 0,
          carbs:    log.carbs_g   ?? log.carbs   ?? 0,
          fat:      log.fat_g     ?? log.fat     ?? 0,
        } : {}),
        meal_type: log.meal_type ?? null,
      })
      toast.success(`Duplicated ${log.food_name}`, { icon: '⊕' })
      loadLogs()
    } catch (err) {
      setError(err.message)
    }
  }, [user, date, loadLogs])

  /* ── quick edit save ──────────────────────────────────────── */
  const handleEditSave = useCallback(async ({ qty, mealType }) => {
    if (!editingLog) return
    setEditingLog(null)
    try {
      // Delete old + re-log with new qty/meal_type
      await deleteFoodLog(user.id, editingLog.id)
      await logFood(user.id, {
        date,
        food_name:  editingLog.food_name,
        quantity_g: qty,
        is_custom:  editingLog.is_custom ?? false,
        ...(editingLog.is_custom ? {
          calories: editingLog.calories,
          protein:  editingLog.protein_g ?? editingLog.protein ?? 0,
          carbs:    editingLog.carbs_g   ?? editingLog.carbs   ?? 0,
          fat:      editingLog.fat_g     ?? editingLog.fat     ?? 0,
        } : {}),
        meal_type: mealType,
      })
      toast.success('Entry updated')
      loadLogs()
    } catch (err) {
      setError(err.message)
    }
  }, [user, date, editingLog, loadLogs])

  /* ── derived data ─────────────────────────────────────────── */
  const allFoods    = useMemo(() => [...foods, ...customFoods], [foods, customFoods])
  const mealGroups  = useMemo(() => groupByMeal(logs), [logs])

  const calGoal  = user?.calorie_goal  ?? 2000
  const proGoal  = user?.protein_goal  ?? 150
  const carbGoal = 250
  const fatGoal  = 65

  /* ── render ───────────────────────────────────────────────── */
  return (
    <>
      {/* Modals */}
      {showCustomModal && (
        <CustomFoodModal
          onClose={() => setShowCustomModal(false)}
          onSave={handleCustomSave}
        />
      )}
      {editingLog && (
        <QuickEditModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSave={handleEditSave}
        />
      )}

      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="animate-fade-up opacity-0" style={{ animationFillMode:'forwards' }}>
          <h1
            className="font-display font-bold tracking-tight"
            style={{ fontSize:'28px', letterSpacing:'-0.02em' }}
          >
            Nutrition
          </h1>
          <p className="text-[13px] text-dim mt-1">
            {new Date().toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })}
          </p>
        </div>

        <ErrorBanner message={error} />

        {/* ── Macro cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {loading && !summary
            ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
            : (<>
                <NutritionCard label="Calories" value={Math.round(summary?.total_calories ?? 0)} unit="kcal" goal={calGoal}  color="lime"  delay={0}   />
                <NutritionCard label="Protein"  value={Math.round(summary?.total_protein_g ?? 0)} unit="g"   goal={proGoal}  color="ice"   delay={60}  />
                <NutritionCard label="Carbs"    value={Math.round(summary?.total_carbs_g ?? 0)}   unit="g"   goal={carbGoal} color="ember" delay={120} />
                <NutritionCard label="Fat"      value={Math.round(summary?.total_fat_g ?? 0)}     unit="g"   goal={fatGoal}  color="rose"  delay={180} />
              </>)
          }
        </div>

        {/* ── Main content ────────────────────────────────── */}
        <div className="grid lg:grid-cols-5 gap-5">

          {/* ── Add Food panel ──────────────────────────── */}
          <div className="lg:col-span-2 animate-fade-up opacity-0 animate-delay-200"
               style={{ animationFillMode:'forwards' }}>
            <AddFoodPanel
              date={date}
              onDateChange={setDate}
              allFoods={allFoods}
              onSubmit={handleAddFood}
              onOpenCustomModal={() => setShowCustomModal(true)}
              submitting={submitting}
              formError={formError}
              formSuccess={formSuccess}
            />
          </div>

          {/* ── Entries panel ───────────────────────────── */}
          <div className="lg:col-span-3 animate-fade-up opacity-0 animate-delay-300"
               style={{ animationFillMode:'forwards' }}>
            <div className="card-glass p-5">

              <div className="flex items-center justify-between mb-5">
                <h2
                  className="font-display font-semibold"
                  style={{ fontSize:'16px', letterSpacing:'-0.01em' }}
                >
                  Entries — {date}
                </h2>
                <span className="text-[11px] font-mono text-dim">
                  {logs.length} item{logs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* ── Loading skeleton ────────────────────── */}
              {loading ? (
                <div className="space-y-2.5">
                  {Array(3).fill(0).map((_, i) => <EntrySkeleton key={i} />)}
                </div>

              /* ── Empty state ────────────────────────── */
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-1"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    🍽
                  </div>
                  <p className="text-[15px] font-semibold text-dim">No food logged yet</p>
                  <p className="text-[12px] text-dim/60 max-w-[220px]">
                    Search and add your first meal on the left
                  </p>
                </div>

              /* ── Grouped entries ────────────────────── */
              ) : (
                <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
                  {mealGroups.map(group => (
                    <MealGroup
                      key={group.mealType}
                      {...group}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      onEdit={setEditingLog}
                    />
                  ))}
                </div>
              )}

              {/* ── Daily totals footer ─────────────────── */}
              {summary && logs.length > 0 && (
                <div
                  className="mt-5 pt-4 grid grid-cols-4 gap-3 text-center"
                  style={{ borderTop: '1px solid rgba(46,46,53,0.6)' }}
                >
                  {[
                    { l:'Total Cal', v:`${Math.round(summary.total_calories)} kcal`, c:'#a8f04a' },
                    { l:'Protein',   v:`${Math.round(summary.total_protein_g)}g`,    c:'#7dd3fc' },
                    { l:'Carbs',     v:`${Math.round(summary.total_carbs_g)}g`,      c:'#f97316' },
                    { l:'Fat',       v:`${Math.round(summary.total_fat_g)}g`,        c:'#fb7185' },
                  ].map(m => (
                    <div key={m.l}>
                      <p className="text-[9px] font-mono uppercase text-dim mb-0.5">{m.l}</p>
                      <p className="text-[13px] font-bold font-display" style={{ color: m.c }}>{m.v}</p>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  )
}