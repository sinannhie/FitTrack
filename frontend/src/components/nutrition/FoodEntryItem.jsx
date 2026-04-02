import { memo, useState } from 'react'
import SwipeableRow from './SwipeableRow'

const EMOJI_MAP = {
  egg: '🥚', chicken: '🍗', milk: '🥛', rice: '🍚', banana: '🍌',
  apple: '🍎', oats: '🥣', salmon: '🐟', tuna: '🐟', fish: '🐟',
  paneer: '🧀', dal: '🫘', bread: '🍞', sweet: '🍠', potato: '🥔',
  whey: '💪', protein: '💪', yogurt: '🥛', orange: '🍊',
  beef: '🥩', pork: '🥩', lamb: '🥩', steak: '🥩',
  pasta: '🍝', noodle: '🍜', salad: '🥗', soup: '🍲',
  water: '💧', juice: '🧃', coffee: '☕', tea: '🍵',
}

function getEmoji(name = '') {
  const n = name.toLowerCase()
  for (const [k, e] of Object.entries(EMOJI_MAP)) if (n.includes(k)) return e
  return '🍽'
}

const FoodEntryItem = memo(function FoodEntryItem({
  log, onDelete, onDuplicate, onEdit,
}) {
  const [pressing, setPressing] = useState(false)

  const cal     = Math.round(log.calories ?? 0)
  const protein = parseFloat(log.protein_g ?? log.protein ?? 0).toFixed(1)
  const carbs   = parseFloat(log.carbs_g   ?? log.carbs   ?? 0).toFixed(1)
  const fat     = parseFloat(log.fat_g     ?? log.fat     ?? 0).toFixed(1)

  return (
    <div className="group">
      <SwipeableRow
        onSwipeLeft={onDelete}
        onSwipeRight={onDuplicate}
        onLongPress={onEdit}
      >
        <div
          className={`
            flex items-center gap-3
            bg-card border rounded-2xl px-4 py-3
            transition-all duration-200 ease-out cursor-default
            ${pressing
              ? 'scale-[0.985] bg-card2 border-border'
              : 'border-border/70 hover:border-border hover:bg-card2'}
          `}
          onMouseDown={() => setPressing(true)}
          onMouseUp={() => setPressing(false)}
          onMouseLeave={() => setPressing(false)}
          onTouchStart={() => setPressing(true)}
          onTouchEnd={() => setPressing(false)}
        >
          {/* Emoji */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center
                       text-lg flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {getEmoji(log.food_name)}
          </div>

          {/* Name + qty */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-text capitalize truncate leading-tight">
              {log.food_name}
            </p>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(104,104,122,0.8)' }}>
              {log.quantity_g} {log.unit ?? 'g'}
            </p>
          </div>

          {/* Macro badges */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[14px] font-bold font-display text-lime leading-none">
              {cal} kcal
            </span>
            <div className="flex gap-2">
              <span className="text-[10px] font-mono text-ice/80">{protein}g P</span>
              <span className="text-[10px] font-mono text-ember/80">{carbs}g C</span>
              <span className="text-[10px] font-mono text-rose-400/80">{fat}g F</span>
            </div>
          </div>

          {/* Delete btn – visible on hover (desktop) */}
          <button
            onClick={e => { e.stopPropagation(); onDelete?.() }}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       text-dim hover:bg-rose-500/12 hover:text-rose-400
                       transition-all duration-150 flex-shrink-0 ml-1
                       opacity-0 group-hover:opacity-100 text-[13px]"
            aria-label="Delete entry"
          >
            ✕
          </button>
        </div>
      </SwipeableRow>
    </div>
  )
})

export default FoodEntryItem
