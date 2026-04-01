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
  if (!foodName) return '100g'
  const n = foodName.toLowerCase()
  if (n === 'egg') return 'piece'
  if (n.includes('whey')) return 'scoop'
  if (n.includes('milk')) return 'ml'
  return '100g'
}

const calculatePreview = (food, quantity) => {
  if (!food || !quantity || isNaN(quantity) || quantity <= 0) return null

  const name = food.name.toLowerCase()
  let factor = 1

  if (name === 'egg') factor = quantity
  else if (name.includes('whey')) factor = quantity
  else factor = quantity / 100

  const calories = food.calories_per_100g * factor
  const protein = food.protein_per_100g * factor
  const carbs = food.carbs_per_100g * factor
  const fat = food.fat_per_100g * factor

  if ([calories, protein, carbs, fat].some(v => isNaN(v))) return null

  return {
    calories: calories.toFixed(1),
    protein: protein.toFixed(1),
    carbs: carbs.toFixed(1),
    fat: fat.toFixed(1),
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

  const [search, setSearch] = useState('')
  const [recentFoods, setRecentFoods] = useState([])

  const [customMode, setCustomMode] = useState(false)
  const [customFood, setCustomFood] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
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
      .finally(() => setLoading(false))
  }, [user, date])

  useEffect(() => { loadLogs() }, [loadLogs])

  const addRecentFood = (foodName) => {
    setRecentFoods((prev) => {
      const updated = [foodName, ...prev.filter(f => f !== foodName)]
      return updated.slice(0, 5)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (customMode) {
      if (!customFood.name) return setFormError('Enter food name')

      try {
        await logFood(user.id, {
          date,
          food_name: customFood.name,
          quantity_g: 1,
          is_custom: true,
          calories: parseFloat(customFood.calories) || 0,
          protein: parseFloat(customFood.protein) || 0,
          carbs: parseFloat(customFood.carbs) || 0,
          fat: parseFloat(customFood.fat) || 0,
        })

        addRecentFood(customFood.name)

        setCustomFood({
          name: '',
          calories: '',
          protein: '',
          carbs: '',
          fat: ''
        })

        loadLogs()
        return
      } catch (err) {
        setFormError(err.message)
        return
      }
    }

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

      addRecentFood(form.food_name)

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

            {/* RECENT FOODS (SELECT ONLY) */}
            {recentFoods.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Recent</p>
                <div className="flex flex-wrap gap-2">
                  {recentFoods.map((f, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCustomMode(false)
                        setForm((prev) => ({ ...prev, food_name: f }))
                      }}
                      className="bg-gray-800 px-2 py-1 rounded text-xs hover:bg-gray-700"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Input
              placeholder="Search food..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="max-h-40 overflow-y-auto bg-gray-900 rounded p-2 space-y-1">
              <div
                className="p-2 cursor-pointer hover:bg-gray-800 rounded"
                onClick={() => {
                  setCustomMode(true)
                  setForm((f) => ({ ...f, food_name: '' }))
                }}
              >
                ➕ Add Custom Food
              </div>

              {filteredFoods.map((f) => (
                <div
                  key={f.name}
                  className="p-2 cursor-pointer hover:bg-gray-800 rounded"
                  onClick={() => {
                    setCustomMode(false)
                    setForm((prev) => ({ ...prev, food_name: f.name }))
                  }}
                >
                  {f.name}
                </div>
              ))}
            </div>

            {customMode && (
              <div className="bg-gray-900 p-3 rounded-lg space-y-2">
                <Input placeholder="Food name" value={customFood.name} onChange={setCustom('name')} />
                <Input placeholder="Calories" type="number" onChange={setCustom('calories')} />
                <Input placeholder="Protein (g)" type="number" onChange={setCustom('protein')} />
                <Input placeholder="Carbs (g)" type="number" onChange={setCustom('carbs')} />
                <Input placeholder="Fat (g)" type="number" onChange={setCustom('fat')} />
              </div>
            )}

            {!customMode && (
              <Input
                label={`Quantity (${getFoodUnit(form.food_name)})`}
                type="number"
                value={form.quantity_g}
                onChange={set('quantity_g')}
              />
            )}

            {preview && !customMode && (
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
                    <div>
                      <p className="font-medium">{log.food_name}</p>
                      <p className="text-xs text-gray-400">
                        {log.quantity_g}
                      </p>
                    </div>

                    <div className="text-right text-sm">
                      <p>{log.calories} kcal</p>
                      <p className="text-gray-400">{log.protein_g}g protein</p>
                    </div>

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