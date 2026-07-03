// Messaging data layer — the ONLY door between the chat UI and the backend.
// Deliberately NOT part of the whole-db `TABLES` sync (see api/sync.js): chat
// grows unbounded and needs realtime, so it talks to Supabase directly and
// falls back to a localStorage mock when the backend is absent.
import { supabase, hasBackend } from '../lib/supabase'
import { uid } from '../lib/format'

const LKEY = 'fitscribe_messages_v1'
const byTime = (a, b) => a.createdAt.localeCompare(b.createdAt)
const rand = () => Math.random().toString(36).slice(2)

const lload = () => {
  try { return JSON.parse(localStorage.getItem(LKEY)) || [] } catch { return [] }
}
const lsave = (a) => {
  try { localStorage.setItem(LKEY, JSON.stringify(a)) } catch { /* ignore */ }
}

// Messages for one athlete's thread, oldest first.
export async function listThread(clientId) {
  if (!hasBackend) {
    let a = lload()
    if (!a.some((m) => m.clientId === clientId)) {
      // Seed one inbound demo message so the thread isn't blank in local mode.
      a = [...a, {
        id: uid(), clientId, senderRole: 'athlete', kind: 'text',
        body: 'Hi coach! Looking forward to this week’s sessions 💪',
        attachmentPath: null, durationSec: null,
        createdAt: new Date(Date.now() - 3600e3).toISOString(), readAt: null,
      }]
      lsave(a)
    }
    return a.filter((m) => m.clientId === clientId).sort(byTime)
  }
  const { data, error } = await supabase
    .from('messages').select('*').eq('clientId', clientId).order('createdAt', { ascending: true })
  if (error) throw error
  return data || []
}

// All messages the signed-in coach can see (RLS scopes to their clients).
export async function fetchAllMessages() {
  if (!hasBackend) return lload().sort(byTime)
  const { data, error } = await supabase.from('messages').select('*').order('createdAt', { ascending: true })
  if (error) throw error
  return data || []
}

export async function sendMessage({ clientId, senderRole, body, kind = 'text', attachmentPath = null, durationSec = null }) {
  const row = {
    id: uid(), clientId, senderRole, kind, body,
    attachmentPath, durationSec, createdAt: new Date().toISOString(), readAt: null,
  }
  if (!hasBackend) { const a = lload(); a.push(row); lsave(a); return row }
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('messages').insert({ ...row, senderId: user?.id }).select().single()
  if (error) throw error
  return data
}

// Fan a single update out to many clients — one message row per recipient,
// all sharing a broadcastId so they can be recognised/grouped later.
export async function sendBroadcast({ clientIds, body }) {
  const text = (body || '').trim()
  const ids = [...new Set(clientIds || [])]
  if (!text || !ids.length) return { count: 0 }
  const broadcastId = uid()
  const base = (clientId) => ({
    id: uid(), clientId, senderRole: 'coach', kind: 'text', body: text,
    attachmentPath: null, durationSec: null, broadcastId,
    createdAt: new Date().toISOString(), readAt: null,
  })
  if (!hasBackend) {
    const a = lload(); ids.forEach((cid) => a.push(base(cid))); lsave(a)
    return { count: ids.length, broadcastId }
  }
  const { data: { user } } = await supabase.auth.getUser()
  const rows = ids.map((cid) => ({ ...base(cid), senderId: user?.id }))
  const { error } = await supabase.from('messages').insert(rows)
  if (error) throw error
  return { count: ids.length, broadcastId }
}

// Insert automated system messages (reminders/nudges) that don't already
// exist, matched by broadcastId. Local mode only — in backend mode the
// scheduled comms-cron Edge Function owns this so it isn't duplicated per
// coach browser. Returns the number inserted.
export async function ensureSystemMessages(pending) {
  if (hasBackend || !pending?.length) return 0
  const a = lload()
  const have = new Set(a.map((m) => m.broadcastId).filter(Boolean))
  const toAdd = pending.filter((p) => !have.has(p.broadcastId))
  if (!toAdd.length) return 0
  const now = new Date().toISOString()
  toAdd.forEach((p) => a.push({
    id: uid(), clientId: p.clientId, senderRole: 'coach', kind: 'system', body: p.body,
    attachmentPath: null, durationSec: null, broadcastId: p.broadcastId, createdAt: now, readAt: null,
  }))
  lsave(a)
  return toAdd.length
}

// Mark the other party's unread messages in a thread as read.
export async function markThreadRead(clientId, viewerRole) {
  const now = new Date().toISOString()
  if (!hasBackend) {
    const a = lload(); let changed = false
    a.forEach((m) => {
      if (m.clientId === clientId && m.senderRole !== viewerRole && !m.readAt) { m.readAt = now; changed = true }
    })
    if (changed) lsave(a)
    return
  }
  await supabase.from('messages').update({ readAt: now })
    .eq('clientId', clientId).neq('senderRole', viewerRole).is('readAt', null)
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = () => reject(r.error || new Error('read failed'))
  r.readAsDataURL(file)
})

// Upload a voice/video/image blob for a thread and return its stored reference.
// Backend: object key "<clientId>/<uid>.<ext>" in the private `media` bucket.
// Local mode: an inline data: URL (kept small — long clips may hit quota).
export async function uploadMedia({ clientId, file, ext = 'bin' }) {
  if (!hasBackend) return fileToDataUrl(file)
  const key = `${clientId}/${uid()}.${ext}`
  const { error } = await supabase.storage.from('media').upload(key, file, {
    contentType: file.type || 'application/octet-stream', upsert: false,
  })
  if (error) throw error
  return key
}

// Resolve a stored reference to a playable URL (signed, ~1h) for the UI.
export async function mediaUrl(attachmentPath) {
  if (!attachmentPath) return null
  if (!hasBackend || attachmentPath.startsWith('data:') || attachmentPath.startsWith('blob:')) return attachmentPath
  const { data, error } = await supabase.storage.from('media').createSignedUrl(attachmentPath, 3600)
  if (error) return null
  return data?.signedUrl || null
}

// Realtime: fire onInsert for new rows in one thread. Returns an unsubscribe fn.
export function subscribeThread(clientId, onInsert) {
  if (!hasBackend) return () => {}
  const ch = supabase.channel('messages:' + clientId + ':' + rand())
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `clientId=eq.${clientId}` },
      (payload) => onInsert(payload.new))
    .subscribe()
  return () => supabase.removeChannel(ch)
}

// Realtime: fire onChange on any message change (coach inbox badge / list).
export function subscribeAll(onChange) {
  if (!hasBackend) return () => {}
  const ch = supabase.channel('messages:all:' + rand())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => onChange())
    .subscribe()
  return () => supabase.removeChannel(ch)
}
