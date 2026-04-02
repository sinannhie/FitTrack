import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { useUser } from '../hooks/useUser'
import { logFood, getFoodLogs, getNutritionSummary, getFoods, deleteFoodLog } from '../services/api'
import { ErrorBanner } from '../components/UI'
import NutritionCard from '../components/nutrition/NutritionCard'
import FoodEntryItem from '../components/nutrition/FoodEntryItem'
import AddFoodPanel  from '../components/nutrition/AddFoodPanel'

// ── Date helpers ─────────────────────────────────────────────────────────────
// Internal format: YYYY-MM-DD (HTML date input native)
// API accepts:     YYYY-MM-DD or DD-MM-YYYY (backend normalizes both)
const todayISO = () => new Date().toISOString().split('T')[0]

function fmtDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return new Date(+y, +m - 1, +d).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Meal config ───────────────────────────────────────────────────────────────
const MEAL_META = {
  breakfast: { label: 'Breakfast', icon: '🌅', order: 0 },
  lunch:     { label: 'Lunch',     icon: '☀️',  order: 1 },
  snack:     { label: 'Snack',     icon: '🍎',  order: 2 },
  dinner:    { label: 'Dinner',    icon: '🌙',  order: 3 },
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

// ── Skeletons ─────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div style={{ borderRadius: '16px', padding: '16px', background: 'rgba(22,22,25,0.8)', border: '1px solid rgba(46,46,53,0.5)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ height: '10px', width: '56px', borderRadius: '6px', background: 'rgba(38,38,44,0.8)', animation: 'pulse 1.5s infinite' }} />
      <div style={{ height: '28px', width: '80px', borderRadius: '8px', background: 'rgba(38,38,44,0.8)', animation: 'pulse 1.5s infinite' }} />
      <div style={{ height: '6px', width: '100%', borderRadius: '99px', background: 'rgba(38,38,44,0.8)', animation: 'pulse 1.5s infinite' }} />
    </div>
  )
}

function EntrySkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '16px', padding: '12px 16px', background: 'rgba(22,22,25,0.6)', border: '1px solid rgba(46,46,53,0.4)' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(38,38,44,0.8)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ height: '12px', width: '120px', borderRadius: '6px', background: 'rgba(38,38,44,0.8)' }} />
        <div style={{ height: '10px', width: '60px',  borderRadius: '6px', background: 'rgba(38,38,44,0.6)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
        <div style={{ height: '12px', width: '64px', borderRadius: '6px', background: 'rgba(38,38,44,0.8)' }} />
        <div style={{ height: '8px',  width: '96px', borderRadius: '6px', background: 'rgba(38,38,44,0.6)' }} />
      </div>
    </div>
  )
}

// ── Custom Food Modal ─────────────────────────────────────────────────────────
function CustomFoodModal({ onClose, onSave }) {
  const [form,  setForm]  = useState({ name:'', calories:'', protein:'', carbs:'', fat:'' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = () => {
    if (!form.name.trim()) return setError('Food name is required.')
    if (!form.calories || parseFloat(form.calories) < 0) return setError('Enter valid calories.')
    setError('')
    onSave({ name: form.name.trim(), calories: parseFloat(form.calories) || 0, protein: parseFloat(form.protein) || 0, carbs: parseFloat(form.carbs) || 0, fat: parseFloat(form.fat) || 0 })
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(8,8,10,0.8)', backdropFilter: 'blur(8px)', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '420px', borderRadius: '24px', padding: '24px', background: 'rgba(18,18,22,0.98)', border: '1px solid rgba(46,46,53,0.8)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ color: '#f2f2f7', fontSize: '17px', fontWeight: 600, margin: 0 }}>Add Custom Food</h2>
          <button onClick={onClose} style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#68687a', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div><label className="label">Food Name *</label><input type="text" placeholder="e.g. Homemade Granola" value={form.name} onChange={set('name')} autoFocus className="input-field" /></div>
          <div><label className="label">Calories (kcal) *</label><input type="number" placeholder="0" min="0" value={form.calories} onChange={set('calories')} className="input-field" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            {[['protein','Protein (g)'],['carbs','Carbs (g)'],['fat','Fat (g)']].map(([k,l]) => (
              <div key={k}><label className="label">{l}</label><input type="number" placeholder="0" min="0" step="0.1" value={form[k]} onChange={set(k)} className="input-field" /></div>
            ))}
          </div>
          {error && <p style={{ color: '#fb7185', fontSize: '12px', margin: 0 }}>{error}</p>}
          {form.calories && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(46,46,53,0.5)' }}>
              {[{l:'Cal',v:form.calories||0,c:'#a8f04a'},{l:'Pro',v:form.protein||0,c:'#7dd3fc'},{l:'Carb',v:form.carbs||0,c:'#f97316'},{l:'Fat',v:form.fat||0,c:'#fb7185'}].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <p style={{ color: '#68687a', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>{m.l}</p>
                  <p style={{ color: m.c, fontSize: '13px', fontWeight: 700, margin: 0 }}>{m.v}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" style={{ flex: 2 }}>Save & Add</button>
        </div>
      </div>
    </div>
  )
}

// ── Quick Edit Modal ──────────────────────────────────────────────────────────
function QuickEditModal({ log, onClose, onSave }) {
  const [qty, setQty] = useState(String(log.quantity_g))
  const [mealType, setMealType] = useState(log.meal_type || 'snack')
  const MEALS = [{id:'breakfast',icon:'🌅'},{id:'lunch',icon:'☀️'},{id:'snack',icon:'🍎'},{id:'dinner',icon:'🌙'}]

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(8,8,10,0.8)', backdropFilter: 'blur(8px)', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '360px', borderRadius: '24px', padding: '22px', background: 'rgba(18,18,22,0.98)', border: '1px solid rgba(46,46,53,0.8)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h2 style={{ color: '#f2f2f7', fontSize: '15px', fontWeight: 600, margin: 0, textTransform: 'capitalize' }}>{log.food_name}</h2>
            <p style={{ color: '#68687a', fontSize: '11px', margin: '2px 0 0' }}>{Math.round(log.calories ?? 0)} kcal</p>
          </div>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#68687a', cursor: 'pointer', fontSize: '13px' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div><label className="label">Quantity (g)</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0.1" step="0.1" className="input-field" autoFocus /></div>
          <div>
            <label className="label">Meal</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
              {MEALS.map(m => (
                <button key={m.id} type="button" onClick={() => setMealType(m.id)} style={{ padding: '8px 4px', borderRadius: '10px', fontSize: '20px', background: mealType === m.id ? 'rgba(168,240,74,0.15)' : 'rgba(38,38,44,0.6)', border: mealType === m.id ? '1px solid rgba(168,240,74,0.3)' : '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s ease' }}>{m.icon}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
          <button onClick={() => onSave({ qty: parseFloat(qty), mealType })} className="btn-primary" style={{ flex: 2 }}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

// ── Meal Group ────────────────────────────────────────────────────────────────
function MealGroup({ mealType, entries, icon, label, onDelete, onDuplicate, onEdit }) {
  const totalCal = entries.reduce((s, e) => s + (e.calories ?? 0), 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', lineHeight: 1 }}>{icon || '🍽'}</span>
          <span style={{ color: 'rgba(242,242,247,0.85)', fontSize: '13px', fontWeight: 600 }}>{label || mealType}</span>
          <span style={{ color: '#68687a', fontSize: '11px', fontFamily: 'monospace' }}>{entries.length} item{entries.length !== 1 ? 's' : ''}</span>
        </div>
        <span style={{ color: '#a8f04a', fontSize: '12px', fontFamily: 'monospace', fontWeight: 600 }}>{Math.round(totalCal)} kcal</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {entries.map(log => (
          <FoodEntryItem key={log.id} log={log} onDelete={() => onDelete(log.id)} onDuplicate={() => onDuplicate(log)} onEdit={() => onEdit(log)} />
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function FoodPage() {
  const { user } = useUser()

  const [date,        setDate]        = useState(todayISO)
  const [foods,       setFoods]       = useState([])
  const [logs,        setLogs]        = useState([])
  const [summary,     setSummary]     = useState(null)
  const [customFoods, setCustomFoods] = useState([])

  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [formError,   setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [showCustomModal, setShowCustomModal] = useState(false)
  const [editingLog,      setEditingLog]      = useState(null)

  useEffect(() => { getFoods().then(r => setFoods(r.data)).catch(() => {}) }, [])

  const loadLogs = useCallback(() => {
    if (!user) return
    setLoading(true)
    Promise.all([getFoodLogs(user.id, date), getNutritionSummary(user.id, date)])
      .then(([l, s]) => { setLogs(l.data); setSummary(s.data) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, date])

  useEffect(() => { loadLogs() }, [loadLogs])

  const flash = (msg) => { setFormSuccess(msg); setTimeout(() => setFormSuccess(''), 3000) }

  const handleAddFood = useCallback(async ({ date: d, food_name, quantity_g, meal_type }) => {
    setFormError(''); setSubmitting(true)
    try {
      await logFood(user.id, { date: d, food_name, quantity_g, meal_type })
      flash('Added ✓'); toast.success(`${food_name} added`); loadLogs()
    } catch (err) { setFormError(err.message || 'Failed to add food') }
    finally { setSubmitting(false) }
  }, [user, loadLogs])

  const handleCustomSave = useCallback(async (customFood) => {
    setShowCustomModal(false); setSubmitting(true); setFormError('')
    try {
      await logFood(user.id, { date, food_name: customFood.name, quantity_g: 1, is_custom: true, calories: customFood.calories, protein: customFood.protein, carbs: customFood.carbs, fat: customFood.fat, meal_type: null })
      setCustomFoods(prev => [...prev, { name: customFood.name, calories_per_100g: customFood.calories, protein_per_100g: customFood.protein, carbs_per_100g: customFood.carbs, fat_per_100g: customFood.fat }])
      toast.success(`${customFood.name} added`); flash(`"${customFood.name}" added ✓`); loadLogs()
    } catch (err) { setFormError(err.message || 'Failed to add custom food') }
    finally { setSubmitting(false) }
  }, [user, date, loadLogs])

  const handleDelete = useCallback(async (logId) => {
    try { await deleteFoodLog(user.id, logId); toast.success('Entry removed', { icon: '🗑' }); loadLogs() }
    catch (err) { setError(err.message) }
  }, [user, loadLogs])

  const handleDuplicate = useCallback(async (log) => {
    try {
      await logFood(user.id, { date, food_name: log.food_name, quantity_g: log.quantity_g, is_custom: log.is_custom ?? false, ...(log.is_custom ? { calories: log.calories, protein: log.protein_g ?? log.protein ?? 0, carbs: log.carbs_g ?? log.carbs ?? 0, fat: log.fat_g ?? log.fat ?? 0 } : {}), meal_type: log.meal_type ?? null })
      toast.success(`Duplicated ${log.food_name}`, { icon: '⊕' }); loadLogs()
    } catch (err) { setError(err.message) }
  }, [user, date, loadLogs])

  const handleEditSave = useCallback(async ({ qty, mealType }) => {
    if (!editingLog) return; setEditingLog(null)
    try {
      await deleteFoodLog(user.id, editingLog.id)
      await logFood(user.id, { date, food_name: editingLog.food_name, quantity_g: qty, is_custom: editingLog.is_custom ?? false, ...(editingLog.is_custom ? { calories: editingLog.calories, protein: editingLog.protein_g ?? editingLog.protein ?? 0, carbs: editingLog.carbs_g ?? editingLog.carbs ?? 0, fat: editingLog.fat_g ?? editingLog.fat ?? 0 } : {}), meal_type: mealType })
      toast.success('Entry updated'); loadLogs()
    } catch (err) { setError(err.message) }
  }, [user, date, editingLog, loadLogs])

  const allFoods   = useMemo(() => [...foods, ...customFoods], [foods, customFoods])
  const mealGroups = useMemo(() => groupByMeal(logs), [logs])
  const calGoal = user?.calorie_goal ?? 2000
  const proGoal = user?.protein_goal ?? 150

  return (
    <>
      {showCustomModal && <CustomFoodModal onClose={() => setShowCustomModal(false)} onSave={handleCustomSave} />}
      {editingLog && <QuickEditModal log={editingLog} onClose={() => setEditingLog(null)} onSave={handleEditSave} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <h1 style={{ color: '#f2f2f7', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Nutrition</h1>
          <p style={{ color: '#68687a', fontSize: '13px', marginTop: '4px' }}>{fmtDisplay(date)}</p>
        </div>

        <ErrorBanner message={error} />

        {/* Macro cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {loading && !summary
            ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
            : (<>
                <NutritionCard label="Calories" value={Math.round(summary?.total_calories ?? 0)} unit="kcal" goal={calGoal}  color="lime"  delay={0}   />
                <NutritionCard label="Protein"  value={Math.round(summary?.total_protein_g ?? 0)} unit="g"   goal={proGoal}  color="ice"   delay={60}  />
                <NutritionCard label="Carbs"    value={Math.round(summary?.total_carbs_g ?? 0)}   unit="g"   goal={250}      color="ember" delay={120} />
                <NutritionCard label="Fat"      value={Math.round(summary?.total_fat_g ?? 0)}     unit="g"   goal={65}       color="rose"  delay={180} />
              </>)
          }
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '20px' }}>

          {/* Add Food */}
          <div className="animate-fade-up opacity-0 animate-delay-200" style={{ animationFillMode: 'forwards' }}>
            <AddFoodPanel
              date={date} onDateChange={setDate}
              allFoods={allFoods} onSubmit={handleAddFood}
              onOpenCustomModal={() => setShowCustomModal(true)}
              submitting={submitting} formError={formError} formSuccess={formSuccess}
            />
          </div>

          {/* Entries */}
          <div className="animate-fade-up opacity-0 animate-delay-300" style={{ animationFillMode: 'forwards' }}>
            <div style={{ borderRadius: '20px', padding: '20px', background: 'rgba(22,22,25,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <h2 style={{ color: '#f2f2f7', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Entries — {fmtDisplay(date)}</h2>
                <span style={{ color: '#68687a', fontSize: '11px', fontFamily: 'monospace' }}>{logs.length} item{logs.length !== 1 ? 's' : ''}</span>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array(3).fill(0).map((_, i) => <EntrySkeleton key={i} />)}
                </div>
              ) : logs.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px', gap: '12px', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '4px' }}>🍽</div>
                  <p style={{ color: '#68687a', fontSize: '15px', fontWeight: 600, margin: 0 }}>No food added yet</p>
                  <p style={{ color: 'rgba(104,104,122,0.6)', fontSize: '12px', margin: 0, maxWidth: '200px' }}>Search and select a food on the left to log it here</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                  {mealGroups.map(group => (
                    <MealGroup key={group.mealType} {...group} onDelete={handleDelete} onDuplicate={handleDuplicate} onEdit={setEditingLog} />
                  ))}
                </div>
              )}

              {summary && logs.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(46,46,53,0.6)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', textAlign: 'center' }}>
                  {[
                    { l:'Total Cal', v:`${Math.round(summary.total_calories)} kcal`, c:'#a8f04a' },
                    { l:'Protein',   v:`${Math.round(summary.total_protein_g)}g`,    c:'#7dd3fc' },
                    { l:'Carbs',     v:`${Math.round(summary.total_carbs_g)}g`,      c:'#f97316' },
                    { l:'Fat',       v:`${Math.round(summary.total_fat_g)}g`,        c:'#fb7185' },
                  ].map(m => (
                    <div key={m.l}>
                      <p style={{ color: '#68687a', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>{m.l}</p>
                      <p style={{ color: m.c, fontSize: '13px', fontWeight: 700, margin: 0 }}>{m.v}</p>
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
