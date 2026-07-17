import { useState } from 'react'
import { useData } from '../../store/DataContext'

// Surfaces a visible banner when one or more Supabase tables failed to load
// (usually a migration that was never applied). Without this, a missing table
// loads as an empty list and every save to it silently fails — data appears to
// "vanish". The banner names the tables so the gap is obvious, not silent.
export default function SchemaWarning() {
  const { loadIssues } = useData()
  const [dismissed, setDismissed] = useState(false)
  if (!loadIssues?.length || dismissed) return null
  const tables = loadIssues.map((i) => i.table).join(', ')
  const many = loadIssues.length > 1
  return (
    <div className="schema-warn" role="alert">
      <span className="schema-warn-ic" aria-hidden="true">⚠</span>
      <span>
        <strong>Database table{many ? 's' : ''} missing:</strong> {tables}.
        {' '}These records can’t load or save until the table{many ? 's are' : ' is'} created in Supabase —
        anything you record here won’t be kept. Apply the matching schema file, then reload.
      </span>
      <button className="x" onClick={() => setDismissed(true)} aria-label="Dismiss warning">×</button>
    </div>
  )
}
