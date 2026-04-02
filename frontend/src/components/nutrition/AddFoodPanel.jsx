import { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react'

/* ── Helpers ──────────────────────────────────────────────────── */

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { id: 'lunch',     label: 'Lunch',     icon: '☀️' },
  { id: 'snack',     label: 'Snack',     icon: '🍎' },
  { id: 'dinner',    label: 'Dinner',    icon: '🌙' },
]

function inferMealType() {
  const h = new Date().getHours()
  if (h >= 5  && h < 10) return 'breakfast'
  if (h >= 10 && h < 14) return 'lunch'
  if (h >= 14 && h < 18) return 'snack'
  if (h >= 18 && h < 22) return 'dinner'
  return 'snack'
}

function getFoodUnit(name = '') {
  const n = name.toLowerCase()
  if (n === 'egg') return 'pieces'
  if (n.includes('whey') || n.includes('protein powder')) return 'scoops'
  if (['milk','chai','coconut water','black tea'].includes(n)) return 'ml'
  if (['parotta','puttu','kerala shawarma roll'].includes(n)) return 'pieces'
  return 'g'
}

function calcPreview(food, qty) {
  if (!food || !qty || isNaN(qty) || qty <= 0) return null
  const n = food.name.toLowerCase()
  let factor =
    n === 'egg'           ? qty :
    n.includes('whey')   ? qty :
    getFoodUnit(n) === 'ml' ? qty / 100 :
    qty / 100
  return {
    calories: (food.calories_per_100g * factor).toFixed(1),
    protein:  (food.protein_per_100g  * factor).toFixed(1),
    carbs:    (food.carbs_per_100g    * factor).toFixed(1),
    fat:      (food.fat_per_100g      * factor).toFixed(1),
  }
}

/* ── Component ────────────────────────────────────────────────── */

const AddFoodPanel = memo(function AddFoodPanel({
  date,
  onDateChange,
  allFoods,                  // merged API + custom foods
  onSubmit,                  // ({ date, food_name, quantity_g, meal_type }) => void
  onOpenCustomModal,         // () => void  opens custom food modal in parent
  submitting,
  formError,
  formSuccess,
}) {
  const [search,     setSearch]     = useState('')
  const [debSearch,  setDebSearch]  = useState('')
  const [selected,   setSelected]   = useState(null)   // food object
  const [qty,        setQty]        = useState('')
  const [mealType,   setMealType]   = useState(inferMealType)
  const [dropOpen,   setDropOpen]   = useState(false)

  const searchRef  = useRef(null)
  const dropRef    = useRef(null)

  /* Debounce search 300ms */
  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  /* Click-outside closes dropdown */
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = useMemo(() =>
    allFoods.filter(f => f.name.toLowerCase().includes(debSearch.toLowerCase())),
    [allFoods, debSearch]
  )

  const preview = useMemo(() => calcPreview(selected, parseFloat(qty)), [selected, qty])

  const selectFood = useCallback((food) => {
    setSelected(food)
    setSearch('')
    setDebSearch('')
    setDropOpen(false)
    const unit = getFoodUnit(food.name)
    setQty(unit === 'pieces' ? '1' : '100')
  }, [])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (!selected || !qty) return
    onSubmit({
      date,
      food_name:  selected.name,
      quantity_g: parseFloat(qty),
      meal_type:  mealType,
    })
    setSelected(null)
    setQty('')
    setSearch('')
  }, [date, selected, qty, mealType, onSubmit])

  const unit = selected ? getFoodUnit(selected.name) : 'g'

  return (
    <div className="card-glass flex flex-col gap-4 p-5 h-fit">
      <h2 className="text-[18px] font-display font-semibold tracking-tight">Add Food</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">

        {/* Date */}
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => onDateChange(e.target.value)}
            className="input-field"
          />
        </div>

        {/* Status messages */}
        {formError && (
          <div className="flex items-center gap-2 bg-rose/10 border border-rose/20 rounded-xl
                          px-3 py-2.5 text-[13px] text-rose-400">
            <span>⚠</span> {formError}
          </div>
        )}
        {formSuccess && (
          <div className="flex items-center gap-2 bg-lime/10 border border-lime/20 rounded-xl
                          px-3 py-2.5 text-[13px] text-lime">
            <span>✓</span> {formSuccess}
          </div>
        )}

        {/* Meal type selector */}
        <div>
          <label className="label">Meal</label>
          <div className="grid grid-cols-4 gap-1.5">
            {MEAL_TYPES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMealType(m.id)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl
                            text-[10px] font-medium transition-all duration-150
                            ${mealType === m.id
                              ? 'bg-lime/15 text-lime border border-lime/30'
                              : 'bg-muted/40 text-dim border border-transparent hover:border-border hover:text-text'
                            }`}
              >
                <span className="text-base leading-none">{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search + dropdown */}
        <div ref={dropRef}>
          <label className="label">Search Food</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dim text-sm pointer-events-none">
              ⌕
            </span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search food..."
              value={search}
              onChange={e => { setSearch(e.target.value); setDropOpen(true) }}
              onFocus={() => setDropOpen(true)}
              className="input-field pl-8"
              autoComplete="off"
            />
          </div>

          {/* Dropdown */}
          {dropOpen && (
            <div
              className="mt-1.5 rounded-2xl border border-border/60 overflow-hidden shadow-card-lg"
              style={{ background: 'rgba(18,18,22,0.97)', backdropFilter: 'blur(20px)', maxHeight: '200px', overflowY: 'auto' }}
            >
              {/* Custom food option */}
              <button
                type="button"
                onMouseDown={() => { setDropOpen(false); onOpenCustomModal() }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left text-[13px]
                           text-lime font-medium hover:bg-lime/8 transition-colors border-b border-border/40"
              >
                <span className="text-[16px] font-bold leading-none">+</span>
                Add Custom Food
              </button>

              {/* Food list */}
              {filtered.length === 0 && debSearch && (
                <p className="px-4 py-3 text-[12px] text-dim">No results for "{debSearch}"</p>
              )}
              {filtered.map(f => (
                <button
                  key={f.name}
                  type="button"
                  onMouseDown={() => selectFood(f)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left
                              text-[13px] transition-colors border-b border-border/30 last:border-0
                              ${selected?.name === f.name
                                ? 'bg-lime/10 text-lime'
                                : 'text-text hover:bg-white/4'}`}
                >
                  <span className="capitalize">{f.name}</span>
                  <span className="text-[11px] font-mono text-dim ml-2 flex-shrink-0">
                    {Math.round(f.calories_per_100g)} kcal
                    · {Math.round(f.protein_per_100g)}g P
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected food + quantity */}
        {selected && (
          <div
            className="rounded-2xl border border-lime/20 p-3 flex flex-col gap-3"
            style={{ background: 'rgba(168,240,74,0.05)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-text capitalize">{selected.name}</p>
              <button
                type="button"
                onClick={() => { setSelected(null); setQty('') }}
                className="text-[11px] text-dim hover:text-rose-400 transition-colors"
              >
                ✕ Clear
              </button>
            </div>

            <div>
              <label className="label">Quantity ({unit})</label>
              <input
                type="number"
                value={qty}
                onChange={e => setQty(e.target.value)}
                min="0.1"
                step="0.1"
                placeholder={`Enter ${unit}`}
                className="input-field"
                autoFocus
              />
            </div>

            {/* Macro preview */}
            {preview && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { l: 'Cal',  v: preview.calories, c: '#a8f04a' },
                  { l: 'Pro',  v: preview.protein,  c: '#7dd3fc' },
                  { l: 'Carb', v: preview.carbs,    c: '#f97316' },
                  { l: 'Fat',  v: preview.fat,       c: '#fb7185' },
                ].map(m => (
                  <div
                    key={m.l}
                    className="rounded-xl py-2 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <p className="text-[9px] font-mono uppercase mb-0.5" style={{ color: 'rgba(104,104,122,0.8)' }}>
                      {m.l}
                    </p>
                    <p className="text-[13px] font-bold font-display" style={{ color: m.c }}>{m.v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !selected || !qty}
          className="btn-primary w-full"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
              Adding…
            </span>
          ) : 'Add Food'}
        </button>

      </form>
    </div>
  )
})

export default AddFoodPanel
