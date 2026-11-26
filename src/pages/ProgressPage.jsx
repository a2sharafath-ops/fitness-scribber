import HelperTip from '../components/atoms/HelperTip'
import Select from '../components/molecules/Select'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Line, Bar } from 'react-chartjs-2'
import Button from '../components/atoms/Button'
import ProgressInfo from '../components/atoms/ProgressInfo'
import TrackedMetricsForm from '../components/organisms/TrackedMetricsForm'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useFormat } from '../hooks/useFormat'
import { fmtDate, todayISO, addDays } from '../lib/dates'
import { baseOptions, COLORS, shortLabel } from '../lib/chartSetup'
import { metricKey, metricMeta, trackedMetrics, trackingComparison, trackingSeries, trackingWindow } from '../lib/progressTracking'
import { dashboardActivity } from '../lib/dashboard'
import { performedLiftHistory } from '../lib/performedLifts'
import { workoutReviewPath } from '../lib/schedule'
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
  const seriesColors = [COLORS.purple, COLORS.green, COLORS.amber]
  const data = { datasets:seriesGroups.map((group,i)=>({label:metric?.kind==='body'?group:meta?.subtitle,data:rows.filter(r=>metric?.kind!=='body'||r.method===group).map(row=>({x:timestamp(row.date),y:row.value==null?null:meta.unit==='kg'?format.toDisp(row.value):row.value,row})),borderColor:seriesColors[i % seriesColors.length],backgroundColor:metric?.kind==='consistency'?COLORS.purple + 'bb':seriesColors[i % seriesColors.length],borderWidth:2,pointRadius:4,pointHoverRadius:6,spanGaps:false,tension:0,showLine:group!=='Method not recorded',barThickness:22})) }
  return <>
    <div className="pt-client-summary">{client.goal && <p>{client.goal}</p>}<div><Link to={`/clients/${client.id}/progress#${metric?.kind==='body'?'outcomes':metric?.kind==='consistency'?'attendance':'strength'}`}>Client progress →</Link><Link className="btn ghost" to={`/report/${client.id}`}>Report ↗</Link></div></div>
    <div className="pt-section-head"><h2>Tracked metrics</h2><Button variant="ghost" onClick={manage}>{metrics.length?'Manage tracked metrics':'Choose metrics'}</Button></div>
    {!metrics.length ? <section className="pt-card pt-empty"><h2>Track what matters to {client.name.split(' ')[0]}</h2><p>Track exercises, body measurements or training consistency.</p></section> : <>
      <div className="pt-cards">{metrics.slice(0,3).map(m=>{const definition=metricMeta(m),history=trackingSeries(db,client.id,m,window.start,window.end).rows,last=history.filter(r=>r.value!=null).at(-1);return <button type="button" key={metricKey(m)} className="pt-card pt-metric" aria-pressed={metricKey(m)===metricKey(metric)} onClick={()=>choose(metricKey(m))}><span>{definition.title}</span><small>{definition.subtitle}</small><strong>{displayValue(last?.value,definition)} <em>{last?definition.unit==='kg'?format.unitName():definition.unit:''}</em></strong><small>{last?`${fmtDate(last.date)}${last.partial?' · partial week':''}`:'No values in this period'}</small></button>})}</div>
      <section className="pt-card pt-chart-card"><div className="pt-section-head"><h2>Progress over time</h2><ProgressInfo label="selected metric" text={meta.help} /></div>
        <div className="pt-chart-controls"><label>Metric<Select value={metricKey(metric)} onChange={e=>choose(e.target.value)}>{metrics.map(m=><option key={metricKey(m)} value={metricKey(m)}>{metricMeta(m).title} · {metricMeta(m).subtitle}</option>)}</Select></label><label>Period<Select value={days} onChange={e=>{setDays(e.target.value);setExpanded(false)}}><option value="28">4 weeks</option><option value="56">8 weeks</option><option value="84">12 weeks</option><option value="all">All time</option></Select></label>{methods.length>1 && <label>Measurement method<Select value={activeMethod} onChange={e=>{setMethod(e.target.value);setExpanded(false)}}><option value="all">All methods · separate series</option>{methods.map(m=><option key={m}>{m}</option>)}</Select></label>}</div>
        <div className="pt-change">{comparison ? <><strong>{comparison.change>0?'+':''}{displayValue(comparison.change)} <small>{changeUnit}</small></strong><span>change · {fmtDate(comparison.first.date)}–{fmtDate(comparison.last.date)}</span></> : <><strong>{values.length?'Recorded values':'No measurements yet'}</strong><span>{values.length===1?'One more dated record is needed.':values.length>1?metric.kind==='body'?'Compare within one known measurement method.':metric.kind==='consistency'?'Comparison needs two complete weeks.':'Comparison needs records on two separate dates.':''}</span></>}</div>
        <div className="pt-chart">{metric.kind==='consistency'?<Bar data={data} options={chartOptions} role="img" aria-label={`${meta.title} chart, ${values.length} recorded values`} />:<Line data={data} options={chartOptions} role="img" aria-label={`${meta.title} ${meta.subtitle} chart, ${values.length} recorded values`} />}{!values.length && <p className="pt-chart-empty">Record {meta.title} to see it here.</p>}</div>
        <div className="pt-card-foot"><span>{values.length} {metric.kind==='consistency'?'weekly values':'records'} · {fmtDate(window.start)}–{fmtDate(window.end)}</span><Link to={actionPath}>{meta.action} →</Link></div>
        {result.excluded>0 && <p className="pt-note">{result.excluded} {metric.kind==='exercise'?'sets or older entries':'entries'} excluded for missing or ineligible values. <ProgressInfo label="excluded values" text={meta.help} /></p>}
      </section>
      <section className="pt-card pt-history"><div className="pt-section-head"><h2>Supporting records <small>{rows.length}</small></h2><span>Selected period</span></div>{rows.length?<div className="pt-table-wrap" tabIndex={0} role="region" aria-label="Metric records"><table><thead><tr><th>Date</th><th>Value ({unit})</th><th>Context</th><th>Source</th></tr></thead><tbody>{[...rows].reverse().slice(0,expanded?undefined:4).map(row=><tr key={row.id}><th scope="row">{fmtDate(row.date)}</th><td>{displayValue(row.value)}</td><td>{sourceDetail(row)}</td><td>{row.path?<Link to={row.path}>{row.source} →</Link>:row.source}</td></tr>)}</tbody></table></div>:<p className="pt-empty-history">No records in this period.</p>}{rows.length>4 && <div className="pt-card-foot"><span>{expanded?rows.length:4} of {rows.length} records</span><button className="pt-link" onClick={()=>setExpanded(!expanded)}>{expanded?'Show fewer ↑':'View all records ↓'}</button></div>}</section>
    </>}
    {!!db.logs?.filter(r=>r.clientId===client.id).length && <details className="pt-card pt-legacy"><summary>Previous manual entries</summary><HelperTip label="Previous manual entries" text="Older manual entries are separate from workouts and assessments. A zero in the old form could mean the field was blank." /><div className="pt-table-wrap" tabIndex={0} role="region" aria-label="Previous manual entries"><table><thead><tr><th>Date</th><th>Body weight</th><th>Manual squat value</th></tr></thead><tbody>{db.logs.filter(r=>r.clientId===client.id).sort((a,b)=>b.date.localeCompare(a.date)).map(r=><tr key={r.id}><th scope="row">{fmtDate(r.date)}</th><td>{r.weightKg==null?'—':format.fmtWt(r.weightKg)}</td><td>{r.squat==null?'—':format.fmtWt(r.squat)}</td></tr>)}</tbody></table></div></details>}
  </>
}

const trends = [
  { id: 'consistency', label: 'Average consistency', unit: '%' },
  { id: 'weight', label: 'Working weight' },
  { id: 'readiness', label: 'Average readiness', unit: '/100' },
]

function workingWeights(buckets, lifts, exercise) {
  const daily = new Map()
  for (const lift of lifts) {
    if (lift.name !== exercise) continue
    const current = daily.get(lift.date)
    if (current == null || lift.loadKg > current) daily.set(lift.date, lift.loadKg)
  }
  return buckets.map(day => ({ ...day, value: daily.get(day.from) ?? null, samples: daily.has(day.from) ? 1 : 0 }))
}

export default function ProgressPage() {
  const { db, tz } = useData(), format = useFormat()
  const [params, setParams] = useSearchParams()
  const clientId = params.get('client') || ''
  const setClientId = id => setParams(previous => {
    const next = new URLSearchParams(previous)
    if (id) next.set('client', id)
    else next.delete('client')
    return next
  })
  const [query, setQuery] = useState('')
  const [days, setDays] = useState(30), [metric, setMetric] = useState('consistency')
  const [lift, setLift] = useState('')
  const today = todayISO(tz), from = addDays(today, 1 - days)
  const client = db.clients.find(c => c.id === clientId)
  const scope = useMemo(() => client ? { ...db, clients: [client] } : db, [client, db])
  const lifts = useMemo(() => scope.clients.flatMap(c => performedLiftHistory(db, c.id, { actualOnly: true }))
    .filter(r => r.date >= from && r.date <= today && r.loadKg != null && r.loadKg >= 0), [scope, db, from, today])
  const names = [...new Set(lifts.map(row => row.name))].sort()
  const exercise = names.includes(lift) ? lift : names[0]
  const series = useMemo(() => {
    const range = { today: addDays(today, 1), days, bucketDays: 1 }
    const consistency = dashboardActivity(scope, { ...range, metric: 'consistency' }).buckets
    const readiness = dashboardActivity(scope, { ...range, metric: 'readiness' }).buckets
    return { consistency, readiness, weight: workingWeights(consistency, lifts, exercise) }
  }, [scope, today, days, lifts, exercise])
  const valueLabel = (value, id) => value == null ? '—' : id === 'weight' ? format.fmtWt(value) :
    number(value) + trends.find(t => t.id === id).unit
  const clients = new Map(scope.clients.map(c => [c.id, c.name]))
  const moments = (db.workouts || []).filter(w => clients.has(w.clientId) && w.status === 'completed' && w.date >= from && w.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  const points = series[metric].filter(p => p.value != null)
  const definition = trends.find(t => t.id === metric)
  const options = baseOptions()
  options.plugins.legend.display = false
  options.scales.x.ticks.maxTicksLimit = 6
  options.scales.y.title = { display: true, text: metric === 'weight' ? format.unitName() : definition.unit }
  options.animation = false
  if (!db.clients.length) return <section className="progress-tracking"><h1>Progress</h1><p>Add a client to start tracking progress.</p><Link to="/clients">View clients</Link></section>
  return <div className="progress-tracking"><header className="pt-title"><h1>Progress</h1></header>
    <section className="pt-card pt-client">
      <label>Clients<Select value={client?.id || ''} onChange={e => setClientId(e.target.value)}>
        <option value="">All clients</option>{db.clients.filter(c => c.id === clientId || c.name.toLowerCase().includes(query.toLowerCase())).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select></label>
      {db.clients.length > 6 && <label>Find client<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>}
      <label className="pt-mobile-metric">Metric<Select value={metric} onChange={e => setMetric(e.target.value)}>{trends.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></label>
      <label>Period<Select value={days} onChange={e => setDays(Number(e.target.value))}>{[7,30,90].map(n => <option key={n} value={n}>{n} days</option>)}</Select></label>
    </section>
    <section className="pt-card pt-chart-card pt-trend" aria-label="Metric and trend">
    <div className="pt-cards">{trends.map(t => {
      const recorded = series[t.id].filter(p => p.value != null)
      const samples = recorded.reduce((n, p) => n + p.samples, 0)
      const value = t.id === 'weight' ? recorded.at(-1)?.value : samples ? recorded.reduce((n,p) => n + p.value * p.samples, 0) / samples : null
      const delta = recorded.length > 1 ? recorded.at(-1).value - recorded[0].value : null
      return <button key={t.id} className="pt-card pt-metric" aria-pressed={metric === t.id} onClick={() => setMetric(t.id)}>
        <span>{t.label}{t.id === 'weight' && exercise ? ' · ' + exercise : ''}</span><strong>{valueLabel(value, t.id)}</strong>
        <small>{delta == null ? 'More records are needed to compare.' : (delta > 0 ? '+' : '') + (t.id === 'weight' ? format.fmtWt(delta) : number(delta) + ' pts') + ' in period'}</small>
      </button>
    })}</div>
    <div className="pt-section-head"><h2>{definition.label}</h2></div>
      {metric === 'weight' && names.length > 0 && <div className="pt-chart-controls"><label>Exercise<Select value={exercise} onChange={e => setLift(e.target.value)}>{names.map(n => <option key={n}>{n}</option>)}</Select></label></div>}
      {points.length ? <div className="pt-chart"><Line options={options} role="img" aria-label={definition.label + ' from ' + fmtDate(from) + ' to ' + fmtDate(today)} data={{
        labels: series[metric].map(p => shortLabel(p.from)), datasets: [{ label: definition.label, data: series[metric].map(p => metric === 'weight' && p.value != null ? format.toDisp(p.value) : p.value),
          borderColor: COLORS.purple, pointRadius: 3, backgroundColor: COLORS.purple + '25', fill: true, tension: 0.2, spanGaps: false }]
      }} /></div> : <p className="pt-empty-history">No values recorded in this period.</p>}
      <div className="pt-card-foot"><span>{metric === 'weight' ? 'Highest recorded set weight per day' : metric === 'consistency' ? 'Prescribed workout days with a completed log' : 'Recorded readiness scores for active clients'}</span><span>{fmtDate(from)} – {fmtDate(today)}</span></div>
    </section>
    <section className="pt-card pt-history"><div className="pt-section-head"><h2>Recent milestones</h2></div>
      {moments.length ? <ul className="progress-moments">{moments.map(w => <li key={w.id}><Link to={workoutReviewPath(w)}>{clients.get(w.clientId)} · {w.name || w.title || 'Completed workout'}</Link><small>{fmtDate(w.date)}</small></li>)}</ul> : <p className="pt-empty-history">No completed workouts in this period.</p>}
    </section>
    {client && <ClientTracking key={client.id} client={client} />}
  </div>
}
