import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../hooks/useUser'
import { logWorkout, getWorkoutHistory, deleteWorkout } from '../services/api'
import {
  Card,
  Input,
  Button,
  StatCard,
  PageLoader,
  ErrorBanner,
  EmptyState,
  SectionHeader,
  Badge,
} from '../components/UI'

const today = () => new Date().toISOString().split('T')[0]
const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

const EXERCISE_SUGGESTIONS = [
  'Bench Press', 'Squat', 'Deadlift', 'Pull-ups', 'Shoulder Press',
  'Barbell Row', 'Incline Press', 'Leg Press', 'Lat Pulldown',
  'Romanian Deadlift', 'Dips', 'Bicep Curl', 'Tricep Extension',
  'Plank', 'Running', 'Cycling',
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
      setForm({ date: today(), exercise_name: '', sets: '', reps: '', weight_kg: '', notes: '' })
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
      loadHistory()
    } catch (err) {
      setError(err.message)
    }
  }

  // Stats
  const totalSessions = history.length
  const totalSets = history.reduce((a, s) => a + s.total_sets, 0)
  const totalVolume = history.reduce((a, s) => a + s.total_volume_kg, 0)
  const lastWorkout = history[history.length - 1]

  return (
    <div className="space-y-8">
      <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display text-5xl tracking-widest text-text">WORKOUTS</h1>
        <p className="text-dim text-sm mt-1">Log exercises and track your training volume</p>
      </div>

      <ErrorBanner message={error} onRetry={loadHistory} />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Sessions" value={totalSessions} icon="◈" accent="lime" delay={0} />
        <StatCard label="Total Sets" value={totalSets} icon="◉" accent="ice" delay={100} />
        <StatCard label="Total Volume" value={Math.round(totalVolume)} unit="kg" icon="◎" accent="ember" delay={200}
          sub="sets × reps × weight" />
        <StatCard
          label="Last Session"
          value={lastWorkout ? fmt(lastWorkout.date) : '—'}
          icon="◐"
          accent="dim"
          delay={300}
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Form */}
        <Card
          className="lg:col-span-2 animate-fade-up opacity-0 animate-delay-200 h-fit"
          style={{ animationFillMode: 'forwards' }}
        >
          <h2 className="font-display text-2xl tracking-wide mb-5">Log Exercise</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={set('date')}
                className="input-field"
                max={today()}
              />
            </div>

            {/* Exercise with suggestions */}
            <div className="relative">
              <Input
                label="Exercise Name"
                id="exercise_name"
                placeholder="e.g. Bench Press"
                value={form.exercise_name}
                onChange={set('exercise_name')}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
              />
              {showSuggestions && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                  {EXERCISE_SUGGESTIONS.filter((s) =>
                    s.toLowerCase().includes(form.exercise_name.toLowerCase())
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => setForm((f) => ({ ...f, exercise_name: s }))}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors text-text"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Sets"
                id="sets"
                type="number"
                min="1"
                placeholder="4"
                value={form.sets}
                onChange={set('sets')}
              />
              <Input
                label="Reps"
                id="reps"
                type="number"
                min="1"
                placeholder="8"
                value={form.reps}
                onChange={set('reps')}
              />
              <Input
                label="Weight (kg)"
                id="weight_kg"
                type="number"
                min="0"
                step="0.5"
                placeholder="80"
                value={form.weight_kg}
                onChange={set('weight_kg')}
              />
            </div>

            {/* Volume preview */}
            {form.sets && form.reps && form.weight_kg && (
              <div className="bg-lime/5 border border-lime/20 rounded-xl px-4 py-3 flex justify-between text-xs">
                <span className="text-dim">Session volume</span>
                <span className="font-mono font-semibold text-lime">
                  {(parseInt(form.sets) * parseInt(form.reps) * parseFloat(form.weight_kg)).toFixed(0)} kg
                </span>
              </div>
            )}

            <Input
              label="Notes (optional)"
              id="notes"
              placeholder="How did it feel?"
              value={form.notes}
              onChange={set('notes')}
            />

            <ErrorBanner message={formError} />
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Logging…' : '+ Log Exercise'}
            </Button>
          </form>
        </Card>

        {/* History */}
        <div
          className="lg:col-span-3 animate-fade-up opacity-0 animate-delay-300 space-y-3"
          style={{ animationFillMode: 'forwards' }}
        >
          <SectionHeader title="Session History" />

          {loading ? (
            <Card>
              <div className="py-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-border border-t-lime rounded-full animate-spin" />
              </div>
            </Card>
          ) : history.length === 0 ? (
            <Card>
              <EmptyState icon="◉" title="No workouts yet" description="Log your first exercise to start tracking progress." />
            </Card>
          ) : (
            [...history].reverse().map((session) => (
              <Card key={session.date}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-lime rounded-full" />
                    <h3 className="font-semibold text-sm">{fmt(session.date)}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Badge color="lime">{session.total_sets} sets</Badge>
                    <Badge color="ember">{session.total_volume_kg.toFixed(0)} kg vol</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {session.exercises.map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl hover:bg-muted/20 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 bg-muted/40 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-[10px] text-dim font-mono">
                            {ex.exercise_name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium truncate">{ex.exercise_name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-dim">
                          {ex.sets} × {ex.reps}
                          {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
                        </span>
                        {ex.notes && (
                          <span className="text-[10px] text-dim italic hidden md:block truncate max-w-24">
                            "{ex.notes}"
                          </span>
                        )}
                        <button
                          onClick={() => handleDelete(ex.id)}
                          className="opacity-0 group-hover:opacity-100 text-dim hover:text-ember text-xs px-2 py-1 rounded hover:bg-ember/10 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
