import { Navigate, Route, Routes } from 'react-router-dom'
import AuthScreen from './components/AuthScreen.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import { useAuth } from './context/AuthContext.jsx'
import CalendarPage from './pages/CalendarPage.jsx'
import JournalPage from './pages/JournalPage.jsx'

function PrivateRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/today" replace />} />
      <Route path="/today" element={<JournalPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/journal/:date" element={<JournalPage />} />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  )
}

export default function App() {
  const { isAuthenticated, status } = useAuth()

  if (status === 'loading') {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  return <PrivateRoutes />
}
