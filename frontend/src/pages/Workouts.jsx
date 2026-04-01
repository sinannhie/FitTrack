import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../hooks/useUser'
import { logWorkout, getWorkoutHistory, deleteWorkout } from '../services/api'
import {
  Card,
  Input,
  Button,
  StatCard,
  ErrorBanner,
  EmptyState,
  SectionHeader,
  Badge,
} from '../components/UI'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import { toast } from 'react-hot-toast'

const today = () => new Date().toISOString().split('T')[0]
const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

const EXERCISE_SUGGESTIONS = [
  'Bench Press','Squat','Deadlift','Pull-ups','Shoulder Press',
  'Barbell Row','Incline Press','Leg Press','Lat Pulldown',
  'Romanian Deadlift','Dips','Bicep Curl','Tricep Extension',
  'Plank','Running','Cycling',
]

export default function WorkoutsPage() {
  const { user } = useUser()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [form, setForm] = useState({
    date: today(),
    exercise_name: '',
    sets: '',
    reps: '',
    weight_kg: '',
    notes: '',
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const loadHistory = useCallback(() => {
    if (!user) return
    setLoading(true)
    getWorkoutHistory(user.id)
      .then((r) => setHistory(r.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => { loadHistory() }, [loadHistory])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.exercise_name.trim()) return setFormError('Enter exercise name.')
    if (!form.sets || parseInt(form.sets) < 1) return setFormError('Enter valid sets.')
    if (!form.reps || parseInt(form.reps) < 1) return setFormError('Enter valid reps.')

    setSubmitting(true)
    setFormError('')

    try {
      await logWorkout(user.id, {
        date: form.date,
        exercise_name: form.exercise_name.trim(),
        sets: parseInt(form.sets),
        reps: parseInt(form.reps),
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        notes: form.notes || null,
      })

      toast.success('Workout logged 💪')

      setForm({
        date: today(),
        exercise_name: '',
        sets: '',
        reps: '',
        weight_kg: '',
        notes: '',
      })

      loadHistory()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (workoutId) => {
    try {
      await deleteWorkout(user.id, workoutId)
      toast.success('Deleted')
      loadHistory()
    } catch (err) {
      setError(err.message)
    }
  }

  // ===== STATS =====
  const totalSessions = history.length
  const totalSets = history.reduce((a, s) => a + s.total_sets, 0)
  const totalVolume = history.reduce((a, s) => a + s.total_volume_kg, 0)
  const lastWorkout = history[history.length - 1]

  // ===== WEEKLY DATA =====
  const weeklyData = history.slice(-7).map((s) => ({
    day: new Date(s.date).toLocaleDateString('en', { weekday: 'short' }),
    volume: s.total_volume_kg,
  }))

  const Trend = ({ value }) => {
    if (value > 0) return <span className="text-lime">↑</span>
    if (value < 0) return <span className="text-ember">↓</span>
    return <span className="text-dim">—</span>
  }

  return (
    <div className="space-y-8">

      <div>
        <h1 className="font-display text-5xl tracking-widest text-text">WORKOUTS</h1>
        <p className="text-dim text-sm mt-1">Log exercises and track your training volume</p>
      </div>

      <ErrorBanner message={error} onRetry={loadHistory} />

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value={totalSessions || '--'} icon="◈" accent="lime" />
        <StatCard label="Total Sets" value={totalSets || '--'} icon="◉" accent="ice" />
        <StatCard
          label="Total Volume"
          value={totalVolume ? Math.round(totalVolume) : '--'}
          unit={totalVolume ? 'kg' : ''}
          icon="◎"
          accent="ember"
          sub="sets × reps × weight"
        />
        <StatCard
          label="Last Session"
          value={lastWorkout ? fmt(lastWorkout.date) : '--'}
          icon="◐"
          accent="dim"
        />
      </div>

      {/* ===== WEEKLY CHART ===== */}
      <Card>
        <h3 className="text-sm mb-4 text-dim">Weekly Volume</h3>
        {weeklyData.length === 0 ? (
          <EmptyState title="No data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid lg:grid-cols-5 gap-4">

        {/* ===== FORM ===== */}
        <Card className="lg:col-span-2 h-fit">
          <h2 className="font-display text-2xl mb-5">Log Exercise</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            <input
              type="date"
              value={form.date}
              onChange={set('date')}
              className="input-field"
              max={today()}
            />

            {/* Suggestions */}
            <div className="relative">
              <Input
                label="Exercise Name"
                value={form.exercise_name}
                onChange={set('exercise_name')}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />

              {showSuggestions && (
                <div className="absolute z-20 w-full bg-card border rounded-xl max-h-40 overflow-y-auto">
                  {EXERCISE_SUGGESTIONS
                    .filter(s => s.toLowerCase().includes(form.exercise_name.toLowerCase()))
                    .map(s => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={() => setForm(f => ({ ...f, exercise_name: s }))}
                        className="block w-full text-left px-3 py-2 hover:bg-muted/30"
                      >
                        {s}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="Sets" value={form.sets} onChange={set('sets')} />
              <Input type="number" placeholder="Reps" value={form.reps} onChange={set('reps')} />
              <Input type="number" placeholder="Weight" value={form.weight_kg} onChange={set('weight_kg')} />
            </div>

            {/* Volume */}
            {form.sets && form.reps && form.weight_kg && (
              <div className="bg-lime/10 p-3 rounded-xl text-xs flex justify-between">
                <span>Volume</span>
                <strong>
                  {(form.sets * form.reps * form.weight_kg).toFixed(0)} kg
                </strong>
              </div>
            )}

            <Input
              placeholder="Notes"
              value={form.notes}
              onChange={set('notes')}
            />

            <ErrorBanner message={formError} />

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Logging…' : '+ Log Exercise'}
            </Button>

          </form>
        </Card>

        {/* ===== HISTORY ===== */}
        <div className="lg:col-span-3 space-y-3">

          <SectionHeader title="Session History" />

          {loading ? (
            <Card><div className="p-6 text-center">Loading...</div></Card>
          ) : history.length === 0 ? (
            <Card>
              <EmptyState title="No workouts yet" description="Start logging 💪" />
            </Card>
          ) : (
            [...history].reverse().map(session => (
              <Card key={session.date}>

                <div className="flex justify-between mb-3">
                  <h3>{fmt(session.date)}</h3>
                  <div className="flex gap-2">
                    <Badge color="lime">{session.total_sets} sets</Badge>
                    <Badge color="ember">{session.total_volume_kg.toFixed(0)} kg</Badge>
                  </div>
                </div>

                {session.exercises.map(ex => (
                  <div key={ex.id} className="flex justify-between text-sm py-2">

                    <span>{ex.exercise_name}</span>

                    <div className="flex gap-3 items-center">
                      <span>
                        {ex.sets} × {ex.reps}
                        {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
                      </span>

                      <button onClick={() => handleDelete(ex.id)}>✕</button>
                    </div>

                  </div>
                ))}

              </Card>
            ))
          )}

        </div>
      </div>
    </div>
  )
}