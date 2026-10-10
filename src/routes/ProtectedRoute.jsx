import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.js'

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()
  const currentLocation = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600">Checking your session…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={`/${user.role}`} replace />
  if (user.mustChangePassword && !currentLocation.pathname.endsWith('/settings')) return <Navigate to={`/${user.role}/settings`} replace />
  return <Outlet />
}
