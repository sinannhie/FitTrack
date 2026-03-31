// ── Shared UI primitives ──────────────────────────────────────────────────────

export function Card({ children, className = '', glow = false }) {
  return (
    <div
      className={`card transition-all duration-200 ${
        glow ? 'hover:border-lime/30 hover:shadow-lg hover:shadow-lime/5' : 'hover:border-muted'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function StatCard({ label, value, unit, sub, accent = 'lime', icon, delay = 0 }) {
  const accentMap = {
    lime: 'text-lime',
    ember: 'text-ember',
    ice: 'text-ice',
    dim: 'text-dim',
  }
  return (
    <Card
      className="animate-fade-up opacity-0 flex flex-col gap-3"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      glow
    >
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {icon && <span className={`text-lg ${accentMap[accent]}`}>{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className={`font-display text-5xl tracking-wide ${accentMap[accent]}`}>
          {value ?? '—'}
        </span>
        {unit && <span className="text-dim text-sm mb-1.5 font-mono">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-dim">{sub}</p>}
    </Card>
  )
}

export function Button({ children, onClick, variant = 'primary', disabled = false, className = '', type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variant === 'primary' ? 'btn-primary' : 'btn-ghost'} ${className}`}
    >
      {children}
    </button>
  )
}

export function Input({ label, id, className = '', ...props }) {
  return (
    <div>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <input id={id} className={`input-field ${className}`} {...props} />
    </div>
  )
}

export function Select({ label, id, children, className = '', ...props }) {
  return (
    <div>
      {label && <label htmlFor={id} className="label">{label}</label>}
      <select
        id={id}
        className={`input-field appearance-none cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}

export function Badge({ children, color = 'lime' }) {
  const colors = {
    lime: 'bg-lime/10 text-lime border-lime/20',
    ember: 'bg-ember/10 text-ember border-ember/20',
    ice: 'bg-ice/10 text-ice border-ice/20',
    gray: 'bg-muted/30 text-dim border-border',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-medium border ${colors[color]}`}>
      {children}
    </span>
  )
}

export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={`${sizes[size]} border-2 border-border border-t-lime rounded-full animate-spin`} />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-dim text-sm font-mono">Loading...</p>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="text-4xl opacity-30">{icon}</span>
      <p className="text-text font-medium">{title}</p>
      {description && <p className="text-dim text-sm text-center max-w-xs">{description}</p>}
    </div>
  )
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="flex items-center justify-between gap-4 bg-ember/10 border border-ember/20 rounded-xl px-4 py-3 text-sm text-ember">
      <span>⚠ {message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-ember underline text-xs hover:no-underline shrink-0">
          Retry
        </button>
      )}
    </div>
  )
}

export function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-display text-2xl tracking-wide text-text">{title}</h2>
      {action}
    </div>
  )
}

export function Divider() {
  return <div className="border-t border-border my-5" />
}

// Progress bar for macro tracking
export function MacroBar({ label, current, goal, color = 'lime' }) {
  const colorMap = {
    lime:  'bg-lime',
    ember: 'bg-ember',
    ice:   'bg-ice',
    dim:   'bg-dim',
  }

  const hasGoal = goal != null && goal > 0
  const over    = hasGoal && current > goal

  // With goal    → % of goal, capped at 100%
  // Without goal → % of a sensible reference so bar still moves:
  //                Calories: 3000 kcal ref | everything else: 300 g ref
  let pct
  if (hasGoal) {
    pct = Math.min((current / goal) * 100, 100)
  } else {
    const ref = label === 'Calories' ? 3000 : 300
    pct = Math.min((current / ref) * 100, 100)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-dim font-medium uppercase tracking-wider">{label}</span>
        <span className={`font-mono ${over ? 'text-ember' : 'text-dim'}`}>
          {Math.round(current)}
          {hasGoal && (
            <>
              {' / '}{goal}
              <span className="text-dim/60"> {over ? 'over' : 'left'}</span>
            </>
          )}
        </span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            over ? 'bg-ember' : colorMap[color]
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// Trend indicator arrow
export function TrendBadge({ trend }) {
  const map = {
    losing:            { label: '↓ Losing',  color: 'ice'   },
    gaining:           { label: '↑ Gaining', color: 'ember' },
    stable:            { label: '→ Stable',  color: 'lime'  },
    insufficient_data: { label: '? No data', color: 'gray'  },
  }
  const config = map[trend] || map.insufficient_data
  return <Badge color={config.color}>{config.label}</Badge>
}