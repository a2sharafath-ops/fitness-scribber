// Block-by-block workout builder (spec 2) with one-click cloning, bulk
// calendar paste + progression rules (spec 3), voice dictation (spec 5) and
// the completion feedback loop (spec 4) applied on save. This page-tier modal
// owns state and data access; the cards below it stay presentational.
import { useState } from 'react'
import ModalShell from '../../molecules/ModalShell'
import MultiDatePicker from '../../molecules/MultiDatePicker'
import BlockCard from './BlockCard'
import ProgressionPanel from './ProgressionPanel'
import DictationPanel from './DictationPanel'
import Button from '../../atoms/Button'
import Field from '../../atoms/Field'
import { useData } from '../../../store/DataContext'
import { useModal } from '../../../store/ModalContext'
import { useFormat } from '../../../hooks/useFormat'
import { uid } from '../../../lib/format'
import { fmtDay, addDays } from '../../../lib/dates'
import {
  newBlock, defaultBlocks, itemsToBlocks, blocksToItems, blocksVolume, cloneBlocksFresh,
  applyProgression, resolveTrainingMax, hasUnmapped, resetTrainingMaxes, programStats,
} from '../../../lib/program'
import { toast, confirmDialog } from '../../../lib/toast'

// Existing sessions load as saved; a fresh day opens with the standard
// three-block scaffold (Warm-up / Main Lifts / Core/Others).
const fromExisting = (p) => (p?.blocks?.length ? structuredClone(p.blocks) : p?.items?.length ? itemsToBlocks(p.items) : defaultBlocks())

export default function WorkoutBuilderModal({ clientId, date }) {
  const { db, commit } = useData()
  const { closeModal } = useModal()
  const { toDisp, dispToKg, fmtVL, unitName } = useFormat()
  const existing = db.prescriptions.find((p) => p.clientId === clientId && p.date === date)
  const [blocks, setBlocks] = useState(() => fromExisting(existing))
  const [notes, setNotes] = useState(existing?.notes || '')
  const [blockStart, setBlockStart] = useState(false)
  const [step, setStep] = useState('edit') // edit | dates | progress | dictate | clients
  const [targets, setTargets] = useState(new Set())
  const [clientTargets, setClientTargets] = useState(new Set())

  const client = db.clients.find((c) => c.id === clientId)
  const maxHr = 220 - (client?.anthro?.age || 30)
  // Full Training-Max info (direct 1RM, or the library's %-of-reference fallback).
  const tmInfo = (name) => (name ? resolveTrainingMax(db, clientId, name, date) : { kg: null, source: null })
  // Number-only resolver for progression math (applyProgression expects a kg).
  const resolveTm = (name) => tmInfo(name).kg

  const updBlock = (bi) => (patch) => setBlocks(blocks.map((b, j) => (j === bi ? { ...b, ...patch } : b)))
  const rmBlock = (bi) => () => setBlocks(blocks.filter((_, j) => j !== bi).map((b, j) => ({ ...b, order: j + 1 })))
  const addBlock = () => setBlocks([...blocks, newBlock(blocks.length ? 'Assisted' : 'Main Lifts', blocks.length + 1)])

  const copyLast = () => {
    const prev = db.prescriptions.filter((p) => p.clientId === clientId && p.date < date).sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!prev) return toast('No earlier session to copy.', 'error')
    setBlocks(cloneBlocksFresh(prev.blocks?.length ? prev.blocks : itemsToBlocks(prev.items)))
    if (prev.notes) setNotes(prev.notes)
    toast('Copied last session', 'info')
  }

  // Persist a blocks payload onto a target date (used by quick clones, bulk paste
  // and the copy-to-clients step). Defaults to this client; pass `cid` to write
  // the same session onto another client's calendar.
  const writeTo = (d, dt, payload, cid = clientId) => {
    const items = blocksToItems(payload)
    const ex = d.prescriptions.find((p) => p.clientId === cid && p.date === dt)
    if (ex) { ex.blocks = payload; ex.items = items; ex.notes = notes }
    else d.prescriptions.push({ id: uid(), clientId: cid, date: dt, notes, blocks: payload, items })
  }

  // Days this client already has a real (non-empty) session on — surfaced in the
  // bulk-paste calendar so the trainer sees planned vs rest days at a glance.
  const sessionDates = new Set(
    db.prescriptions.filter((p) => p.clientId === clientId && programStats(p).exercises > 0).map((p) => p.date),
  )

  // ---- Copy this session onto other clients (same date) ----------------------
  const others = db.clients.filter((x) => x.id !== clientId)
  const hasSession = (cid) =>
    db.prescriptions.some((p) => p.clientId === cid && p.date === date && programStats(p).exercises)
  const toggleClient = (cid) => setClientTargets((s) => {
    const n = new Set(s); if (n.has(cid)) n.delete(cid); else n.add(cid); return n
  })
  const leaveClients = () => { setStep('edit'); setClientTargets(new Set()) }
  const copyToClients = async () => {
    const ids = [...clientTargets]
    if (!ids.length) return
    const clash = ids.filter(hasSession)
    if (clash.length && !await confirmDialog({
      title: 'Overwrite sessions',
      message: `${clash.length} of the selected client${clash.length === 1 ? ' already has' : 's already have'} a session on ${fmtDay(date)} — overwrite ${clash.length === 1 ? 'it' : 'them'}?`,
      confirmLabel: 'Overwrite',
    })) return
    // Each client gets its own deep copy with brand-new ids; %1RM targets
    // re-resolve against that client's own Training Max when the card renders.
    commit((d) => ids.forEach((cid) => writeTo(d, date, cloneBlocksFresh(blocks), cid)))
    leaveClients()
    toast(`Copied to ${ids.length} client${ids.length === 1 ? '' : 's'}.`)
  }

  // Spec 3.1 — quick clones duplicate the structure onto tomorrow / day after
  // with brand-new ids, no progression.
  const quickClone = async (offset) => {
    const dt = addDays(date, offset)
    if (db.prescriptions.some((p) => p.clientId === clientId && p.date === dt) &&
      !await confirmDialog({ title: 'Overwrite session', message: `${fmtDay(dt)} already has a session — overwrite it?`, confirmLabel: 'Overwrite' })) return
    commit((d) => writeTo(d, dt, cloneBlocksFresh(blocks)))
    toast(`Copied to ${fmtDay(dt)}.`)
  }

  // Spec 3.2 — calendar duplication is gated behind the Progression Rule Window.
  const bulkApply = (rules) => {
    const dates = [...targets].sort()
    const progressed = applyProgression(blocks, rules, resolveTm)
    commit((d) => dates.forEach((dt) => writeTo(d, dt, cloneBlocksFresh(progressed))))
    setStep('edit')
    setTargets(new Set())
    toast(`Cloned with progression to ${dates.length} date${dates.length === 1 ? '' : 's'}.`)
  }

  const insertDictated = (parsed) => {
    setBlocks((cur) => {
      const merged = [...cur]
      parsed.forEach((nb) => {
        const host = merged.find((b) => b.blockType === nb.blockType)
        if (host) host.exercises = [...host.exercises, ...nb.exercises.map((e, i) => ({ ...e, order: host.exercises.length + i + 1 }))]
        else merged.push({ ...nb, order: merged.length + 1 })
      })
      return merged.map((b, i) => ({ ...b, order: i + 1 }))
    })
    setStep('edit')
  }

  const save = () => {
    if (hasUnmapped(blocks)) return toast('Some dictated exercises are unvalidated (orange) — pick their standard library term first.', 'error')
    const payload = blocks.map((b, i) => ({ ...b, order: i + 1 }))
    const events = []
    commit((d) => {
      const ex = d.prescriptions.find((p) => p.clientId === clientId && p.date === date)
      if (!payload.some((b) => b.exercises.length) && ex) {
        d.prescriptions = d.prescriptions.filter((p) => p !== ex)
        return
      }
      writeTo(d, date, payload)
      // The builder only prescribes — completion (and any 1RM peaks / failure
      // flags) is logged through the Today's Workout flow, never on save here.
      if (blockStart) {
        const reset = resetTrainingMaxes(d, clientId, payload, date)
        if (reset.length) events.push(`Training Max reset to rolling Absolute 1RM: ${reset.join(', ')}`)
      }
    })
    closeModal()
    toast('Workout saved')
    if (events.length) events.forEach((e, i) => setTimeout(() => toast(e, 'info', 6000), i * 350))
  }
  const del = async () => {
    if (!await confirmDialog({ title: 'Delete workout', message: 'Delete this prescribed workout?', confirmLabel: 'Delete', danger: true })) return
    commit((d) => { d.prescriptions = d.prescriptions.filter((p) => !(p.clientId === clientId && p.date === date)) })
    closeModal()
    toast('Workout deleted')
  }

  const total = blocksVolume(blocks)

  return (
    <ModalShell title={'Workout — ' + fmtDay(date)} onClose={closeModal}
      footer={step === 'edit' && <>
        {existing && <Button variant="danger" onClick={del}>Delete</Button>}
        <Button variant="ghost" onClick={closeModal}>Cancel</Button>
        <Button onClick={save}>Save Workout</Button>
      </>}>
      <datalist id="progExList">{db.exercises.map((e) => <option key={e.id} value={e.name} />)}</datalist>

      {step === 'dates' && (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>Bulk paste — select target dates</div>
          <MultiDatePicker selected={targets} minDate={date} sourceDate={date} sessionDates={sessionDates}
            onToggle={(dt) => setTargets((s) => { const n = new Set(s); if (n.has(dt)) n.delete(dt); else n.add(dt); return n })} />
          <div className="flex gap" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setStep('edit')}>Cancel</Button>
            <Button disabled={!targets.size} onClick={() => setStep('progress')}>Next — progression rules →</Button>
          </div>
        </>
      )}
      {step === 'clients' && (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>Copy this workout to other clients</div>
          <p className="muted" style={{ fontSize: 12.5, margin: '0 0 10px' }}>
            The same blocks, exercises and sets are prescribed for <strong>{fmtDay(date)}</strong>. Loads copy across as-is;
            %1RM / RPE / RIR targets re-resolve against each client's own Training Max.
          </p>
          {others.length ? (
            <>
              <div className="flex gap" style={{ marginBottom: 8 }}>
                <button type="button" className="link-btn" onClick={() => setClientTargets(new Set(others.map((o) => o.id)))}>Select all</button>
                <button type="button" className="link-btn" onClick={() => setClientTargets(new Set())}>Clear</button>
                <div className="nav-spacer" />
                <span className="muted" style={{ fontSize: 12 }}>{clientTargets.size} selected</span>
              </div>
              <div className="pick-list">
                {others.map((o) => (
                  <label key={o.id} className={'pick-row' + (clientTargets.has(o.id) ? ' on' : '')}>
                    <input type="checkbox" checked={clientTargets.has(o.id)} onChange={() => toggleClient(o.id)} />
                    <span className="pick-name">{o.name}</span>
                    <span className="muted" style={{ fontSize: 11 }}>{o.level} · {o.status}</span>
                    <div className="nav-spacer" />
                    {hasSession(o.id) && <span className="pick-warn">has a session — will overwrite</span>}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>No other clients yet.</div>
          )}
          <div className="flex gap" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={leaveClients}>Cancel</Button>
            <Button disabled={!clientTargets.size} onClick={copyToClients}>
              Copy to {clientTargets.size || ''} client{clientTargets.size === 1 ? '' : 's'}
            </Button>
          </div>
        </>
      )}
      {step === 'progress' && (
        <ProgressionPanel blocks={blocks} dates={[...targets].sort()} onConfirm={bulkApply} onBack={() => setStep('dates')} />
      )}
      {step === 'dictate' && (
        <DictationPanel synonyms={db.synonyms} exercises={db.exercises} onInsert={insertDictated} onBack={() => setStep('edit')} />
      )}

      {step === 'edit' && (
        <>
          <div className="flex gap" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            <Button variant="ghost" size="sm" onClick={() => quickClone(1)} disabled={!blocks.length}>→ Copy to Tomorrow</Button>
            <Button variant="ghost" size="sm" onClick={() => setStep('clients')} disabled={!blocks.length}>👥 Copy to clients…</Button>
            <Button variant="ghost" size="sm" onClick={() => setStep('dates')} disabled={!blocks.length}>📅 Bulk paste…</Button>
            <Button variant="ghost" size="sm" onClick={() => setStep('dictate')}>🎙️ Dictate</Button>
            <Button variant="ghost" size="sm" onClick={copyLast}>↩ Copy last session</Button>
          </div>

          {blocks.map((b, bi) => (
            <BlockCard key={b.blockId} block={b} exercises={db.exercises} exListId="progExList"
              tmInfo={tmInfo} maxHr={maxHr}
              toDisp={toDisp} dispToKg={dispToKg} unitName={unitName}
              onChange={updBlock(bi)} onRemove={rmBlock(bi)} />
          ))}
          {!blocks.length && <div className="muted" style={{ fontSize: 12, padding: '6px 0' }}>No blocks yet — add one below or dictate the session.</div>}
          <Button variant="ghost" size="sm" onClick={addBlock} style={{ margin: '6px 0' }}>＋ Add block</Button>

          <Field label="Session notes"><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. knee-friendly, deload" /></Field>
          <label className="block-auto" style={{ margin: '4px 0 10px', display: 'inline-flex' }}>
            <input type="checkbox" checked={blockStart} onChange={(e) => setBlockStart(e.target.checked)} />
            Start of a new programming block — reset Training Max up to the rolling 30-day Absolute 1RM on save
          </label>
          <div className="card" style={{ textAlign: 'center', padding: 12 }}>
            <div className="muted" style={{ fontSize: 11 }}>SESSION VOLUME LOAD (Σ Reps×Load across blocks)</div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{fmtVL(total)}</div>
          </div>
        </>
      )}
    </ModalShell>
  )
}
