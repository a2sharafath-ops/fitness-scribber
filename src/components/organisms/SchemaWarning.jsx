import { useState } from 'react'
import { useData } from '../../store/DataContext'

// Surfaces a visible banner when the database is out of sync with the app:
//   • a table failed to load (usually a migration never applied), or
//   • a write failed (usually a missing column).
// Either way a missing table/column loads as empty and saves silently fail —
// data appears to "vanish". The banner names the tables so the gap is obvious.
export default function SchemaWarning() {
  const { dbIssues } = useData()
  const [dismissed, setDismissed] = useState(false)
  if (!dbIssues?.length || dismissed) return null
  const tables = dbIssues.map((i) => i.table).join(', ')
  const many = dbIssues.length > 1
  const write = dbIssues.some((i) => i.kind === 'write')
  const load = dbIssues.some((i) => i.kind !== 'write')
  const action = write && load ? 'load or save' : write ? 'save' : 'load'
  return (
    <div className="schema-warn" role="alert">
      <span className="schema-warn-ic" aria-hidden="true">⚠</span>
      <span>
        <strong>Database out of sync:</strong> couldn’t {action} {tables}.
        {' '}A {many ? 'table or column is' : 'table or column is'} likely missing — changes here won’t be
        kept until the Supabase schema is updated (apply the matching schema file), then reload.
      </span>
      <button className="x" onClick={() => setDismissed(true)} aria-label="Dismiss warning">×</button>
    </div>
  )
}
