import Brand from '../atoms/Brand'
import Button from '../atoms/Button'
import './OrbitShell.css'

export default function StartupScreen({ title = 'Couldn’t load your data', error, onRetry }) {
  // Keep the loader from index.html visible across auth, data and route loading.
  if (!error) return <span hidden data-orbit-loading />

  return <main className="orbit-startup" aria-label="Orbit Trainer">
    <div className="orbit-startup-card">
      <Brand />
      <div role="alert">
        <h1>{title}</h1>
        <p>{error.message || 'Check your connection and try again.'}</p>
      </div>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  </main>
}
