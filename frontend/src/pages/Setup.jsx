import { useState } from 'react'
import { useUser } from '../hooks/useUser'
import { Input, Button, ErrorBanner } from '../components/UI'

export default function Setup() {
  const { login } = useUser()
  const [form, setForm] = useState({
    name: '',
    target_weight: '',
    calorie_goal: '',
    protein_goal: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Name is required.')
    setLoading(true)
    setError('')
    try {
      await login({
        name: form.name.trim(),
        target_weight: form.target_weight ? parseFloat(form.target_weight) : null,
        calorie_goal: form.calorie_goal ? parseInt(form.calorie_goal) : null,
        protein_goal: form.protein_goal ? parseInt(form.protein_goal) : null,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
        <div className="text-center mb-10 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-lime rounded-2xl flex items-center justify-center shadow-lg shadow-lime/20">
              <span className="text-void text-xl font-display">FT</span>
            </div>
          </div>
          <h1 className="font-display text-6xl tracking-widest text-text mb-2">FITTRACK AI</h1>
          <p className="text-dim text-sm font-body">Your intelligent fitness companion.</p>
        </div>

        {/* Form */}
        <div
          className="card border-muted animate-fade-up opacity-0 animate-delay-100"
          style={{ animationFillMode: 'forwards' }}
        >
          <h2 className="font-display text-2xl tracking-wide mb-6">Create Profile</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your Name *"
              id="name"
              placeholder="e.g. Sinan"
              value={form.name}
              onChange={set('name')}
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Target Weight (kg)"
                id="target_weight"
                type="number"
                step="0.1"
                min="30"
                max="300"
                placeholder="72.0"
                value={form.target_weight}
                onChange={set('target_weight')}
              />
              <Input
                label="Calorie Goal (kcal)"
                id="calorie_goal"
                type="number"
                min="500"
                max="10000"
                placeholder="2200"
                value={form.calorie_goal}
                onChange={set('calorie_goal')}
              />
            </div>

            <Input
              label="Protein Goal (g/day)"
              id="protein_goal"
              type="number"
              min="10"
              max="500"
              placeholder="150"
              value={form.protein_goal}
              onChange={set('protein_goal')}
            />

            <ErrorBanner message={error} />

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? 'Creating…' : 'Start Tracking →'}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-dim mt-6 font-mono">
          Data stored locally — no account needed.
        </p>
      </div>
    </div>
  )
}
