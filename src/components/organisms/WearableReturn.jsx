import { useEffect, useRef, useState } from 'react'
import { completeWearableConnection } from '../../api/wearable'

export default function WearableReturn() {
  const started = useRef(false)
  const [result, setResult] = useState(null)
  useEffect(() => {
    if (started.current) return
    started.current = true
    completeWearableConnection().then(path => setResult({ path }), () => setResult({ error: true }))
  }, [])
  return <main className="empty" style={{ padding: 40 }}>
    <h1>{!result ? 'Connecting device…' : result.error ? 'Device connection failed' : 'Device connected'}</h1>
    {result && <><p>{result.error ? 'Return to the client page and restart the connection in this tab.' : 'Device connected. You can now sync readings.'}</p><a className="btn" href={result.path || '/'}>Continue</a></>}
  </main>
}
