import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser } from './hooks/useUser'
import Sidebar from './components/Sidebar'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import FoodPage from './pages/Food'
import WorkoutsPage from './pages/Workouts'
import ProgressPage from './pages/Progress'
import { Spinner } from './components/UI'
import { useEffect } from "react";
import axios from "axios";

function AppShell() {
const { user, loading } = useUser()

// 🔥 Wake up backend (Render sleep fix)
useEffect(() => {
axios.get("https://fittrack-backend-owl8.onrender.com/health")
.then(() => console.log("Backend awake"))
.catch(() => console.log("Backend wake failed"));
}, [])

if (loading) {
return ( <div className="min-h-screen bg-void flex items-center justify-center"> <div className="flex flex-col items-center gap-4"> <Spinner size="lg" /> <p className="text-dim text-sm font-mono tracking-widest">FITTRACK AI</p> </div> </div>
)
}

if (!user) return <Setup />

return ( <div className="flex min-h-screen bg-void"> <Sidebar />
{/* Main content — offset by sidebar width */} <main className="flex-1 ml-64 min-h-screen">
{/* Subtle background grid */}
<div
className="fixed inset-0 pointer-events-none opacity-[0.015] ml-64"
style={{
backgroundImage:
'linear-gradient(#C8F135 1px, transparent 1px), linear-gradient(90deg, #C8F135 1px, transparent 1px)',
backgroundSize: '60px 60px',
}}
/> <div className="relative z-10 p-8 max-w-6xl"> <Routes>
<Route path="/"         element={<Dashboard />} />
<Route path="/food"     element={<FoodPage />} />
<Route path="/workouts" element={<WorkoutsPage />} />
<Route path="/progress" element={<ProgressPage />} />
<Route path="*"         element={<Navigate to="/" replace />} /> </Routes> </div> </main> </div>
)
}

export default function App() {
return ( <BrowserRouter> <UserProvider> <AppShell /> </UserProvider> </BrowserRouter>
)
}
