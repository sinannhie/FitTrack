// FIXED VERSION — matches backend logic 100%

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
  Badge,
} from '../components/UI'

const today = () => new Date().toISOString().split('T')[0]

// 🔥 UNIT LOGIC (FINAL)
const getFoodUnit = (foodName) => {
  if (!foodName) return '100g'
  const n = foodName.toLowerCase()
  if (n === 'egg') return 'piece'
  if (n.includes('whey')) return 'scoop'
  if (n.includes('milk')) return 'ml'
  return '100g'
}

// 🔥 PREVIEW CALCULATION (MATCH BACKEND)
const calculatePreview = (food, quantity) => {
  if (!food || quantity <= 0) return null

  const name = food.name.toLowerCase()

  let factor = 1

  if (name === 'egg') {
    factor = quantity
  } else if (name.includes('whey')) {
    factor = quantity
  } else if (name.includes('milk')) {
    factor = quantity / 100
  } else {
    factor = quantity / 100
  }

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

  // Load foods
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
      <div>
        <h1 className="text-4xl font-bold">Nutrition</h1>
      </div>

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

      <div className="grid lg:grid-cols-5 gap-4">

        {/* FORM */}
        <Card className="lg:col-span-2">
          <h2>Add Food</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

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

            {/* 🔥 LIVE PREVIEW FIXED */}
            {preview && (
              <div className="bg-gray-900 p-3 rounded">
                <p>Calories: {preview.calories} kcal</p>
                <p>Protein: {preview.protein} g</p>
                <p>Carbs: {preview.carbs} g</p>
                <p>Fat: {preview.fat} g</p>
              </div>
            )}

            <Button type="submit">
              {submitting ? 'Adding...' : 'Add Food'}
            </Button>
          </form>
        </Card>

        {/* LOGS */}
        <div className="lg:col-span-3">
          <Card>
            <SectionHeader title={`Entries — ${date}`} />

            {loading ? (
              <p>Loading...</p>
            ) : logs.length === 0 ? (
              <EmptyState title="No entries" />
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex justify-between p-2 border-b">
                  <div>
                    <p>{log.food_name}</p>
                    <p className="text-xs text-gray-400">
                      {log.quantity_g}
                    </p>
                  </div>

                  <div>
                    <p>{log.calories} kcal</p>
                    <p>{log.protein_g}g</p>
                  </div>

                  <button onClick={() => handleDelete(log.id)}>X</button>
                </div>
              ))
            )}
          </Card>

          {/* MACROS */}
          {summary && (
            <Card>
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