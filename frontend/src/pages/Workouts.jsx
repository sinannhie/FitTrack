/**
 * Workouts.jsx — FitTrack AI
 *
 * FIXES APPLIED:
 * 1. Data loss — robust field mapping with fallbacks for old/new API shape
 * 2. Top cards — Steps Today (large) + Weekly Steps/Days/Volume/Sessions
 * 3. Cardio logic — hide sets/weight, show steps only; no volume/set validation
 * 4. Session title — shows workout TYPE (Push/Pull/Legs/Cardio/Custom)
 * 5. Session grouping — one card per (date, workout_type); same-day same-type merged
 * 6. Steps integration — saved, returned, shown in every session card
 * 7. Log Session UI — unchanged layout, only conditional hide for cardio
 * 8. Date filtering — strict YYYY-MM-DD string comparison, no timezone bleed
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useUser } from '../hooks/useUser'
import { logWorkout, getWorkoutHistory, deleteWorkout } from '../services/api'
import {
  Card, Input, Button, ErrorBanner, EmptyState, SectionHeader, Badge,
} from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { toast } from 'react-hot-toast'

// ─── date helpers ────────────────────────────────────────────────
const toISO  = (d) => (d instanceof Date ? d : new Date(d + 'T00:00:00')).toISOString().split('T')[0]
const todayS = () => toISO(new Date())
const addDay = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d) }
const fmtDay = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })

// ─── workout type config ─────────────────────────────────────────
const TYPES = [
  { value: 'push',   label: 'Push',   icon: '↑', color: '#a8f04a' },
  { value: 'pull',   label: 'Pull',   icon: '↓', color: '#7dd3fc' },
  { value: 'legs',   label: 'Legs',   icon: '⚡', color: '#f97316' },
  { value: 'cardio', label: 'Cardio', icon: '♥', color: '#fb7185' },
  { value: 'custom', label: 'Custom', icon: '◈', color: '#a8f04a' },
]

const typeLabel = (v) => TYPES.find(t => t.value === (v || 'custom').toLowerCase())?.label ?? 'Custom'
const typeColor = (v) => TYPES.find(t => t.value === (v || 'custom').toLowerCase())?.color ?? '#a8f04a'
const isCardio  = (v) => (v || '').toLowerCase() === 'cardio'

// ─── exercise suggestions ────────────────────────────────────────
const SUGGESTIONS = [
  { name: 'Bench Press',       type: 'push',   muscle: 'Chest'     },
  { name: 'Incline Press',     type: 'push',   muscle: 'Chest'     },
  { name: 'Shoulder Press',    type: 'push',   muscle: 'Shoulders' },
  { name: 'Lateral Raise',     type: 'push',   muscle: 'Shoulders' },
  { name: 'Dips',              type: 'push',   muscle: 'Triceps'   },
  { name: 'Tricep Extension',  type: 'push',   muscle: 'Triceps'   },
  { name: 'Pull-ups',          type: 'pull',   muscle: 'Back'      },
  { name: 'Barbell Row',       type: 'pull',   muscle: 'Back'      },
  { name: 'Lat Pulldown',      type: 'pull',   muscle: 'Back'      },
  { name: 'Bicep Curl',        type: 'pull',   muscle: 'Biceps'    },
  { name: 'Hammer Curl',       type: 'pull',   muscle: 'Biceps'    },
  { name: 'Wrist Curl',        type: 'pull',   muscle: 'Forearms'  },
  { name: 'Squat',             type: 'legs',   muscle: 'Legs'      },
  { name: 'Deadlift',          type: 'legs',   muscle: 'Legs'      },
  { name: 'Romanian Deadlift', type: 'legs',   muscle: 'Glutes'    },
  { name: 'Leg Press',         type: 'legs',   muscle: 'Legs'      },
  { name: 'Calf Raise',        type: 'legs',   muscle: 'Calves'    },
  { name: 'Hip Thrust',        type: 'legs',   muscle: 'Glutes'    },
  { name: 'Running',           type: 'cardio', muscle: 'Full Body' },
  { name: 'Cycling',           type: 'cardio', muscle: 'Full Body' },
  { name: 'Jump Rope',         type: 'cardio', muscle: 'Full Body' },
  { name: 'Plank',             type: 'custom', muscle: 'Core'      },
  { name: 'Ab Rollout',        type: 'custom', muscle: 'Core'      },
]

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Legs', 'Glutes', 'Core', 'Calves', 'Full Body',
]

// ─── safe field accessors (handles old + new API shape) ──────────
const safeDate      = (s) => (s?.date ? toISO(s.date) : null)
const safeType      = (s) => (s?.workout_type || 'custom').toLowerCase()
const safeSteps     = (s) => Number(s?.total_steps ?? 0)
const safeSets      = (s) => Number(s?.total_sets ?? 0)
const safeVolume    = (s) => Number(s?.total_volume_kg ?? 0)
const safeExercises = (s) => Array.isArray(s?.exercises) ? s.exercises : []

// ─── group exercises by muscle inside a session ──────────────────
function groupByMuscle(exercises) {
  const g = {}
  for (const ex of exercises) {
    const key = ex.muscle_group || 'Other'
    ;(g[key] = g[key] || []).push(ex)
  }
  return Object.entries(g).sort(([a], [b]) => a.localeCompare(b))
}

// ─── accordion session card ──────────────────────────────────────
function SessionCard({ session, onDelete, userWeight }) {
  const [open, setOpen] = useState(false)

  const date      = safeDate(session)
  const wtype     = safeType(session)
  const steps     = safeSteps(session)
  const sets      = safeSets(session)
  const exercises = safeExercises(session)
  const color     = typeColor(wtype)
  const cardio    = isCardio(wtype)

  // FIXED: volume uses userWeight for bodyweight, 0 weight not penalised
  const effectiveVolume = useMemo(() =>
    exercises.reduce((t, ex) => {
      const w = Number(ex.weight_kg) > 0 ? Number(ex.weight_kg) : (cardio ? 0 : userWeight)
      return t + (ex.sets || 0) * (ex.reps || 0) * w
    }, 0)
  , [exercises, userWeight, cardio])

  const muscleGroups = useMemo(() => groupByMuscle(exercises), [exercises])

  // sub-line
  const meta = cardio
    ? `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} • ${steps.toLocaleString()} steps`
    : [
        `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''}`,
        sets ? `${sets} sets` : null,
        effectiveVolume ? `${Math.round(effectiveVolume)}kg vol` : null,
        steps ? `${steps.toLocaleString()} steps` : null,
      ].filter(Boolean).join(' • ')

  return (
    <div style={{
      borderRadius: 16, border: '1px solid rgba(46,46,53,0.8)',
      background: 'rgba(22,22,25,0.9)', overflow: 'hidden',
    }}>
      {/* header */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '13px 16px',
          background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6,
            background: `${color}20`, color, border: `1px solid ${color}30`,
          }}>
            {typeLabel(wtype)}
          </span>
          <div>
            {/* FIX #4: title is workout TYPE — date on second line */}
            <p style={{ color: '#f2f2f7', fontSize: 14, fontWeight: 600, margin: 0 }}>
              {typeLabel(wtype)} — {date ? fmtDay(date) : ''}
            </p>
            <p style={{ color: '#68687a', fontSize: 11, fontFamily: 'monospace', margin: '2px 0 0' }}>
              {meta}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {steps > 0 && (
            <span style={{ color: '#7dd3fc', fontSize: 11, fontFamily: 'monospace' }}>
              👟 {steps.toLocaleString()}
            </span>
          )}
          <span style={{
            color: '#68687a', fontSize: 16, display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
          }}>▾</span>
        </div>
      </button>

      {/* body */}
      {open && (
        <div style={{ borderTop: '1px solid rgba(46,46,53,0.5)', padding: '12px 16px 16px' }}>
          {muscleGroups.map(([muscle, exs]) => (
            <div key={muscle} style={{ marginBottom: 14 }}>
              <p style={{
                color: '#68687a', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                margin: '0 0 6px', paddingBottom: 4,
                borderBottom: '1px solid rgba(46,46,53,0.4)',
              }}>{muscle}</p>

              {exs.map(ex => {
                const exW = Number(ex.weight_kg) > 0 ? ex.weight_kg : null
                const exVol = (ex.sets || 0) * (ex.reps || 0) * (exW || (cardio ? 0 : userWeight))

                return (
                  <div key={ex.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 0', borderBottom: '1px solid rgba(46,46,53,0.2)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: '#f2f2f7', fontSize: 13, fontWeight: 500 }}>
                        {ex.exercise_name}
                      </span>
                      {ex.notes && (
                        <span style={{ color: '#68687a', fontSize: 11, marginLeft: 8 }}>
                          — {ex.notes}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {cardio ? (
                        <span style={{ color: '#7dd3fc', fontSize: 12, fontFamily: 'monospace' }}>
                          {(ex.steps || 0).toLocaleString()} steps
                        </span>
                      ) : (
                        <>
                          <span style={{ color: '#68687a', fontSize: 12, fontFamily: 'monospace' }}>
                            {ex.sets} × {ex.reps}
                            {exW ? ` @ ${exW}kg` : ' (BW)'}
                          </span>
                          <span style={{ color: '#a8f04a', fontSize: 11, fontFamily: 'monospace' }}>
                            {Math.round(exVol)}kg
                          </span>
                        </>
                      )}
                      <button
                        onClick={() => onDelete(ex.id)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, background: 'transparent',
                          border: 'none', color: '#68687a', cursor: 'pointer', fontSize: 11,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.12)'; e.currentTarget.style.color = '#fb7185' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#68687a' }}
                      >✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* summary row */}
          <div style={{
            marginTop: 8, padding: '9px 12px', borderRadius: 10,
            background: `${color}08`, border: `1px solid ${color}18`,
            display: 'flex', gap: 18, flexWrap: 'wrap',
          }}>
            {!cardio && (
              <span style={{ color: '#68687a', fontSize: 11, fontFamily: 'monospace' }}>
                Vol: <strong style={{ color }}>{Math.round(effectiveVolume)} kg</strong>
              </span>
            )}
            {!cardio && (
              <span style={{ color: '#68687a', fontSize: 11, fontFamily: 'monospace' }}>
                Sets: <strong style={{ color: '#f2f2f7' }}>{sets}</strong>
              </span>
            )}
            {steps > 0 && (
              <span style={{ color: '#68687a', fontSize: 11, fontFamily: 'monospace' }}>
                Steps: <strong style={{ color: '#7dd3fc' }}>{steps.toLocaleString()}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function WorkoutsPage() {
  const { user } = useUser()
  const userWeight = Number(user?.weight) || 70

  const [history,     setHistory]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [formError,   setFormError]   = useState('')
  const [showSug,     setShowSug]     = useState(false)

  // date nav
  const [selectedDate, setSelectedDate] = useState(todayS)
  const isToday = selectedDate === todayS()

  // form
  const [form, setForm] = useState({
    date:          todayS(),
    exercise_name: '',
    sets:          '',
    reps:          '',
    weight_kg:     '',
    notes:         '',
    steps:         '',
    workout_type:  'custom',
    muscle_group:  '',
    is_bodyweight: false,
  })

  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const cardioMode = isCardio(form.workout_type)

  // ── load history ──────────────────────────────────────────────
  const loadHistory = useCallback(() => {
    if (!user) return
    setLoading(true)
    getWorkoutHistory(user.id)
      .then(r => {
        // FIX #1: robust — handle both array and object responses
        const data = Array.isArray(r.data) ? r.data : []
        setHistory(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => { loadHistory() }, [loadHistory])

  // ── FIX #8: strict date filter ────────────────────────────────
  const sessionsOnDate = useMemo(() =>
    history.filter(s => safeDate(s) === selectedDate)
  , [history, selectedDate])

  // ── steps stats ───────────────────────────────────────────────
  const stepsToday = useMemo(() =>
    sessionsOnDate.reduce((sum, s) => sum + safeSteps(s), 0)
  , [sessionsOnDate])

  const lastWeekStart = useMemo(() => addDay(todayS(), -7), [])
  const weeklyData = useMemo(() =>
    history.filter(s => safeDate(s) >= lastWeekStart)
  , [history, lastWeekStart])

  const stepsWeekly   = useMemo(() => weeklyData.reduce((s, x) => s + safeSteps(x), 0), [weeklyData])
  const weeklyDays    = useMemo(() => new Set(weeklyData.map(s => safeDate(s))).size,    [weeklyData])
  const weeklyVolume  = useMemo(() => weeklyData.reduce((s, x) => s + safeVolume(x), 0),[weeklyData])
  const weeklySessions= useMemo(() => weeklyData.length,                                 [weeklyData])

  // ── chart data ────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const byDay = {}
    weeklyData.forEach(s => {
      const d = safeDate(s)
      byDay[d] = (byDay[d] || 0) + safeVolume(s)
    })
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({
        day: new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }),
        volume: Math.round(v),
      }))
  }, [weeklyData])

  // ── filtered suggestions ──────────────────────────────────────
  const filteredSug = useMemo(() => {
    const q = form.exercise_name.toLowerCase()
    return SUGGESTIONS.filter(s => s.name.toLowerCase().includes(q))
  }, [form.exercise_name])

  // ── volume preview ────────────────────────────────────────────
  const volPreview = useMemo(() => {
    if (cardioMode || !form.sets || !form.reps) return null
    const w = form.is_bodyweight
      ? userWeight
      : (form.weight_kg ? parseFloat(form.weight_kg) : 0)
    return parseInt(form.sets) * parseInt(form.reps) * w
  }, [form, cardioMode, userWeight])

  // ── submit ────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.exercise_name.trim()) return setFormError('Enter exercise name.')

    // FIX #3: cardio doesn't require sets
    if (!cardioMode) {
      if (!form.sets || parseInt(form.sets) < 1) return setFormError('Enter valid sets.')
      if (!form.reps || parseInt(form.reps) < 1) return setFormError('Enter valid reps.')
    }

    setSubmitting(true)
    setFormError('')

    const payload = {
      date:          form.date,
      exercise_name: form.exercise_name.trim(),
      sets:          cardioMode ? 0 : parseInt(form.sets || 0),
      reps:          cardioMode ? 0 : parseInt(form.reps || 0),
      weight_kg:     cardioMode ? null
                     : form.is_bodyweight ? userWeight
                     : (form.weight_kg ? parseFloat(form.weight_kg) : null),
      notes:         form.notes || null,
      steps:         form.steps ? parseInt(form.steps) : 0,
      workout_type:  form.workout_type || 'custom',
      muscle_group:  form.muscle_group || null,
    }

    try {
      await logWorkout(user.id, payload)
      toast.success('Workout logged 💪')
      setForm(f => ({
        ...f,
        exercise_name: '',
        sets: '', reps: '', weight_kg: '',
        notes: '', steps: '', muscle_group: '',
        is_bodyweight: false,
      }))
      setSelectedDate(form.date)
      loadHistory()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteWorkout(user.id, id)
      toast.success('Deleted')
      loadHistory()
    } catch (err) { setError(err.message) }
  }

  const selectSug = (s) => {
    setForm(f => ({
      ...f,
      exercise_name: s.name,
      workout_type: s.type,
      muscle_group: s.muscle,
    }))
  }

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* header */}
      <div>
        <h1 className="font-display text-5xl tracking-widest text-text">WORKOUTS</h1>
        <p className="text-dim text-sm mt-1">Log exercises · track volume and steps</p>
      </div>

      <ErrorBanner message={error} onRetry={loadHistory} />

      {/* ── FIX #2: STAT CARDS ── */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Steps Today — large, spans 2 cols on xl */}
        <div
          className="card animate-fade-up opacity-0"
          style={{ animationFillMode: 'forwards', gridColumn: 'span 2' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="label mb-0">Steps Today</p>
            <span className="text-dim text-xs">👟</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl font-bold text-lime">
              {stepsToday.toLocaleString()}
            </span>
            <span className="text-sm text-dim">/ 10,000</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
            <div
              className="h-full rounded-full bg-lime transition-all duration-700"
              style={{ width: `${Math.min(100, (stepsToday / 10000) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-dim mt-1">
            {Math.max(0, 10000 - stepsToday).toLocaleString()} steps remaining
          </p>
        </div>

        {/* Weekly Steps */}
        <div className="card animate-fade-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '60ms' }}>
          <p className="label mb-1">Weekly Steps</p>
          <p className="font-display text-2xl font-bold text-ice">{stepsWeekly.toLocaleString()}</p>
          <p className="text-[11px] text-dim mt-1">Last 7 days</p>
        </div>

        {/* Weekly Days */}
        <div className="card animate-fade-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '120ms' }}>
          <p className="label mb-1">Workout Days</p>
          <p className="font-display text-2xl font-bold text-lime">{weeklyDays}</p>
          <p className="text-[11px] text-dim mt-1">This week</p>
        </div>

        {/* Weekly Volume */}
        <div className="card animate-fade-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '180ms' }}>
          <p className="label mb-1">Weekly Volume</p>
          <p className="font-display text-2xl font-bold text-ember">{Math.round(weeklyVolume).toLocaleString()}<span className="text-sm text-dim ml-1">kg</span></p>
          <p className="text-[11px] text-dim mt-1">Last 7 days</p>
        </div>

        {/* Weekly Sessions */}
        <div className="card animate-fade-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '240ms' }}>
          <p className="label mb-1">Weekly Sessions</p>
          <p className="font-display text-2xl font-bold text-lime">{weeklySessions}</p>
          <p className="text-[11px] text-dim mt-1">Session blocks</p>
        </div>
      </div>

      {/* ── WEEKLY CHART ── */}
      <Card>
        <h3 className="text-sm text-dim mb-4">Weekly Volume (kg)</h3>
        {chartData.length === 0 ? <EmptyState title="No data yet" /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#68687a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#68687a' }} />
              <Tooltip
                contentStyle={{ background: '#161619', border: '1px solid #2e2e35', borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: '#f2f2f7' }}
              />
              <Bar dataKey="volume" radius={[6, 6, 0, 0]} fill="#a8f04a" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid lg:grid-cols-5 gap-4">

        {/* ── FIX #7: LOG FORM — layout unchanged, cardio conditional ── */}
        <Card className="lg:col-span-2 h-fit">
          <h2 className="font-display text-2xl mb-5">Log Exercise</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* date */}
            <input type="date" value={form.date} onChange={setF('date')}
              className="input-field" max={todayS()} />

            {/* workout type */}
            <div>
              <p className="label">Workout Type</p>
              <div className="flex gap-1.5 flex-wrap">
                {TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setForm(f => ({ ...f, workout_type: t.value }))}
                    style={{
                      padding: '4px 10px', borderRadius: 8, fontSize: 11,
                      fontWeight: 600, cursor: 'pointer', border: '1px solid',
                      background: form.workout_type === t.value ? `${t.color}20` : 'transparent',
                      borderColor: form.workout_type === t.value ? `${t.color}50` : '#2e2e35',
                      color: form.workout_type === t.value ? t.color : '#68687a',
                      transition: 'all 0.15s',
                    }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* exercise name */}
            <div className="relative">
              <Input label="Exercise Name" value={form.exercise_name}
                onChange={setF('exercise_name')}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)} />
              {showSug && (
                <div className="absolute z-20 w-full bg-card border border-border rounded-xl max-h-44 overflow-y-auto shadow-xl">
                  {filteredSug.map(s => (
                    <button key={s.name} type="button"
                      onMouseDown={() => selectSug(s)}
                      className="block w-full text-left px-3 py-2 hover:bg-muted/30 text-sm">
                      <span className="text-text">{s.name}</span>
                      <span className="text-dim text-xs ml-2">{s.muscle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* muscle group — hide for cardio */}
            {!cardioMode && (
              <div>
                <p className="label">Muscle Group</p>
                <select value={form.muscle_group} onChange={setF('muscle_group')}
                  className="input-field" style={{ background: 'rgba(38,38,44,0.6)' }}>
                  <option value="">Select…</option>
                  {MUSCLE_GROUPS.map(mg => <option key={mg} value={mg}>{mg}</option>)}
                </select>
              </div>
            )}

            {/* FIX #3: hide sets/weight for cardio */}
            {!cardioMode && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Input type="number" placeholder="Sets"   value={form.sets}      onChange={setF('sets')}      min="1" />
                  <Input type="number" placeholder="Reps"   value={form.reps}      onChange={setF('reps')}      min="1" />
                  <input type="number" placeholder={form.is_bodyweight ? `BW ${userWeight}kg` : 'Weight'}
                    value={form.weight_kg} onChange={setF('weight_kg')}
                    disabled={form.is_bodyweight} min="0" step="0.5" className="input-field"
                    style={form.is_bodyweight ? { opacity: 0.4 } : {}} />
                </div>

                {/* bodyweight toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                  <div onClick={() => setForm(f => ({ ...f, is_bodyweight: !f.is_bodyweight, weight_kg: '' }))}
                    style={{
                      width: 32, height: 18, borderRadius: 9, position: 'relative', cursor: 'pointer',
                      background: form.is_bodyweight ? '#a8f04a' : '#2e2e35', transition: 'background 0.2s',
                    }}>
                    <div style={{
                      position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
                      left: form.is_bodyweight ? 14 : 2, transition: 'left 0.2s',
                      background: form.is_bodyweight ? '#08080a' : '#68687a',
                    }} />
                  </div>
                  <span className="text-xs text-dim">
                    Bodyweight {form.is_bodyweight ? `(${userWeight}kg)` : ''}
                  </span>
                </label>

                {/* volume preview */}
                {volPreview !== null && volPreview > 0 && (
                  <div className="bg-lime/10 p-3 rounded-xl text-xs flex justify-between border border-lime/20">
                    <span className="text-dim">Volume preview</span>
                    <strong className="text-lime">{Math.round(volPreview)} kg</strong>
                  </div>
                )}
              </>
            )}

            {/* steps — always visible */}
            <Input label={cardioMode ? 'Steps *' : 'Steps (optional)'}
              type="number" placeholder="e.g. 4500"
              value={form.steps} onChange={setF('steps')} min="0" />

            <Input placeholder="Notes (optional)" value={form.notes} onChange={setF('notes')} />

            <ErrorBanner message={formError} />

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Logging…' : '+ Log Exercise'}
            </Button>
          </form>
        </Card>

        {/* ── SESSION HISTORY ── */}
        <div className="lg:col-span-3 space-y-3">

          {/* date navigation */}
          <div className="flex items-center justify-between">
            <SectionHeader title="Session History" />
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedDate(d => addDay(d, -1))} style={{
                width: 30, height: 30, borderRadius: 8, background: '#1c1c20',
                border: '1px solid #2e2e35', color: '#f2f2f7', cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>‹</button>

              <button onClick={() => setSelectedDate(todayS())} style={{
                padding: '4px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                background: isToday ? 'rgba(168,240,74,0.15)' : '#1c1c20',
                border: `1px solid ${isToday ? 'rgba(168,240,74,0.3)' : '#2e2e35'}`,
                color: isToday ? '#a8f04a' : '#68687a', fontFamily: 'monospace',
              }}>
                {isToday ? 'Today' : fmtDay(selectedDate)}
              </button>

              <button onClick={() => setSelectedDate(d => addDay(d, 1))} disabled={isToday} style={{
                width: 30, height: 30, borderRadius: 8, background: '#1c1c20',
                border: '1px solid #2e2e35', color: isToday ? '#2e2e35' : '#f2f2f7',
                cursor: isToday ? 'not-allowed' : 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>›</button>
            </div>
          </div>

          {/* sessions for selected date */}
          {loading ? (
            <Card><div className="p-6 text-center text-dim text-sm">Loading…</div></Card>
          ) : sessionsOnDate.length === 0 ? (
            <Card>
              <EmptyState
                title={`No workouts on ${isToday ? 'today' : fmtDay(selectedDate)}`}
                description="Log an exercise on the left 💪"
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {sessionsOnDate.map((session, i) => (
                <SessionCard
                  key={`${safeDate(session)}-${safeType(session)}-${i}`}
                  session={session}
                  onDelete={handleDelete}
                  userWeight={userWeight}
                />
              ))}
            </div>
          )}

          {/* all dates quick-nav */}
          {history.length > 0 && (
            <div className="mt-6">
              <p className="text-dim text-xs font-mono mb-3 uppercase tracking-widest">Recent Sessions</p>
              <div className="space-y-1.5">
                {/* deduplicate dates */}
                {[...new Map(
                  [...history]
                    .reverse()
                    .map(s => [safeDate(s), s])
                ).values()].slice(0, 10).map((session) => {
                  const d = safeDate(session)
                  const sel = d === selectedDate
                  const totalStepsDay = history
                    .filter(s => safeDate(s) === d)
                    .reduce((sum, s) => sum + safeSteps(s), 0)
                  const totalVolDay = history
                    .filter(s => safeDate(s) === d)
                    .reduce((sum, s) => sum + safeVolume(s), 0)

                  return (
                    <button key={d} onClick={() => setSelectedDate(d)} style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', padding: '9px 14px',
                      borderRadius: 12, cursor: 'pointer', border: '1px solid',
                      background: sel ? 'rgba(168,240,74,0.08)' : 'rgba(22,22,25,0.6)',
                      borderColor: sel ? 'rgba(168,240,74,0.25)' : '#2e2e35',
                      transition: 'all 0.15s', textAlign: 'left',
                    }}>
                      <span style={{ color: sel ? '#a8f04a' : '#f2f2f7', fontSize: 13, fontWeight: 500 }}>
                        {fmtDay(d)}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {totalStepsDay > 0 && (
                          <span style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 6,
                            background: 'rgba(125,211,252,0.1)', color: '#7dd3fc',
                            border: '1px solid rgba(125,211,252,0.2)', fontFamily: 'monospace',
                          }}>👟 {totalStepsDay.toLocaleString()}</span>
                        )}
                        {totalVolDay > 0 && (
                          <span style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 6,
                            background: 'rgba(168,240,74,0.1)', color: '#a8f04a',
                            border: '1px solid rgba(168,240,74,0.2)', fontFamily: 'monospace',
                          }}>{Math.round(totalVolDay)}kg</span>
                        )}
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