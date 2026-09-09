// DEV-only navigation component fixture. No authentication, client records or
// backend operations; this is not new hosted pooling acceptance evidence.
import {useState} from 'react'
import {Link, useLocation, useNavigate} from 'react-router-dom'
import PoolingNavigation from '../../src/components/organisms/PoolingNavigation'
import {poolingNavigation} from '../../src/lib/pooling/navigation'
import '../../src/index.css'

export function NavigationFixture() {
  const location = useLocation(), navigate = useNavigate()
  const [workspace, setWorkspace] = useState(true), [active, setActive] = useState(true), [extensions, setExtensions] = useState(true), [ready, setReady] = useState(true), [zoom, setZoom] = useState(false)
  const scope = {clientId: workspace ? 'fictional-navigation' : null, r1:active, r2:active&&extensions, r3:active&&extensions}
  // Targets intentionally describe only navigation. Their real page markup is
  // separately checked by navigation.test.js; no domain forms are fabricated.
  const targets = Object.values(poolingNavigation({...scope,r1:true,r2:true,r3:true})).flat().filter(row => row.to?.split('#')[0] === location.pathname)
  return <main className="pooling-workspace" style={{padding:16,fontSize:zoom?'200%':undefined}}>
    <h1>Isolated navigation fixture</h1><p>Production navigation component; synthetic section headings only. No backend connection.</p>
    <section className="card"><h2>Fixture controls</h2>
      <label><input type="checkbox" checked={workspace} onChange={e=>setWorkspace(e.target.checked)}/>Workspace exists</label>
      <label><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Pooling active</label>
      <label><input type="checkbox" checked={extensions} onChange={e=>setExtensions(e.target.checked)}/>R2 and R3 active</label>
      <label><input type="checkbox" checked={ready} onChange={e=>setReady(e.target.checked)}/>Sections loaded</label>
      <label><input type="checkbox" checked={zoom} onChange={e=>setZoom(e.target.checked)}/>200% text fixture</label>
      <button onClick={()=>navigate(-1)}>Fixture back</button>{' '}<button onClick={()=>navigate(1)}>Fixture forward</button>
      <output aria-label="Current fixture route">{location.pathname}{location.hash}</output>
    </section>
    <PoolingNavigation {...scope} ready={ready}/>
    {ready ? targets.map(row => <section className="card" key={row.key} style={{minHeight:250}}>
      <h2 id={row.to.split('#')[1]} tabIndex={-1}>{row.label} destination</h2>
      <Link to={`${location.pathname}#pooling-navigation`}>Back to steps</Link>
    </section>) : <p role="status">Synthetic sections not yet loaded</p>}
  </main>
}
export function ViewportFixture() {
  const [width,setWidth] = useState(390)
  return <main><h1>Navigation viewport check</h1>{[390,768,1280].map(value => <button key={value} onClick={()=>setWidth(value)}>Viewport {value}px</button>)}<iframe title="Navigation viewport" src="/pooling-test" style={{display:'block',width,maxWidth:'100%',height:900,border:'1px solid #777'}}/></main>
}
