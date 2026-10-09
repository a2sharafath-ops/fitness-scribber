import { lazy, Suspense } from 'react'
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

const AthletePortal = lazy(() => import('./pages/AthletePortal'))
const AdminPortal = lazy(() => import('./pages/AdminPortal'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
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

const routeLoading = <div className="empty" style={{ paddingTop: 120 }}><div className="big">⏳</div>Loading…</div>

function LegacyClientRoute({ section }) {
  const { id } = useParams()
  const { search, hash } = useLocation()
  return <Navigate to={clientSectionPath(id, section, search, hash)} replace />
}

function Shell() {
  return (
    <DataProvider>
      <ModalProvider>
        <ClipboardProvider>
        <BrowserRouter>
          <Suspense fallback={routeLoading}><Routes>
            <Route element={<AppLayout />}>
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
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes></Suspense>
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
  if (!role || role === 'pending') return <RoleOnboarding />
  if (role === 'admin') return <Suspense fallback={routeLoading}><AdminPortal /></Suspense>
  if (role === 'athlete') return <Suspense fallback={routeLoading}><AthletePortal /></Suspense>
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
