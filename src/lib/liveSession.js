import { editRunSet } from './setAutofill'
import { uid } from './format'
import { normalizeRunItem, runBlocks, restToSec, ensureSetRows } from './workout'

export const LIVE_SET_TYPES = { normal: 'Normal', warmup: 'Warm-up', cooldown: 'Cool-down', failure: 'Failure', drop: 'Drop set' }
export const SESSION_SECTIONS = ['warmup', 'main', 'cooldown']
export const sessionItems = (workout) => SESSION_SECTIONS.flatMap((section) => workout[section] || [])
export const sessionRows = (workout) => sessionItems(workout).flatMap((item) => item.setRows || [])
export const liveClosed = (workout) => ['completed', 'discarded'].includes(workout.status)
export const rowMode = (row) => row.mode === 'duration' ||
  (row.mode == null && !row.done && row.reps == null && adjustedSetDuration(row) != null) ? 'duration' : 'reps'
export const rowType = (row) => row.type || ({ warmup: 'warmup', cooldown: 'cooldown' }[row.purpose]) || 'normal'

export function liveSetLoad(row) {
  if (row.done || row.completedAt != null || row.completionHistory?.length || row.autofill?.load === 'manual') return row.load ?? null
  // Older drafts stored both prefilled targets and copied weights in the actual field.
  if (row.load === row.pLoadKg || row.autofill?.load === 'suggested' || Number.isInteger(row.autofill?.load)) return null
  return row.load ?? null
}

const copy = (value) => structuredClone(value)
const planParts = (workout) => Object.fromEntries(SESSION_SECTIONS.map((section) => [section, copy(workout[section] || [])]))
function structuredDuration(row) {
  const minutes = row.pIntensityType === 'Minutes'
  if (!minutes && row.pIntensityType !== 'Seconds') return null
  const value = Number(row.pIntensityValue) * (minutes ? 60 : 1)
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value)) : null
}

export const adjustedSetDuration = (row) => row.pDurationSeconds === undefined ? structuredDuration(row) : row.pDurationSeconds

export function prescribedSetDuration(item, row) {
  const target = adjustedSetDuration(row)
  if (target != null) return target
  const legacy = item.duration ?? (/\d\s*(?:secs?|seconds?|mins?|minutes?|[sm])\b/i.test(String(row.pReps)) ? row.pReps : null)
  return legacy == null ? null : restToSec(legacy)
}

// The snapshot is captured once. Legacy sessions retain every existing field and
// actual value, including fields unknown to this version of the runner.
export function prepareLiveSession(workout, resolveTm, now = Date.now()) {
  if (workout.liveState?.version === 1) return copy(workout)
  const next = copy(workout)
  const original = planParts(workout)
  for (const section of SESSION_SECTIONS) {
    next[section] = (next[section] || []).map((item, index) => {
      const normalized = normalizeRunItem(item, resolveTm, { prefillLoad: false })
      const existingRows = item.setRows || []
      const id = item.id || `${workout.id}:${section}:${index}`
      return { ...normalized, id, setRows: normalized.setRows.map((normalizedRow, i) => {
        let row = existingRows[i]?.done ? copy(existingRows[i]) : normalizedRow
        if (!existingRows.length && item.done && i < (item.doneSets ?? item.sets ?? 1)) row = { ...row, done: true,
          reps: item.doneReps ?? item.reps ?? null, load: item.doneWeight ?? item.weight ?? null }
        const duration = prescribedSetDuration(item, row)
        return { ...row, id: row.id || `${id}:set:${i + 1}`,
          ...(!row.done ? { load: liveSetLoad(row) } : {}),
          ...(duration != null && duration > 0 && !row.done && row.mode == null && row.reps == null
            ? { mode: 'duration', pDurationSeconds: duration } : {}) }
      }) }
    })
  }
  const blocks = runBlocks(next).map((block) => ({ id: block.key, title: block.title, section: block.section,
    exerciseIds: block.items.map((item) => item.id), skipped: false }))
  next.liveState = { version: 1, original, originalBlocks: copy(blocks), blocks, capturedAt: now,
    recoveredInProgress: workout.status === 'in_progress',
    clock: { elapsedMs: Math.max(0, now - (Date.parse(workout.startedAt) || now)), runningSince: now, paused: false },
    settings: { units: null, defaultRestSeconds: 90 }, rest: null, setTimer: null }
  return next
}

export function liveBlocks(workout) {
  if (!workout.liveState) return runBlocks(workout).map((block) => ({ ...block, id: block.key }))
  const items = new Map(sessionItems(workout).map((item) => [item.id, item]))
  return workout.liveState.blocks.map((block) => ({ ...block, key: block.id,
    items: block.exerciseIds.map((id) => items.get(id)).filter(Boolean) }))
}
export function locateLive(workout, id) {
  for (const block of liveBlocks(workout)) {
    if (block.id === id) return { block }
    for (const item of block.items) {
      if (item.id === id) return { block, item }
      const row = item.setRows.find((set) => set.id === id)
      if (row) return { block, item, row }
    }
  }
  return {}
}
export const rowPending = (block, item, row) => !block.skipped && !item.skipped && !row.skipped && !row.done
export function nextLiveSet(workout) {
  for (const block of liveBlocks(workout)) {
    for (const group of liveExerciseUnits(block.items)) {
      const rounds = Math.max(0, ...group.map((item) => item.setRows.length))
      for (let round = 0; round < rounds; round++) {
        for (const item of group) {
          const row = item.setRows[round]
          if (row && rowPending(block, item, row)) return { block, item, row }
        }
      }
    }
  }
  return null
}
export function liveDockSet(workout) {
  const state = workout.liveState
  if (state.setTimer) return { ...locateLive(workout, state.setTimer.rowId), action: 'stop' }
  if (state.stoppedSetId) {
    const stopped = locateLive(workout, state.stoppedSetId)
    if (stopped.row && rowPending(stopped.block, stopped.item, stopped.row) && rowMode(stopped.row) === 'duration' && stopped.row.durationSeconds != null) {
      return { ...stopped, action: 'done' }
    }
  }
  const next = nextLiveSet(workout)
  if (!next) return null
  const action = rowMode(next.row) !== 'duration' ? 'log' : next.row.durationSeconds == null ? 'start' : 'done'
  return { ...next, action }
}
export const liveElapsed = (workout, now = Date.now()) => {
  const clock = workout.liveState.clock
  return clock.elapsedMs + (clock.runningSince == null ? 0 : Math.max(0, now - clock.runningSince))
}
export const timerElapsed = (timer, now = Date.now()) => timer.elapsedMs + (timer.runningSince == null ? 0 : Math.max(0, now - timer.runningSince))
export const restRemainingMs = (rest, now = Date.now()) => rest ? Math.max(0, rest.endsAt == null ? rest.remainingMs : rest.endsAt - now) : 0
export const exerciseRestSeconds = (workout, item) => item.restSeconds ?? item.rest ?? workout.liveState.settings.defaultRestSeconds
export function stopLiveSetTimer(workout, now) {
  const timer = workout.liveState.setTimer
  if (!timer) return
  const { row } = locateLive(workout, timer.rowId)
  if (row && !row.done) {
    row.durationSeconds = Math.max(1, Math.floor(timerElapsed(timer, now) / 1000))
    workout.liveState.stoppedSetId = row.id
  }
  workout.liveState.setTimer = null
}
function startRest(workout, item, row, now) {
  workout.liveState.rest = null
  const following = item.setRows.slice(item.setRows.indexOf(row) + 1).some((set) => !set.done && !set.skipped)
  if (!item.restEnabled || !following) return
  const remainingMs = exerciseRestSeconds(workout, item) * 1000
  workout.liveState.rest = { rowId: row.id, itemId: item.id, remainingMs,
    endsAt: workout.liveState.clock.paused ? null : now + remainingMs }
}
const validNumber = (value, max, integer = false, min = 0) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))
const requirePending = (block, item, row) => {
  if (!row || !rowPending(block, item, row)) throw new Error('Undo the completed set before editing it.')
}
function syncSections(workout) {
  const blocks = liveBlocks(workout)
  for (const section of SESSION_SECTIONS) workout[section] = blocks.filter((block) => block.section === section)
    .flatMap((block) => block.items.map((item) => ({ ...item, blockType: block.title })))
}
function skipUpcoming(item, skipped) {
  item.skipped = skipped
  item.setRows.forEach((row) => { if (!row.done) row.skipped = skipped })
}
function reorder(list, id, beforeId) {
  const index = list.findIndex((item) => (typeof item === 'string' ? item : item.id) === id)
  if (index < 0 || id === beforeId) return
  const [item] = list.splice(index, 1)
  const target = list.findIndex((entry) => (typeof entry === 'string' ? entry : entry.id) === beforeId)
  list.splice(target < 0 ? list.length : target, 0, item)
}
export function liveExerciseUnits(items) {
  const units = []
  for (const item of items) {
    const previous = units.at(-1)
    if (item.supersetId && previous?.[0].supersetId === item.supersetId) previous.push(item)
    else units.push([item])
  }
  return units
}

// Every action returns a new session. Completion and explicit undo are the only
// operations that change whether a set counts as performed work.
export function applyLiveAction(workout, action, now = Date.now()) {
  if (liveClosed(workout)) throw new Error('This session has ended.')
  const next = copy(workout)
  const state = next.liveState
  const { block, item, row } = locateLive(next, action.id)
  const metaBlock = state.blocks.find((entry) => entry.id === block?.id)
  switch (action.type) {
    case 'row': {
      requirePending(block, item, row)
      if (state.setTimer?.rowId === row.id) throw new Error('Stop the set timer before editing this set.')
      if (action.patch.load != null && !validNumber(action.patch.load, 2000)) throw new Error('Enter a weight between 0 and 2000 kg.')
      if (action.patch.reps != null && !validNumber(action.patch.reps, 999, true)) throw new Error('Enter whole reps between 0 and 999.')
      if (action.patch.durationSeconds != null && !validNumber(action.patch.durationSeconds, 35999, true, 1)) throw new Error('Enter 1–35,999 seconds in whole numbers.')
      if (Object.hasOwn(action.patch, 'pLoadKg') && row.load != null && liveSetLoad(row) == null) {
        row.autofill = { ...row.autofill, load: 'suggested' }
      }
      const propagate = (action.patch.mode || rowMode(row)) === 'reps' ? ['reps'] : []
      item.setRows = editRunSet(item.setRows, item.setRows.indexOf(row), action.patch, propagate)
      break
    }
    case 'done':
      if (row.done) {
        row.completionHistory = [...(row.completionHistory || []), { undoneAt: now,
          recorded: Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'completionHistory')) }]
        row.done = false
        if (state.rest?.rowId === row.id) state.rest = null
      } else {
        requirePending(block, item, row)
        if (state.setTimer?.rowId === row.id) throw new Error('Stop the timer before marking the set done.')
        const mode = rowMode(row)
        if (action.actual) {
          const { load, metric } = action.actual
          if (load != null && !validNumber(load, 2000)) throw new Error('Enter a weight between 0 and 2000 kg.')
          row.load = load
          if (mode === 'duration') row.durationSeconds = metric
          else row.reps = metric
        }
        const actualLoad = action.actual ? row.load : liveSetLoad(row)
        if (row.pLoadKg != null && actualLoad == null) throw new Error('Confirm the weight used for this set.')
        row.load = actualLoad
        const timed = mode === 'duration'
        const metric = timed ? row.durationSeconds : row.reps
        if (!validNumber(metric, timed ? 35999 : 999, true, timed ? 1 : 0)) throw new Error('Enter actual reps or duration first.')
        if (timed) row.mode = 'duration'
        row.done = true
        row.completedAt = now
        if (state.stoppedSetId === row.id) delete state.stoppedSetId
        startRest(next, item, row, now)
      }
      item.done = item.setRows.some((set) => set.done)
      break
    case 'skip-row':
      if (row.done) throw new Error('Undo the completed set before skipping it.')
      row.skipped = !row.skipped
      break
    case 'skip-exercise': {
      const skipped = item.skipped
      if (!skipped) item.individuallySkippedSetIds = item.setRows.filter((set) => set.skipped).map((set) => set.id)
      skipUpcoming(item, !skipped)
      if (skipped && item.individuallySkippedSetIds) {
        for (const set of item.setRows) if (item.individuallySkippedSetIds.includes(set.id)) set.skipped = true
        delete item.individuallySkippedSetIds
      }
      break
    }
    case 'skip-block':
      metaBlock.skipped = !metaBlock.skipped
      break
    case 'rest-toggle':
      item.restEnabled = !item.restEnabled
      if (!item.restEnabled && state.rest?.itemId === item.id) state.rest = null
      break
    case 'rest-duration':
      if (!validNumber(action.seconds, 900, true, 1)) throw new Error('Enter a rest time of 1–900 seconds.')
      item.restSeconds = action.seconds
      break
    case 'note': item.note = action.note; break
    case 'settings': state.settings = { ...state.settings, ...action.settings }; break
    case 'pause': {
      const paused = !state.clock.paused
      state.clock = { elapsedMs: liveElapsed(next, now), runningSince: paused ? null : now, paused }
      if (state.rest) state.rest = { ...state.rest, remainingMs: restRemainingMs(state.rest, now),
        endsAt: paused ? null : now + state.rest.remainingMs }
      if (state.setTimer) state.setTimer = { ...state.setTimer, elapsedMs: timerElapsed(state.setTimer, now), runningSince: paused ? null : now }
      break
    }
    case 'set-timer':
      requirePending(block, item, row)
      if (rowMode(row) !== 'duration') throw new Error('Choose Duration first.')
      if (state.setTimer?.rowId === row.id) stopLiveSetTimer(next, now)
      else {
        if (state.clock.paused) throw new Error('Resume the workout before starting a set timer.')
        if (state.setTimer) throw new Error('Stop the running set timer first.')
        row.mode = 'duration'
        state.setTimer = { rowId: row.id, elapsedMs: 0, runningSince: now }
        delete state.stoppedSetId
      }
      break
    case 'add-set': {
      const last = item.setRows.at(-1) || {}
      item.setRows.push({ ...last, id: uid(), n: item.setRows.length + 1, load: null, reps: null,
        durationSeconds: null, effort: null, done: false, skipped: false, completedAt: null, completionHistory: [], autofill: {} })
      item.sets = item.setRows.length
      break
    }
    case 'add-block': {
      state.blocks.push({ id: uid(), title: action.name.trim(), section: 'main', exerciseIds: [], skipped: false })
      break
    }
    case 'add-exercise':
    case 'replace': {
      const targetBlock = state.blocks.find((entry) => entry.id === (action.blockId || block?.id))
      if (!targetBlock || !action.name.trim()) throw new Error('Choose a block and enter an exercise name.')
      const exId = uid()
      const newItem = { id: exId, name: action.name.trim(), exerciseId: action.exerciseId || null, exId: action.exerciseId || null,
        blockType: targetBlock.title, sets: 1, reps: '10', rest: state.settings.defaultRestSeconds,
        setRows: [{ id: uid(), n: 1, purpose: 'working', pReps: 10, pLoadKg: null, load: null, reps: null, done: false, effortType: 'RIR', effort: null }] }
      if (action.type === 'replace') {
        skipUpcoming(item, true)
        item.replacedBy = exId
        newItem.replaces = item.id
      }
      next[targetBlock.section].push(newItem)
      const at = targetBlock.exerciseIds.indexOf(action.beforeId)
      targetBlock.exerciseIds.splice(at < 0 ? targetBlock.exerciseIds.length : at, 0, exId)
      break
    }
    case 'superset': {
      const partner = locateLive(next, action.partnerId)
      if (!item || !partner.item || partner.item.id === item.id || partner.block.id !== block.id || item.supersetId || partner.item.supersetId || item.skipped || partner.item.skipped) throw new Error('Choose another exercise from the same block.')
      const groupId = uid()
      item.supersetId = groupId
      partner.item.supersetId = groupId
      const after = metaBlock.exerciseIds[metaBlock.exerciseIds.indexOf(item.id) + 1]
      reorder(metaBlock.exerciseIds, partner.item.id, after)
      break
    }
    case 'unlink':
      sessionItems(next).filter((entry) => entry.supersetId === item.supersetId).forEach((entry) => { delete entry.supersetId })
      break
    case 'move-block': reorder(state.blocks, action.id, action.beforeId); break
    case 'move-exercise': {
      const targetBlock = state.blocks.find((entry) => entry.id === action.blockId)
      if (!targetBlock) throw new Error('Choose a destination block.')
      const moving = block.items.filter((entry) => item.supersetId ? entry.supersetId === item.supersetId : entry.id === item.id)
      const ids = moving.map((entry) => entry.id)
      if (ids.includes(action.beforeId)) break
      metaBlock.exerciseIds = metaBlock.exerciseIds.filter((id) => !ids.includes(id))
      let index = targetBlock.exerciseIds.indexOf(action.beforeId)
      if (index < 0) index = targetBlock.exerciseIds.length
      targetBlock.exerciseIds.splice(index, 0, ...ids)
      break
    }
    case 'move-set':
      reorder(item.setRows, action.id, action.beforeId)
      item.setRows.forEach((set, index) => { set.n = index + 1 })
      break
    case 'discard':
      stopLiveSetTimer(next, now)
      next.status = 'discarded'
      next.endedAt = new Date(now).toISOString()
      next.durationSec = Math.floor(liveElapsed(next, now) / 1000)
      state.clock = { elapsedMs: liveElapsed(next, now), runningSince: null, paused: true }
      state.rest = null
      break
    default: throw new Error('This action is unavailable.')
  }
  // Move metadata changes back into the legacy arrays used by reports/exports.
  // Read items from their old sections before reorganising the arrays.
  syncSections(next)
  if (state.setTimer) {
    const current = locateLive(next, state.setTimer.rowId)
    if (!current.row || !rowPending(current.block, current.item, current.row)) stopLiveSetTimer(next, now)
  }
  if (state.rest) {
    const current = locateLive(next, state.rest.rowId)
    if (!current.row?.done || current.block.skipped || current.item.skipped) state.rest = null
  }
  return next
}
export function finishLiveSession(workout, now = Date.now()) {
  const next = copy(workout)
  stopLiveSetTimer(next, now)
  next.durationSec = Math.floor(liveElapsed(next, now) / 1000)
  next.endedAt = new Date(now).toISOString()
  next.status = 'completed'
  next.liveState.clock = { elapsedMs: liveElapsed(next, now), runningSince: null, paused: true }
  next.liveState.rest = null
  return next
}
export function previousLivePerformance(workouts, current, item) {
  const recordedAt = (workout) => workout.endedAt || workout.startedAt || ''
  return (workouts || []).filter((workout) => workout.clientId === current.clientId && workout.id !== current.id &&
    workout.status === 'completed' && (workout.date < current.date || workout.date === current.date &&
      (!current.startedAt || recordedAt(workout) <= current.startedAt)))
    .sort((a, b) => b.date.localeCompare(a.date) || recordedAt(b).localeCompare(recordedAt(a)))
    .map((workout) => ({ workout, items: sessionItems(workout).filter((entry) => entry.name.trim().toLowerCase() === item.name.trim().toLowerCase()) }))
    .map(({ workout, items }) => ({ date: workout.date, rows: items.flatMap((entry) => entry.setRows?.length ? entry.setRows.filter((row) => row.done) :
      entry.done ? ensureSetRows(entry).slice(0, entry.doneSets || entry.sets).map((row) => ({ ...row, done: true, reps: entry.doneReps, load: entry.doneWeight })) : []) }))
    .find((entry) => entry.rows.length) || null
}
