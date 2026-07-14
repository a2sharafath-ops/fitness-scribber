// Planner copy/paste: turning a span of prescribed days into a portable
// "clip", and writing that clip back onto any client's calendar.
//
// The clip preserves the *pattern* of the copied span: each session is stored
// as a day offset from the first day of the selection, so a Mon/Wed/Fri block
// pasted onto a Tuesday lands on Tue/Thu/Sat. Rest days inside the selection
// stay rest days at the target.
//
// React-free. `pasteClip` is a draft mutator (runs inside commit(), same shape
// as the mutators in program.js); everything else is pure.
import { uid } from './format'
import { addDays, daysBetween } from './dates'
import { blocksToItems, itemsToBlocks, cloneBlocksFresh, programStats } from './program'

// The blocks of a prescription, migrating legacy item-shaped rows on the way.
const blocksOf = (p) => (p?.blocks?.length ? p.blocks : itemsToBlocks(p?.items))

// A prescription only counts as a "session" once it actually holds exercises.
export const isSession = (p) => !!p && programStats(p).exercises > 0

// Build a clip from a selected span of dates. `dates` is the full selection
// (including empty days); only days holding a real session are carried, each
// keyed by its offset from the first selected day. Returns null when the span
// holds nothing to copy.
export function buildClip(db, client, dates) {
  if (!dates?.length) return null
  const anchor = dates[0]
  const days = dates
    .map((date) => {
      const p = db.prescriptions.find((x) => x.clientId === client.id && x.date === date)
      if (!isSession(p)) return null
      return { offset: daysBetween(anchor, date), blocks: blocksOf(p), notes: p.notes || '' }
    })
    .filter(Boolean)
  if (!days.length) return null
  return {
    sourceClientId: client.id,
    sourceClientName: client.name,
    anchor,
    span: dates.length,
    days,
  }
}

// The dates a clip would occupy if pasted starting at `startDate`.
export const clipTargets = (clip, startDate) =>
  (clip?.days || []).map((d) => addDays(startDate, d.offset))

// Which of those target dates already hold a session for `clientId`.
export const clipClashes = (db, clip, clientId, startDate) =>
  clipTargets(clip, startDate).filter((date) =>
    isSession(db.prescriptions.find((p) => p.clientId === clientId && p.date === date)))

// Write (or overwrite) one prescription on a client's calendar.
export function writePrescription(draft, clientId, date, blocks, notes = '') {
  const items = blocksToItems(blocks)
  const ex = draft.prescriptions.find((p) => p.clientId === clientId && p.date === date)
  if (ex) { ex.blocks = blocks; ex.items = items; ex.notes = notes }
  else draft.prescriptions.push({ id: uid(), clientId, date, notes, blocks, items })
}

// Paste a clip onto `clientId`, anchored at `startDate`. Every day gets its own
// deep copy with brand-new block/exercise/set ids, so the pasted sessions are
// independent of the source. Returns the dates written.
export function pasteClip(draft, clip, clientId, startDate) {
  const written = []
  for (const d of clip?.days || []) {
    const date = addDays(startDate, d.offset)
    writePrescription(draft, clientId, date, cloneBlocksFresh(d.blocks), d.notes)
    written.push(date)
  }
  return written
}
