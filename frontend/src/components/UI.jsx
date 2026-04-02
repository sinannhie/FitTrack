// ─────────────────────────────────────────────────────────────────────────────
// components/UI.jsx
// Shared component library for FitTrack AI
// ─────────────────────────────────────────────────────────────────────────────

// ── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', style = {} }) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl p-5 ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

const ACCENT_TEXT = {
  lime:  'text-lime',
  ice:   'text-ice',
  ember: 'text-ember',
  dim:   'text-dim',
  red:   'text-red-400',
}

export function StatCard({ label, value, unit = '', sub = '', accent = 'lime', icon = '', delay = 0 }) {
  const textColor = ACCENT_TEXT[accent] || 'text-lime'

  return (
    <div
      className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2
                 hover:border-muted transition-colors animate-fade-up opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-widest text-dim">{label}</p>
        {icon && <span className="text-dim text-xs">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-display text-2xl font-bold ${textColor}`}>{value}</span>
        {unit && <span className="text-xs text-dim font-body">{unit}</span>}
      </div>
      {sub && <p className="text-[11px] text-dim font-body leading-tight">{sub}</p>}
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────

export function Input({
  label,
  id,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  className = '',
  autoFocus = false,
  min,
  max,
  step,
  onFocus,
  onBlur,
  disabled = false,
}) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`input-field ${className}`}
        autoFocus={autoFocus}
        min={min}
        max={max}
        step={step}
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
      />
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────────────────

export function Button({ children, type = 'button', onClick, disabled = false, className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        px-5 py-2.5 rounded-xl bg-lime text-void font-display font-semibold text-sm
        hover:bg-lime/90 active:scale-[0.98] transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  )
}

// ── ErrorBanner ───────────────────────────────────────────────────────────────

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="flex items-center justify-between gap-3 bg-red-400/10 border border-red-400/20
                    rounded-xl px-4 py-3 text-sm font-body text-red-400">
      <span>⚠ {message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs underline underline-offset-2 hover:no-underline flex-shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle = '' }) {
  return (
    <div className="mb-1">
      <h3 className="font-display text-base font-semibold tracking-wide text-text">{title}</h3>
      {subtitle && <p className="text-xs text-dim font-body mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

export function EmptyState({ icon = '◎', title = 'Nothing here yet', description = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <span className="text-3xl mb-1">{icon}</span>
      <p className="text-sm font-display font-semibold text-dim">{title}</p>
      {description && <p className="text-xs text-dim/70 font-body max-w-xs">{description}</p>}
    </div>
  )
}

// ── PageLoader ────────────────────────────────────────────────────────────────

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin" />
      <p className="text-dim text-sm font-body font-mono">Loading…</p>
    </div>
  )
}

// ── MacroBar ──────────────────────────────────────────────────────────────────

export function MacroBar({ label, value, goal, color = 'lime' }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const COLORS = {
    lime:  { bar: 'bg-lime',     text: 'text-lime'    },
    ice:   { bar: 'bg-ice',      text: 'text-ice'     },
    ember: { bar: 'bg-ember',    text: 'text-ember'   },
    red:   { bar: 'bg-red-400',  text: 'text-red-400' },
  }
  const c = COLORS[color] || COLORS.lime

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-dim font-body">{label}</span>
        <span className={`text-xs font-mono font-semibold ${c.text}`}>
          {value} <span className="text-dim font-normal">/ {goal}</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── TrendBadge ────────────────────────────────────────────────────────────────

const TREND_CONFIG = {
  losing:             { label: 'Losing',     bg: 'bg-ice/10',   text: 'text-ice',   icon: '↓' },
  gaining:            { label: 'Gaining',    bg: 'bg-ember/10', text: 'text-ember', icon: '↑' },
  stable:             { label: 'Stable',     bg: 'bg-lime/10',  text: 'text-lime',  icon: '→' },
  insufficient_data:  { label: 'Need Data',  bg: 'bg-muted',    text: 'text-dim',   icon: '–' },
}

export function TrendBadge({ trend }) {
  const cfg = TREND_CONFIG[trend] || TREND_CONFIG.insufficient_data
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono
                      font-semibold ${cfg.bg} ${cfg.text}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

const BADGE_COLORS = {
  lime:  'bg-lime/10  text-lime   border-lime/20',
  ice:   'bg-ice/10   text-ice    border-ice/20',
  ember: 'bg-ember/10 text-ember  border-ember/20',
  dim:   'bg-muted    text-dim    border-border',
  red:   'bg-red-400/10 text-red-400 border-red-400/20',
}

export function Badge({ children, color = 'dim' }) {
  const cls = BADGE_COLORS[color] || BADGE_COLORS.dim
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs
                      font-mono font-semibold border ${cls}`}>
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div
      className={`${sizes[size] || sizes.md} border-2 border-lime/30 border-t-lime
                  rounded-full animate-spin ${className}`}
    />
  )
}