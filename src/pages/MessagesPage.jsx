import { useState, useEffect } from 'react'
import { useData } from '../store/DataContext'
import { useModal } from '../store/ModalContext'
import { useConversations } from '../hooks/useConversations'
import { hasBackend } from '../lib/supabase'
import { computeNudges } from '../lib/nudges'
import { ensureSystemMessages } from '../api/messages'
import Button from '../components/atoms/Button'
import ConversationList from '../components/organisms/ConversationList'
import ChatThread from '../components/organisms/ChatThread'
import BroadcastComposer from '../components/organisms/BroadcastComposer'

export default function MessagesPage() {
  const { db } = useData()
  const { openModal } = useModal()
  const { byClient, reload } = useConversations()
  const clients = db.clients || []
  const [selectedId, setSelectedId] = useState(null)
  const sel = clients.find((c) => c.id === selectedId) || null

  // Local mode has no scheduled Edge Function, so generate reminders/nudges on
  // open. In backend mode the comms-cron function owns this (ensure… no-ops).
  useEffect(() => {
    if (hasBackend || !db) return
    ensureSystemMessages(computeNudges(db, db.settings)).then((n) => { if (n) reload() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const broadcast = () => openModal(
    <BroadcastComposer clients={clients} onSent={(n) => { reload(); if (n) alert(`Broadcast sent to ${n} athlete${n === 1 ? '' : 's'}.`) }} />,
  )

  return (
    <>
      <div className="topbar">
        <div><h1>Messages</h1><div className="sub">Chat with your athletes</div></div>
        <Button onClick={broadcast} disabled={!clients.length}>📣 Broadcast</Button>
      </div>
      <div className="msg-layout">
        <div className="card msg-list-card">
          <ConversationList clients={clients} byClient={byClient} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="card msg-thread-card">
          {sel ? (
            <ChatThread clientId={sel.id} viewerRole="coach" headerName={sel.name} subtitle={sel.email} />
          ) : (
            <div className="empty" style={{ padding: 40 }}><div className="big">💬</div>Select a conversation to start chatting.</div>
          )}
        </div>
      </div>
    </>
  )
}
