import { useState, useEffect } from 'react'
import ModalShell from '../../molecules/ModalShell'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import RangeSlider from '../../atoms/RangeSlider'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { saveAssessmentRecord } from '../../../lib/assessmentWrite'
import { todayISO, addDays, fmtDate } from '../../../lib/dates'
import { assessmentReview, isAssessmentDate, reassessmentDateError } from '../../../lib/assessmentReview'
import { toast } from '../../../lib/toast'
import { ACTIVE_TYPES, ACTIVITY_LEVELS, typeMeta, estOneRepMax, movementScore, latest, forClient } from '../../../lib/assessment'
import { SECTIONS, SEVERITY, itemsInSection, isPresent } from '../../../lib/posture'
import { FIELD_LABELS, parseBodyComp } from '../../../lib/bodyCompPdf'
import { BODY_COMP_ACCEPT, BODY_COMP_TEMPLATE, bodyCompFileKind, readBodyCompTable, fillBodyCompImport } from '../../../lib/bodyCompImport'
import { screeningsFor, goalsFromScreening } from '../../../lib/screening'
import Icon from '../../atoms/Icon'
import Autocomplete from '../../molecules/Autocomplete'

const numOrNull = (v) => (v === '' || v == null || Number.isNaN(+v) ? null : +v)

// Shared date + phase header for every assessment form.
function MetaRow({ f, setF }) {
  const { db } = useData()
  const suggested = assessmentReview({ date: f.date, data: {} }, db.settings?.reassessIntervalDays)
  const hasReviewDate = Object.hasOwn(f, 'nextReassessmentDate')
  const error = hasReviewDate ? reassessmentDateError(f.date, f.nextReassessmentDate) : ''
  return (
    <>
    <div className="row2">
      <Field label="Assessment date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <Field label="Phase">
        <select value={f.phase} onChange={(e) => setF({ ...f, phase: e.target.value })}>
          <option value="baseline">Baseline (onboarding)</option>
          <option value="reassessment">Reassessment</option>
        </select>
      </Field>
    </div>
    {hasReviewDate && <div style={{ marginBottom: 12 }}>
      <Field label="Next reassessment date"><input type="date" value={f.nextReassessmentDate} min={isAssessmentDate(f.date) ? addDays(f.date, 1) : undefined} aria-invalid={!!error} onChange={(e) => setF({ ...f, nextReassessmentDate: e.target.value })} /></Field>
      <div className="flex between gap" style={{ flexWrap: 'wrap', marginTop: 6 }}>
        <small className="muted">Optional · leave blank if not scheduled.</small>
        {suggested.dueDate && <Button variant="ghost" size="sm" onClick={() => setF({ ...f, nextReassessmentDate: suggested.dueDate })}>Use {suggested.intervalDays}-day default · {fmtDate(suggested.dueDate)}</Button>}
      </div>
      {error && <p role="alert" style={{ color: 'var(--accent)', fontSize: 12 }}>{error}</p>}
    </div>}
    </>
  )
}

// Save handler for create OR edit. When `record` is supplied the existing
// assessment is updated in place; otherwise a new one is pushed.
function useSave(clientId, type, buildData, extra, record) {
  const { commit } = useData()
  const { closeModal } = useModal()
  return (f) => {
    if (Object.hasOwn(f, 'nextReassessmentDate')) {
      const error = reassessmentDateError(f.date, f.nextReassessmentDate)
      if (error) { toast(error, 'error'); return }
    }
    commit((d) => {
      const savedRecord = saveAssessmentRecord(d, { clientId, type, form: f, data: buildData(), record })
      if (savedRecord) extra?.(d, savedRecord)
    })
    closeModal()
  }
}

// ---- Movement screen — NASM static posture + OHSA --------------------------
// Legacy 0–3 records still open in the old pattern editor; everything new is
// captured as postural compensations (see lib/posture.js). One collapsible
// section per assessment area; OHSA is open by default (highest yield).
export function MovementScreenForm({ clientId, record, defaultPhase }) {
  // Historical 0–3 records open in the legacy editor; everything else is NASM.
  const isLegacy = record?.data && record.data.protocol !== 'nasm' && Array.isArray(record.data.screens)
  return isLegacy
    ? <LegacyMovementForm clientId={clientId} record={record} defaultPhase={defaultPhase} />
    : <NasmMovementForm clientId={clientId} record={record} defaultPhase={defaultPhase} />
}

function NasmMovementForm({ clientId, record, defaultPhase }) {
  const { closeModal } = useModal()
  const [f, setF] = useState({ date: record?.date || todayISO(), phase: record?.phase || defaultPhase || 'baseline', notes: record?.notes || '', posture: record?.data?.posture || '', nextReassessmentDate: record?.data?.nextReassessmentDate || '' })
  const [findings, setFindings] = useState(() => ({ ...(record?.data?.findings || {}) }))
  const [open, setOpen] = useState({ ohsa: true, static: false })

  const setItem = (id, patch) => setFindings((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  const data = () => ({ protocol: 'nasm', findings, posture: f.posture.trim() })
  const save = useSave(clientId, 'movement', data, undefined, record)

  const live = movementScore(data())

  return (
    <ModalShell title={<><Icon name="treadmill" size={16} /> Movement screen</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      <div className="pos-score">
        <span>Movement quality <b>{live.score}/100</b></span>
        <span className="muted">{live.findings} compensation{live.findings === 1 ? '' : 's'}{live.asymmetry ? ` · ${live.asymmetry} asymmetric` : ''}{live.pain ? ` · ${live.pain} pain` : ''}</span>
      </div>

      {SECTIONS.map(([key, title]) => (
        <div className="pos-sec" key={key}>
          <button type="button" className="pos-sec-h" aria-expanded={open[key]} onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}>
            <span>{open[key] ? '▾' : '▸'} {title}</span>
            <span className="muted">{itemsInSection(key).filter((it) => isPresent(findings[it.id], it)).length} flagged</span>
          </button>
          {open[key] && (
            <div className="pos-rows">
              {itemsInSection(key).map((it) => (
                <PostureRow key={it.id} item={it} f={findings[it.id]} onChange={(p) => setItem(it.id, p)} />
              ))}
            </div>
          )}
        </div>
      ))}

      <Field label="Posture"><input value={f.posture} onChange={(e) => setF({ ...f, posture: e.target.value })} placeholder="e.g. Mild anterior pelvic tilt" /></Field>
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Overall observations, cues, limitations…" /></Field>
    </ModalShell>
  )
}

// One compensation row: side toggles (L/R or present), severity, pain, note.
function PostureRow({ item, f = {}, onChange }) {
  const on = isPresent(f, item)
  const chip = (label, active, patch) => (
    <button type="button" className={'pos-chip' + (active ? ' on' : '')} aria-pressed={active} onClick={() => onChange(patch)}>{label}</button>
  )
  return (
    <div className={'pos-row' + (on ? ' on' : '')}>
      <div className="pos-row-top">
        <span className="pos-cp">{item.group}</span>
        <span className="pos-label">{item.label}</span>
        <span className="pos-sides">
          {item.kind === 'midline'
            ? chip('Present', !!f.mid, { mid: !f.mid })
            : <>{chip('L', !!f.l, { l: !f.l })}{chip('R', !!f.r, { r: !f.r })}</>}
        </span>
      </div>
      {on && (
        <div className="pos-row-detail">
          <select value={f.severity || 'moderate'} onChange={(e) => onChange({ severity: e.target.value })} aria-label={item.label + ' severity'}>
            {SEVERITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="pos-pain"><input type="checkbox" checked={!!f.pain} onChange={(e) => onChange({ pain: e.target.checked })} /> pain</label>
          <input className="pos-note" value={f.note || ''} onChange={(e) => onChange({ note: e.target.value })} placeholder="note…" aria-label={item.label + ' note'} />
        </div>
      )}
    </div>
  )
}

// Kept so historical 0–3 records stay editable exactly as before.
function LegacyMovementForm({ clientId, record, defaultPhase }) {
  const { closeModal } = useModal()
  const [f, setF] = useState({ date: record?.date || todayISO(), phase: record?.phase || defaultPhase || 'baseline', notes: record?.notes || '', posture: record?.data?.posture || '', nextReassessmentDate: record?.data?.nextReassessmentDate || '' })
  const [screens, setScreens] = useState(record.data.screens.map((s) => ({ ...s })))
  const upd = (i, k, v) => setScreens(screens.map((s, j) => (j === i ? { ...s, [k]: v } : s)))
  const save = useSave(clientId, 'movement', () => ({ screens, posture: f.posture.trim() }), undefined, record)
  return (
    <ModalShell title={<><Icon name="treadmill" size={16} /> Movement screen (legacy)</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      <div className="asr-head"><span>Pattern</span><span>Score /3</span><span>Pain</span></div>
      {screens.map((s, i) => (
        <div className="asr-row" key={s.pattern}>
          <span className="asr-pat">{s.pattern}</span>
          <select value={s.score} onChange={(e) => upd(i, 'score', +e.target.value)} aria-label={s.pattern + ' score'}>
            {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <label className="asr-pain"><input type="checkbox" checked={s.pain} onChange={(e) => upd(i, 'pain', e.target.checked)} /> pain</label>
        </div>
      ))}
      <Field label="Posture"><input value={f.posture} onChange={(e) => setF({ ...f, posture: e.target.value })} placeholder="e.g. Mild anterior pelvic tilt" /></Field>
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Compensations, cues, limitations…" /></Field>
    </ModalShell>
  )
}

// Upload control for a device report (InBody / DEXA / BIA printout, or a scan
// or photo of one). Reading the file only pre-fills the form — nothing is
// stored until the coach saves.
function ReportImport({ pdf, imported, importedSource, onPick, candidates, selectedIndex, onSelect, onApply, onCancel }) {
  const filled = imported.map((k) => FIELD_LABELS[k]).filter(Boolean)
  const selected = candidates[Number(selectedIndex)]
  return (
    <div className="bc-import">
      <label className={'bc-drop' + (pdf.busy ? ' busy' : '')}>
        <input type="file" aria-label="Upload body composition report" accept={BODY_COMP_ACCEPT} disabled={pdf.busy}
          onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = '' }} />
        <span className="bc-drop-ic"><Icon name={pdf.busy ? 'activity' : 'clipboard'} size={18} /></span>
        <span className="bc-drop-txt">
          <b>{pdf.busy ? (pdf.step || 'Reading report…') : 'Import body composition report'}</b>
          <em>{pdf.busy ? pdf.name : 'PDF, images, CSV, TSV, Excel (.xlsx) or TXT · up to 10 MB'}</em>
          {pdf.busy && pdf.pct > 0 && (
            <span className="bc-prog"><span className="bc-prog-fill" style={{ width: Math.round(pdf.pct * 100) + '%' }} /></span>
          )}
        </span>
      </label>
      <a className="bc-template" href={'data:text/csv;charset=utf-8,' + encodeURIComponent(BODY_COMP_TEMPLATE)} download="body-composition-template.csv">CSV template</a>
      {candidates.length > 0 && <div className="bc-table-preview">
        <Field label={`Choose measurements · ${candidates.length} row${candidates.length === 1 ? '' : 's'}`}><select aria-label="Import measurement row" value={selectedIndex} onChange={e => onSelect(e.target.value)}>
          <option value="">Select a row</option>{candidates.map((row, index) => <option key={index} value={String(index)}>{row.label}</option>)}
        </select></Field>
        {selectedIndex !== '' && selected && <>
          <p className="bc-row-label">{selected.label}{selected.method ? ` · ${selected.method}` : ''}</p>
          <dl>{selected.found.map(key => <div key={key}><dt>{FIELD_LABELS[key]}</dt><dd>{selected.values[key]}{['massKg', 'leanMassKg', 'skeletalMuscleKg'].includes(key) ? ' kg' : key === 'bodyFatPct' ? '%' : key === 'hydrationL' ? ' L' : ''}</dd></div>)}</dl>
          {selected.warnings.map((warning, i) => <p className="bc-row-label" key={i}>{warning}</p>)}
        </>}
        <div className="flex gap"><Button size="sm" disabled={selectedIndex === '' || !selected} onClick={onApply}>Use selected measurements</Button><Button variant="ghost" size="sm" onClick={onCancel}>Cancel import</Button></div>
      </div>}
      {pdf.error && <div className="bc-import-msg err" role="alert"><Icon name="alert" size={13} /> {pdf.error}</div>}
      {!pdf.error && filled.length > 0 && (
        <div className={'bc-import-msg ' + (importedSource.ocr ? 'warn' : 'ok')} role="status">
          <Icon name={importedSource.ocr ? 'alert' : 'check'} size={13} />
          <span>
            Filled {filled.length} field{filled.length === 1 ? '' : 's'} from <b>{importedSource.name}</b>: {filled.join(', ')}.
            {importedSource.ocr
              ? ' Read from a scan by text recognition, so digits can be misread — please check every value against the report before saving.'
              : ' Check them before saving.'}
          </span>
        </div>
      )}
    </div>
  )
}

// A body-comp number input that shows whether its value came from a report.
function BcField({ label, k, f, set, imported, step = '0.1' }) {
  const fromReport = imported.includes(k)
  return (
    <Field label={<>{label}{fromReport && <span className="bc-tag" title="Filled from the imported report">Import</span>}</>}>
      <input type="number" step={step} value={f[k]} onChange={set(k)} className={fromReport ? 'bc-filled' : undefined} />
    </Field>
  )
}

// ---- Body composition (InBody / BIA / calipers) ----
export function BodyCompForm({ clientId, record, defaultPhase }) {
  const { closeModal } = useModal()
  const d0 = record?.data || {}
  const [f, setF] = useState({
    date: record?.date || todayISO(), phase: record?.phase || defaultPhase || 'baseline', notes: record?.notes || '', method: d0.method || 'InBody', nextReassessmentDate: d0.nextReassessmentDate || '',
    massKg: d0.massKg ?? '', bodyFatPct: d0.bodyFatPct ?? '', leanMassKg: d0.leanMassKg ?? '',
    skeletalMuscleKg: d0.skeletalMuscleKg ?? '', visceralFat: d0.visceralFat ?? '', hydrationL: d0.hydrationL ?? '',
  })
  // Keep the applied source separate from a new report being previewed.
  const [imported, setImported] = useState([])
  const [importedSource, setImportedSource] = useState({ name: '', ocr: false })
  // Editing a field by hand makes it the coach's own value, so drop its flag.
  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value })
    setImported((prev) => prev.filter((x) => x !== k))
  }
  const [pdf, setPdf] = useState({ busy: false, name: '', error: '', step: '', pct: 0, ocr: false })
  const [candidates, setCandidates] = useState([])
  const [selectedIndex, setSelectedIndex] = useState('')
  const applyImport = () => {
    const selected = candidates[Number(selectedIndex)]
    if (selectedIndex === '' || !selected) return
    setF(previous => fillBodyCompImport(previous, selected, imported, !!record))
    setImported(selected.found)
    setImportedSource({ name: pdf.name, ocr: false })
    setCandidates([])
  }

  // The OCR worker holds a few hundred MB of WASM heap; drop it with the modal.
  useEffect(() => () => { import('../../../lib/ocr').then((m) => m.releaseOcr()).catch(() => {}) }, [])

  // Read a device report and pre-fill the form. Values are never saved
  // automatically — the coach reviews them and presses Save as usual.
  //
  // Two paths: a normal PDF export carries a text layer, which is exact and
  // instant. A scan or phone photo has none, so we rasterise and OCR it —
  // slower and fallible, hence the explicit "check these" warning afterwards.
  const onPdf = async (file) => {
    if (!file) return
    setCandidates([])
    setSelectedIndex('')
    const busy = (step, pct = 0, ocr = false) => setPdf({ busy: true, name: file.name, error: '', step, pct, ocr })
    busy('Opening file…')
    try {
      const kind = bodyCompFileKind(file)
      if (['csv', 'tsv', 'xlsx'].includes(kind)) {
        const rows = await readBodyCompTable(file)
        setCandidates(rows)
        setSelectedIndex(rows.length === 1 ? '0' : '')
        setPdf({ busy: false, name: file.name, error: '', step: '', pct: 0, ocr: false })
        return
      }
      const image = kind === 'image'
      let text = ''
      let viaOcr = false

      if (kind === 'txt') {
        text = await file.text()
        if (!text.trim()) throw new Error('That text report is empty.')
      } else if (!image) {
        // pdf.js is ~330 kB, so it loads only when a report is actually uploaded.
        const { extractPdfText } = await import('../../../lib/pdfText')
        busy('Reading PDF…')
        text = await extractPdfText(file)
      }

      // No text layer (scan/photo) → OCR.
      if (!text && kind !== 'txt') {
        viaOcr = true
        const { imagesToText } = await import('../../../lib/ocr')
        let sources
        if (image) {
          sources = [file]
        } else {
          const { renderPdfPages } = await import('../../../lib/pdfText')
          busy('Rendering scanned pages…', 0, true)
          sources = await renderPdfPages(file, (done, total) => busy(`Rendering page ${done} of ${total}…`, done / total, true))
        }
        text = await imagesToText(sources, (phase, progress, page, total) => {
          if (phase === 'loading') busy('Loading text recognition…', progress || 0, true)
          else if (phase === 'page') busy(total > 1 ? `Scanning page ${page} of ${total}…` : 'Scanning report…', 0, true)
          else busy('Reading text…', progress || 0, true)
        })
      }

      const { values, found, method, date } = parseBodyComp(text, { ocr: viaOcr })
      if (!found.length) {
        setPdf({
          busy: false, name: file.name, step: '', pct: 0, ocr: viaOcr,
          error: viaOcr
            ? "Couldn't read any values from that scan. Try a sharper, straight-on image, or enter the values manually below."
            : "Couldn't find any body-composition values in that report. Enter them manually below.",
        })
        return
      }
      setF(prev => fillBodyCompImport(prev, { values, found, method, date }, imported, !!record))
      setImported(found)
      setImportedSource({ name: file.name, ocr: viaOcr })
      setPdf({ busy: false, name: file.name, error: '', step: '', pct: 0, ocr: viaOcr })
    } catch (err) {
      setPdf({ busy: false, name: file.name, step: '', pct: 0, ocr: false, error: err?.message || 'That file could not be read.' })
    }
  }
  const data = () => ({
    method: f.method, massKg: numOrNull(f.massKg), bodyFatPct: numOrNull(f.bodyFatPct),
    leanMassKg: numOrNull(f.leanMassKg), skeletalMuscleKg: numOrNull(f.skeletalMuscleKg),
    visceralFat: numOrNull(f.visceralFat), hydrationL: numOrNull(f.hydrationL),
  })
  // Mirror only the latest assessment into the current profile snapshot and
  // retain the source record. An explicit profile override stays in control.
  const save = useSave(clientId, 'body_comp', data, (d, savedRecord) => {
    const c = d.clients.find((x) => x.id === clientId)
    if (!c || latest(forClient(d.assessments, clientId), 'body_comp')?.id !== savedRecord.id) return
    c.anthro = c.anthro || {}
    c.anthro._sources = c.anthro._sources || {}
    const v = data()
    for (const field of ['massKg', 'bodyFatPct', 'leanMassKg']) {
      const prior = c.anthro._sources[field]
      if (prior?.kind === 'profile') continue
      if (v[field] != null) {
        c.anthro[field] = v[field]
        c.anthro._sources[field] = { kind: 'body_comp', recordId: savedRecord.id, date: savedRecord.date, method: v.method }
      } else if (prior?.kind === 'body_comp') {
        c.anthro[field] = null
        delete c.anthro._sources[field]
      }
    }
  }, record)
  return (
    <ModalShell title={<><Icon name="tuning" size={16} /> Body composition</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button disabled={pdf.busy || candidates.length > 0} onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      <ReportImport pdf={pdf} imported={imported} importedSource={importedSource} onPick={onPdf} candidates={candidates} selectedIndex={selectedIndex} onSelect={setSelectedIndex} onApply={applyImport} onCancel={() => setCandidates([])} />
      <Field label="Method">
        <select value={f.method} onChange={set('method')}><option>InBody</option><option>BIA</option><option>Calipers</option><option>DEXA</option></select>
      </Field>
      <div className="row3">
        <BcField label="Body mass (kg)" k="massKg" f={f} set={set} imported={imported} />
        <BcField label="Body fat (%)" k="bodyFatPct" f={f} set={set} imported={imported} />
        <BcField label="Lean mass (kg)" k="leanMassKg" f={f} set={set} imported={imported} />
      </div>
      <div className="row3">
        <BcField label="Skeletal muscle (kg)" k="skeletalMuscleKg" f={f} set={set} imported={imported} />
        <BcField label="Visceral fat" k="visceralFat" f={f} set={set} imported={imported} step="1" />
        <BcField label="Total body water (L)" k="hydrationL" f={f} set={set} imported={imported} />
      </div>
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Device, hydration state, time of day…" /></Field>
    </ModalShell>
  )
}

// ---- Fitness (strength lifts + endurance + mobility) ----
// The strength section is a 1RM-estimation surface: each lift takes a test
// weight × reps, from which we compute an estimated 1RM (Epley; 1 rep = a true
// 1RM). The estimates live on the assessment record itself; the workout
// builder reads them straight from there (resolveTrainingMax → assessmentMaxKg),
// so nothing extra needs persisting and recent training PRs still win.
export function FitnessAssessmentForm({ clientId, record, defaultPhase }) {
  const { db } = useData()
  const { closeModal } = useModal()
  const d0 = record?.data || {}
  const [f, setF] = useState({
    date: record?.date || todayISO(), phase: record?.phase || defaultPhase || 'baseline', notes: record?.notes || '',
    enduranceTest: d0.endurance?.test || '', enduranceResult: d0.endurance?.result || '', nextReassessmentDate: d0.nextReassessmentDate || '',
  })
  const [strength, setStrength] = useState(d0.strength?.length
    // Back-compat: older records stored only { lift, valueKg } (a stated 1RM).
    ? d0.strength.map((s) => ({ lift: s.lift || '', weightKg: (s.weightKg ?? s.valueKg) ?? '', reps: String(s.reps ?? 1) }))
    : [{ lift: '', weightKg: '', reps: '1' }])
  const [mobility, setMobility] = useState(d0.mobility?.length
    ? d0.mobility.map((m) => ({ joint: m.joint || '', value: m.value || '', side: m.side || '' }))
    : [{ joint: '', value: '', side: '' }])
  // Exercise-library names for the lift autocomplete, alphabetical.
  const liftNames = [...new Set(db.exercises.map((e) => e.name))].sort((a, b) => a.localeCompare(b))
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const updS = (i, k, v) => setStrength(strength.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const updM = (i, k, v) => setMobility(mobility.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  // Only rows with a lift name and a valid estimated 1RM are kept.
  const strengthOut = () => strength
    .map((r) => ({ lift: r.lift.trim(), weightKg: numOrNull(r.weightKg), reps: numOrNull(r.reps) || 1, valueKg: estOneRepMax(r.weightKg, r.reps) }))
    .filter((r) => r.lift && r.valueKg != null)
  const data = () => ({
    strength: strengthOut(),
    endurance: f.enduranceTest.trim() ? { test: f.enduranceTest.trim(), result: f.enduranceResult.trim() } : null,
    mobility: mobility.filter((r) => r.joint.trim()).map((r) => ({ joint: r.joint.trim(), value: r.value.trim(), side: r.side.trim() })),
  })
  const save = useSave(clientId, 'fitness', data, undefined, record)
  return (
    <ModalShell title={<><Icon name="dumbbellAlt" size={16} /> Fitness assessment</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />

      <div className="section-title" style={{ margin: '4px 0 2px', fontSize: 13 }}>Strength — estimated 1RM</div>
      <p className="muted" style={{ fontSize: 11.5, margin: '0 0 8px' }}>Enter a test weight and reps; we estimate the 1RM (1 rep = a true 1RM). These feed the workout builder's Training Max.</p>
      {strength.map((r, i) => {
        const est = estOneRepMax(r.weightKg, r.reps)
        return (
          <div className="asf-1rm-row" key={i}>
            <div className="asf-lift-head"><span>Exercise {i + 1}</span><button className="x" aria-label={`Remove lift ${i + 1}`} onClick={() => setStrength(strength.filter((_, j) => j !== i))}>×</button></div>
            <Autocomplete value={r.lift} onChange={(v) => updS(i, 'lift', v)} options={liftNames}
              placeholder="Search exercises" ariaLabel={`Lift ${i + 1}`} />
            {r.lift && <p className="asf-lift-name">{r.lift}</p>}
            <div className="asf-lift-metrics">
              <Field label="Weight (kg)"><input type="number" step="0.5" min="0" value={r.weightKg} onChange={(e) => updS(i, 'weightKg', e.target.value)} placeholder="kg" aria-label={`Test weight kg ${i + 1}`} /></Field>
              <Field label="Reps"><input type="number" step="1" min="1" value={r.reps} onChange={(e) => updS(i, 'reps', e.target.value)} placeholder="1" aria-label={`Reps ${i + 1}`} /></Field>
              <Field label="Est. 1RM"><output className="asf-1rm-est" aria-live="polite">{est != null ? `${est} kg` : '—'}</output></Field>
            </div>
          </div>
        )
      })}
      <Button variant="ghost" size="sm" onClick={() => setStrength([...strength, { lift: '', weightKg: '', reps: '1' }])}>＋ Add lift</Button>

      <div className="section-title" style={{ margin: '12px 0 6px', fontSize: 13 }}>Endurance</div>
      <div className="row2">
        <Field label="Test"><input value={f.enduranceTest} onChange={set('enduranceTest')} placeholder="e.g. 3-min step" /></Field>
        <Field label="Result"><input value={f.enduranceResult} onChange={set('enduranceResult')} placeholder="e.g. HRrec 28 bpm" /></Field>
      </div>

      <div className="section-title" style={{ margin: '12px 0 6px', fontSize: 13 }}>Mobility</div>
      {mobility.map((r, i) => (
        <div className="asf-row3" key={i}>
          <input value={r.joint} onChange={(e) => updM(i, 'joint', e.target.value)} placeholder="Joint (e.g. Ankle DF)" aria-label="Joint" />
          <input value={r.value} onChange={(e) => updM(i, 'value', e.target.value)} placeholder="ROM (e.g. 8 cm)" aria-label="ROM" />
          <input value={r.side} onChange={(e) => updM(i, 'side', e.target.value)} placeholder="Side/notes" aria-label="Side" />
          <button className="x" aria-label="Remove mobility row" onClick={() => setMobility(mobility.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setMobility([...mobility, { joint: '', value: '', side: '' }])}>＋ Add joint</Button>

      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Overall observations…" /></Field>
    </ModalShell>
  )
}

// ---- Pain (sites: area / severity 0–10 / aggravating movement) ----
export function PainAssessmentForm({ clientId, record, defaultPhase }) {
  const { closeModal } = useModal()
  const [f, setF] = useState({ date: record?.date || todayISO(), phase: record?.phase || defaultPhase || 'reassessment', notes: record?.notes || '' })
  const [sites, setSites] = useState(record?.data?.sites?.length
    ? record.data.sites.map((s) => ({ area: s.area || '', severity: s.severity ?? 3, aggravating: s.aggravating || '', limitation: s.limitation || '' }))
    : [{ area: '', severity: 3, aggravating: '', limitation: '' }])
  const upd = (i, k, v) => setSites(sites.map((s, j) => (j === i ? { ...s, [k]: v } : s)))
  const data = () => ({ sites: sites.filter((s) => s.area.trim()).map((s) => ({ area: s.area.trim(), severity: +s.severity, aggravating: s.aggravating.trim(), limitation: s.limitation.trim() })) })
  const save = useSave(clientId, 'pain', data, undefined, record)
  return (
    <ModalShell title={<><Icon name="danger" size={16} /> Pain assessment</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      {sites.map((s, i) => (
        <div className="asp-site" key={i}>
          <div className="asf-row">
            <input value={s.area} onChange={(e) => upd(i, 'area', e.target.value)} placeholder="Area (e.g. Right knee)" aria-label="Area" />
            <input type="number" min="0" max="10" value={s.severity} onChange={(e) => upd(i, 'severity', e.target.value)} aria-label="Severity 0-10" />
            <button className="x" aria-label="Remove site" onClick={() => setSites(sites.filter((_, j) => j !== i))}>×</button>
          </div>
          <div className="row2">
            <Field label="Aggravating movement"><input value={s.aggravating} onChange={(e) => upd(i, 'aggravating', e.target.value)} placeholder="e.g. Deep squat" /></Field>
            <Field label="Limitation"><input value={s.limitation} onChange={(e) => upd(i, 'limitation', e.target.value)} placeholder="e.g. Can't load past 90°" /></Field>
          </div>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setSites([...sites, { area: '', severity: 3, aggravating: '', limitation: '' }])}>＋ Add site</Button>
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Onset, pattern, referral…" /></Field>
    </ModalShell>
  )
}

// ---- Lifestyle (sleep / stress / hydration / activity) ----
export function LifestyleForm({ clientId, record, defaultPhase }) {
  const { closeModal } = useModal()
  const d0 = record?.data || {}
  const [f, setF] = useState({ date: record?.date || todayISO(), phase: record?.phase || defaultPhase || 'baseline', notes: record?.notes || '', sleepHrs: d0.sleepHrs ?? '', sleepQuality: d0.sleepQuality ?? 4, stress: d0.stress ?? 4, hydrationL: d0.hydrationL ?? '', activityLevel: d0.activityLevel || 'Moderate', steps: d0.steps ?? '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const sl = (k) => (v) => setF({ ...f, [k]: v })
  const data = () => ({ sleepHrs: numOrNull(f.sleepHrs), sleepQuality: +f.sleepQuality, stress: +f.stress, hydrationL: numOrNull(f.hydrationL), activityLevel: f.activityLevel, steps: numOrNull(f.steps) })
  const save = useSave(clientId, 'lifestyle', data, undefined, record)
  return (
    <ModalShell title={<><Icon name="watch" size={16} /> Lifestyle assessment</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>Save assessment</Button></>}>
      <MetaRow f={f} setF={setF} />
      <div className="row2">
        <Field label="Sleep (hours/night)"><input type="number" step="0.5" value={f.sleepHrs} onChange={set('sleepHrs')} /></Field>
        <Field label="Hydration (L/day)"><input type="number" step="0.1" value={f.hydrationL} onChange={set('hydrationL')} /></Field>
      </div>
      <RangeSlider label="Sleep quality" value={f.sleepQuality} min={1} max={7} lo="Poor" hi="Excellent" onChange={sl('sleepQuality')} />
      <RangeSlider label="Stress" value={f.stress} min={1} max={7} lo="None" hi="Extreme" onChange={sl('stress')} />
      <div className="row2">
        <Field label="Activity level"><select value={f.activityLevel} onChange={set('activityLevel')}>{ACTIVITY_LEVELS.map((a) => <option key={a}>{a}</option>)}</select></Field>
        <Field label="Daily steps (avg)"><input type="number" step="500" value={f.steps} onChange={set('steps')} /></Field>
      </div>
      <Field label="Notes"><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Occupation, routine, constraints…" /></Field>
    </ModalShell>
  )
}

// ---- Goals (short-term & long-term) ----
export function GoalForm({ clientId, record, defaultPhase }) {
  const { db } = useData()
  const { closeModal } = useModal()
  const d0 = record?.data || {}
  const mapGoals = (l) => (l?.length ? l.map((r) => ({ text: r.text || '', target: r.target || '', by: r.by || '' })) : [{ text: '', target: '', by: '' }])

  // Seed a brand-new baseline Goals record from the intake screening — but only
  // when this client has no goals assessment yet, so tracked goals are never
  // overwritten. The coach reviews the pre-filled rows before saving.
  const hasGoalsAlready = (db.assessments || []).some((a) => a.clientId === clientId && a.type === 'goals')
  const scr = !record && !hasGoalsAlready ? (screeningsFor(db.screenings, clientId).complete || screeningsFor(db.screenings, clientId).draft) : null
  const seed = scr ? goalsFromScreening(scr, todayISO()) : null
  const seeded = !!seed && (seed.shortTerm.length > 0 || seed.longTerm.length > 0)

  const [fromScreening, setFromScreening] = useState(seeded)
  const [f, setF] = useState({ date: record?.date || todayISO(), phase: record?.phase || defaultPhase || 'baseline', notes: record?.notes || '', why: d0.why || (seed?.why || '') })
  const [shortTerm, setShort] = useState(mapGoals(record ? d0.shortTerm : seed?.shortTerm))
  const [longTerm, setLong] = useState(mapGoals(record ? d0.longTerm : seed?.longTerm))
  const reimport = () => { if (!seed) return; setShort(mapGoals(seed.shortTerm)); setLong(mapGoals(seed.longTerm)); setFromScreening(true) }
  const updList = (setter, list) => (i, k, v) => setter(list.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const clean = (list) => list.filter((r) => r.text.trim()).map((r) => ({ text: r.text.trim(), target: r.target.trim(), by: r.by }))
  const data = () => ({ shortTerm: clean(shortTerm), longTerm: clean(longTerm), why: f.why.trim() })
  const save = useSave(clientId, 'goals', data, undefined, record)
  const rows = (list, setter, label, prefix) => (
    <fieldset className="goal-form-group">
      <legend>{label}</legend>
      {list.map((r, i) => (
        <div className="asf-row3" key={i}>
          <textarea rows={2} value={r.text} onChange={(e) => updList(setter, list)(i, 'text', e.target.value)} placeholder="Goal" aria-label={`${prefix} goal ${i + 1}`} />
          <input value={r.target} onChange={(e) => updList(setter, list)(i, 'target', e.target.value)} placeholder="Target (e.g. -5 kg)" aria-label={`${prefix} target ${i + 1}`} />
          <input type="date" value={r.by} onChange={(e) => updList(setter, list)(i, 'by', e.target.value)} aria-label={`${prefix} target date ${i + 1}`} />
          <button className="x" aria-label={`Remove ${prefix.toLowerCase()} goal ${i + 1}`} onClick={() => setter(list.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => setter([...list, { text: '', target: '', by: '' }])}>＋ Add {prefix.toLowerCase()} goal</Button>
    </fieldset>
  )
  return (
    <ModalShell title={<><Icon name="like" size={16} /> {record ? 'Edit goals' : 'Goal setting'}</>} onClose={closeModal}
      footer={<><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button onClick={() => save(f)}>{record ? 'Save changes' : 'Save goals'}</Button></>}>
      <MetaRow f={f} setF={setF} />
      {seed && (
        <div className="goal-seed">
          <span className="goal-seed-ic" aria-hidden="true"><Icon name="sparkles" size={14} /></span>
          <span>
            {fromScreening
              ? <>Pre-filled from the intake screening — review &amp; edit before saving.</>
              : <>This client stated goals at intake.</>}
          </span>
          <button className="goal-seed-btn" onClick={reimport}>{fromScreening ? 'Re-import' : 'Fill from screening'}</button>
        </div>
      )}
      {rows(shortTerm, setShort, 'Short-term goals', 'Short-term')}
      {rows(longTerm, setLong, 'Long-term goals', 'Long-term')}
      <div style={{ marginTop: 10 }}><Field label="Why it matters"><input value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} placeholder="The deeper motivation…" /></Field></div>
    </ModalShell>
  )
}

const FORMS = {
  fitness: (clientId, record, defaultPhase) => <FitnessAssessmentForm clientId={clientId} record={record} defaultPhase={defaultPhase} />,
  movement: (clientId, record, defaultPhase) => <MovementScreenForm clientId={clientId} record={record} defaultPhase={defaultPhase} />,
  body_comp: (clientId, record, defaultPhase) => <BodyCompForm clientId={clientId} record={record} defaultPhase={defaultPhase} />,
  pain: (clientId, record, defaultPhase) => <PainAssessmentForm clientId={clientId} record={record} defaultPhase={defaultPhase} />,
  lifestyle: (clientId, record, defaultPhase) => <LifestyleForm clientId={clientId} record={record} defaultPhase={defaultPhase} />,
  goals: (clientId, record, defaultPhase) => <GoalForm clientId={clientId} record={record} defaultPhase={defaultPhase} />,
}

// Element factory for one assessment type. Pass `record` to edit it in place;
// omit it to record a new one. `defaultPhase` presets baseline vs reassessment
// for a fresh record (e.g. the per-card "Add reassessment" button).
// eslint-disable-next-line react/only-export-components
export const assessmentForm = (type, clientId, record, defaultPhase) => FORMS[type]?.(clientId, record, defaultPhase) || null

// Launcher: pick which assessment to record.
export function NewAssessmentMenu({ clientId, types = ACTIVE_TYPES }) {
  const { openModal, closeModal } = useModal()
  return (
    <ModalShell title="New assessment" onClose={closeModal}>
      <div className="grid cards-2" style={{ gap: 10 }}>
        {types.map((t) => {
          const m = typeMeta(t)
          return <Button key={t} variant="ghost" onClick={() => openModal(FORMS[t](clientId))}><Icon name={m.icon} size={14} /> {m.label}</Button>
        })}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Pain may also be self-reported by the athlete. Their reports are dated; use Concerns for new symptoms between formal assessments.</p>
    </ModalShell>
  )
}
