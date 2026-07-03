// Loads one chat thread, subscribes to new messages, and exposes send helpers.
import { useState, useEffect, useCallback } from 'react'
import { listThread, sendMessage, subscribeThread, markThreadRead, uploadMedia } from '../api/messages'

export function useThread(clientId, viewerRole) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const add = useCallback((row) => setMessages((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row])), [])

  useEffect(() => {
    if (!clientId) return undefined
    let alive = true
    setLoading(true)
    listThread(clientId).then((m) => {
      if (!alive) return
      setMessages(m)
      setLoading(false)
      markThreadRead(clientId, viewerRole)
    }).catch(() => { if (alive) setLoading(false) })
    const unsub = subscribeThread(clientId, (msg) => {
      setMessages((prev) => (prev.some((p) => p.id === msg.id) ? prev : [...prev, msg]))
      if (msg.senderRole !== viewerRole) markThreadRead(clientId, viewerRole)
    })
    return () => { alive = false; unsub() }
  }, [clientId, viewerRole])

  const send = useCallback(async (body) => {
    const text = (body || '').trim()
    if (!text) return
    add(await sendMessage({ clientId, senderRole: viewerRole, body: text }))
  }, [clientId, viewerRole, add])

  // Record → upload → post a voice note.
  const sendVoice = useCallback(async (blob, seconds) => {
    setUploading(true)
    try {
      const attachmentPath = await uploadMedia({ clientId, file: blob, ext: 'webm' })
      add(await sendMessage({ clientId, senderRole: viewerRole, kind: 'voice', attachmentPath, durationSec: Math.round(seconds || 0) }))
    } finally { setUploading(false) }
  }, [clientId, viewerRole, add])

  // Upload → post an attached file (form-check video, image, or audio).
  const sendFile = useCallback(async (file) => {
    const kind = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'voice' : 'image'
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    setUploading(true)
    try {
      const attachmentPath = await uploadMedia({ clientId, file, ext })
      add(await sendMessage({ clientId, senderRole: viewerRole, kind, attachmentPath, body: kind === 'image' ? '' : file.name }))
    } finally { setUploading(false) }
  }, [clientId, viewerRole, add])

  return { messages, loading, uploading, send, sendVoice, sendFile }
}
