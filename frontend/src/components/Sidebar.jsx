import { NavLink } from 'react-router-dom'
import { useUser } from '../hooks/useUser'

const NAV = [
  { to: '/',          icon: '◈', label: 'Dashboard' },
  { to: '/food',      icon: '◎', label: 'Nutrition'  },
  { to: '/workouts',  icon: '◉', label: 'Workouts'   },
  { to: '/progress',  icon: '◐', label: 'Progress'   },
]

export default function Sidebar() {
  const { user, logout } = useUser()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-lime rounded-lg flex items-center justify-center">
            <span className="text-void text-sm font-display">FT</span>
          </div>
          <div>
            <p className="font-display text-xl tracking-widest text-text leading-none">FITTRACK</p>
            <p className="text-[10px] text-dim font-mono tracking-widest uppercase">AI</p>
          </div>
        </div>
      </div>

      {/* User */}
      {user && (
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/20 rounded-xl">
            <div className="w-8 h-8 bg-lime/20 border border-lime/30 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-lime text-sm font-display">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{user.name}</p>
              <p className="text-[11px] text-dim font-mono">ID #{user.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="text-base w-5 text-center">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Goals summary */}
      {user && (
        <div className="px-4 pb-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <p className="text-[10px] text-dim font-mono uppercase tracking-widest">Daily Goals</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-lg font-display text-lime leading-none">
                  {user.calorie_goal ?? '—'}
                </p>
                <p className="text-[10px] text-dim font-mono">kcal</p>
              </div>
              <div>
                <p className="text-lg font-display text-ice leading-none">
                  {user.protein_goal ?? '—'}
                </p>
                <p className="text-[10px] text-dim font-mono">protein g</p>
              </div>
            </div>
            {user.target_weight && (
              <div>
                <p className="text-lg font-display text-text leading-none">{user.target_weight}</p>
                <p className="text-[10px] text-dim font-mono">target kg</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="px-4 pb-6">
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2.5 rounded-xl text-xs text-dim hover:text-ember hover:bg-ember/10 transition-all duration-150 font-mono"
        >
          ⎋ Switch User
        </button>
      </div>
    </aside>
  )
}
