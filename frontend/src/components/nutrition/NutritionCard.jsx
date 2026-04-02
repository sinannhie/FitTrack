import { memo, useRef, useEffect, useState } from 'react'

const PALETTE = {
  lime:  { text: 'text-lime',    bar: '#a8f04a', ring: 'rgba(168,240,74,0.15)'  },
  ice:   { text: 'text-ice',     bar: '#7dd3fc', ring: 'rgba(125,211,252,0.15)' },
  ember: { text: 'text-ember',   bar: '#f97316', ring: 'rgba(249,115,22,0.15)'  },
  rose:  { text: 'text-rose-400',bar: '#fb7185', ring: 'rgba(251,113,133,0.15)' },
}

/** Counts up from prev value to next value over ~600ms */
function useCountUp(target) {
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  const raf  = useRef(null)

  useEffect(() => {
    const from  = prev.current
    const to    = target
    if (from === to) return

    const dur   = 600
    const start = performance.now()

    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)   // ease-out-cubic
      setDisplay(Math.round(from + (to - from) * ease))
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else { prev.current = to; setDisplay(to) }
    }

    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target])

  return display
}

const NutritionCard = memo(function NutritionCard({
  label, value, unit, goal, color = 'lime', delay = 0,
}) {
  const p   = PALETTE[color] || PALETTE.lime
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0
  const displayVal = useCountUp(value)

  return (
    <div
      className="card-glass flex flex-col gap-3 p-4 cursor-default
                 animate-fade-up opacity-0
                 hover:scale-[1.02] hover:shadow-card-lg
                 transition-all duration-200 ease-out"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between">
        <p className="label mb-0">{label}</p>
        <span
          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md"
          style={{ background: p.ring, color: p.bar }}
        >
          {Math.round(pct)}%
        </span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span className={`font-display text-[28px] font-bold tracking-tight leading-none ${p.text}`}>
          {displayVal}
        </span>
        <span className="text-xs text-dim">{unit}</span>
      </div>

      {/* Progress bar */}
      <div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%`, background: p.bar }}
          />
        </div>
        <p className="text-[10px] font-mono mt-1.5" style={{ color: 'rgba(104,104,122,0.7)' }}>
          {value} / {goal} {unit}
        </p>
      </div>
    </div>
  )
})

export default NutritionCard
