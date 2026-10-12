import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Line, Bar } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import ProgressInfo from '../components/atoms/ProgressInfo'
import TrackedMetricsForm from '../components/organisms/TrackedMetricsForm'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { fmtDate, todayISO, addDays } from '../lib/dates'
import { baseOptions, shortLabel } from '../lib/chartSetup'
import { metricKey, metricMeta, trackedMetrics, trackingComparison, trackingSeries, trackingWindow } from '../lib/progressTracking'
import './ProgressPage.css'

const number = n => n == null ? '—' : Number(n.toFixed(1)).toLocaleString()
const timestamp = d => Date.parse(d+'T12:00:00Z')
const dateAt = value => new Date(value).toISOString().slice(0,10)

function ClientTracking({ client }) {
  const { db, tz } = useData(), { openModal } = useModal(), format = useFormat()
  const [selected, setSelected] = useState(''), [days, setDays] = useState('56'), [expanded,setExpanded] = useState(false), [method,setMethod] = useState('all')
  const metrics = trackedMetrics(client), metric = metrics.find(m=>metricKey(m)===selected) || metrics[0]
  const today = todayISO(tz), window = trackingWindow(db,client.id,days,today)
  const result = metric ? trackingSeries(db,client.id,metric,window.start,window.end) : {rows:[],excluded:0}
  const methods = [...new Set(result.rows.map(r=>r.method).filter(Boolean))]
  const activeMethod = methods.includes(method) ? method : 'all'
  const rows = result.rows.filter(r=>activeMethod==='all'||r.method===activeMethod)
  const values = rows.filter(r=>r.value!=null), comparison = metric ? trackingComparison(rows,metric) : null
  const meta = metric && metricMeta(metric), unit = meta?.unit==='kg'?format.unitName():meta?.unit
  const displayValue = (value, definition=meta) => value==null?'—':number(definition.unit==='kg'?format.toDisp(value):value)
  const changeUnit = unit==='%'?'percentage points':unit
  const choose = key => {setSelected(key);setMethod('all');setExpanded(false)}
  const manage = () => openModal(<TrackedMetricsForm client={client} />)
  const actionPath = meta?.destination ? `/clients/${client.id}${meta.destination}` : '/schedule'
  const sourceDetail = row => row.load !== undefined ? [row.load==null?'Load not recorded':`${format.fmtWt(row.load)} load`,row.reps==null?'Reps not recorded':`${row.reps} reps`,row.effort!=null?`${row.effort} ${row.effortType}`:'Effort not recorded'].join(' · ') : row.detail
  const chartOptions = baseOptions()
  chartOptions.plugins.legend.display = methods.length>1 && activeMethod==='all'
  chartOptions.plugins.tooltip = { callbacks: { title: items=>items[0]?.raw?.row?fmtDate(items[0].raw.row.date):'', label: item=>`${item.dataset.label}: ${number(item.parsed.y)} ${unit}`, afterLabel: item=>item.raw?.row ? sourceDetail(item.raw.row) : '' } }
  chartOptions.scales.x = { type:'linear', min:timestamp(window.start), max:timestamp(window.end===window.start?addDays(window.end,1):window.end), grid:{display:false}, ticks:{maxTicksLimit:6,callback:value=>shortLabel(dateAt(value))} }
  chartOptions.scales.y = { ...chartOptions.scales.y, title:{display:true,text:unit}, beginAtZero:metric?.kind==='consistency', ...(metric?.kind==='consistency'&&metric.measure==='bookings'?{min:0,max:100}:{}) }
  const seriesGroups = metric?.kind==='body' ? [...new Set(rows.map(r=>r.method))] : ['Recorded values']
  const data = { datasets:seriesGroups.map((group,i)=>({label:metric?.kind==='body'?group:meta?.subtitle,data:rows.filter(r=>metric?.kind!=='body'||r.method===group).map(row=>({x:timestamp(row.date),y:row.value==null?null:meta.unit==='kg'?format.toDisp(row.value):row.value,row})),borderColor:['#315b4d','#826d9c','#b2843f'][i%3],backgroundColor:metric?.kind==='consistency'?'#315b4dbb':'#fff',borderWidth:2,pointRadius:4,pointHoverRadius:6,spanGaps:false,tension:0,showLine:group!=='Method not recorded',barThickness:22})) }
  return <>
    <div className="pt-client-summary"><p>{client.goal || 'Choose what matters for this client.'}</p><div><Link to={`/clients/${client.id}/progress#${metric?.kind==='body'?'outcomes':metric?.kind==='consistency'?'attendance':'strength'}`}>Client progress →</Link><Link className="btn ghost" to={`/report/${client.id}`}>Report ↗</Link></div></div>
    <div className="pt-section-head"><h2>Tracked metrics</h2><Button variant="ghost" onClick={manage}>{metrics.length?'Manage tracked metrics':'Choose metrics'}</Button></div>
    {!metrics.length ? <section className="pt-card pt-empty"><h2>Track what matters to {client.name.split(' ')[0]}</h2><p>Choose exercises, body measurements or training consistency.</p></section> : <>
      <div className="pt-cards">{metrics.slice(0,3).map(m=>{const definition=metricMeta(m),history=trackingSeries(db,client.id,m,window.start,window.end).rows,last=history.filter(r=>r.value!=null).at(-1);return <button type="button" key={metricKey(m)} className="pt-card pt-metric" aria-pressed={metricKey(m)===metricKey(metric)} onClick={()=>choose(metricKey(m))}><span>{definition.title}</span><small>{definition.subtitle}</small><strong>{displayValue(last?.value,definition)} <em>{last?definition.unit==='kg'?format.unitName():definition.unit:''}</em></strong><small>{last?`${fmtDate(last.date)}${last.partial?' · partial week':''}`:'No values in this period'}</small></button>})}</div>
      <section className="pt-card pt-chart-card"><div className="pt-section-head"><h2>Progress over time</h2><ProgressInfo label="selected metric" text={meta.help} /></div>
        <div className="pt-chart-controls"><label>Metric<select value={metricKey(metric)} onChange={e=>choose(e.target.value)}>{metrics.map(m=><option key={metricKey(m)} value={metricKey(m)}>{metricMeta(m).title} · {metricMeta(m).subtitle}</option>)}</select></label><label>Period<select value={days} onChange={e=>{setDays(e.target.value);setExpanded(false)}}><option value="28">4 weeks</option><option value="56">8 weeks</option><option value="84">12 weeks</option><option value="all">All time</option></select></label>{methods.length>1 && <label>Measurement method<select value={activeMethod} onChange={e=>{setMethod(e.target.value);setExpanded(false)}}><option value="all">All methods · separate series</option>{methods.map(m=><option key={m}>{m}</option>)}</select></label>}</div>
        <div className="pt-change">{comparison ? <><strong>{comparison.change>0?'+':''}{displayValue(comparison.change)} <small>{changeUnit}</small></strong><span>change · {fmtDate(comparison.first.date)}–{fmtDate(comparison.last.date)}</span></> : <><strong>{values.length?'Recorded values':'No measurements yet'}</strong><span>{values.length===1?'1 more dated record needed to compare':values.length>1?metric.kind==='body'?'Compare within one known measurement method.':metric.kind==='consistency'?'Comparison needs two complete weeks.':'Comparison needs records on two separate dates.':''}</span></>}</div>
        <div className="pt-chart">{metric.kind==='consistency'?<Bar data={data} options={chartOptions} role="img" aria-label={`${meta.title} chart, ${values.length} recorded values`} />:<Line data={data} options={chartOptions} role="img" aria-label={`${meta.title} ${meta.subtitle} chart, ${values.length} recorded values`} />}{!values.length && <p className="pt-chart-empty">{meta.title} · {meta.subtitle.toLowerCase()} will appear here.</p>}</div>
        <div className="pt-card-foot"><span>{values.length} {metric.kind==='consistency'?'weekly values':'records'} · {fmtDate(window.start)}–{fmtDate(window.end)}</span><Link to={actionPath}>{meta.action} →</Link></div>
        {result.excluded>0 && <p className="pt-note">{result.excluded} {metric.kind==='exercise'?'sets or older exercise entries':'entries'} excluded: missing or ineligible values. <ProgressInfo label="excluded values" text={meta.help} /></p>}
      </section>
      <section className="pt-card pt-history"><div className="pt-section-head"><h2>Supporting records <small>{rows.length}</small></h2><span>Selected period</span></div>{rows.length?<div className="pt-table-wrap" tabIndex={0} role="region" aria-label="Metric records"><table><thead><tr><th>Date</th><th>Value ({unit})</th><th>Context</th><th>Source</th></tr></thead><tbody>{[...rows].reverse().slice(0,expanded?undefined:4).map(row=><tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{displayValue(row.value)}</td><td>{sourceDetail(row)}</td><td>{row.path?<Link to={row.path}>{row.source} →</Link>:row.source}</td></tr>)}</tbody></table></div>:<p className="pt-empty-history">No records in this period.</p>}{rows.length>4 && <div className="pt-card-foot"><span>{expanded?rows.length:4} of {rows.length} records</span><button className="pt-link" onClick={()=>setExpanded(!expanded)}>{expanded?'Show fewer ↑':'View all records ↓'}</button></div>}</section>
    </>}
    {!!db.logs?.filter(r=>r.clientId===client.id).length && <details className="pt-card pt-legacy"><summary>Previous manual entries</summary><p className="pt-note">Kept separately from workouts and assessments. An old zero may represent a blank input.</p><div className="pt-table-wrap" tabIndex={0} role="region" aria-label="Previous manual entries"><table><thead><tr><th>Date</th><th>Body weight</th><th>Manual squat value</th></tr></thead><tbody>{db.logs.filter(r=>r.clientId===client.id).sort((a,b)=>b.date.localeCompare(a.date)).map(r=><tr key={r.id}><th scope="row">{fmtDate(r.date)}</th><td>{r.weightKg==null?'—':format.fmtWt(r.weightKg)}</td><td>{r.squat==null?'—':format.fmtWt(r.squat)}</td></tr>)}</tbody></table></div></details>}
  </>
}

export default function ProgressPage() {
  const { db } = useData(), [clientId,setClientId] = useState(''), [query,setQuery] = useState('')
  const client = db.clients.find(c=>c.id===clientId)||db.clients[0]
  const clients = db.clients.filter(c=>c.name.toLowerCase().includes(query.toLowerCase())||c.id===client?.id)
  return <div className="progress-tracking"><header className="pt-title"><h1>Progress tracking</h1><p>Your clients. Their own measures of progress.</p></header>{!client?<section className="pt-card pt-empty"><h2>Add a client to start tracking</h2><Link className="btn" to="/clients">Go to Clients →</Link></section>:<><section className="pt-card pt-client"><span className="pt-avatar" aria-hidden="true">{client.name.split(' ').slice(0,2).map(n=>n[0]).join('')}</span><label>Client<select value={client.id} onChange={e=>setClientId(e.target.value)}>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{db.clients.length>6 && <label className="pt-client-search">Find client<input type="search" placeholder="Search client names…" value={query} onChange={e=>setQuery(e.target.value)} /></label>}</section><ClientTracking key={client.id} client={client} /></>}</div>
}
