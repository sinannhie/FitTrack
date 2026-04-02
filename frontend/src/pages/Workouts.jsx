import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../hooks/useUser'
import { logWorkoutSession, getWorkoutSessions, deleteWorkoutSession } from '../services/api'
import {
  Card,
  Button,
  Input,
  StatCard,
  ErrorBanner,
  EmptyState,
  SectionHeader,
  Badge,
} from '../components/UI'

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0]

const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

const uid = () => Math.random().toString(36).slice(2)

// ── Config ────────────────────────────────────────────────────────────────────

const WORKOUT_TYPES = [
  { value: 'Push',      icon: '◈', desc: 'Chest · Shoulders · Triceps', accent: 'ember'  },
  { value: 'Pull',      icon: '◉', desc: 'Back · Biceps · Rear Delts',  accent: 'ice'    },
  { value: 'Legs',      icon: '◐', desc: 'Quads · Hamstrings · Calves', accent: 'lime'   },
  { value: 'Chest',     icon: '◎', desc: 'Chest focus day',             accent: 'ember'  },
  { value: 'Back',      icon: '◈', desc: 'Back focus day',              accent: 'ice'    },
  { value: 'Full Body', icon: '◎', desc: 'Full body compound session',  accent: 'lime'   },
  { value: 'Rest Day',  icon: '—', desc: 'Recovery & rest',             accent: 'dim'    },
  { value: 'Custom',    icon: '+', desc: 'Enter your own type',         accent: 'dim'    },
]

const TYPE_STYLE = {
  Push:      { badge: 'bg-ember/10 text-ember border-ember/30',  ring: 'border-ember/40 bg-ember/5'  },
  Pull:      { badge: 'bg-ice/10 text-ice border-ice/30',        ring: 'border-ice/40 bg-ice/5'      },
  Legs:      { badge: 'bg-lime/10 text-lime border-lime/30',     ring: 'border-lime/40 bg-lime/5'    },
  Chest:     { badge: 'bg-ember/10 text-ember border-ember/30',  ring: 'border-ember/40 bg-ember/5'  },
  Back:      { badge: 'bg-ice/10 text-ice border-ice/30',        ring: 'border-ice/40 bg-ice/5'      },
  'Full Body':{ badge: 'bg-lime/10 text-lime border-lime/30',    ring: 'border-lime/40 bg-lime/5'    },
  'Rest Day': { badge: 'bg-muted/40 text-dim border-border',     ring: 'border-muted bg-muted/10'    },
  Custom:    { badge: 'bg-muted/30 text-dim border-border',      ring: 'border-muted bg-muted/10'    },
}

const getTypeStyle = (type) =>
  TYPE_STYLE[type] || { badge: 'bg-lime/10 text-lime border-lime/30', ring: 'border-lime/40 bg-lime/5' }

const EXERCISE_SUGGESTIONS = [
  // Push
  'Bench Press', 'Incline Bench Press', 'Decline Press', 'Overhead Press',
  'Lateral Raise', 'Front Raise', 'Chest Fly', 'Cable Crossover', 'Dips',
  'Tricep Pushdown', 'Skull Crusher', 'Close-Grip Bench', 'Tricep Extension',
  // Pull
  'Pull-ups', 'Chin-ups', 'Barbell Row', 'Cable Row', 'Lat Pulldown',
  'Face Pull', 'Hammer Curl', 'Bicep Curl', 'Preacher Curl', 'Reverse Curl',
  'Shrug', 'Deadlift',
  // Legs
  'Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Leg Extension',
  'Calf Raise', 'Bulgarian Split Squat', 'Hip Thrust', 'Glute Bridge',
  'Lunge', 'Step-Up',
  // Cardio / Other
  'Running', 'Cycling', 'Rowing', 'Plank', 'Burpees', 'Jump Rope',
]

// ── Builder helpers ───────────────────────────────────────────────────────────

const newSet = () => ({ _id: uid(), reps: '', weight_kg: '' })

const newExercise = () => ({ _id: uid(), name: '', sets: [newSet()] })

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeButton({ type, selected, onClick }) {
  const isSelected = selected === type.value
  return (
    <button
      type="button"
      onClick={() => onClick(type.value)}
      className={`
        relative text-left px-3 py-2.5 rounded-xl border text-xs
        transition-all duration-150 group
        ${isSelected
          ? `${getTypeStyle(type.value).ring} border-opacity-100 scale-[1.02] shadow-sm`
          : 'border-border text-dim hover:border-muted hover:bg-muted/10 hover:text-text'
        }
      `}
    >
      <div className="flex items-center gap-2">
        <span className={`font-display text-base leading-none ${isSelected ? '' : 'opacity-40'}`}>
          {type.icon}
        </span>
        <div>
          <p className={`font-semibold leading-tight ${isSelected ? 'text-text' : ''}`}>
            {type.value}
          </p>
          <p className="text-[10px] opacity-60 mt-0.5 leading-tight">{type.desc}</p>
        </div>
      </div>
      {isSelected && (
        <span className="absolute top-2 right-2 text-lime text-[10px] font-mono">✓</span>
      )}
    </button>
  )
}

function ExerciseBuilder({ exercise, exIndex, onUpdateName, onAddSet, onRemoveSet, onUpdateSet, onRemove, canRemove }) {
  const [showSug, setShowSug] = useState(false)

  const filtered = EXERCISE_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(exercise.name.toLowerCase()) && exercise.name.length > 0
  ).slice(0, 6)

  const totalVol = exercise.sets.reduce((a, s) => {
    const r = parseInt(s.reps) || 0
    const w = parseFloat(s.weight_kg) || 0
    return a + r * w
  }, 0)

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Exercise header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="w-6 h-6 bg-lime/10 border border-lime/20 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-lime text-[10px] font-display font-bold">{exIndex + 1}</span>
        </div>

        {/* Name input with autocomplete */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Exercise name…"
            value={exercise.name}
            onChange={(e) => onUpdateName(exercise._id, e.target.value)}
            onFocus={() => setShowSug(true)}
            onBlur={() => setTimeout(() => setShowSug(false), 160)}
            className="w-full bg-transparent border-none text-sm font-semibold text-text placeholder:text-dim/50 focus:outline-none"
            autoComplete="off"
          />
          {showSug && filtered.length > 0 && (
            <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {filtered.map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => { onUpdateName(exercise._id, s); setShowSug(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted/30 text-text transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {totalVol > 0 && (
          <span className="text-[10px] font-mono text-lime/70 shrink-0">
            {totalVol.toFixed(0)}kg
          </span>
        )}

        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(exercise._id)}
            className="text-dim hover:text-ember text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-ember/10 transition-all shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* Sets table */}
      <div className="px-3 pb-3 space-y-1.5">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-1 px-1">
          <div className="col-span-1 text-[9px] text-dim font-mono uppercase tracking-wider text-center">#</div>
          <div className="col-span-5 text-[9px] text-dim font-mono uppercase tracking-wider text-center">Reps</div>
          <div className="col-span-5 text-[9px] text-dim font-mono uppercase tracking-wider text-center">Weight kg</div>
          <div className="col-span-1" />
        </div>

        {exercise.sets.map((s, sIdx) => (
          <div key={s._id} className="grid grid-cols-12 gap-1 items-center">
            <div className="col-span-1 text-[11px] text-dim font-mono text-center">{sIdx + 1}</div>
            <input
              type="number"
              min="1"
              placeholder="10"
              value={s.reps}
              onChange={(e) => onUpdateSet(exercise._id, s._id, 'reps', e.target.value)}
              className="col-span-5 bg-muted/20 border border-border/60 rounded-lg px-2 py-1.5 text-xs text-center font-mono text-text focus:outline-none focus:border-lime/40 focus:bg-muted/30 transition-all"
            />
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="—"
              value={s.weight_kg}
              onChange={(e) => onUpdateSet(exercise._id, s._id, 'weight_kg', e.target.value)}
              className="col-span-5 bg-muted/20 border border-border/60 rounded-lg px-2 py-1.5 text-xs text-center font-mono text-text focus:outline-none focus:border-lime/40 focus:bg-muted/30 transition-all"
            />
            <button
              type="button"
              onClick={() => onRemoveSet(exercise._id, s._id)}
              disabled={exercise.sets.length <= 1}
              className="col-span-1 text-dim hover:text-ember text-[10px] flex items-center justify-center disabled:opacity-0 transition-all"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => onAddSet(exercise._id)}
          className="text-[11px] text-lime/60 font-mono hover:text-lime transition-colors pt-0.5 pl-1"
        >
          + add set
        </button>
      </div>
    </div>
  )
}

function SessionCard({ session, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const isToday = session.date === todayStr()
  const isRest = session.workout_type === 'Rest Day'
  const typeStyle = getTypeStyle(session.workout_type)

  return (
    <Card className={`transition-all duration-200 ${isToday ? 'border-lime/30 shadow-sm shadow-lime/5' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        {/* Left info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${typeStyle.badge}`}>
            {session.workout_type}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold">{fmtDate(session.date)}</p>
              {isToday && (
                <span className="text-[9px] bg-lime/20 text-lime px-1.5 py-0.5 rounded font-mono tracking-wider">
                  TODAY
                </span>
              )}
            </div>
            {!isRest ? (
              <p className="text-[11px] text-dim mt-0.5 font-mono">
                {session.total_exercises} exercise{session.total_exercises !== 1 ? 's' : ''}
                {' · '}
                {session.total_sets} set{session.total_sets !== 1 ? 's' : ''}
                {session.total_volume_kg > 0 && ` · ${session.total_volume_kg.toFixed(0)}kg vol`}
              </p>
            ) : (
              <p className="text-[11px] text-dim mt-0.5">Recovery day</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isRest && session.total_exercises > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-dim hover:text-text text-xs px-2 py-1 rounded-lg hover:bg-muted/30 transition-all font-mono"
              title={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
          <button
            onClick={() => onDelete(session.id)}
            className="text-dim hover:text-ember text-xs px-2 py-1 rounded-lg hover:bg-ember/10 transition-all"
            title="Delete session"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded exercises */}
      {expanded && !isRest && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {session.exercises.map((ex) => (
            <div key={ex.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-text">{ex.name}</p>
                <span className="text-[10px] font-mono text-lime/70">
                  {ex.total_volume_kg > 0 ? `${ex.total_volume_kg.toFixed(0)}kg` : ''}
                </span>
              </div>
              <div className="space-y-1">
                {ex.sets.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 text-[11px] font-mono py-1 px-2 rounded-lg hover:bg-muted/10 transition-colors"
                  >
                    <span className="w-4 text-dim/60 text-center">{idx + 1}</span>
                    <span className="text-text">{s.reps} reps</span>
                    {s.weight_kg != null && s.weight_kg > 0 ? (
                      <>
                        <span className="text-dim">@</span>
                        <span className="text-lime">{s.weight_kg}kg</span>
                        <span className="text-dim/50 ml-auto">
                          = {(s.reps * s.weight_kg).toFixed(0)}kg
                        </span>
                      </>
                    ) : (
                      <span className="text-dim ml-auto">bodyweight</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isRest && (
        <p className="text-xs text-dim mt-2 font-mono">😴 Rest & recovery — muscles grow when you rest</p>
      )}
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WorkoutsPage() {
  const { user } = useUser()

  // Session data
  const [sessions, setSessions]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  // Form state
  const [date, setDate]             = useState(todayStr())
  const [workoutType, setWorkoutType] = useState('Push')
  const [customType, setCustomType]  = useState('')
  const [exercises, setExercises]    = useState([newExercise()])
  const [submitting, setSubmitting]  = useState(false)
  const [formError, setFormError]    = useState('')

  // ── Load sessions ──────────────────────────────────────────────────────────
  const loadSessions = useCallback(() => {
    if (!user) return
    setLoading(true)
    getWorkoutSessions(user.id)
      .then((r) => setSessions(r.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => { loadSessions() }, [loadSessions])

  // ── Derived stats ──────────────────────────────────────────────────────────
  const sevenDaysAgo = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })()

  const recentSessions = sessions.filter((s) => s.date >= sevenDaysAgo)
  const activeSessions = recentSessions.filter((s) => s.workout_type !== 'Rest Day')
  const weeklyDays     = new Set(activeSessions.map((s) => s.date)).size
  const weeklyVolume   = activeSessions.reduce((a, s) => a + (s.total_volume_kg || 0), 0)
  const totalActiveSessions = sessions.filter((s) => s.workout_type !== 'Rest Day').length

  // ── Exercise builder state management ─────────────────────────────────────
  const addExercise = () => setExercises((e) => [...e, newExercise()])

  const removeExercise = (id) =>
    setExercises((e) => e.filter((ex) => ex._id !== id))

  const updateExerciseName = (id, name) =>
    setExercises((e) => e.map((ex) => ex._id === id ? { ...ex, name } : ex))

  const addSet = (exId) =>
    setExercises((e) =>
      e.map((ex) => ex._id === exId ? { ...ex, sets: [...ex.sets, newSet()] } : ex)
    )

  const removeSet = (exId, setId) =>
    setExercises((e) =>
      e.map((ex) =>
        ex._id === exId
          ? { ...ex, sets: ex.sets.filter((s) => s._id !== setId) }
          : ex
      )
    )

  const updateSet = (exId, setId, field, value) =>
    setExercises((e) =>
      e.map((ex) =>
        ex._id === exId
          ? { ...ex, sets: ex.sets.map((s) => s._id === setId ? { ...s, [field]: value } : s) }
          : ex
      )
    )

  // ── Form helpers ───────────────────────────────────────────────────────────
  const isRestDay      = workoutType === 'Rest Day'
  const effectiveType  = workoutType === 'Custom' ? customType : workoutType

  const resetForm = () => {
    setExercises([newExercise()])
    setCustomType('')
    setDate(todayStr())
    setFormError('')
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!effectiveType.trim()) return setFormError('Enter or select a workout type.')

    if (!isRestDay) {
      if (exercises.length === 0) return setFormError('Add at least one exercise.')
      for (const ex of exercises) {
        if (!ex.name.trim()) return setFormError('All exercises need a name.')
        if (ex.sets.length === 0) return setFormError('Each exercise needs at least one set.')
        for (const s of ex.sets) {
          if (!s.reps || parseInt(s.reps) < 1) {
            return setFormError(`"${ex.name || 'Exercise'}" has a set with no reps.`)
          }
        }
      }
    }

    setSubmitting(true)
    try {
      const payload = {
        date,
        workout_type: effectiveType.trim(),
        exercises: isRestDay
          ? []
          : exercises.map((ex) => ({
              name: ex.name.trim(),
              sets: ex.sets.map((s) => ({
                reps: parseInt(s.reps),
                weight_kg: s.weight_kg !== '' && s.weight_kg != null
                  ? parseFloat(s.weight_kg)
                  : null,
              })),
            })),
      }
      await logWorkoutSession(user.id, payload)
      resetForm()
      loadSessions()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (sessionId) => {
    try {
      await deleteWorkoutSession(user.id, sessionId)
      loadSessions()
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
        <h1 className="font-display text-5xl tracking-widest text-text">WORKOUTS</h1>
        <p className="text-dim text-sm mt-1">Log sessions with exercises, sets & weights</p>
      </div>

      <ErrorBanner message={error} onRetry={loadSessions} />

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Sessions"
          value={totalActiveSessions}
          icon="◈"
          accent="lime"
          delay={0}
          sub="all time"
        />
        <StatCard
          label="Weekly Days"
          value={`${weeklyDays}/7`}
          icon="◉"
          accent="ice"
          delay={100}
          sub={`${recentSessions.length - activeSessions.length} rest day${recentSessions.length - activeSessions.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          label="Weekly Volume"
          value={Math.round(weeklyVolume)}
          unit="kg"
          icon="◎"
          accent="ember"
          delay={200}
          sub="last 7 days"
        />
        <StatCard
          label="Weekly Sessions"
          value={activeSessions.length}
          icon="◐"
          accent="lime"
          delay={300}
          sub="last 7 days"
        />
      </div>

      {/* Main layout */}
      <div className="grid lg:grid-cols-5 gap-4 items-start">

        {/* ── Log Session form ────────────────────────────────────────────── */}
        <Card
          className="lg:col-span-2 animate-fade-up opacity-0 animate-delay-200"
          style={{ animationFillMode: 'forwards' }}
        >
          <h2 className="font-display text-2xl tracking-wide mb-5">Log Session</h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Date */}
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                max={todayStr()}
              />
            </div>

            {/* Workout type selector */}
            <div>
              <label className="label">Workout Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {WORKOUT_TYPES.map((t) => (
                  <TypeButton
                    key={t.value}
                    type={t}
                    selected={workoutType}
                    onClick={setWorkoutType}
                  />
                ))}
              </div>

              {/* Custom type input */}
              {workoutType === 'Custom' && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="e.g. Shoulders, HIIT, Arms…"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="input-field"
                    autoFocus
                    maxLength={80}
                  />
                </div>
              )}
            </div>

            {/* Exercises (hidden for Rest Day) */}
            {!isRestDay ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label mb-0">Exercises</label>
                  <button
                    type="button"
                    onClick={addExercise}
                    className="text-xs text-lime font-mono hover:text-lime-dark transition-colors"
                  >
                    + Add Exercise
                  </button>
                </div>

                {exercises.map((ex, idx) => (
                  <ExerciseBuilder
                    key={ex._id}
                    exercise={ex}
                    exIndex={idx}
                    onUpdateName={updateExerciseName}
                    onAddSet={addSet}
                    onRemoveSet={removeSet}
                    onUpdateSet={updateSet}
                    onRemove={removeExercise}
                    canRemove={exercises.length > 1}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-muted/20 border border-border rounded-xl p-5 text-center space-y-2">
                <p className="text-3xl">😴</p>
                <p className="text-sm font-medium">Rest Day</p>
                <p className="text-xs text-dim">Recovery is part of the process. No exercises needed.</p>
              </div>
            )}

            <ErrorBanner message={formError} />

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Logging…' : '+ Log Session'}
            </Button>
          </form>
        </Card>

        {/* ── Session History ──────────────────────────────────────────────── */}
        <div
          className="lg:col-span-3 animate-fade-up opacity-0 animate-delay-300 space-y-3"
          style={{ animationFillMode: 'forwards' }}
        >
          <SectionHeader title="Session History" />

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-border border-t-lime rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <Card>
              <EmptyState
                icon="◉"
                title="No sessions yet"
                description="Log your first workout session using the form."
              />
            </Card>
          ) : (
            <>
              {/* Group header for today if present */}
              {sessions.some((s) => s.date === todayStr()) && (
                <p className="text-[10px] text-lime font-mono uppercase tracking-widest px-1">
                  ● Today
                </p>
              )}
              {sessions.map((session, idx) => {
                const prevDate = idx > 0 ? sessions[idx - 1].date : null
                const showDivider =
                  prevDate &&
                  prevDate !== session.date &&
                  session.date !== todayStr() &&
                  sessions[idx - 1].date !== todayStr()

                return (
                  <div key={session.id}>
                    {showDivider && session.date < sevenDaysAgo && idx > 0 &&
                      sessions[idx - 1].date >= sevenDaysAgo && (
                      <p className="text-[10px] text-dim font-mono uppercase tracking-widest px-1 mt-2">
                        Earlier
                      </p>
                    )}
                    <SessionCard session={session} onDelete={handleDelete} />
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}