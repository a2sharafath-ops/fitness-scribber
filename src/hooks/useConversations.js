// Coach-side inbox: groups all messages by client into last-message + unread
// count, and keeps itself fresh via realtime. Used by the Messages page list
// and the sidebar unread badge.
import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchAllMessages, subscribeAll } from '../api/messages'

export function useConversations() {
  const [messages, setMessages] = useState([])
  const reload = useCallback(() => { fetchAllMessages().then(setMessages).catch(() => {}) }, [])

  useEffect(() => {
    reload()
    const unsub = subscribeAll(reload)
    return unsub
  }, [reload])

  const { byClient, totalUnread } = useMemo(() => {
    const map = {}
    for (const m of messages) {
      const g = map[m.clientId] || (map[m.clientId] = { clientId: m.clientId, last: null, unread: 0 })
      g.last = m
      if (m.senderRole === 'athlete' && !m.readAt) g.unread += 1
    }
    const total = Object.values(map).reduce((s, g) => s + g.unread, 0)
    return { byClient: map, totalUnread: total }
  }, [messages])

  return { byClient, totalUnread, reload }
}
