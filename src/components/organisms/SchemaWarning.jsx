import { useData } from '../../store/DataContext'

// Surfaces a visible banner when the database is out of sync with the app:
//   • a table failed to load (usually a migration never applied), or
//   • a write failed (usually a missing column).
// Either way a missing table/column loads as empty and saves silently fail —
// data appears to "vanish". The banner names the tables so the gap is obvious.
export default function SchemaWarning() {
  const { dbIssues } = useData()
  if (!dbIssues?.length) return null
  const tables = dbIssues.map((i) => i.table).join(', ')
  const write = dbIssues.some((i) => i.kind === 'write')
  const load = dbIssues.some((i) => i.kind !== 'write')
  const action = write && load ? 'load or save' : write ? 'save' : 'load'
  return (
    <div className="schema-warn" role="alert">
      <span className="schema-warn-ic" aria-hidden="true">⚠</span>
      <div>
        <strong>Data issue:</strong> couldn’t {action} {tables}.
        {' '}{write ? 'Some changes may not be saved.' : 'Some records may be missing from this view.'}
        {' '}Check the connection and schema, then reload after the issue is resolved.
        {import.meta.env.DEV && <details>
          <summary>Technical details</summary>
          <ul>{dbIssues.map((issue) => <li key={`${issue.table}:${issue.kind}`}>{issue.table}: {issue.message}</li>)}</ul>
        </details>}
      </div>
    </div>
  )
}
