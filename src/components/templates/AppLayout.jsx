import { Outlet } from 'react-router-dom'
import Sidebar from '../organisms/Sidebar'

export default function AppLayout() {
  return (
    <div id="app">
      <a href="#main" className="skip-link">Skip to content</a>
      <Sidebar />
      <main id="main" role="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
