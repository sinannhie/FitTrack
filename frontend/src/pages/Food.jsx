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

/* 🔥 FINAL UNIT LOGIC */
const getFoodUnit = (foodName) => {
  if (!foodName) return 'g'

  const n = foodName.toLowerCase()

  if (n === 'egg') return 'pieces'
  if (n.includes('whey')) return 'scoops'

  if (['milk', 'chai', 'coconut water', 'black tea'].includes(n)) return 'ml'

  if (
    [
      'parotta',
      'puttu',
      'kerala shawarma roll',
      'kerala shawarma plate',
      'alfaham quarter',
      'shawaya quarter',
      'fried chicken quarter'
    ].includes(n)
  ) return 'pieces'

  return 'g'
}

/* 🔥 SAFE PREVIEW */
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

export default function FoodPage() {
  const { user } = useUser()

  const [date, setDate] = useState(today())
  const [foods, setFoods] = useState([])
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [form, setForm] = useState({ food_name: '', quantity_g: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const [search, setSearch] = useState('')
  const [recentFoods, setRecentFoods] = useState([])

  const [customMode, setCustomMode] = useState(false)
  const [customFood, setCustomFood] = useState({
    name: '', calories: '', protein: '', carbs: '', fat: ''
  })

  const setCustom = (k) => (e) =>
    setCustomFood((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    getFoods().then((r) => setFoods(r.data))
  }, [])

  const loadLogs = useCallback(() => {
    if (!user) return
    setLoading(true)

    Promise.all([
      getFoodLogs(user.id, date),
      getNutritionSummary(user.id, date),
    ])
      .then(([l, s]) => {
        setLogs(l.data)
        setSummary(s.data)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user, date])

  useEffect(() => { loadLogs() }, [loadLogs])

  const addRecentFood = (foodName) => {
    setRecentFoods((prev) => {
      const updated = [foodName, ...prev.filter(f => f !== foodName)]
      return updated.slice(0, 5)
    })
  }

  const showSuccess = (msg) => {
    setFormSuccess(msg)
    setTimeout(() => setFormSuccess(''), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (customMode) {
      if (!customFood.name) return setFormError('Enter food name')

      setSubmitting(true)
      try {
        await logFood(user.id, {
          date,
          food_name: customFood.name,
          quantity_g: 1,
          is_custom: true,
          calories: parseFloat(customFood.calories) || 0,
          protein:  parseFloat(customFood.protein)  || 0,
          carbs:    parseFloat(customFood.carbs)    || 0,
          fat:      parseFloat(customFood.fat)      || 0,
        })

        addRecentFood(customFood.name)
        setCustomFood({ name: '', calories: '', protein: '', carbs: '', fat: '' })
        setCustomMode(false)
        showSuccess('Food added successfully ✅')
        loadLogs()
      } catch (err) {
        setFormError(err.message || 'Failed to add food')
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!form.food_name) return setFormError('Select a food')
    if (!form.quantity_g || form.quantity_g <= 0)
      return setFormError('Enter valid quantity')

    setSubmitting(true)
    try {
      await logFood(user.id, {
        date,
        food_name: form.food_name,
        quantity_g: parseFloat(form.quantity_g),
      })

      addRecentFood(form.food_name)
      setForm({ food_name: '', quantity_g: '' })
      showSuccess('Food added successfully ✅')
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

  const selectedFood = foods.find((f) => f.name === form.food_name)
  const preview = calculatePreview(selectedFood, parseFloat(form.quantity_g))

  const filteredFoods = foods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">

      <h1 className="text-4xl font-bold">Nutrition</h1>

      <ErrorBanner message={error} />

      {summary && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Calories" value={Math.round(summary.total_calories)} unit="kcal" />
          <StatCard label="Protein" value={Math.round(summary.total_protein_g)} unit="g" />
          <StatCard label="Carbs" value={Math.round(summary.total_carbs_g)} unit="g" />
          <StatCard label="Fat" value={Math.round(summary.total_fat_g)} unit="g" />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">

        <Card className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Add Food</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white p-2 rounded"
            />

            {formError && <p className="text-red-400 text-sm">❌ {formError}</p>}
            {formSuccess && <p className="text-green-400 text-sm">{formSuccess}</p>}

            <Input
              placeholder="Search food..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="max-h-40 overflow-y-auto bg-gray-900 rounded p-2 space-y-1">
              <div
                className="p-2 cursor-pointer hover:bg-gray-800 rounded"
                onClick={() => setCustomMode(true)}
              >
                ➕ Add Custom Food
              </div>

              {filteredFoods.map((f) => (
                <div
                  key={f.name}
                  className="p-2 cursor-pointer hover:bg-gray-800 rounded"
                  onClick={() => {
                    setCustomMode(false)
                    const unit = getFoodUnit(f.name)

                    setForm({
                      food_name: f.name,
                      quantity_g:
                        unit === 'pieces' ? 1 :
                        unit === 'ml' ? 100 :
                        100
                    })
                  }}
                >
                  {f.name}
                </div>
              ))}
            </div>

            {!customMode && (
              <>
                <Input
                  label={`Quantity (${getFoodUnit(form.food_name)})`}
                  type="number"
                  value={form.quantity_g}
                  onChange={set('quantity_g')}
                />

                <p className="text-xs text-gray-500">
                  {getFoodUnit(form.food_name) === 'pieces' && "Enter number of pieces"}
                  {getFoodUnit(form.food_name) === 'ml' && "Enter in ml"}
                  {getFoodUnit(form.food_name) === 'g' && "Enter in grams"}
                </p>
              </>
            )}

            {preview && !customMode && (
              <div className="bg-gray-900 p-3 rounded-lg text-sm space-y-1">
                <p>🔥 {preview.calories} kcal</p>
                <p>💪 {preview.protein} g protein</p>
                <p>🍚 {preview.carbs} g carbs</p>
                <p>🥑 {preview.fat} g fat</p>
              </div>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Food'}
            </Button>

          </form>
        </Card>

        <div className="lg:col-span-3 space-y-4">

          <Card>
            <SectionHeader title={`Entries — ${date}`} />

            {loading ? (
              <p>Loading...</p>
            ) : logs.length === 0 ? (
              <EmptyState title="No entries" />
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex justify-between bg-gray-900 p-3 rounded-lg">
                    <div>
                      <p>{log.food_name}</p>
                      <p className="text-xs text-gray-400">{log.quantity_g}</p>
                    </div>
                    <div className="text-right">
                      <p>{log.calories} kcal</p>
                      <p className="text-gray-400">{log.protein}g protein</p>
                    </div>
                    <button onClick={() => handleDelete(log.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}