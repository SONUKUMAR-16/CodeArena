import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useEffect } from 'react'
import { checkAuth } from './authslice'
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyOtp from './pages/VerifyOtp'
import ProblemDetail from './pages/ProblemDetail'
import AdminPage from './pages/AdminPage'
import CreateProblem from './pages/admin/CreateProblem';
import UpdateProblem from './pages/admin/UpdateProblem';
import SubmissionsPage from './pages/SubmissionsPage';
import ChatPage from './pages/ChatPage'; // Import the ChatPage
import AdminUpload from './pages/admin/AdminUpload'
import Contests from './pages/Contests';
import ContestDetail from './pages/ContestDetail';
import CreateContest from './pages/CreateContest';
import Interviews from './pages/Interviews';
import InterviewSelect from './pages/InterviewSelect';
import AIInterview from './components/AIInterview';
import Visualizer from './pages/Visualizer'
import Profile from './pages/Profile'


function App() {
  const { isAuthenticated, loading, user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  
  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch])

  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={isAuthenticated ? <Homepage/> : <Navigate to='/login'/>} 
      />
      <Route 
        path="/homepage" 
        element={isAuthenticated ? <Homepage/> : <Navigate to='/login'/>}
      />
      <Route 
        path="/problem/:id" 
        element={isAuthenticated ? <ProblemDetail/> : <Navigate to='/login'/>}
      />
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login/> : <Navigate to='/'/>} 
      />
      <Route 
        path="/signup" 
        element={!isAuthenticated ? <Signup/> : <Navigate to='/'/>} 
      />
      <Route 
        path="/verify-otp" 
        element={!isAuthenticated ? <VerifyOtp/> : <Navigate to='/'/>} 
      />
      {/* Add Chat Page Route */}
      <Route 
        path="/chat/:id" 
        element={isAuthenticated ? <ChatPage/> : <Navigate to='/login'/>}
      />
      {/* Admin Route - Only accessible to authenticated admins */}
      <Route 
        path="/admin" 
        element={
          isAuthenticated && isAdmin ? 
            <AdminPage/> : 
            isAuthenticated ? 
              <Navigate to='/'/> : 
              <Navigate to='/login'/>
        } 
      />
      <Route 
        path="/admin/create" 
        element={
          isAuthenticated && isAdmin ? 
            <CreateProblem/> : 
            isAuthenticated ? 
              <Navigate to='/'/> : 
              <Navigate to='/login'/>
        } 
      />
      
      <Route 
        path="/admin/update/:id" 
        element={
          isAuthenticated && isAdmin ? 
            <UpdateProblem/> : 
            isAuthenticated ? 
              <Navigate to='/'/> : 
              <Navigate to='/login'/>
        } 
      />
      <Route 
        path="/admin/upload/:problemId" 
        element={
          isAuthenticated && isAdmin ? 
            <AdminUpload/> : 
            isAuthenticated ? 
              <Navigate to='/'/> : 
              <Navigate to='/login'/>
        } 
      />
      <Route 
        path="/submissions" 
          element={isAuthenticated ? <SubmissionsPage /> : <Navigate to='/login'/>} />
      <Route 
        path="/contests" 
        element={isAuthenticated ? <Contests/> : <Navigate to='/login'/>} 
      />
      <Route 
        path="/contest/:id" 
        element={isAuthenticated ? <ContestDetail/> : <Navigate to='/login'/>} 
      />
      <Route 
        path="/contest/create" 
        element={
          isAuthenticated && isAdmin ? 
            <CreateContest/> : 
            isAuthenticated ? 
              <Navigate to='/'/> : 
              <Navigate to='/login'/>
        } 
      />
      <Route 
        path="/interviews" 
        element={isAuthenticated ? <Interviews/> : <Navigate to='/login'/>} 
      />
      <Route 
        path="/interview/select" 
        element={isAuthenticated ? <InterviewSelect/> : <Navigate to='/login'/>} 
      />
      <Route 
        path="/interview/:id" 
        element={isAuthenticated ? <AIInterview/> : <Navigate to='/login'/>} 
      />
      <Route 
        path="/visualizer" 
        element={isAuthenticated ? <Visualizer/> : <Navigate to='/login'/>} 
      />
      <Route 
        path="/profile/:username?" 
        element={isAuthenticated ? <Profile/> : <Navigate to='/login'/>} 
      />
      {/* Catch-all route - must be last */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? '/' : '/login'}/>} 
      />
    </Routes>
  )
}

export default App