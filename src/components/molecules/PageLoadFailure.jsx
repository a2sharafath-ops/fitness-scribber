export default function PageLoadFailure() {
 return <section role="alert" className="empty">
  <h1>This page could not be loaded</h1>
  <p>Check your connection, then reload. Saved history and pending-operation recovery records have not been cleared.</p>
  <button className="btn primary" onClick={() => window.location.reload()}>Reload page</button>
 </section>
}
