// Resolves attachment references to playable (signed) URLs, keyed by message id.
// Signed URLs are fetched lazily and cached for the life of the component.
import { useState, useEffect } from 'react'
import { mediaUrl } from '../api/messages'

export function useMediaUrls(messages) {
  const [map, setMap] = useState({})

  useEffect(() => {
    let alive = true
    messages.forEach((m) => {
      if (m.kind !== 'text' && m.attachmentPath && !(m.id in map)) {
        mediaUrl(m.attachmentPath).then((u) => {
          if (alive) setMap((prev) => (m.id in prev ? prev : { ...prev, [m.id]: u }))
        })
      }
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  return map
}
