import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { hasBackend } from './lib/supabase'
import { AuthProvider, useAuth } from './store/AuthContext'
import { DataProvider } from './store/DataContext'
import { ModalProvider } from './store/ModalContext'
import { ClipboardProvider } from './store/ClipboardContext'
import AuthPage from './pages/AuthPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import RoleOnboarding from './pages/RoleOnboarding'
import AppLayout from './components/templates/AppLayout'
import Toaster from './components/organisms/Toaster'
import PageLoadFailure from './components/molecules/PageLoadFailure'

// A failed chunk must remain recoverable after a deployment or network loss.
// Reload never clears the account-scoped pending-operation journal.
const page = load => lazy(() => load().catch(error => {
  if (import.meta.env.DEV) console.error('Application route module failed to load', error)
  return { default: PageLoadFailure }
}))
const AthletePortal = page(() => import('./pages/AthletePortal'))
const AdminPortal = page(() => import('./pages/AdminPortal'))
const DashboardPage = page(() => import('./pages/DashboardPage'))
const ClientsPage = page(() => import('./pages/ClientsPage'))
const ClientDetailPage = page(() => import('./pages/ClientDetailPage'))
const ClientProfilePage = page(() => import('./pages/ClientProfilePage'))
const AssessmentsPage = page(() => import('./pages/AssessmentsPage'))
const AssessmentDetailPage = page(() => import('./pages/AssessmentDetailPage'))
const MetricDetailPage = page(() => import('./pages/MetricDetailPage'))
const CommandCenterPage = page(() => import('./pages/CommandCenterPage'))
const MonitorPage = page(() => import('./pages/MonitorPage'))
const WorkoutsPage = page(() => import('./pages/WorkoutsPage'))
const SchedulePage = page(() => import('./pages/SchedulePage'))
const ProgressPage = page(() => import('./pages/ProgressPage'))
const ConcernsPage = page(() => import('./pages/ConcernsPage'))
const MessagesPage = page(() => import('./pages/MessagesPage'))
const SettingsPage = page(() => import('./pages/SettingsPage'))
const ReportPage = page(() => import('./pages/ReportPage'))
const ExercisePoolPage = page(() => import('./pages/ExercisePoolPage'))
const PoolingTestPage = page(() => import('./pages/PoolingTestPage'))

function Shell() {
  return (
    <DataProvider>
      <ModalProvider>
        <ClipboardProvider>
        <BrowserRouter>
          <Suspense fallback={<p role="status">Loading page…</p>}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/pooling-test" element={<Suspense fallback={<p role="status">Loading coach test workspace…</p>}><PoolingTestPage /></Suspense>} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
              <Route path="/clients/:id/profile" element={<ClientProfilePage />} />
              <Route path="/clients/:id/pool" element={<Suspense fallback={<p role="status">Loading exercise pool…</p>}><ExercisePoolPage /></Suspense>} />
              <Route path="/clients/:id/assessments" element={<AssessmentsPage />} />
              <Route path="/clients/:id/assessments/:type" element={<AssessmentDetailPage />} />
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
          </Suspense>
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
  if (role === 'admin') return <AdminPortal />
  if (role === 'athlete') return <AthletePortal />
  // A direct authenticated account switch must not reuse the previous actor's
  // in-memory dataset, clipboard, dialogs or pending private component state.
  return <Shell key={session.user.id} />
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<p role="status">Loading workspace…</p>}><Gate /></Suspense>
      <Toaster />
    </AuthProvider>
  )
}
