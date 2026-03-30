import { useState, useEffect, useRef } from 'react'
import { useUser } from '../hooks/useUser'
import { Input, Button, ErrorBanner } from '../components/UI'

const GOALS = [
  { value: 'fat_loss',    label: 'Fat Loss',           icon: '🔻', desc: 'Burn fat, stay lean'     },
  { value: 'muscle_gain', label: 'Muscle Gain (Bulk)', icon: '🔺', desc: 'Build size and strength' },
  { value: 'maintain',    label: 'Maintain',           icon: '⚖️', desc: 'Stay at current weight'  },
]

function calcCalories({ weight, height, age, goal }) {
  if (!weight || !height || !age) return null
  const bmr  = 10 * parseFloat(weight) + 6.25 * parseFloat(height) - 5 * parseFloat(age) + 5
  const tdee = bmr * 1.4
  if (goal === 'fat_loss')    return Math.round(tdee - 400)
  if (goal === 'muscle_gain') return Math.round(tdee + 300)
  return Math.round(tdee)
}

function isStep1Valid(form) {
  return (
    form.name.trim().length > 0 &&
    form.age    >= 10  && form.age    <= 120 &&
    form.height >= 100 && form.height <= 250 &&
    form.weight >= 30  && form.weight <= 300
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4 inline-block mr-2" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

export default function Setup() {
  const { login, loginAsExisting } = useUser()

  // ✅ FIX: Check if there's a returning user cached
  const [returningUser, setReturningUser] = useState(null)
  const [showNewUserForm, setShowNewUserForm] = useState(false)

  useEffect(() => {
    try {
      const cached = localStorage.getItem('fittrack_user_cache')
      if (cached) setReturningUser(JSON.parse(cached))
    } catch {
      setReturningUser(null)
    }
  }, [])

  const [step, setStep]       = useState(1)
  const [visible, setVisible] = useState(true)
  const [form, setForm]       = useState({
    name: '', age: '', height: '', weight: '',
    goal: 'maintain', target_weight: '',
  })
  const [touched, setTouched]   = useState({})
  const [calories, setCalories] = useState(null)
  const [calFlash, setCalFlash] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const prevCal = useRef(null)

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setTouched((t) => ({ ...t, [k]: true }))
  }

  const setGoal = (v) => setForm((f) => ({ ...f, goal: v }))

  useEffect(() => {
    const c = calcCalories(form)
    if (c !== prevCal.current) {
      setCalories(c)
      if (c) {
        setCalFlash(true)
        setTimeout(() => setCalFlash(false), 600)
      }
      prevCal.current = c
    }
  }, [form.weight, form.height, form.age, form.goal])

  const goToStep = (n) => {
    setVisible(false)
    setTimeout(() => { setStep(n); setVisible(true) }, 220)
  }

  const handleNext = (e) => {
    e.preventDefault()
    setError('')
    setTouched({ name: true, age: true, height: true, weight: true })
    if (!isStep1Valid(form)) return setError('Please fill all fields correctly.')
    goToStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.goal !== 'maintain' && !form.target_weight)
      return setError('Please enter your target weight.')
    if (!calories) return setError('Could not calculate calories. Check your info.')
    setLoading(true)
    try {
      await login({
        name:          form.name.trim(),
        age:           parseInt(form.age),
        height:        parseFloat(form.height),
        weight:        parseFloat(form.weight),
        goal:          form.goal,
        target_weight: form.target_weight ? parseFloat(form.target_weight) : null,
        calorie_goal:  calories,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ✅ FIX: Continue as returning user — restore from cache without creating new account
  const handleContinue = async () => {
    setLoading(true)
    setError('')
    try {
      await loginAsExisting(returningUser.id)
    } catch (err) {
      setError('Could not restore your session. Please create a new profile.')
      setReturningUser(null)
      localStorage.removeItem('fittrack_user_cache')
      localStorage.removeItem('fittrack_user_id')
    } finally {
      setLoading(false)
    }
  }

  const invalid = (k) => {
    if (!touched[k]) return false
    if (k === 'name')   return !form.name.trim()
    if (k === 'age')    return !form.age    || form.age    < 10  || form.age    > 120
    if (k === 'height') return !form.height || form.height < 100 || form.height > 250
    if (k === 'weight') return !form.weight || form.weight < 30  || form.weight > 300
    return false
  }

  const inputClass  = (k) => invalid(k) ? 'border-red-500 focus:ring-red-500/30' : ''
  const step1Valid  = isStep1Valid(form)

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(#C8F135 1px, transparent 1px), linear-gradient(90deg, #C8F135 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative">

        {/* Header */}
        <div className="text-center mb-8 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-lime rounded-2xl flex items-center justify-center shadow-lg shadow-lime/20">
              <span className="text-void text-xl font-display">FT</span>
            </div>
          </div>
          <h1 className="font-display text-6xl tracking-widest text-text mb-2">FITTRACK AI</h1>
          <p className="text-dim text-sm font-body">Your intelligent fitness companion.</p>
        </div>

        {/* ✅ FIX: Returning user card — shown INSTEAD of onboarding form */}
        {returningUser && !showNewUserForm ? (
          <div
            className="card border-muted"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.22s ease' }}
          >
            <h2 className="font-display text-2xl tracking-wide mb-1">Welcome back!</h2>
            <p className="text-dim text-xs font-body mb-6">We found your previous profile.</p>

            {/* User summary */}
            <div className="rounded-xl border border-lime/20 bg-lime/5 px-4 py-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-lime/20 rounded-full flex items-center justify-center">
                  <span className="text-lime font-display text-lg">
                    {returningUser.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div>
                  <p className="text-text font-semibold font-body">{returningUser.name}</p>
                  <p className="text-dim text-xs font-mono">ID #{returningUser.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-void/50 rounded-lg p-2">
                  <p className="text-lime font-display text-lg">
                    {returningUser.weight ?? returningUser.weight_kg ?? '—'}
                  </p>
                  <p className="text-dim text-[10px] font-mono">kg</p>
                </div>
                <div className="bg-void/50 rounded-lg p-2">
                  <p className="text-lime font-display text-lg">
                    {returningUser.calorie_goal ?? '—'}
                  </p>
                  <p className="text-dim text-[10px] font-mono">kcal goal</p>
                </div>
                <div className="bg-void/50 rounded-lg p-2">
                  <p className="text-lime font-display text-lg capitalize text-sm">
                    {returningUser.goal?.replace('_', ' ') ?? '—'}
                  </p>
                  <p className="text-dim text-[10px] font-mono">goal</p>
                </div>
              </div>
            </div>

            <ErrorBanner message={error} />

            <Button
              onClick={handleContinue}
              disabled={loading}
              className="w-full mb-3"
            >
              {loading ? <><LoadingSpinner />Restoring…</> : `Continue as ${returningUser.name} →`}
            </Button>

            <button
              type="button"
              onClick={() => setShowNewUserForm(true)}
              className="w-full text-center text-dim text-xs font-body py-2
                hover:text-lime transition-colors duration-200"
            >
              + Create a new profile instead
            </button>
          </div>

        ) : (
          <>
            {/* Step indicator — only shown for new user form */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {[{ n: 1, label: 'Your Info' }, { n: 2, label: 'Your Goal' }].map(({ n, label }, i) => (
                <div key={n} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        n === step ? 'w-10 bg-lime shadow-sm shadow-lime/50'
                        : n < step  ? 'w-6 bg-lime/50'
                        : 'w-6 bg-muted'
                      }`}
                    />
                    <span className={`text-[10px] font-mono tracking-widest transition-colors duration-300 ${
                      n === step ? 'text-lime' : 'text-dim'
                    }`}>
                      {label}
                    </span>
                  </div>
                  {i === 0 && (
                    <div className={`w-8 h-px mb-4 transition-colors duration-500 ${
                      step === 2 ? 'bg-lime/40' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Card */}
            <div
              className="card border-muted"
              style={{
                opacity:    visible ? 1 : 0,
                transform:  visible ? 'translateY(0)' : 'translateY(10px)',
                transition: 'opacity 0.22s ease, transform 0.22s ease',
              }}
            >

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <>
                  <h2 className="font-display text-2xl tracking-wide mb-1">Your Info</h2>
                  <p className="text-dim text-xs font-body mb-6">Step 1 of 2 — Tell us about yourself</p>

                  {/* Back to returning user */}
                  {returningUser && (
                    <button
                      type="button"
                      onClick={() => { setShowNewUserForm(false); setError('') }}
                      className="text-xs text-dim font-body mb-4 hover:text-lime transition-colors flex items-center gap-1"
                    >
                      ← Back to your existing profile
                    </button>
                  )}

                  <form onSubmit={handleNext} className="space-y-4">
                    <div>
                      <Input
                        label="Your Name *"
                        id="name"
                        placeholder="e.g. Sinan"
                        value={form.name}
                        onChange={set('name')}
                        autoFocus
                        className={inputClass('name')}
                      />
                      {invalid('name') && (
                        <p className="text-red-400 text-[11px] mt-1 font-body">Name is required.</p>
                      )}
                    </div>

                    <div>
                      <Input
                        label="Age"
                        id="age"
                        type="number"
                        min="10" max="120"
                        placeholder="25"
                        value={form.age}
                        onChange={set('age')}
                        className={inputClass('age')}
                      />
                      {invalid('age')
                        ? <p className="text-red-400 text-[11px] mt-1 font-body">Enter a valid age (10–120).</p>
                        : <p className="text-dim text-[11px] mt-1 font-body">Enter your real age</p>
                      }
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Input
                          label="Height (cm)"
                          id="height"
                          type="number"
                          min="100" max="250"
                          placeholder="175"
                          value={form.height}
                          onChange={set('height')}
                          className={inputClass('height')}
                        />
                        {invalid('height')
                          ? <p className="text-red-400 text-[11px] mt-1 font-body">100–250 cm</p>
                          : <p className="text-dim text-[11px] mt-1 font-body">in cm</p>
                        }
                      </div>
                      <div>
                        <Input
                          label="Current Weight (kg)"
                          id="weight"
                          type="number"
                          step="0.1"
                          min="30" max="300"
                          placeholder="72.0"
                          value={form.weight}
                          onChange={set('weight')}
                          className={inputClass('weight')}
                        />
                        {invalid('weight') && (
                          <p className="text-red-400 text-[11px] mt-1 font-body">30–300 kg</p>
                        )}
                      </div>
                    </div>

                    <ErrorBanner message={error} />

                    <Button
                      type="submit"
                      disabled={!step1Valid}
                      className={`w-full mt-2 transition-opacity duration-200 ${!step1Valid ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      Next →
                    </Button>
                  </form>
                </>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <>
                  <div className="mb-6">
                    <h2 className="font-display text-2xl tracking-wide mb-1">Your Goal</h2>
                    <p className="text-lime/80 text-sm font-body">
                      Nice to meet you, <span className="text-lime font-semibold">{form.name}</span> 👋
                    </p>
                    <p className="text-dim text-xs font-body mt-1">Step 2 of 2 — Set your fitness goal</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">

                    <div>
                      <p className="text-xs text-dim font-body mb-2 uppercase tracking-widest">Select Goal</p>
                      <div className="flex flex-col gap-2">
                        {GOALS.map((g) => {
                          const active = form.goal === g.value
                          return (
                            <button
                              key={g.value}
                              type="button"
                              onClick={() => setGoal(g.value)}
                              className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-body
                                transition-all duration-200 flex items-center gap-3
                                ${active
                                  ? 'border-lime bg-lime/10 text-lime scale-[1.02] shadow-md shadow-lime/10'
                                  : 'border-muted text-dim hover:border-lime/30 hover:scale-[1.01]'
                                }`}
                            >
                              <span className="text-xl">{g.icon}</span>
                              <div>
                                <p className={`font-semibold leading-tight ${active ? 'text-lime' : 'text-text'}`}>
                                  {g.label}
                                </p>
                                <p className="text-[11px] text-dim">{g.desc}</p>
                              </div>
                              {active && (
                                <span className="ml-auto text-lime text-xs font-mono">✓</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {form.goal !== 'maintain' && (
                      <Input
                        label="Target Weight (kg)"
                        id="target_weight"
                        type="number"
                        step="0.1"
                        min="30" max="300"
                        placeholder="68.0"
                        value={form.target_weight}
                        onChange={set('target_weight')}
                      />
                    )}

                    {calories && (
                      <div className={`rounded-xl border border-lime/20 bg-lime/5 px-4 py-4 transition-all duration-300 ${
                        calFlash ? 'border-lime/60 bg-lime/10 shadow-lg shadow-lime/10' : ''
                      }`}>
                        <p className="text-xs text-dim font-body uppercase tracking-widest mb-1">
                          Recommended Calories
                        </p>
                        <p className={`font-display tracking-wide transition-all duration-300 ${
                          calFlash ? 'text-4xl text-lime drop-shadow-[0_0_8px_#C8F135]' : 'text-3xl text-lime'
                        }`}>
                          {calories}
                          <span className="text-sm text-dim font-body ml-1">kcal / day</span>
                        </p>
                        <p className="text-[11px] text-dim font-body mt-1">Based on your body and goal</p>
                      </div>
                    )}

                    <ErrorBanner message={error} />

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { goToStep(1); setError('') }}
                        className="px-4 py-2 rounded-xl border border-muted text-dim text-sm font-body
                          hover:border-lime/40 transition-all"
                      >
                        ← Back
                      </button>
                      <Button
                        type="submit"
                        disabled={loading || !calories}
                        className={`flex-1 transition-opacity duration-200 ${
                          !calories || loading ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      >
                        {loading ? <><LoadingSpinner />Creating…</> : 'Start Tracking →'}
                      </Button>
                    </div>
                  </form>
                </>
              )}

            </div>
          </>
        )}

        <p className="text-center text-[11px] text-dim mt-6 font-mono">
          Your data is saved to your profile.
        </p>
      </div>
    </div>
  )
}