import Brand from '../atoms/Brand'
import Button from '../atoms/Button'
import useOrbitAppearance from '../../hooks/useOrbitAppearance'
import './OrbitShell.css'

export default function StartupScreen({ label = 'Loading your workspace…', error, onRetry }) {
  const { effectiveTheme } = useOrbitAppearance({ applyToDocument: false })

  return <main className="orbit-startup" data-orbit-theme={effectiveTheme} aria-label="Orbit Trainer">
    <div className="orbit-startup-card">
      <Brand />
      {error ? <>
        <div role="alert">
          <h1>Couldn’t load your data</h1>
          <p>{error.message || 'Check your connection and try again.'}</p>
        </div>
        <Button onClick={onRetry}>Retry</Button>
      </> : <p className="orbit-startup-status" role="status">
        <span className="orbit-startup-spinner" aria-hidden="true" />
        {label}
      </p>}
    </div>
  </main>
}
