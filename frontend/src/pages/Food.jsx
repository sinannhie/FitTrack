import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../hooks/useUser'
import { logFood, getFoodLogs, getNutritionSummary, getFoods, deleteFoodLog } from '../services/api'
import {
  Card,
  Input,
  Select,
  Button,
  StatCard,
  ErrorBanner,
  MacroBar,
  EmptyState,
  SectionHeader,
} from '../components/UI'

const today = () => new Date().toISOString().split('T')[0]

const getFoodUnit = (foodName) => {
  if (!foodName) return '100g'
  const n = foodName.toLowerCase()
  if (n === 'egg') return 'piece'
  if (n.includes('whey')) return 'scoop'
  if (n.includes('milk')) return 'ml'
  return '100g'
}

const calculatePreview = (food, quantity) => {
  if (!food || quantity <= 0) return null

  const name = food.name.toLowerCase()
  let factor = 1

  if (name === 'egg') factor = quantity
  else if (name.includes('whey')) factor = quantity
  else factor = quantity / 100

  return {
    calories: (food.calories_per_100g * factor).toFixed(1),
    protein: (food.protein_per_100g * factor).toFixed(1),
    carbs: (food.carbs_per_100g * factor).toFixed(1),
    fat: (food.fat_per_100g * factor).toFixed(1),
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

  const [form, setForm] = useState({ food_name: '', quantity_g: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

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
      .finally(() => setLoading(false))
  }, [user, date])

  useEffect(() => { loadLogs() }, [loadLogs])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.food_name) return setFormError('Select a food')
    if (!form.quantity_g || form.quantity_g <= 0)
      return setFormError('Enter valid quantity')

    setSubmitting(true)
    setFormError('')

    try {
      await logFood(user.id, {
        date,
        food_name: form.food_name,
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

  const handleDelete = async (id) => {
    await deleteFoodLog(user.id, id)
    loadLogs()
  }

  const selectedFood = foods.find((f) => f.name === form.food_name)
  const preview = calculatePreview(selectedFood, parseFloat(form.quantity_g))

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <h1 className="text-4xl font-bold">Nutrition</h1>

      <ErrorBanner message={error} />

      {/* STATS */}
      {summary && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Calories" value={Math.round(summary.total_calories)} unit="kcal" />
          <StatCard label="Protein" value={Math.round(summary.total_protein_g)} unit="g" />
          <StatCard label="Carbs" value={Math.round(summary.total_carbs_g)} unit="g" />
          <StatCard label="Fat" value={Math.round(summary.total_fat_g)} unit="g" />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">

        {/* FORM */}
        <Card className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Add Food</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* FIXED DATE INPUT */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white p-2 rounded"
            />

            <Select value={form.food_name} onChange={set('food_name')}>
              <option value="">Select food</option>
              {foods.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </Select>

            <Input
              label={`Quantity (${getFoodUnit(form.food_name)})`}
              type="number"
              value={form.quantity_g}
              onChange={set('quantity_g')}
            />

            {/* PREVIEW */}
            {preview && (
              <div className="bg-gray-900 p-3 rounded-lg text-sm space-y-1">
                <p>🔥 {preview.calories} kcal</p>
                <p>💪 {preview.protein} g protein</p>
                <p>🍚 {preview.carbs} g carbs</p>
                <p>🥑 {preview.fat} g fat</p>
              </div>
            )}

            <Button type="submit">
              {submitting ? 'Adding...' : 'Add Food'}
            </Button>
          </form>
        </Card>

        {/* LOGS */}
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
                  <div
                    key={log.id}
                    className="flex justify-between items-center bg-gray-900 p-3 rounded-lg"
                  >
                    {/* LEFT */}
                    <div>
                      <p className="font-medium">{log.food_name}</p>
                      <p className="text-xs text-gray-400">
                        {log.quantity_g}
                      </p>
                    </div>

                    {/* RIGHT */}
                    <div className="text-right text-sm">
                      <p>{log.calories} kcal</p>
                      <p className="text-gray-400">{log.protein_g}g protein</p>
                    </div>

                    {/* DELETE */}
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="text-red-400 hover:text-red-600 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* MACROS */}
          {summary && (
            <Card className="space-y-2">
              <MacroBar label="Calories" current={summary.total_calories} goal={summary.calorie_goal} />
              <MacroBar label="Protein" current={summary.total_protein_g} goal={summary.protein_goal} />
              <MacroBar label="Carbs" current={summary.total_carbs_g} />
              <MacroBar label="Fat" current={summary.total_fat_g} />
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}