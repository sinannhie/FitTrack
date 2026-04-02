// components/UI.jsx — shared component library for FitTrack AI
// All exports preserved + Skeleton + SkeletonCard added

import { memo } from 'react'

// ── Card ─────────────────────────────────────────────────────────
export function Card({ children, className = '', style = {} }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────
const ACCENT_TEXT = {
  lime:  'text-lime',
  ice:   'text-ice',
  ember: 'text-ember',
  dim:   'text-dim',
  red:   'text-rose-400',
}

export const StatCard = memo(function StatCard({
  label, value, unit = '', sub = '', accent = 'lime', icon = '', delay = 0,
}) {
  const c = ACCENT_TEXT[accent] || 'text-lime'
  return (
    <div
      className="card flex flex-col gap-2 hover:border-muted transition-colors
                 animate-fade-up opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center justify-between">
        <p className="label mb-0">{label}</p>
        {icon && <span className="text-dim text-xs">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-display text-2xl font-bold ${c}`}>{value}</span>
        {unit && <span className="text-xs text-dim">{unit}</span>}
      </div>
      {sub && <p className="text-[11px] text-dim leading-tight">{sub}</p>}
    </div>
  )
})

// ── Input ─────────────────────────────────────────────────────────
export function Input({
  label, id, type = 'text', placeholder = '', value, onChange,
  className = '', autoFocus = false, min, max, step,
  onFocus, onBlur, disabled = false,
}) {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <input
        id={id} type={type} placeholder={placeholder}
        value={value} onChange={onChange}
        className={`input-field ${className}`}
        autoFocus={autoFocus} min={min} max={max} step={step}
        onFocus={onFocus} onBlur={onBlur} disabled={disabled}
      />
    </div>
  )
}

// ── Button ────────────────────────────────────────────────────────
export function Button({ children, type = 'button', onClick, disabled = false, className = '' }) {
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      className={`btn-primary ${className}`}
    >
      {children}
    </button>
  )
}

// ── ErrorBanner ───────────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }) {
  if (!message) return null
  return (
    <div className="flex items-center justify-between gap-3 bg-rose-400/10 border
                    border-rose-400/20 rounded-2xl px-4 py-3 text-sm text-rose-400">
      <span>⚠ {message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs underline underline-offset-2 flex-shrink-0">
          Retry
        </button>
      )}
    </div>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────
export function SectionHeader({ title, subtitle = '' }) {
  return (
    <div className="mb-1">
      <h3 className="font-display text-base font-semibold tracking-tight text-text">{title}</h3>
      {subtitle && <p className="text-xs text-dim mt-0.5">{subtitle}</p>}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────
export function EmptyState({ icon = '◎', title = 'Nothing here yet', description = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <span className="text-3xl mb-1">{icon}</span>
      <p className="text-sm font-semibold text-dim">{title}</p>
      {description && <p className="text-xs text-dim/60 max-w-xs">{description}</p>}
    </div>
  )
}

// ── PageLoader ────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin" />
      <p className="text-dim text-sm font-mono">Loading…</p>
    </div>
  )
}

// ── MacroBar ──────────────────────────────────────────────────────
export function MacroBar({ label, value, goal, color = 'lime' }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  const COLORS = {
    lime:  { bar: 'bg-lime',     text: 'text-lime'    },
    ice:   { bar: 'bg-ice',      text: 'text-ice'     },
    ember: { bar: 'bg-ember',    text: 'text-ember'   },
    red:   { bar: 'bg-rose-400', text: 'text-rose-400'},
  }
  const c = COLORS[color] || COLORS.lime
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-dim">{label}</span>
        <span className={`text-xs font-mono font-semibold ${c.text}`}>
          {value} <span className="text-dim font-normal">/ {goal}</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
             style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── TrendBadge ────────────────────────────────────────────────────
const TREND_CFG = {
  losing:            { label:'Losing',    bg:'bg-ice/10',   text:'text-ice',   icon:'↓' },
  gaining:           { label:'Gaining',   bg:'bg-ember/10', text:'text-ember', icon:'↑' },
  stable:            { label:'Stable',    bg:'bg-lime/10',  text:'text-lime',  icon:'→' },
  insufficient_data: { label:'Need Data', bg:'bg-muted',    text:'text-dim',   icon:'–' },
}
export function TrendBadge({ trend }) {
  const c = TREND_CFG[trend] || TREND_CFG.insufficient_data
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                      font-mono font-semibold ${c.bg} ${c.text}`}>
      <span>{c.icon}</span>{c.label}
    </span>
  )
}

// ── Badge ─────────────────────────────────────────────────────────
const BADGE_CLR = {
  lime:  'bg-lime/10  text-lime    border-lime/20',
  ice:   'bg-ice/10   text-ice     border-ice/20',
  ember: 'bg-ember/10 text-ember   border-ember/20',
  dim:   'bg-muted    text-dim     border-border',
  red:   'bg-rose-400/10 text-rose-400 border-rose-400/20',
}
export function Badge({ children, color = 'dim' }) {
  const c = BADGE_CLR[color] || BADGE_CLR.dim
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs
                      font-mono font-semibold border ${c}`}>
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const sz = { sm:'w-4 h-4', md:'w-6 h-6', lg:'w-8 h-8' }[size] || 'w-6 h-6'
  return (
    <div className={`${sz} border-2 border-lime/30 border-t-lime rounded-full animate-spin ${className}`} />
  )
}

// ── Skeleton ──────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card space-y-3">
      {Array(lines).fill(0).map((_, i) => (
        <Skeleton key={i} className={`h-4 rounded-lg ${i === 0 ? 'w-1/2' : i === 1 ? 'w-full' : 'w-2/3'}`} />
      ))}
    </div>
  )
}
