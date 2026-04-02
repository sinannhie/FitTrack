import { useRef, useState, useCallback, useEffect, memo } from 'react'

const SWIPE_THRESHOLD  = 68
const LONG_PRESS_MS    = 500
const MAX_LEFT         = 90
const MAX_RIGHT        = 78

/**
 * SwipeableRow
 * ─ Swipe LEFT  → onSwipeLeft  (delete, red bg)
 * ─ Swipe RIGHT → onSwipeRight (duplicate, green bg)
 * ─ Long press  → onLongPress  (edit modal)
 *
 * Works with both touch (mobile) and mouse (trackpad).
 */
const SwipeableRow = memo(function SwipeableRow({
  children,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  disabled = false,
}) {
  const [offset,     setOffset]     = useState(0)
  const [dragging,   setDragging]   = useState(false)
  const [revealed,   setRevealed]   = useState(null)   // 'left' | 'right' | null
  const [exiting,    setExiting]    = useState(false)

  const startX    = useRef(0)
  const startY    = useRef(0)
  const liveOff   = useRef(0)
  const lpTimer   = useRef(null)
  const didLong   = useRef(false)
  const locked    = useRef(false)   // true when scroll direction detected
  const isDrag    = useRef(false)   // ref mirror so event handlers stay current

  const containerRef = useRef(null)

  /* Prevent native scroll while horizontal-swiping */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onTouchMove = (e) => {
      if (isDrag.current && !locked.current) e.preventDefault()
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  const clearLP = () => { clearTimeout(lpTimer.current); lpTimer.current = null }

  const onStart = useCallback((cx, cy) => {
    if (disabled) return
    startX.current  = cx
    startY.current  = cy
    liveOff.current = 0
    didLong.current = false
    locked.current  = false
    isDrag.current  = false

    lpTimer.current = setTimeout(() => {
      if (Math.abs(liveOff.current) < 8) {
        didLong.current = true
        navigator.vibrate?.(40)
        onLongPress?.()
      }
    }, LONG_PRESS_MS)
  }, [disabled, onLongPress])

  const onMove = useCallback((cx, cy) => {
    if (disabled || locked.current) return
    const dx = cx - startX.current
    const dy = cy - startY.current

    // Detect scroll direction early – lock to vertical
    if (!isDrag.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
      locked.current = true
      clearLP()
      return
    }

    if (Math.abs(dx) > 5) {
      clearLP()
      isDrag.current = true
      setDragging(true)
    }

    if (!isDrag.current) return

    const clamped = Math.max(-MAX_LEFT, Math.min(MAX_RIGHT, dx))
    liveOff.current = clamped
    setOffset(clamped)

    if      (clamped < -SWIPE_THRESHOLD) setRevealed('left')
    else if (clamped >  SWIPE_THRESHOLD) setRevealed('right')
    else                                  setRevealed(null)
  }, [disabled])

  const onEnd = useCallback(() => {
    clearLP()
    if (!isDrag.current) { return }

    const off = liveOff.current

    if (off < -SWIPE_THRESHOLD) {
      setExiting(true)
      setOffset(-MAX_LEFT)
      setTimeout(() => {
        setOffset(0); setRevealed(null); setExiting(false)
        onSwipeLeft?.()
      }, 280)
    } else if (off > SWIPE_THRESHOLD) {
      setOffset(MAX_RIGHT)
      setTimeout(() => {
        setOffset(0); setRevealed(null)
        onSwipeRight?.()
      }, 220)
    } else {
      setOffset(0); setRevealed(null)
    }

    isDrag.current = false
    setDragging(false)
  }, [onSwipeLeft, onSwipeRight])

  /* Global mouseup so release outside element is caught */
  useEffect(() => {
    if (dragging) {
      const up = () => onEnd()
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', up)
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove)
        window.removeEventListener('mouseup', up)
      }
    }
  }, [dragging, onEnd]) // eslint-disable-line

  function handleGlobalMouseMove(e) { onMove(e.clientX, e.clientY) }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl no-select tap-none"
    >
      {/* ── Delete background (left swipe) ── */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-5 rounded-2xl swipe-bg-delete"
        style={{ opacity: revealed === 'left' ? 1 : 0, transition: 'opacity 0.15s ease' }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[18px]">🗑</span>
          <span className="text-[10px] text-white/80 font-medium">Delete</span>
        </div>
      </div>

      {/* ── Duplicate background (right swipe) ── */}
      <div
        className="absolute inset-0 flex items-center justify-start pl-5 rounded-2xl swipe-bg-dup"
        style={{ opacity: revealed === 'right' ? 1 : 0, transition: 'opacity 0.15s ease' }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[18px]">⊕</span>
          <span className="text-[10px] text-void/80 font-medium">Duplicate</span>
        </div>
      </div>

      {/* ── Sliding content ── */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          opacity: exiting ? 0.5 : 1,
        }}
        onTouchStart={e => onStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e  => onMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={onEnd}
        onMouseDown={e  => onStart(e.clientX, e.clientY)}
      >
        {children}
      </div>
    </div>
  )
})

export default SwipeableRow
