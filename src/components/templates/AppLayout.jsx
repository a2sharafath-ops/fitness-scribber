import { Outlet } from 'react-router-dom'
import Sidebar from '../organisms/Sidebar'
import GlobalBar from '../organisms/GlobalBar'
import SchemaWarning from '../organisms/SchemaWarning'
import { isLocalBuilderQA } from '../../lib/supabase'

export default function AppLayout() {
  return (
    <div id="app">
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar />
      <main id="main" role="main" tabIndex={-1}>
        {isLocalBuilderQA && <p className="muted" role="status">Local builder testing · changes saved on this device</p>}
        <SchemaWarning />
        <GlobalBar />
        <Outlet />
      </main>
    </div>
  )
}
