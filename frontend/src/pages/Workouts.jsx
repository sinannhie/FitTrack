/**
 * UPDATED: frontend/src/pages/Workouts.jsx
 *
 * Changes:
 * 1. Replaced "Total Sessions" with Steps Today + Weekly Steps cards
 * 2. Added Steps field in Log Exercise form (optional)
 * 3. Fixed bodyweight exercise bug (uses userWeight when weight=0)
 * 4. Strict date-wise session filtering
 * 5. Date navigation (← → previous/next day)
 * 6. Session title shows Workout Type (Push/Pull/Legs/Custom)
 * 7. Exercises grouped by muscle group inside session
 * 8. Steps shown in session history card
 * 9. Accordion expand/collapse for session history
 * 10. Weekly cards with trend arrows
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
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

// ── Date helpers ─────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0]

const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

// ── Workout config ─────────────────────────────────────────────
const WORKOUT_TYPES = [
  { value: 'push',   label: 'Push',   icon: '↑', color: '#a8f04a' },
  { value: 'pull',   label: 'Pull',   icon: '↓', color: '#7dd3fc' },
  { value: 'legs',   label: 'Legs',   icon: '⚡', color: '#f97316' },
  { value: 'cardio', label: 'Cardio', icon: '♥', color: '#fb7185' },
  { value: 'custom', label: 'Custom', icon: '◈', color: '#a8f04a' },
]

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Legs', 'Glutes', 'Core', 'Calves', 'Full Body',
]

const EXERCISE_SUGGESTIONS = [
  // Push
  { name: 'Bench Press',        type: 'push',   muscle: 'Chest'     },
  { name: 'Incline Press',      type: 'push',   muscle: 'Chest'     },
  { name: 'Shoulder Press',     type: 'push',   muscle: 'Shoulders' },
  { name: 'Lateral Raise',      type: 'push',   muscle: 'Shoulders' },
  { name: 'Dips',               type: 'push',   muscle: 'Triceps'   },
  { name: 'Tricep Extension',   type: 'push',   muscle: 'Triceps'   },
  { name: 'Chest Fly',          type: 'push',   muscle: 'Chest'     },
  // Pull
  { name: 'Pull-ups',           type: 'pull',   muscle: 'Back'      },
  { name: 'Barbell Row',        type: 'pull',   muscle: 'Back'      },
  { name: 'Lat Pulldown',       type: 'pull',   muscle: 'Back'      },
  { name: 'Bicep Curl',         type: 'pull',   muscle: 'Biceps'    },
  { name: 'Hammer Curl',        type: 'pull',   muscle: 'Biceps'    },
  { name: 'Face Pull',          type: 'pull',   muscle: 'Back'      },
  { name: 'Wrist Curl',         type: 'pull',   muscle: 'Forearms'  },
  // Legs
  { name: 'Squat',              type: 'legs',   muscle: 'Legs'      },
  { name: 'Deadlift',           type: 'legs',   muscle: 'Legs'      },
  { name: 'Romanian Deadlift',  type: 'legs',   muscle: 'Glutes'    },
  { name: 'Leg Press',          type: 'legs',   muscle: 'Legs'      },
  { name: 'Leg Curl',           type: 'legs',   muscle: 'Legs'      },
  { name: 'Calf Raise',         type: 'legs',   muscle: 'Calves'    },
  { name: 'Hip Thrust',         type: 'legs',   muscle: 'Glutes'    },
  // Cardio / Core
  { name: 'Running',            type: 'cardio', muscle: 'Full Body' },
  { name: 'Cycling',            type: 'cardio', muscle: 'Legs'      },
  { name: 'Plank',              type: 'custom', muscle: 'Core'      },
  { name: 'Ab Rollout',         type: 'custom', muscle: 'Core'      },
]

// ── Bodyweight exercises (no weight needed) ────────────────────
const BODYWEIGHT_EXERCISES = new Set([
  'pull-ups', 'dips', 'plank', 'push-ups', 'chin-ups',
  'muscle-ups', 'pistol squat', 'ab rollout',
])

const isBodyweight = (name) => BODYWEIGHT_EXERCISES.has(name?.toLowerCase().trim())

// ── Get label for workout type ─────────────────────────────────
const getWorkoutTypeLabel = (type) => {
  const found = WORKOUT_TYPES.find(t => t.value === type)
  return found ? found.label : 'Workout'
}

const getWorkoutTypeColor = (type) => {
  const found = WORKOUT_TYPES.find(t => t.value === type)
  return found ? found.color : '#a8f04a'
}

// ── Group exercises by muscle group ───────────────────────────
function groupByMuscle(exercises) {
  const groups = {}
  for (const ex of exercises) {
    const key = ex.muscle_group || 'Other'
    if (!groups[key]) groups[key] = []
    groups[key].push(ex)
  }
  return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
}

// ── Trend arrow component ──────────────────────────────────────
function TrendArrow({ current, previous }) {
  if (!previous || previous === 0) return null
  const diff = current - previous
  const pct = Math.abs(Math.round((diff / previous) * 100))
  if (Math.abs(diff) < 1) return <span style={{ color: '#68687a', fontSize: '11px' }}>—</span>
  return (
    <span style={{ color: diff > 0 ? '#a8f04a' : '#fb7185', fontSize: '11px', fontFamily: 'monospace' }}>
      {diff > 0 ? '↑' : '↓'} {pct}%
    </span>
  )
}

// ── Accordion Session Card ─────────────────────────────────────
function SessionCard({ session, onDeleteExercise, userWeight }) {
  const [expanded, setExpanded] = useState(false)

  // Determine session workout type from exercises
  const workoutType = session.exercises?.[0]?.workout_type || 'custom'
  const typeColor = getWorkoutTypeColor(workoutType)
  const typeLabel = getWorkoutTypeLabel(workoutType)

  // Group exercises by muscle group
  const muscleGroups = useMemo(() => groupByMuscle(session.exercises || []), [session.exercises])

  // Calculate effective volume (bodyweight uses userWeight)
  const effectiveVolume = useMemo(() => {
    return session.exercises.reduce((total, ex) => {
      const w = (ex.weight_kg && ex.weight_kg > 0) ? ex.weight_kg : (userWeight || 0)
      return total + ex.sets * ex.reps * w
    }, 0)
  }, [session.exercises, userWeight])

  const hasSteps = session.total_steps > 0

  return (
    <div
      style={{
        borderRadius: '16px',
        border: '1px solid rgba(46,46,53,0.8)',
        background: 'rgba(22,22,25,0.9)',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '14px 16px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Type pill */}
          <span
            style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px',
              background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}30`,
            }}
          >
            {typeLabel}
          </span>
          <div>
            <p style={{ color: '#f2f2f7', fontSize: '14px', fontWeight: 600, margin: 0 }}>
              {fmtDate(session.date)}
            </p>
            <p style={{ color: '#68687a', fontSize: '11px', fontFamily: 'monospace', margin: '2px 0 0' }}>
              {session.exercises.length} exercise{session.exercises.length !== 1 ? 's' : ''}
              {' · '}{session.total_sets} sets
              {' · '}{Math.round(effectiveVolume)}kg vol
              {hasSteps ? ` · ${session.total_steps.toLocaleString()} steps` : ''}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasSteps && (
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#7dd3fc' }}>
              👟 {session.total_steps.toLocaleString()}
            </span>
          )}
          <span
            style={{
              color: '#68687a', fontSize: '16px',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
            }}
          >
            ▾
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(46,46,53,0.5)', padding: '12px 16px 16px' }}>
          {muscleGroups.map(([muscle, exercises]) => (
            <div key={muscle} style={{ marginBottom: '16px' }}>
              {/* Muscle group header */}
              <p
                style={{
                  color: '#68687a', fontSize: '10px', fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  margin: '0 0 8px', paddingBottom: '4px',
                  borderBottom: '1px solid rgba(46,46,53,0.4)',
                }}
              >
                {muscle}
              </p>

              {/* Exercises in this muscle group */}
              {exercises.map((ex) => {
                const effectiveWeight = (ex.weight_kg && ex.weight_kg > 0)
                  ? ex.weight_kg
                  : (userWeight || 0)
                const vol = ex.sets * ex.reps * effectiveWeight

                return (
                  <div
                    key={ex.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 0', borderBottom: '1px solid rgba(46,46,53,0.2)',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#f2f2f7', fontSize: '13px', fontWeight: 500 }}>
                        {ex.exercise_name}
                      </span>
                      {ex.notes && (
                        <span style={{ color: '#68687a', fontSize: '11px', marginLeft: '8px' }}>
                          — {ex.notes}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#68687a', fontSize: '12px', fontFamily: 'monospace' }}>
                        {ex.sets} × {ex.reps}
                        {ex.weight_kg > 0 ? ` @ ${ex.weight_kg}kg` : ' (BW)'}
                      </span>
                      <span style={{ color: '#a8f04a', fontSize: '11px', fontFamily: 'monospace' }}>
                        {Math.round(vol)}kg
                      </span>
                      <button
                        onClick={() => onDeleteExercise(ex.id)}
                        style={{
                          width: '24px', height: '24px', borderRadius: '6px',
                          background: 'transparent', border: 'none',
                          color: '#68687a', cursor: 'pointer', fontSize: '12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.1)'; e.currentTarget.style.color = '#fb7185' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#68687a' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Session summary row */}
          <div
            style={{
              marginTop: '8px', padding: '10px 12px', borderRadius: '10px',
              background: 'rgba(168,240,74,0.05)', border: '1px solid rgba(168,240,74,0.1)',
              display: 'flex', gap: '20px', flexWrap: 'wrap',
            }}
          >
            <span style={{ color: '#68687a', fontSize: '11px', fontFamily: 'monospace' }}>
              Volume: <strong style={{ color: '#a8f04a' }}>{Math.round(effectiveVolume)} kg</strong>
            </span>
            <span style={{ color: '#68687a', fontSize: '11px', fontFamily: 'monospace' }}>
              Sets: <strong style={{ color: '#f2f2f7' }}>{session.total_sets}</strong>
            </span>
            {hasSteps && (
              <span style={{ color: '#68687a', fontSize: '11px', fontFamily: 'monospace' }}>
                Steps: <strong style={{ color: '#7dd3fc' }}>{session.total_steps.toLocaleString()}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function WorkoutsPage() {
  const { user } = useUser()
  const userWeight = user?.weight || 70 // fallback bodyweight

  // ── State ──────────────────────────────────────────────────────
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Date navigation — default to today
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const isToday = selectedDate === todayStr()

  // Form state — EXTENDED with steps, workout_type, muscle_group
  const [form, setForm] = useState({
    date: todayStr(),
    exercise_name: '',
    sets: '',
    reps: '',
    weight_kg: '',
    notes: '',
    steps: '',              // NEW
    workout_type: 'custom', // NEW
    muscle_group: '',        // NEW
    is_bodyweight: false,    // UI toggle only
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // ── Filtered suggestion ────────────────────────────────────────
  const filteredSuggestions = useMemo(() => {
    if (!form.exercise_name.trim()) return EXERCISE_SUGGESTIONS
    const q = form.exercise_name.toLowerCase()
    return EXERCISE_SUGGESTIONS.filter(s => s.name.toLowerCase().includes(q))
  }, [form.exercise_name])

  // ── Load history ───────────────────────────────────────────────
  const loadHistory = useCallback(() => {
    if (!user) return
    setLoading(true)
    getWorkoutHistory(user.id)
      .then((r) => setHistory(r.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => { loadHistory() }, [loadHistory])

  // ── Date-wise filtered sessions (STRICT date match) ────────────
  const sessionsOnDate = useMemo(() => {
    return history.filter(session => {
      // Ensure YYYY-MM-DD string comparison
      const sessionDate = typeof session.date === 'string'
        ? session.date.slice(0, 10)
        : new Date(session.date).toISOString().split('T')[0]
      return sessionDate === selectedDate
    })
  }, [history, selectedDate])

  // ── Steps stats ────────────────────────────────────────────────
  const stepsToday = useMemo(() => {
    return sessionsOnDate.reduce((sum, s) => sum + (s.total_steps || 0), 0)
  }, [sessionsOnDate])

  const stepsWeekly = useMemo(() => {
    const cutoff = addDays(todayStr(), -7)
    return history
      .filter(s => s.date >= cutoff)
      .reduce((sum, s) => sum + (s.total_steps || 0), 0)
  }, [history])

  // ── Weekly chart data (last 7 sessions) ───────────────────────
  const weeklyVolumeData = useMemo(() => {
    return history.slice(-7).map((s) => ({
      day: new Date(s.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }),
      volume: s.total_volume_kg,
      steps: s.total_steps || 0,
    }))
  }, [history])

  // ── Previous week comparison ───────────────────────────────────
  const thisWeekVolume = useMemo(() =>
    history.slice(-7).reduce((a, s) => a + s.total_volume_kg, 0), [history])
  const prevWeekVolume = useMemo(() =>
    history.slice(-14, -7).reduce((a, s) => a + s.total_volume_kg, 0), [history])

  const totalSets = sessionsOnDate.reduce((a, s) => a + s.total_sets, 0)
  const totalVolume = sessionsOnDate.reduce((a, s) => a + s.total_volume_kg, 0)

  // ── Submit ─────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.exercise_name.trim()) return setFormError('Enter exercise name.')
    if (!form.sets || parseInt(form.sets) < 1) return setFormError('Enter valid sets.')
    if (!form.reps || parseInt(form.reps) < 1) return setFormError('Enter valid reps.')

    setSubmitting(true)
    setFormError('')

    // Bodyweight fix: if weight is empty/0 and bodyweight toggle → use userWeight
    const rawWeight = form.weight_kg ? parseFloat(form.weight_kg) : null
    const effectiveWeight = form.is_bodyweight
      ? userWeight
      : rawWeight

    try {
      await logWorkout(user.id, {
        date: form.date,
        exercise_name: form.exercise_name.trim(),
        sets: parseInt(form.sets),
        reps: parseInt(form.reps),
        weight_kg: effectiveWeight,
        notes: form.notes || null,
        steps: form.steps ? parseInt(form.steps) : 0,        // NEW
        workout_type: form.workout_type || 'custom',           // NEW
        muscle_group: form.muscle_group || null,               // NEW
      })

      toast.success('Workout logged 💪')

      setForm(f => ({
        ...f,
        exercise_name: '',
        sets: '',
        reps: '',
        weight_kg: '',
        notes: '',
        steps: '',
        muscle_group: '',
        is_bodyweight: false,
      }))

      // Refresh and set date to logged date
      setSelectedDate(form.date)
      loadHistory()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete exercise ─────────────────────────────────────────────
  const handleDelete = async (workoutId) => {
    try {
      await deleteWorkout(user.id, workoutId)
      toast.success('Deleted')
      loadHistory()
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Suggestion select ─────────────────────────────────────────
  const selectSuggestion = (suggestion) => {
    setForm(f => ({
      ...f,
      exercise_name: suggestion.name,
      workout_type: suggestion.type,
      muscle_group: suggestion.muscle,
      is_bodyweight: isBodyweight(suggestion.name),
    }))
  }

  // ── Volume preview with bodyweight fix ────────────────────────
  const volumePreview = useMemo(() => {
    if (!form.sets || !form.reps) return null
    const w = form.is_bodyweight
      ? userWeight
      : (form.weight_kg ? parseFloat(form.weight_kg) : 0)
    return parseInt(form.sets) * parseInt(form.reps) * w
  }, [form.sets, form.reps, form.weight_kg, form.is_bodyweight, userWeight])

  return (
    <div className="space-y-8">

      {/* ── Page Header ── */}
      <div>
        <h1 className="font-display text-5xl tracking-widest text-text">WORKOUTS</h1>
        <p className="text-dim text-sm mt-1">Log exercises, track volume and steps</p>
      </div>

      <ErrorBanner message={error} onRetry={loadHistory} />

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Steps Today — replaces "Total Sessions" */}
        <div
          className="card flex flex-col gap-2 hover:border-muted transition-colors animate-fade-up opacity-0"
          style={{ animationFillMode: 'forwards', animationDelay: '0ms', gridColumn: 'span 2' }}
        >
          <div className="flex items-center justify-between">
            <p className="label mb-0">Steps Today</p>
            <span className="text-dim text-xs">👟</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-4xl font-bold text-lime">
              {stepsToday.toLocaleString()}
            </span>
            <span className="text-xs text-dim">steps</span>
          </div>
          {/* Progress bar toward 10k */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full bg-lime transition-all duration-700"
              style={{ width: `${Math.min(100, (stepsToday / 10000) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-dim">{Math.max(0, 10000 - stepsToday).toLocaleString()} to reach 10k goal</p>
        </div>

        {/* Weekly Steps */}
        <StatCard
          label="Weekly Steps"
          value={stepsWeekly.toLocaleString()}
          unit="steps"
          icon="📅"
          accent="ice"
          delay={100}
          sub="Last 7 days"
        />

        {/* Total Sets on selected date */}
        <StatCard
          label="Sets Today"
          value={totalSets || '--'}
          icon="◉"
          accent="lime"
          delay={200}
          sub={selectedDate === todayStr() ? 'Today' : fmtDate(selectedDate)}
        />
      </div>

      {/* ── WEEKLY VOLUME CHART ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm text-dim">Weekly Volume (kg)</h3>
          <TrendArrow current={thisWeekVolume} previous={prevWeekVolume} />
        </div>
        {weeklyVolumeData.length === 0 ? (
          <EmptyState title="No data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyVolumeData}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#68687a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#68687a' }} />
              <Tooltip
                contentStyle={{ background: '#161619', border: '1px solid #2e2e35', borderRadius: '10px', fontSize: '12px' }}
                labelStyle={{ color: '#f2f2f7' }}
              />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]} fill="#a8f04a" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid lg:grid-cols-5 gap-4">

        {/* ── LOG EXERCISE FORM ── */}
        <Card className="lg:col-span-2 h-fit">
          <h2 className="font-display text-2xl mb-5">Log Exercise</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Date */}
            <input
              type="date"
              value={form.date}
              onChange={set('date')}
              className="input-field"
              max={todayStr()}
            />

            {/* Workout Type selector */}
            <div>
              <p className="label">Workout Type</p>
              <div className="flex gap-1.5 flex-wrap">
                {WORKOUT_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, workout_type: t.value }))}
                    style={{
                      padding: '4px 10px', borderRadius: '8px', fontSize: '11px',
                      fontWeight: 600, cursor: 'pointer', border: '1px solid',
                      background: form.workout_type === t.value ? `${t.color}20` : 'transparent',
                      borderColor: form.workout_type === t.value ? `${t.color}50` : '#2e2e35',
                      color: form.workout_type === t.value ? t.color : '#68687a',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise Name with suggestions */}
            <div className="relative">
              <Input
                label="Exercise Name"
                value={form.exercise_name}
                onChange={set('exercise_name')}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />

              {showSuggestions && (
                <div className="absolute z-20 w-full bg-card border border-border rounded-xl max-h-44 overflow-y-auto shadow-xl">
                  {filteredSuggestions.map(s => (
                    <button
                      key={s.name}
                      type="button"
                      onMouseDown={() => selectSuggestion(s)}
                      className="block w-full text-left px-3 py-2 hover:bg-muted/30 text-sm"
                    >
                      <span className="text-text">{s.name}</span>
                      <span className="text-dim text-xs ml-2">{s.muscle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Muscle Group */}
            <div>
              <p className="label">Muscle Group</p>
              <select
                value={form.muscle_group}
                onChange={set('muscle_group')}
                className="input-field"
                style={{ background: 'rgba(38,38,44,0.6)' }}
              >
                <option value="">Select muscle group</option>
                {MUSCLE_GROUPS.map(mg => (
                  <option key={mg} value={mg}>{mg}</option>
                ))}
              </select>
            </div>

            {/* Sets / Reps / Weight grid */}
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" placeholder="Sets" value={form.sets} onChange={set('sets')} min="1" />
              <Input type="number" placeholder="Reps" value={form.reps} onChange={set('reps')} min="1" />
              <div>
                <input
                  type="number"
                  placeholder={form.is_bodyweight ? `BW (${userWeight}kg)` : 'Weight'}
                  value={form.weight_kg}
                  onChange={set('weight_kg')}
                  disabled={form.is_bodyweight}
                  className="input-field"
                  min="0"
                  step="0.5"
                  style={form.is_bodyweight ? { opacity: 0.4 } : {}}
                />
              </div>
            </div>

            {/* Bodyweight toggle */}
            <label
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                cursor: 'pointer', userSelect: 'none',
              }}
            >
              <div
                onClick={() => setForm(f => ({ ...f, is_bodyweight: !f.is_bodyweight, weight_kg: '' }))}
                style={{
                  width: '32px', height: '18px', borderRadius: '9px',
                  background: form.is_bodyweight ? '#a8f04a' : '#2e2e35',
                  position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  position: 'absolute', top: '2px',
                  left: form.is_bodyweight ? '14px' : '2px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: form.is_bodyweight ? '#08080a' : '#68687a',
                  transition: 'left 0.2s ease',
                }} />
              </div>
              <span className="text-xs text-dim">
                Bodyweight exercise {form.is_bodyweight ? `(using ${userWeight}kg)` : ''}
              </span>
            </label>

            {/* Volume preview */}
            {volumePreview !== null && volumePreview > 0 && (
              <div className="bg-lime/10 p-3 rounded-xl text-xs flex justify-between border border-lime/20">
                <span className="text-dim">Volume preview</span>
                <strong className="text-lime">{volumePreview.toFixed(0)} kg</strong>
              </div>
            )}

            {/* Steps — NEW FIELD */}
            <div>
              <Input
                label="Steps (optional)"
                type="number"
                placeholder="e.g. 4200"
                value={form.steps}
                onChange={set('steps')}
                min="0"
              />
              <p className="text-dim text-[11px] mt-1">Steps logged for this session / today</p>
            </div>

            <Input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={set('notes')}
            />

            <ErrorBanner message={formError} />

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Logging…' : '+ Log Exercise'}
            </Button>
          </form>
        </Card>

        {/* ── SESSION HISTORY ── */}
        <div className="lg:col-span-3 space-y-3">

          {/* Date navigation */}
          <div className="flex items-center justify-between mb-2">
            <SectionHeader title="Session History" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(d => addDays(d, -1))}
                style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: '#1c1c20', border: '1px solid #2e2e35',
                  color: '#f2f2f7', cursor: 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ‹
              </button>

              <button
                onClick={() => setSelectedDate(todayStr())}
                style={{
                  padding: '4px 10px', borderRadius: '8px', fontSize: '12px',
                  background: isToday ? 'rgba(168,240,74,0.15)' : '#1c1c20',
                  border: `1px solid ${isToday ? 'rgba(168,240,74,0.3)' : '#2e2e35'}`,
                  color: isToday ? '#a8f04a' : '#68687a', cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                {isToday ? 'Today' : fmtDate(selectedDate)}
              </button>

              <button
                onClick={() => setSelectedDate(d => addDays(d, 1))}
                disabled={isToday}
                style={{
                  width: '30px', height: '30px', borderRadius: '8px',
                  background: '#1c1c20', border: '1px solid #2e2e35',
                  color: isToday ? '#2e2e35' : '#f2f2f7',
                  cursor: isToday ? 'not-allowed' : 'pointer', fontSize: '14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ›
              </button>
            </div>
          </div>

          {/* Sessions for selected date */}
          {loading ? (
            <Card><div className="p-6 text-center text-dim text-sm">Loading…</div></Card>
          ) : sessionsOnDate.length === 0 ? (
            <Card>
              <EmptyState
                title={`No workouts on ${isToday ? 'today' : fmtDate(selectedDate)}`}
                description="Log an exercise to get started 💪"
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {sessionsOnDate.map(session => (
                <SessionCard
                  key={session.date + '-' + session.exercises[0]?.id}
                  session={session}
                  onDeleteExercise={handleDelete}
                  userWeight={userWeight}
                />
              ))}
            </div>
          )}

          {/* Show all dates summary below */}
          {history.length > 0 && (
            <div className="mt-6">
              <p className="text-dim text-xs font-mono mb-3 uppercase tracking-widest">All Sessions</p>
              <div className="space-y-2">
                {[...history].reverse().slice(0, 10).map(session => {
                  const sessionDateStr = typeof session.date === 'string'
                    ? session.date.slice(0, 10)
                    : new Date(session.date).toISOString().split('T')[0]
                  const isSelected = sessionDateStr === selectedDate

                  return (
                    <button
                      key={session.date}
                      onClick={() => setSelectedDate(sessionDateStr)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', padding: '10px 14px',
                        borderRadius: '12px', cursor: 'pointer', border: '1px solid',
                        background: isSelected ? 'rgba(168,240,74,0.08)' : 'rgba(22,22,25,0.6)',
                        borderColor: isSelected ? 'rgba(168,240,74,0.25)' : '#2e2e35',
                        transition: 'all 0.15s ease', textAlign: 'left',
                      }}
                    >
                      <div>
                        <span style={{ color: isSelected ? '#a8f04a' : '#f2f2f7', fontSize: '13px', fontWeight: 500 }}>
                          {fmtDate(sessionDateStr)}
                        </span>
                        <span style={{ color: '#68687a', fontSize: '11px', marginLeft: '8px', fontFamily: 'monospace' }}>
                          {session.exercises.length} ex
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {session.total_steps > 0 && (
                          <Badge color="ice">👟 {session.total_steps.toLocaleString()}</Badge>
                        )}
                        <Badge color="lime">{Math.round(session.total_volume_kg)}kg</Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}