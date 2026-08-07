import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect } from 'react'
import { checkAuth } from './authslice'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyOtp from './pages/VerifyOtp'
import ForgotPassword from './pages/ForgotPassword'
import ProblemDetail from './pages/ProblemDetail'
import AdminPage from './pages/AdminPage'
import CreateProblem from './pages/admin/CreateProblem';
import UpdateProblem from './pages/admin/UpdateProblem';
import SubmissionsPage from './pages/SubmissionsPage';
import ChatPage from './pages/ChatPage';
import AdminUpload from './pages/admin/AdminUpload'
import Contests from './pages/Contests';
import ContestDetail from './pages/ContestDetail';
import CreateContest from './pages/CreateContest';
import Profile from './pages/Profile'

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, loading, user } = useSelector((state) => state.auth)
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((state) => state.auth)
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  return children
}

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch])

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Homepage /></ProtectedRoute>} />
      <Route path="/homepage" element={<ProtectedRoute><Homepage /></ProtectedRoute>} />
      <Route path="/problem/:id" element={<ProtectedRoute><ProblemDetail /></ProtectedRoute>} />
      <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/submissions" element={<ProtectedRoute><SubmissionsPage /></ProtectedRoute>} />
      <Route path="/contests" element={<ProtectedRoute><Contests /></ProtectedRoute>} />
      <Route path="/contest/:id" element={<ProtectedRoute><ContestDetail /></ProtectedRoute>} />
      <Route path="/profile/:username?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
      <Route path="/admin/create" element={<ProtectedRoute adminOnly><CreateProblem /></ProtectedRoute>} />
      <Route path="/admin/update/:id" element={<ProtectedRoute adminOnly><UpdateProblem /></ProtectedRoute>} />
      <Route path="/admin/upload/:problemId" element={<ProtectedRoute adminOnly><AdminUpload /></ProtectedRoute>} />
      <Route path="/contest/create" element={<ProtectedRoute adminOnly><CreateContest /></ProtectedRoute>} />

      {/* Public / Auth Routes */}
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
      <Route path="/verify-otp" element={<PublicOnlyRoute><VerifyOtp /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App