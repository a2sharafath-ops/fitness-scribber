import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { hasBackend } from './lib/supabase'
import { AuthProvider, useAuth } from './store/AuthContext'
import { DataProvider } from './store/DataContext'
import { ModalProvider } from './store/ModalContext'
import { ClipboardProvider } from './store/ClipboardContext'
import AuthPage from './pages/AuthPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import RoleOnboarding from './pages/RoleOnboarding'
import AppLayout from './components/templates/AppLayout'
import ClientLayout from './components/templates/ClientLayout'
import Toaster from './components/organisms/Toaster'
import { clientSectionPath } from './lib/clientRoutes'
import { wearableReturn } from './api/wearable'
import WearableReturn from './components/organisms/WearableReturn'
import StartupScreen from './components/templates/StartupScreen'
import useOrbitAppearance from './hooks/useOrbitAppearance'

const AthletePortal = lazy(() => import('./pages/AthletePortal'))
const AdminPortal = lazy(() => import('./pages/AdminPortal'))
const loadDashboard = () => import('./pages/DashboardPage')
const DashboardPage = lazy(loadDashboard)
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'))
const ClientProfilePage = lazy(() => import('./pages/ClientProfilePage'))
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'))
const AssessmentDetailPage = lazy(() => import('./pages/AssessmentDetailPage'))
const MetricDetailPage = lazy(() => import('./pages/MetricDetailPage'))
const ClientTrainingPage = lazy(() => import('./pages/ClientTrainingPage'))
const ClientProgressPage = lazy(() => import('./pages/ClientProgressPage'))
const MonitorPage = lazy(() => import('./pages/MonitorPage'))
const WorkoutsPage = lazy(() => import('./pages/WorkoutsPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))
const ProgressPage = lazy(() => import('./pages/ProgressPage'))
const ConcernsPage = lazy(() => import('./pages/ConcernsPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ReportPage = lazy(() => import('./pages/ReportPage'))

const routeLoading = <StartupScreen />

function LegacyClientRoute({ section }) {
  const { id } = useParams()
  const { search, hash } = useLocation()
  return <Navigate to={clientSectionPath(id, section, search, hash)} replace />
}

function Shell({ appearance }) {
  useEffect(() => {
    if (window.location.pathname === '/') void loadDashboard().catch(() => {})
  }, [])

  return (
    <DataProvider>
      <BrowserRouter>
      <ModalProvider>
        <ClipboardProvider>
          <Suspense fallback={routeLoading}><Routes>
            <Route element={<AppLayout appearance={appearance} />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:id" element={<ClientLayout />}>
                <Route index element={<ClientDetailPage />} />
                <Route path="training" element={<ClientTrainingPage />} />
                <Route path="progress" element={<ClientProgressPage />} />
                <Route path="check-ins" element={<MonitorPage />} />
                <Route path="assessments" element={<AssessmentsPage />} />
                <Route path="assessments/:type" element={<AssessmentDetailPage />} />
                <Route path="profile" element={<ClientProfilePage />} />
                <Route path="profile/:type" element={<AssessmentDetailPage />} />
                <Route path="metric/:metric" element={<MetricDetailPage />} />
              </Route>
              <Route path="/command/:id" element={<LegacyClientRoute section="training" />} />
              <Route path="/monitor/:id" element={<LegacyClientRoute section="check-ins" />} />
              <Route path="/report/:id" element={<ReportPage />} />
              <Route path="/workouts" element={<WorkoutsPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/concerns" element={<ConcernsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/settings" element={<SettingsPage appearance={appearance} />} />
            </Route>
          </Routes></Suspense>
        </ClipboardProvider>
      </ModalProvider>
      </BrowserRouter>
    </DataProvider>
  )
}

// In backend mode: require login, then branch by role. In local mode: straight through (coach app).
function Gate({ appearance }) {
  const { ready, session, profileReady, profileError, refreshProfile, role, recovery } = useAuth()
  // Completion removes the sensitive URL fragment. Keep this screen mounted
  // across the auth/profile updates that follow startup until Continue navigates.
  const [isWearableReturn] = useState(() => hasBackend && wearableReturn())
  if (!hasBackend) return <Shell appearance={appearance} />
  if (!ready) return routeLoading
  if (recovery) return <ResetPasswordPage />
  if (!session) return <AuthPage />
  if (isWearableReturn) return <WearableReturn />
  if (profileError) return <StartupScreen title="Couldn’t check your profile" error={profileError} onRetry={refreshProfile} />
  if (!profileReady) return routeLoading
  if (!role || role === 'pending') return <RoleOnboarding />
  if (role === 'admin') return <Suspense fallback={routeLoading}><AdminPortal /></Suspense>
  if (role === 'athlete') return <Suspense fallback={routeLoading}><AthletePortal /></Suspense>
  return <Shell appearance={appearance} />
}

export default function App() {
  const appearance = useOrbitAppearance()
  return (
    <AuthProvider>
      <Gate appearance={appearance} />
      <Toaster />
    </AuthProvider>
  )
}
