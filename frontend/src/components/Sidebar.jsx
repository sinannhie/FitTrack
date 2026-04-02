import { NavLink } from 'react-router-dom'
import { useUser } from '../hooks/useUser'

const NAV = [
  { to: '/',         icon: '⊞', label: 'Dashboard'  },
  { to: '/food',     icon: '◎', label: 'Nutrition'   },
  { to: '/workouts', icon: '◉', label: 'Workouts'    },
  { to: '/progress', icon: '◐', label: 'Progress'    },
]

export default function Sidebar() {
  const { user, logout } = useUser()

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100%',
        width: '256px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        background: 'rgba(10,10,13,0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(46,46,53,0.6)',
      }}
    >
      {/* ── Logo ─────────────────────────────── */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(46,46,53,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: '#a8f04a', boxShadow: '0 0 16px rgba(168,240,74,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#08080a', fontSize: '13px', fontWeight: 700 }}>FT</span>
          </div>
          <div>
            <p style={{ color: '#f2f2f7', fontSize: '15px', fontWeight: 600, letterSpacing: '0.1em', lineHeight: 1, margin: 0 }}>
              FITTRACK
            </p>
            <p style={{ color: '#a8f04a', fontSize: '9px', fontWeight: 500, letterSpacing: '0.2em', margin: '3px 0 0' }}>
              AI
            </p>
          </div>
        </div>
      </div>

      {/* ── User ─────────────────────────────── */}
      {user && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(46,46,53,0.5)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 12px', borderRadius: '14px',
            background: 'rgba(168,240,74,0.06)',
            border: '1px solid rgba(168,240,74,0.12)',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
              background: 'rgba(168,240,74,0.15)', border: '1px solid rgba(168,240,74,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#a8f04a', fontSize: '13px', fontWeight: 600 }}>
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: '#f2f2f7', fontSize: '13px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </p>
              <p style={{ color: '#68687a', fontSize: '10px', fontFamily: 'monospace', margin: '1px 0 0' }}>
                ID #{user.id}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Nav ──────────────────────────────── */}
      <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="sidebar-nav-item"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
              background: isActive ? 'rgba(168,240,74,0.12)' : 'transparent',
              color: isActive ? '#a8f04a' : '#68687a',
              border: `1px solid ${isActive ? 'rgba(168,240,74,0.2)' : 'transparent'}`,
            })}
          >
            <span style={{ fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 }}>
              {icon}
            </span>
            <span style={{ lineHeight: 1 }}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Goals ────────────────────────────── */}
      {user && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{
            borderRadius: '16px', padding: '14px',
            background: 'rgba(18,18,22,0.9)',
            border: '1px solid rgba(46,46,53,0.8)',
          }}>
            <p style={{ color: '#68687a', fontSize: '9px', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>
              Daily Goals
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <p style={{ color: '#a8f04a', fontSize: '20px', fontWeight: 700, lineHeight: 1, margin: 0 }}>
                  {user.calorie_goal ?? '—'}
                </p>
                <p style={{ color: '#68687a', fontSize: '10px', margin: '2px 0 0' }}>kcal</p>
              </div>
              <div>
                <p style={{ color: '#7dd3fc', fontSize: '20px', fontWeight: 700, lineHeight: 1, margin: 0 }}>
                  {user.protein_goal ?? '—'}
                </p>
                <p style={{ color: '#68687a', fontSize: '10px', margin: '2px 0 0' }}>protein g</p>
              </div>
            </div>
            {user.target_weight && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(46,46,53,0.6)' }}>
                <p style={{ color: '#f2f2f7', fontSize: '18px', fontWeight: 600, lineHeight: 1, margin: 0 }}>
                  {user.target_weight}
                </p>
                <p style={{ color: '#68687a', fontSize: '10px', margin: '2px 0 0' }}>target kg</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Switch User ──────────────────────── */}
      <div style={{ padding: '0 16px 20px' }}>
        <button
          onClick={logout}
          style={{
            width: '100%', textAlign: 'left',
            padding: '8px 12px', borderRadius: '10px',
            fontSize: '11px', color: '#68687a',
            background: 'transparent', border: 'none',
            cursor: 'pointer', transition: 'all 0.15s ease',
            fontFamily: 'monospace', letterSpacing: '0.03em',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f97316'; e.currentTarget.style.background = 'rgba(249,115,22,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#68687a'; e.currentTarget.style.background = 'transparent' }}
        >
          ⎋ Switch User
        </button>
      </div>
    </aside>
  )
}