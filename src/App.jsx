import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { hasBackend } from './lib/supabase'
import { AuthProvider, useAuth } from './store/AuthContext'
import { DataProvider } from './store/DataContext'
import { ModalProvider } from './store/ModalContext'
import { ClipboardProvider } from './store/ClipboardContext'
import AuthPage from './pages/AuthPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import RoleOnboarding from './pages/RoleOnboarding'
import AthletePortal from './pages/AthletePortal'
import AppLayout from './components/templates/AppLayout'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import ClientProfilePage from './pages/ClientProfilePage'
import AssessmentsPage from './pages/AssessmentsPage'
import MetricDetailPage from './pages/MetricDetailPage'
import CommandCenterPage from './pages/CommandCenterPage'
import MonitorPage from './pages/MonitorPage'
import WorkoutsPage from './pages/WorkoutsPage'
import SchedulePage from './pages/SchedulePage'
import ProgressPage from './pages/ProgressPage'
import ConcernsPage from './pages/ConcernsPage'
import MessagesPage from './pages/MessagesPage'
import SettingsPage from './pages/SettingsPage'
import ReportPage from './pages/ReportPage'
import Toaster from './components/organisms/Toaster'
import './lib/chartSetup'

function Shell() {
  return (
    <DataProvider>
      <ModalProvider>
        <ClipboardProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
              <Route path="/clients/:id/profile" element={<ClientProfilePage />} />
              <Route path="/clients/:id/assessments" element={<AssessmentsPage />} />
              <Route path="/clients/:id/metric/:metric" element={<MetricDetailPage />} />
              <Route path="/command/:id" element={<CommandCenterPage />} />
              <Route path="/monitor/:id" element={<MonitorPage />} />
              <Route path="/report/:id" element={<ReportPage />} />
              <Route path="/workouts" element={<WorkoutsPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/concerns" element={<ConcernsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ClipboardProvider>
      </ModalProvider>
    </DataProvider>
  )
}

// In backend mode: require login, then branch by role. In local mode: straight through (coach app).
function Gate() {
  const { ready, session, profileReady, role, recovery } = useAuth()
  if (!hasBackend) return <Shell />
  const loading = <div className="empty" style={{ paddingTop: 120 }}><div className="big">⏳</div>Starting…</div>
  if (!ready) return loading
  if (recovery) return <ResetPasswordPage />
  if (!session) return <AuthPage />
  if (!profileReady) return loading
  if (!role) return <RoleOnboarding />
  if (role === 'athlete') return <AthletePortal />
  return <Shell />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
      <Toaster />
    </AuthProvider>
  )
}
